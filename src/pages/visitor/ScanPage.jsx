import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera, CheckCircle2, ChevronLeft, RefreshCcw, SendHorizontal,
  Check, ShieldCheck, Loader2, AlertCircle
} from "lucide-react";
import VisitorConsentModal from "../../components/VisitorConsentModal";
import { apiRequest } from "../../services/apiClient";
import { env } from "../../config/env";
import { RealtimeEvent } from "../../services/realtimeEvents";
import { createRealtimeSocket, releaseRealtimeSocket } from "../../services/socketClient";
import { getVisitorSessionStatus } from "../../services/homeownerService";
import { storeVisitorSessionToken, getVisitorSessionToken } from "../../services/visitorSessionToken";
import {
  buildVisitorConsentPayload,
  getVisitorConsent,
  hasVisitorConsent,
  recordVisitorConsent
} from "../../services/visitorConsent";
import { getOfficeVisitorCallStatus, requestOfficeVisitorCall } from "../../services/officeService";

const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const MAX_SUBMIT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 700;
const DEVICE_STORAGE_KEY = "qring_visitor_device_id";
let runtimeVisitorDeviceId = "";

function normalizeSessionStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isVisitorSessionActive(status) {
  return ["approved", "active", "gate_confirmed"].includes(normalizeSessionStatus(status));
}

function isOfficeCallTerminalStatus(status) {
  return ["accepted", "rejected", "cancelled", "completed", "ended", "failed"].includes(normalizeSessionStatus(status));
}

function getOrCreateVisitorDeviceId() {
  const next = `visitor-device-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    localStorage.setItem(DEVICE_STORAGE_KEY, next);
    return next;
  } catch {
    if (runtimeVisitorDeviceId) return runtimeVisitorDeviceId;
    runtimeVisitorDeviceId = next;
    return runtimeVisitorDeviceId;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createVisitorRequestId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `vrq_${crypto.randomUUID()}`;
    }
  } catch {
    // Fallback
  }
  return `vrq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function getSnapshotPayloadParts(dataUrl) {
  const raw = String(dataUrl || "").trim();
  if (!raw) return { snapshotBase64: "", snapshotMime: "" };
  const [prefix, body = ""] = raw.split(",", 2);
  const mimeMatch = prefix.match(/^data:([^;]+);base64$/i);
  return {
    snapshotBase64: body.trim(),
    snapshotMime: (mimeMatch?.[1] || "image/jpeg").trim().toLowerCase()
  };
}

function getVisitorSubmitErrorMessage(error) {
  const code = String(error?.payload?.code || "").trim();
  if (code === "SNAPSHOT_SAVE_FAILED") {
    return "Snapshot could not be saved. Please retake the photo and try again.";
  }
  if (code === "VISITOR_CONSENT_EXPIRED" || code === "VISITOR_CONSENT_REQUIRED" || code === "VISITOR_CONSENT_TIMESTAMP_REQUIRED") {
    return "Your privacy notice session expired. Please accept it again, then retry your request.";
  }
  if (code === "VISITOR_CONSENT_STORAGE_INVALID") {
    return "We couldn't confirm your consent session. Please accept the privacy notice again.";
  }
  if (error?.status === 422) {
    return "We couldn't validate your request. Please check the form and try again.";
  }
  if (error?.status === 400) {
    return error?.message || "Please review the form and try again.";
  }
  if (error?.status >= 500) {
    return "The server responded with an error even though the connection worked. Please try again.";
  }
  return error?.message || "Request failed";
}

function canReacceptConsentFromError(message) {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("privacy notice session expired") ||
    normalized.includes("accept it again") ||
    normalized.includes("visitor consent") ||
    normalized.includes("consent")
  );
}

function isRetryableSubmitError(error) {
  const status = Number(error?.status ?? -1);
  return RETRYABLE_STATUSES.has(status);
}

