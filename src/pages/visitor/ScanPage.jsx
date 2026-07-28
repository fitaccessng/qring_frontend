import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, CheckCircle2, ChevronLeft, RefreshCcw, SendHorizontal, Building2, User, Phone, FileText, Check, BadgeCheck, ArrowRightLeft } from "lucide-react";
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
  const [requestLatencyMs, setRequestLatencyMs] = useState(0);
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
  const isOfficeQr = Boolean(office?.id || String(qr?.type || "").toLowerCase() === "office" || String(qr?.plan || "").toLowerCase() === "office");
  const doorOptions = useMemo(() => getDoorList(qr), [qr]);
  const snapshotCaptured = Boolean(visitorForm.snapshotDataUrl);
  const canReacceptConsent = canReacceptConsentFromError(error);

  useEffect(() => {
    if (!qrId) return;
    try {
      sessionStorage.setItem("qring_visitor_last_qr_id", String(qrId).trim());
    } catch {
      // Ignored
    }
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
        setError(fetchError.message ?? "QR could not be resolved");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [consentAccepted, qrId]);

  useEffect(() => {
    if (!consentAccepted || loading || requestState.sent || visitorForm.snapshotDataUrl || isOfficeQr) return;
    if (cameraState.ready || cameraState.starting) return;
    void startCamera();
  }, [consentAccepted, loading, qr, requestState.sent, visitorForm.snapshotDataUrl, isOfficeQr]);

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
      } catch {
        // Keep polling until the office responds.
      }
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
      } catch {
        // Continue loop
      }
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
        error: cameraError?.message || "Camera access blocked. Please allow camera permissions."
      });
    }
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (!vw || !vh) {
      setCameraState((prev) => ({ ...prev, error: "Camera frame processing. Try again." }));
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

    if (!consentAccepted) return setError("Please accept the privacy notice.");
    if (!doorId) return setError("Please select an entry gate.");
    if (!visitorForm.snapshotDataUrl) return setError("Please snap a live photo validation.");
    if (!visitorForm.name.trim()) return setError("Please enter your full name.");
    if (!visitorForm.phone.trim()) return setError("Please fill in your phone contact line.");
    if (!visitorForm.purpose.trim()) return setError("Please specify your reason for arriving.");

    const startedAt = Date.now();
    const requestId = createVisitorRequestId();
    const { snapshotBase64, snapshotMime } = getSnapshotPayloadParts(visitorForm.snapshotDataUrl);

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
    event.preventDefault();
    setError("");

    if (!consentAccepted) return setError("Please accept the privacy notice.");
    const isStaffMode = nextMode === "staff";
    const staffName = String(visitorForm.name || "").trim();
    const visitorName = String(visitorForm.name || "").trim();
    if (isStaffMode) {
      if (!staffName) return setError("Please enter the staff name.");
    } else {
      if (!visitorName) return setError("Please enter your full name.");
      if (!visitorForm.phone.trim()) return setError("Please fill in your phone contact line.");
      if (!visitorForm.purpose.trim()) return setError("Please tell us what brings you here.");
      if (!visitorForm.staffName.trim()) return setError("Please enter the staff name.");
    }

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
        visitorName: isStaffMode ? visitorName : visitorName,
        visitorPhone: isStaffMode ? undefined : visitorForm.phone.trim(),
        purpose: isStaffMode ? (visitorForm.purpose.trim() || `Staff ${nextAction === "clock_out" ? "clock out" : "clock in"}`) : visitorForm.purpose.trim(),
        callType: isStaffMode ? undefined : "audio",
        hasVideo: isStaffMode ? undefined : false,
        staffName: isStaffMode ? staffName : visitorForm.staffName.trim(),
        entryMode: nextMode,
        staffAction: isStaffMode ? nextAction : undefined,
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
        status: normalizeSessionStatus(data?.status ?? (isStaffMode ? nextAction === "clock_out" ? "checked_out" : "checked_in" : "pending")),
        entryMode: nextMode,
        staffAction: isStaffMode ? nextAction : ""
      });
      setRequestLatencyMs(latencyMs);
    } catch (submitError) {
      setRequestState((prev) => ({ ...prev, sending: false, retrying: false, retryAttempt: 0, requestStartedAt: 0 }));
      setError(submitError?.message || (nextMode === "staff" ? "Unable to save staff attendance." : "Unable to send the office request."));
    }
  }

  const isFormValid = Boolean(
    (isOfficeQr ? true : visitorForm.snapshotDataUrl) &&
    (officeEntryMode === "staff" ? Boolean(visitorForm.name.trim()) : Boolean(visitorForm.name.trim() && visitorForm.phone.trim() && visitorForm.purpose.trim() && visitorForm.staffName.trim())) &&
    !requestState.sending
  );

  const officeStatus = normalizeSessionStatus(requestState.status);
  const officeStatusCopy = useMemo(() => {
    if (!requestState.kind || requestState.kind !== "office") return null;
    if (officeStatus === "accepted") {
      return {
        tone: "success",
        title: "Reception matched your request",
        message: "The office has attached your request to the right staff member. Please stay nearby and wait for the next instruction."
      };
    }
    if (officeStatus === "assigned_to_staff") {
      return {
        tone: "success",
        title: "Request routed to staff",
        message: "Reception has matched the request to the correct staff account. Stay nearby for the next update."
      };
    }
    if (officeStatus === "rejected" || officeStatus === "cancelled") {
      return {
        tone: "danger",
        title: "Request declined",
        message: "The office couldn't route this request right now. You can try again with a different staff name."
      };
    }
    return {
      tone: "pending",
      title: "Waiting for reception",
      message: "Your request is in the office queue while reception routes it to the correct staff account."
    };
  }, [officeStatus, requestState.kind]);

  const officeJourney = useMemo(() => {
    if (!requestState.kind || requestState.kind !== "office") return [];
    const isAccepted = officeStatus === "accepted";
    const isRouted = officeStatus === "assigned_to_staff";
    const isRejected = officeStatus === "rejected" || officeStatus === "cancelled";
    return [
      {
        key: "requested",
        label: "Requested",
        detail: "Sent to the office queue",
        state: "done"
      },
      {
        key: "reviewing",
        label: "Reception reviewing",
        detail: "Reception is matching it to staff",
        state: isAccepted || isRouted || isRejected ? "done" : "active"
      },
      {
        key: "preparing",
        label: "Staff notified",
        detail: "Your named staff member receives it next",
        state: isAccepted || isRouted ? "active" : "upcoming"
      },
      {
        key: "instructions",
        label: "Next instructions",
        detail: "Waiting for the next step",
        state: isAccepted ? "upcoming" : "upcoming"
      }
    ];
  }, [officeStatus, requestState.kind]);

  function resetOfficeRequestForRetry() {
    setError("");
    setOfficeEntryMode("visitor");
    setOfficeClockAction("clock_in");
    setVisitorForm((prev) => ({ ...prev, staffName: "", phone: "", purpose: "", name: "" }));
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-sky-200">
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-sky-100/50 to-transparent pointer-events-none" />

      <VisitorConsentModal
        open={showConsent}
        onAccept={() => {
          const nextConsent = recordVisitorConsent({ persist: false });
          setConsentState(nextConsent);
          setShowConsent(false);
        }}
      />

      {showConsent ? null : (
        <main className="relative mx-auto max-w-6xl px-4 py-4 sm:py-8">
          
          <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">Secure Entrypoint</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-2xl truncate">Qring Digital Pass</h1>
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-100">
              {requestState.sent
                ? requestState.kind === "office" && requestState.entryMode === "staff"
                  ? "Staff updated"
                  : "Request Sent"
                : isOfficeQr
                  ? officeEntryMode === "staff"
                    ? "Step 1: Staff"
                    : "Step 1: Visitor"
                  : snapshotCaptured
                    ? "Armed"
                    : "Step 1: Photo"}
            </div>
          </header>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-red-900">Submission issue occurred</p>
                <p className="mt-0.5 text-red-700">{error}</p>
              </div>
              {canReacceptConsent && (
                <button
                  type="button"
                  onClick={() => { setError(""); setShowConsent(true); }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                >
                  Re-verify Now
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              <p className="mt-3 text-sm font-medium text-slate-500">Resolving security endpoint profile...</p>
            </div>
          ) : qr && !requestState.sent ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 items-start">
              {isOfficeQr ? (
                <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
                    <div className="space-y-2 border-b border-slate-100 pb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Office entry</span>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">
                        {office?.companyName || "Office access"}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Visitors type the staff name they want to reach. Staff can still clock in or out from the same scan point.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOfficeEntryMode("staff")}
                          className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                            officeEntryMode === "staff"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-sky-300"
                          }`}
                        >
                          Staff clock-in/out
                        </button>
                        <button
                          type="button"
                          onClick={() => setOfficeEntryMode("visitor")}
                          className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                            officeEntryMode === "visitor"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200 hover:border-sky-300"
                          }`}
                        >
                          Visitor request
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Routing</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Reception will match the staff name to the staff account in the office plan and route the request after submission.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                        {officeEntryMode === "staff" ? "Staff clock-in/out" : "Visitor details"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {officeEntryMode === "staff"
                          ? "Type the staff name, then record whether they are clocking in or clocking out."
                          : "Add your details and the staff name you want to reach."}
                      </p>
                    </div>

                    {officeEntryMode === "staff" ? (
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" /> Staff name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Jane Doe"
                            value={visitorForm.name}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <FileText size={14} className="text-slate-400" /> Shift note
                          </label>
                          <input
                            type="text"
                            placeholder="Optional note for the office log"
                            value={visitorForm.purpose}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, purpose: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={(event) => void handleOfficeSubmit(event, "staff", "clock_in")}
                            disabled={!visitorForm.name.trim() || requestState.sending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {requestState.sending && requestState.entryMode === "staff" && requestState.staffAction === "clock_in" ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            ) : (
                              <BadgeCheck size={16} />
                            )}
                            Clock In
                          </button>
                          <button
                            type="button"
                            onClick={(event) => void handleOfficeSubmit(event, "staff", "clock_out")}
                            disabled={!visitorForm.name.trim() || requestState.sending}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {requestState.sending && requestState.entryMode === "staff" && requestState.staffAction === "clock_out" ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-700" />
                            ) : (
                              <ArrowRightLeft size={16} />
                            )}
                            Clock Out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" /> Visitor name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={visitorForm.name}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" /> Phone Contact Number
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. +234..."
                            value={visitorForm.phone}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <User size={14} className="text-slate-400" /> Staff name
                          </label>
                          <input
                            type="text"
                            placeholder="Who are you here to see?"
                            value={visitorForm.staffName}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, staffName: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <FileText size={14} className="text-slate-400" /> Purpose of visit
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Meeting, delivery, interview"
                            value={visitorForm.purpose}
                            onChange={(e) => setVisitorForm((prev) => ({ ...prev, purpose: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {officeEntryMode === "visitor" ? (
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={!visitorForm.name.trim() || !visitorForm.phone.trim() || !visitorForm.purpose.trim() || !visitorForm.staffName.trim() || requestState.sending}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {requestState.sending ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Sending Office Request...
                            </>
                          ) : (
                            <>
                              <SendHorizontal size={16} />
                              Send to Office Queue
                            </>
                          )}
                        </button>
                        <p className="mt-2 text-center text-[11px] text-slate-400 font-medium">
                          Reception will route this request to the named staff member after it enters the queue.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                        The staff clock action updates the team directory and records the member as checked in or checked out.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col lg:flex-row gap-6 items-start">
                  {/* Taller Premium Portrait Layout Camera Side Column */}
                  <div className="w-full lg:w-[42%] order-first lg:order-none space-y-4 shrink-0">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Identity Capture</h2>
                          <p className="text-xs font-medium text-slate-600">
                            {snapshotCaptured ? "Verification image locked" : "Position face inside frame"}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                          snapshotCaptured ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-sky-50 text-sky-700 border-sky-100"
                        }`}>
                          {snapshotCaptured ? "Locked" : "Live Feed"}
                        </span>
                      </div>

                      {/* Enhanced 3:4 aspect ratio view for an elongated premium native-mobile layout aspect without distortion */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-200 shadow-inner max-h-[420px]">
                        {!snapshotCaptured ? (
                          <>
                            <video ref={videoRef} className="h-full w-full object-cover scale-x-[-1]" playsInline muted />
                            <canvas ref={canvasRef} className="hidden" />
                            <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none rounded-lg" />
                            {cameraState.starting && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs">
                                Launching camera hardware stream...
                              </div>
                            )}
                            {cameraState.error && (
                              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 px-4 text-center text-xs text-red-400">
                                {cameraState.error}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="relative h-full w-full">
                            <img src={visitorForm.snapshotDataUrl} alt="Visitor snapshot preview" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={clearSnapshot}
                              className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900 transition backdrop-blur-xs shadow-md"
                              title="Clear and retake picture"
                            >
                              <RefreshCcw size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        {!snapshotCaptured ? (
                          <button
                            type="button"
                            onClick={captureSnapshot}
                            disabled={!cameraState.ready}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Camera size={18} />
                            Capture Live Validation Photo
                          </button>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <p className="text-xs text-slate-600 leading-relaxed">
                              <strong className="text-slate-800 block font-semibold mb-0.5">Photo Attached Securely</strong>
                              This real-time picture will be shared instantly with the resident upon form transmission.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Input Deck Side Column */}
                  <div className="w-full lg:flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Visitor Credentials</h3>
                      <p className="text-xs text-slate-500">Provide authentic background details for instant verification</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Building2 size={14} className="text-slate-400" /> Target Entry Gate/Door
                        </label>
                        <select
                          value={doorId}
                          onChange={(e) => setDoorId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          required
                        >
                          {doorOptions.length === 0 && <option value="">No access endpoints available</option>}
                          {doorOptions.map((door) => (
                            <option key={door.id} value={door.id}>
                              {getDoorLabel(door, door.id)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <User size={14} className="text-slate-400" /> Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={visitorForm.name}
                          onChange={(e) => setVisitorForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Phone size={14} className="text-slate-400" /> Phone Contact Number
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. +234..."
                          value={visitorForm.phone}
                          onChange={(e) => setVisitorForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" /> Detailed Purpose of Visit
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Courier dropoff / Family member dinner"
                          value={visitorForm.purpose}
                          onChange={(e) => setVisitorForm((prev) => ({ ...prev, purpose: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 shadow-2xs outline-none focus:border-sky-500 focus:bg-white transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={!isFormValid || requestState.sending}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {requestState.sending ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Transmitting Request...
                          </>
                        ) : (
                          <>
                            <SendHorizontal size={16} />
                            Request Instant Gate Clearance
                          </>
                        )}
                      </button>
                      {!isFormValid && (
                        <p className="mt-2 text-center text-[11px] text-slate-400 font-medium">
                          Fill out all fields and take a verification photo to unlock submission
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          ) : (
            requestState.kind === "office" ? (
              requestState.entryMode === "staff" ? (
                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 px-6 py-8 text-white sm:px-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                        Staff attendance
                      </span>
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                        {requestState.staffAction === "clock_out" ? "Clocked out" : "Clocked in"}
                      </span>
                    </div>
                    <div className="mt-5 flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 text-emerald-100">
                        <BadgeCheck size={26} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                          Staff attendance recorded
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                          {visitorForm.name} has been marked as {requestState.staffAction === "clock_out" ? "checked out" : "checked in"} for the office log.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Employee</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{visitorForm.name || "Selected staff"}</p>
                      <p className="mt-1 text-xs text-slate-500">{visitorForm.purpose || "Office team"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{requestState.staffAction === "clock_out" ? "Checked out" : "Checked in"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {requestState.lastLatencyMs ? `Saved in ${requestState.lastLatencyMs}ms.` : "Saved instantly."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">Use the same QR for the next person</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Another staff member can scan and clock in, or a visitor can enter a staff name and send a request.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetOfficeRequestForRetry()}
                        className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                      >
                        Add another person
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 px-6 py-8 text-white sm:px-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                        Office visitor
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        officeStatusCopy?.tone === "success"
                          ? "bg-emerald-400/15 text-emerald-200 border border-emerald-300/20"
                          : officeStatusCopy?.tone === "danger"
                            ? "bg-rose-400/15 text-rose-200 border border-rose-300/20"
                            : "bg-sky-400/15 text-sky-100 border border-sky-300/20"
                      }`}>
                        {officeStatus || "pending"}
                      </span>
                    </div>
                    <div className="mt-5 flex items-start gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                        officeStatusCopy?.tone === "success"
                          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                          : officeStatusCopy?.tone === "danger"
                            ? "border-rose-300/30 bg-rose-400/15 text-rose-100"
                            : "border-sky-300/30 bg-sky-400/15 text-sky-100"
                      }`}>
                        {officeStatusCopy?.tone === "success" ? (
                          <Check size={26} />
                        ) : officeStatusCopy?.tone === "danger" ? (
                          <CheckCircle2 size={26} />
                        ) : (
                          <RefreshCcw size={24} className="animate-spin" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black tracking-tight sm:text-2xl">
                          {officeStatusCopy?.title || "Waiting for reception response"}
                        </h3>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75">
                          {officeStatusCopy?.message || "Your request is in the office queue."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-4">
                      {officeJourney.map((step, index) => {
                        const isDone = step.state === "done";
                        const isActive = step.state === "active";
                        return (
                          <div
                            key={step.key}
                            className={`rounded-2xl border px-3 py-3 shadow-sm backdrop-blur-sm ${
                              isDone
                                ? "border-emerald-300/25 bg-emerald-400/10"
                                : isActive
                                  ? "border-sky-300/25 bg-sky-400/10"
                                  : "border-white/10 bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                                isDone
                                  ? "bg-emerald-400 text-emerald-950"
                                  : isActive
                                    ? "bg-sky-300 text-sky-950"
                                    : "bg-white/10 text-white/70"
                              }`}>
                                {index + 1}
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                                {isDone ? "Complete" : isActive ? "Current" : "Waiting"}
                              </p>
                            </div>
                            <p className="mt-2 text-sm font-bold text-white">
                              {step.label}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-white/70">
                              {step.detail}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {requestState.entryMode === "staff" ? "Attendance ID" : "Request ID"}
                      </p>
                      <p className="mt-1 break-all font-mono text-sm font-medium text-slate-900">{requestState.sessionId || "Pending..."}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor name</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{visitorForm.name || "Selected staff"}</p>
                      <p className="mt-1 text-xs text-slate-500">{visitorForm.staffName || "Named staff"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response</p>
                      <p className="mt-1 text-sm font-semibold capitalize text-slate-900">{officeStatus || "pending"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {officeStatus === "accepted"
                          ? "Reception has matched your request."
                          : officeStatus === "rejected" || officeStatus === "cancelled"
                            ? "The office couldn't route this request."
                            : "This card refreshes automatically."}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
                    {officeStatus === "accepted" ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">Reception matched your request</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Stay nearby. The office may message you here or direct you to the next step once they are ready.
                          </p>
                        </div>
                        <div className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Queue updated
                        </div>
                      </div>
                    ) : officeStatus === "rejected" || officeStatus === "cancelled" ? (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">Try another staff name</p>
                          <p className="mt-1 text-sm text-slate-600">
                            That person isn&apos;t available right now. Choose a different staff name and resend the request.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resetOfficeRequestForRetry()}
                          className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
                        >
                          Choose another staff name
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">Waiting for reception response</p>
                          <p className="mt-1 text-sm text-slate-600">
                            This screen refreshes automatically until reception routes your request.
                          </p>
                        </div>
                        <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                          Stay on this page
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm space-y-4 my-10">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 border border-sky-100 text-sky-600">
                  <Check size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Signaling Sent Out Successfully</h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                    Your request info package has landed on the resident's terminal. Please hold position here - this dashboard will redirect the moment access is approved.
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
                  <div className="flex justify-between"><span>Session ID:</span> <span className="font-mono text-slate-700">{requestState.sessionId || "Pending..."}</span></div>
                  <div className="flex justify-between"><span>Current Status:</span> <span className="font-semibold text-sky-600 capitalize">{requestState.status || "In Queue"}</span></div>
                </div>
              </div>
            )
          )}
        </main>
      )}
    </div>
  );
}
