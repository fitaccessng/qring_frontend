import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera, CheckCircle2, ChevronLeft, RefreshCcw, SendHorizontal, Building2, User, Phone, FileText, Check } from "lucide-react";
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
    sending: false,
    retrying: false,
    retryAttempt: 0,
    requestStartedAt: 0,
    lastLatencyMs: null,
    sent: false,
    sessionId: "",
    status: ""
  });
  const [cameraState, setCameraState] = useState({
    starting: false,
    ready: false,
    error: ""
  });
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    phone: "",
    purpose: "",
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
  const doorOptions = useMemo(() => getDoorList(qr), [qr]);
  const snapshotCaptured = Boolean(visitorForm.snapshotDataUrl);
  const canReacceptConsent = canReacceptConsentFromError(error);

  const qrMeta = useMemo(() => {
    const raw = String(qrId || "").trim();
    const isSecureToken = raw.startsWith("qt1.") || raw.startsWith("qt2.");
    if (isSecureToken) return { label: "Secure Access", value: `Protected Token` };
    if (raw.length <= 28) return { label: "QR ID", value: raw };
    return { label: "QR ID", value: `${raw.slice(0, 12)}...` };
  }, [qrId]);

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
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, 640, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
    setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: dataUrl }));
    void stopCamera();
  }

  function clearSnapshot() {
    setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: "" }));
    void startCamera();
  }

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
    if (!consentAccepted || loading || requestState.sent || visitorForm.snapshotDataUrl) return;
    if (cameraState.ready || cameraState.starting) return;
    void startCamera();
  }, [consentAccepted, loading, qr, requestState.sent, visitorForm.snapshotDataUrl]);

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
    if (!requestState.sent || !requestState.sessionId) return;
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
  }, [requestState.sent, requestState.sessionId]);

  useEffect(() => {
    if (!requestState.sessionId) return;
    if (!isVisitorSessionActive(requestState.status)) return;
    navigate(`/session/${requestState.sessionId}/message`, { replace: true });
  }, [navigate, requestState.sessionId, requestState.status]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId) return;
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
  }, [requestState.sent, requestState.sessionId]);

  async function handleSubmit(event) {
    event.preventDefault();
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
        sending: false,
        retrying: false,
        retryAttempt: 0,
        requestStartedAt: 0,
        lastLatencyMs: latencyMs,
        sent: true,
        sessionId: data?.sessionId ?? "",
        status: normalizeSessionStatus(data?.status ?? "pending")
      });
      setRequestLatencyMs(latencyMs);
    } catch (submitError) {
      setRequestState((prev) => ({ ...prev, sending: false, retrying: false, retryAttempt: 0, requestStartedAt: 0 }));
      setError(getVisitorSubmitErrorMessage(submitError));
    }
  }

  const isFormValid = Boolean(
    visitorForm.name.trim() &&
    visitorForm.phone.trim() &&
    visitorForm.purpose.trim() &&
    visitorForm.snapshotDataUrl &&
    !requestState.sending
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-sky-200">
      {/* Decorative Sky Blue subtle ambient backdrops */}
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
        <main className="relative mx-auto max-w-5xl px-4 py-6 sm:py-8">
          
          {/* Header Bar */}
          <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm">
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Secure Entrypoint</span>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Qring Digital Pass</h1>
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 border border-sky-100">
              {requestState.sent ? "Request Sent" : snapshotCaptured ? "Verification Armed" : "Step 1: Snap Photo"}
            </div>
          </header>

          {/* Actionable Error Alert Box */}
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

          {/* Core Content Loading or Core Framework View */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              <p className="mt-3 text-sm font-medium text-slate-500">Resolving security endpoint profile...</p>
            </div>
          ) : qr && !requestState.sent ? (
            <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-12 items-start">
              
              {/* Left Column: Camera Feed Interaction Deck */}
              <div className="md:col-span-6 lg:col-span-5 space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 px-1">
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

                  {/* Dynamic Video Viewport Window Box */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-900 border border-slate-200 shadow-inner">
                    {!snapshotCaptured ? (
                      <>
                        <video ref={videoRef} className="h-full w-full object-cover scale-x-[-1]" playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 border-[3px] border-dashed border-white/20 pointer-events-none rounded-lg" />
                        {cameraState.starting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white text-xs">
                            Launching camera hardware stream...
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="relative h-full w-full">
                        <img src={visitorForm.snapshotDataUrl} alt="Visitor" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={clearSnapshot}
                          className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900 transition backdrop-blur-xs"
                          title="Clear and retake picture"
                        >
                          <RefreshCcw size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Immediate Functional Camera Call-to-Actions */}
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
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <strong className="text-slate-800 block font-semibold">Photo Attached Securely</strong>
                          This real-time picture will be shared instantly with the resident upon form transmission.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Visitor Form Metadata Profile */}
              <div className="md:col-span-6 lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Visitor Credentials</h3>
                  <p className="text-xs text-slate-500">Provide authentic background details for instant verification</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Dropdown Route Configuration Selector */}
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

                  {/* Name Input field */}
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

                  {/* Phone Line field */}
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

                  {/* Core Visit Intention Context */}
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

                {/* Submit Action Pipeline System */}
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
            </form>
          ) : (
            /* Request Transmission Awaiting Feedback Hub Stage */
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm space-y-4 my-10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 border border-sky-100 text-sky-600">
                <Check size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Signaling Sent Out Successfully</h3>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                  Your request info package has landed on the resident's terminal. Please hold position here—this dashboard will redirect the moment access is approved.
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
                <div className="flex justify-between"><span>Session ID:</span> <span className="font-mono text-slate-700">{requestState.sessionId || "Pending..."}</span></div>
                <div className="flex justify-between"><span>Current Status:</span> <span className="font-semibold text-sky-600 capitalize">{requestState.status || "In Queue"}</span></div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}