async function submitVisitorRequestWithRetry(payload, onRetry) {
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_SUBMIT_RETRIES; attempt += 1) {
    try {
      return await apiRequest("/visitor/request", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_SUBMIT_RETRIES || !isRetryableSubmitError(error)) {
        throw error;
      }
      const waitMs = RETRY_BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 220);
      onRetry?.({
        attempt: attempt + 1,
        maxRetries: MAX_SUBMIT_RETRIES,
        nextDelayMs: waitMs
      });
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function getDoorList(qr) {
  const doorOptions = Array.isArray(qr?.doorOptions) ? qr.doorOptions : [];
  if (doorOptions.length > 0) return doorOptions;
  return (Array.isArray(qr?.doors) ? qr.doors : []).map((doorId) => ({ id: doorId, name: doorId }));
}

function getDoorLabel(door, fallbackId = "") {
  return String(door?.name || door?.label || door?.doorName || fallbackId || "").trim();
}

export default function ScanPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();

  const [consentState, setConsentState] = useState(() => getVisitorConsent());
  const consentAccepted = Boolean(consentState?.consentAccepted);
  const [showConsent, setShowConsent] = useState(() => !hasVisitorConsent());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState(null);
  const [doorId, setDoorId] = useState("");
  const [requestState, setRequestState] = useState({
    kind: "",
    sending: false,
    retrying: false,
    retryAttempt: 0,
    requestStartedAt: 0,
    lastLatencyMs: null,
    sent: false,
    sessionId: "",
    status: ""
  });
  const [officeEntryMode, setOfficeEntryMode] = useState("visitor");
  const [officeClockAction, setOfficeClockAction] = useState("clock_in");
  const [cameraState, setCameraState] = useState({
    starting: false,
    ready: false,
    error: ""
  });
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    phone: "",
    purpose: "",
    staffName: "",
    deliveryOption: "allow_entry",
    snapshotDataUrl: ""
  });

  const [seconds, setSeconds] = useState(0);
  const [, setRequestLatencyMs] = useState(0);
  const socketRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const visitorDeviceId = useMemo(() => (consentAccepted ? getOrCreateVisitorDeviceId() : ""), [consentAccepted]);
  const selectedDoor = useMemo(() => getDoorList(qr).find((item) => item.id === doorId) ?? null, [qr, doorId]);
  const selectedDoorName = useMemo(
    () => getDoorLabel(selectedDoor, doorId || qr?.doorName || qr?.unitName || ""),
    [selectedDoor, doorId, qr]
  );
  const office = qr?.office ?? null;
  const estateName = String(qr?.estateName || qr?.estate?.name || "").trim();
  const isOfficeQr = Boolean(office?.id || String(qr?.type || "").toLowerCase() === "office" || String(qr?.plan || "").toLowerCase() === "office");
  const doorOptions = useMemo(() => getDoorList(qr), [qr]);
  const snapshotCaptured = Boolean(visitorForm.snapshotDataUrl);
  const canReacceptConsent = canReacceptConsentFromError(error);

  const requiresPhotoCapture = !isOfficeQr || (isOfficeQr && officeEntryMode === "visitor");

  useEffect(() => {
    if (!qrId) return;
    try {
      sessionStorage.setItem("qring_visitor_last_qr_id", String(qrId).trim());
    } catch {}
  }, [qrId]);

  useEffect(() => {
    return () => { void stopCamera(); };
  }, []);

  useEffect(() => {
    if (!consentAccepted) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiRequest(`/qr/resolve/${qrId}`);
        const data = response?.data ?? response;
        if (!mounted) return;
        setQr(data);
        const nextDoorOptions = getDoorList(data);
        setDoorId(nextDoorOptions[0]?.id || "");
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError.message ?? "QR code could not be resolved");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [consentAccepted, qrId]);

  useEffect(() => {
    if (!consentAccepted || loading || requestState.sent || visitorForm.snapshotDataUrl || !requiresPhotoCapture) return;
    if (cameraState.ready || cameraState.starting) return;
    void startCamera();
  }, [consentAccepted, loading, qr, requestState.sent, visitorForm.snapshotDataUrl, requiresPhotoCapture]);

  useEffect(() => {
    if (!requestState.sent) return;
    const id = window.setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => window.clearInterval(id);
  }, [requestState.sent]);

  useEffect(() => {
    if (!requestState.sending || !requestState.requestStartedAt) return;
    const tick = () => setRequestLatencyMs(Date.now() - requestState.requestStartedAt);
    tick();
    const id = window.setInterval(tick, 150);
    return () => window.clearInterval(id);
  }, [requestState.sending, requestState.requestStartedAt]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId || requestState.kind !== "office") return;
    if (isOfficeCallTerminalStatus(requestState.status)) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await getOfficeVisitorCallStatus(requestState.sessionId);
        const data = response?.data ?? response;
        if (!active || (!data?.status && !response?.status)) return;
        const nextStatus = normalizeSessionStatus(data.status);
        setRequestState((prev) => ({ ...prev, status: nextStatus }));
      } catch {}
    };
    void poll();
    const intervalId = window.setInterval(poll, 1800);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [requestState.sent, requestState.sessionId, requestState.kind, requestState.status]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId || requestState.kind === "office") return;
    let active = true;
    const poll = async () => {
      try {
        const data = await getVisitorSessionStatus(requestState.sessionId);
        if (!active || !data?.status) return;
        const nextStatus = normalizeSessionStatus(data.status);
        setRequestState((prev) => ({ ...prev, status: nextStatus }));
      } catch {}
    };
    void poll();
    const id = window.setInterval(poll, 1500);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [requestState.sent, requestState.sessionId, requestState.kind]);

  useEffect(() => {
    if (!requestState.sessionId) return;
    if (!isVisitorSessionActive(requestState.status)) return;
    navigate(`/session/${requestState.sessionId}/message`, { replace: true });
  }, [navigate, requestState.sessionId, requestState.status]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId || requestState.kind === "office") return;
    const socket = createRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
      reconnectionAttempts: 6,
      authBuilder: () => ({})
    });
    socketRef.current = socket;

    const handleConnect = () => {
      const visitorToken = getVisitorSessionToken(requestState.sessionId);
      socket.timeout(5000).emit(RealtimeEvent.SESSION_JOIN, {
        sessionId: requestState.sessionId,
        displayName: "Visitor",
        visitorToken: visitorToken || undefined
      }, () => {});
    };

    const handleSessionStatus = (payload) => {
      if (payload?.sessionId !== requestState.sessionId) return;
      const nextStatus = normalizeSessionStatus(payload?.status || payload?.sessionStatus);
      if (nextStatus) setRequestState((prev) => ({ ...prev, status: nextStatus }));
    };

    socket.on("connect", handleConnect);
    socket.on(RealtimeEvent.SESSION_STATUS, handleSessionStatus);

    return () => {
      socket.off("connect", handleConnect);
      socket.off(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
      socketRef.current = null;
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
        autoConnect: true,
        reconnection: true,
        withCredentials: true
      });
    };
  }, [requestState.sent, requestState.sessionId, requestState.kind]);

  async function stopCamera() {
    const stream = cameraStreamRef.current;
    cameraStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setCameraState((prev) => ({ ...prev, ready: false, starting: false }));
  }

  async function startCamera() {
    if (!consentAccepted) return;
    if (cameraStreamRef.current || cameraState.starting) return;
    setCameraState({ starting: true, ready: false, error: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState({ starting: false, ready: true, error: "" });
    } catch (cameraError) {
      setCameraState({
        starting: false,
        ready: false,
        error: cameraError?.message || "Camera permission is required to process visitor requests."
      });
    }
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (!vw || !vh) {
      setCameraState((prev) => ({ ...prev, error: "Initializing frame. Try again in a second." }));
      return;
    }
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 480, 640);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: dataUrl }));
    void stopCamera();
  }

  function clearSnapshot() {
    setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: "" }));
    void startCamera();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isOfficeQr) {
      await handleOfficeSubmit(event);
      return;
    }
    setError("");

    if (!consentAccepted) return setError("Please accept the privacy notice to continue.");
    if (!doorId) return setError("Select an access point or entry gate.");
    if (!visitorForm.name.trim()) return setError("Please enter your full name.");
    if (!visitorForm.phone.trim()) return setError("Please fill in your contact line.");
    if (!visitorForm.purpose.trim()) return setError("Specify your reason for arriving.");

    const startedAt = Date.now();
    const requestId = createVisitorRequestId();
    const { snapshotBase64, snapshotMime } = getSnapshotPayloadParts(visitorForm.snapshotDataUrl);
    if (!snapshotBase64) return setError("A fresh photo snapshot is required for verification.");

    setRequestLatencyMs(0);
    setRequestState((prev) => ({
      ...prev,
      sending: true,
      retrying: false,
      retryAttempt: 0,
      requestStartedAt: startedAt,
      lastLatencyMs: null
    }));

    const normalizedPurpose = visitorForm.purpose.trim();
    const visitorType = normalizedPurpose.toLowerCase() === "delivery" ? "delivery" : "guest";

    try {
      const response = await submitVisitorRequestWithRetry({
        requestId,
        qrId,
        doorId,
        doorName: selectedDoorName,
        name: visitorForm.name.trim(),
        phoneNumber: visitorForm.phone.trim(),
        purpose: normalizedPurpose,
        visitorType,
        deliveryOption: visitorType === "delivery" ? visitorForm.deliveryOption : undefined,
        snapshotBase64,
        snapshotMime,
        deviceId: visitorDeviceId,
        ...(buildVisitorConsentPayload(consentState) || {})
      }, ({ attempt }) => {
        setRequestState((prev) => ({ ...prev, sending: true, retrying: true, retryAttempt: attempt }));
      });

      const data = response?.data ?? response;
      const latencyMs = Date.now() - startedAt;
      if (data?.sessionId && data?.visitorToken) {
        storeVisitorSessionToken(data.sessionId, data.visitorToken);
      }
      setRequestState({
        kind: "visitor",
        sending: false,
        retrying: false,
        retryAttempt: 0,
        requestStartedAt: 0,
        lastLatencyMs: latencyMs,
        sent: true,
        sessionId: data?.sessionId ?? "",
        status: normalizeSessionStatus(data?.status ?? "pending"),
        entryMode: "visitor",
        staffAction: ""
      });
      setRequestLatencyMs(latencyMs);
    } catch (submitError) {
      setRequestState((prev) => ({ ...prev, sending: false, retrying: false, retryAttempt: 0, requestStartedAt: 0 }));
      setError(getVisitorSubmitErrorMessage(submitError));
    }
  }

  async function handleOfficeSubmit(event, nextMode = officeEntryMode, nextAction = officeClockAction) {
    if (event) event.preventDefault();
    setError("");

    if (!consentAccepted) return setError("Please accept the privacy notice to proceed.");
    const isStaffMode = nextMode === "staff";
    const staffName = String(visitorForm.staffName || visitorForm.name || "").trim();
    const visitorName = String(visitorForm.name || "").trim();

    if (isStaffMode) {
      if (!staffName) return setError("Please enter your staff member name.");
    } else {
      if (!visitorName) return setError("Please provide your full name.");
      if (!visitorForm.phone.trim()) return setError("Please enter a valid phone number.");
      if (!visitorForm.purpose.trim()) return setError("State the objective of your visit.");
      if (!visitorForm.staffName.trim()) return setError("Name of the staff member you are visiting.");
      if (!visitorForm.snapshotDataUrl) return setError("A fresh photo snapshot is required for verification.");
    }

    const { snapshotBase64, snapshotMime } = getSnapshotPayloadParts(visitorForm.snapshotDataUrl);

    const startedAt = Date.now();
    const requestId = createVisitorRequestId();
    setRequestLatencyMs(0);
    setRequestState((prev) => ({
      ...prev,
      kind: "office",
      sending: true,
      retrying: false,
      retryAttempt: 0,
      requestStartedAt: startedAt,
      lastLatencyMs: null,
      entryMode: nextMode,
      staffAction: isStaffMode ? nextAction : ""
    }));

    try {
      const response = await requestOfficeVisitorCall({
        requestId,
        qrId,
        employeeId: undefined,
        visitorName: visitorName,
        visitorPhone: isStaffMode ? undefined : visitorForm.phone.trim(),
        purpose: isStaffMode ? (visitorForm.purpose.trim() || `Staff ${nextAction === "clock_out" ? "clock out" : "clock in"}`) : visitorForm.purpose.trim(),
        callType: isStaffMode ? undefined : "audio",
        hasVideo: isStaffMode ? undefined : false,
        staffName: staffName,
        entryMode: nextMode,
        staffAction: isStaffMode ? nextAction : undefined,
        snapshotBase64: !isStaffMode ? snapshotBase64 : undefined,
        snapshotMime: !isStaffMode ? snapshotMime : undefined,
        ...(buildVisitorConsentPayload(consentState) || {})
      });
      const data = response?.data ?? response;
      const latencyMs = Date.now() - startedAt;
      setRequestState({
        kind: "office",
        sending: false,
        retrying: false,
        retryAttempt: 0,
        requestStartedAt: 0,
        lastLatencyMs: latencyMs,
        sent: true,
        sessionId: data?.attendanceId ?? data?.id ?? data?.callSessionId ?? data?.sessionId ?? "",
        status: normalizeSessionStatus(data?.status ?? (isStaffMode ? (nextAction === "clock_out" ? "checked_out" : "checked_in") : "pending")),
        entryMode: nextMode,
        staffAction: isStaffMode ? nextAction : ""
      });
      setRequestLatencyMs(latencyMs);
    } catch (submitError) {
      setRequestState((prev) => ({ ...prev, sending: false, retrying: false, retryAttempt: 0, requestStartedAt: 0 }));
      setError(submitError?.message || (nextMode === "staff" ? "Could not log attendance." : "Unable to dispatch request."));
    }
  }

  const isFormValid = Boolean(
    (isOfficeQr
      ? officeEntryMode === "staff"
        ? Boolean((visitorForm.staffName || visitorForm.name).trim())
        : Boolean(visitorForm.name.trim() && visitorForm.phone.trim() && visitorForm.purpose.trim() && visitorForm.staffName.trim())
      : Boolean(doorId && visitorForm.name.trim() && visitorForm.phone.trim() && visitorForm.purpose.trim())) &&
    (!requiresPhotoCapture || snapshotCaptured) &&
    !requestState.sending
  );

  function resetOfficeRequestForRetry() {
    setError("");
    setOfficeEntryMode("visitor");
    setOfficeClockAction("clock_in");
    setVisitorForm({ name: "", phone: "", purpose: "", staffName: "", deliveryOption: "allow_entry", snapshotDataUrl: "" });
    setRequestState({
      kind: "",
      sending: false,
      retrying: false,
      retryAttempt: 0,
      requestStartedAt: 0,
      lastLatencyMs: null,
      sent: false,
      sessionId: "",
      status: "",
      entryMode: "",
      staffAction: ""
    });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      <VisitorConsentModal
        open={showConsent}
        onAccept={() => {
          const nextConsent = recordVisitorConsent({ persist: false });
          setConsentState(nextConsent);
          setShowConsent(false);
        }}
      />

      <canvas ref={canvasRef} className="hidden" />

      {showConsent ? null : (
        <div className="min-h-screen flex flex-col justify-between">
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="text-center">
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                  {estateName || office?.companyName || "QRing Access"}
                </p>
                <h1 className="text-sm font-bold text-slate-900">Digital Pass Verification</h1>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>Encrypted</span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-xs text-rose-900 animate-in fade-in slide-in-from-top-2 duration-200">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Action Required</p>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                  {canReacceptConsent && (
                    <button
                      type="button"
                      onClick={() => { setError(""); setShowConsent(true); }}
                      className="mt-2 font-bold text-rose-900 underline underline-offset-2"
                    >
                      Re-accept Consent
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Loader2 size={28} className="animate-spin text-slate-900 mb-3" />
                <p className="text-xs font-semibold text-slate-600">Verifying Pass Credentials</p>
                <p className="text-[11px] text-slate-400 mt-1">Connecting to gateway instance...</p>
              </div>
            ) : requestState.sent ? (
              <div className="py-8 space-y-6 text-center animate-in fade-in duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  <CheckCircle2 size={32} />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {requestState.kind === "office" && requestState.entryMode === "staff"
                      ? "Attendance Logged"
                      : "Request Dispatched"}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {requestState.kind === "office" && requestState.entryMode === "staff"
                      ? "Your check-in timestamp has been recorded at the front desk."
                      : "Your check-in authorization has been sent. Please stand by."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200/60 pb-2.5">
                    <span>Status</span>
                    <span className="font-semibold uppercase text-slate-900 tracking-wider text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {requestState.status || "Pending Review"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Elapsed Wait</span>
                    <span className="font-mono text-slate-900 font-medium">{seconds}s</span>
                  </div>
                </div>

                {requestState.kind === "office" && (
                  <button
                    type="button"
                    onClick={resetOfficeRequestForRetry}
                    className="w-full py-3 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Submit Another Request
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {isOfficeQr && (
                  <div className="p-1 rounded-xl bg-slate-100 flex text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setOfficeEntryMode("visitor")}
                      className={`flex-1 py-2.5 rounded-lg transition ${
                        officeEntryMode === "visitor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Visitor Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfficeEntryMode("staff")}
                      className={`flex-1 py-2.5 rounded-lg transition ${
                        officeEntryMode === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Staff Access
                    </button>
                  </div>
                )}

                {!isOfficeQr && doorOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Access Point</label>
                    <div className="grid grid-cols-1 gap-2">
                      {doorOptions.map((door) => (
                        <button
                          key={door.id}
                          type="button"
                          onClick={() => setDoorId(door.id)}
                          className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                            doorId === door.id
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-xs font-medium">{getDoorLabel(door, door.id)}</span>
                          {doorId === door.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {requiresPhotoCapture && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Verification Photo</label>
                    <div className="relative aspect-4/3 rounded-2xl bg-slate-900 overflow-hidden flex flex-col items-center justify-center text-white">
                      {snapshotCaptured ? (
                        <>
                          <img src={visitorForm.snapshotDataUrl} alt="Visitor Snapshot" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={clearSnapshot}
                            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-black/80 transition"
                          >
                            <RefreshCcw size={12} /> Retake
                          </button>
                        </>
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${cameraState.ready ? "block" : "hidden"}`}
                          />

                          {!cameraState.ready && (
                            <div className="p-6 text-center space-y-2">
                              {cameraState.starting ? (
                                <Loader2 size={24} className="animate-spin mx-auto text-slate-400" />
                              ) : (
                                <Camera size={24} className="mx-auto text-slate-400" />
                              )}
                              <p className="text-xs text-slate-300">
                                {cameraState.error || "Granting camera permission..."}
                              </p>
                            </div>
                          )}

                          {cameraState.ready && (
                            <button
                              type="button"
                              onClick={captureSnapshot}
                              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg active:scale-95 transition"
                            >
                              <div className="w-11 h-11 rounded-full border-2 border-slate-900" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {isOfficeQr && officeEntryMode === "staff" && (
                  <div className="p-1 rounded-xl bg-slate-100 flex text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setOfficeClockAction("clock_in")}
                      className={`flex-1 py-2 rounded-lg transition ${
                        officeClockAction === "clock_in" ? "bg-slate-900 text-white" : "text-slate-600"
                      }`}
                    >
                      Clock In
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfficeClockAction("clock_out")}
                      className={`flex-1 py-2 rounded-lg transition ${
                        officeClockAction === "clock_out" ? "bg-slate-900 text-white" : "text-slate-600"
                      }`}
                    >
                      Clock Out
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isOfficeQr && officeEntryMode === "staff" ? "Staff Full Name" : "Your Name"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jane Doe"
                      value={visitorForm.name}
                      onChange={(e) => setVisitorForm({ ...visitorForm, name: e.target.value })}
                      className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                    />
                  </div>

                  {(officeEntryMode === "visitor" || !isOfficeQr) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +234 800 000 0000"
                        value={visitorForm.phone}
                        onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                      />
                    </div>
                  )}

                  {isOfficeQr && officeEntryMode === "visitor" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Member Visiting</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Morgan"
                        value={visitorForm.staffName}
                        onChange={(e) => setVisitorForm({ ...visitorForm, staffName: e.target.value })}
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                      />
                    </div>
                  )}

                  {(officeEntryMode === "visitor" || !isOfficeQr) && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Visit</label>
                      <input
                        type="text"
                        placeholder="e.g. Meeting, Personal Visit, Delivery"
                        value={visitorForm.purpose}
                        onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                        className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {requestState.sending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <SendHorizontal size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </main>

          <footer className="py-4 border-t border-slate-100 text-center">
            <p className="text-[10px] font-medium text-slate-400">
              Powered by QRing Infrastructure · Realtime Security Protocol
            </p>
          </footer>
        </div>
      )}
    </div>
  );
}