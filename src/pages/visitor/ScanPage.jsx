import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import VisitorConsentModal from "../../components/VisitorConsentModal";
import { apiRequest } from "../../services/apiClient";
import { env } from "../../config/env";
import { RealtimeEvent } from "../../services/realtimeEvents";
import { createRealtimeSocket, releaseRealtimeSocket } from "../../services/socketClient";
import { getVisitorSessionStatus } from "../../services/homeownerService";
import { storeVisitorSessionToken, getVisitorSessionToken } from "../../services/visitorSessionToken";
import { buildVisitorConsentPayload, getVisitorConsent, hasVisitorConsent, recordVisitorConsent } from "../../services/visitorConsent";

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
    // Fall back to pseudo-random ID.
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
    normalized.includes("accept the privacy notice again") ||
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

export default function ScanPage() {
  const [consentState, setConsentState] = useState(() => getVisitorConsent());
  const consentAccepted = Boolean(consentState?.consentAccepted);
  const [showConsent, setShowConsent] = useState(() => !hasVisitorConsent());
  const { qrId } = useParams();
  const navigate = useNavigate();
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
  const [seconds, setSeconds] = useState(0);
  const [requestLatencyMs, setRequestLatencyMs] = useState(0);
  const visitorDeviceId = useMemo(() => (consentAccepted ? getOrCreateVisitorDeviceId() : ""), [consentAccepted]);
  const socketRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraState, setCameraState] = useState({
    starting: false,
    ready: false,
    error: "",
  });
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    phone: "",
    purpose: "visitor",
    deliveryOption: "allow_entry",
    snapshotDataUrl: "",
  });

  useEffect(() => {
    if (!qrId) return;
    try {
      sessionStorage.setItem("qring_visitor_last_qr_id", String(qrId).trim());
    } catch {
      // ignore storage failures
    }
  }, [qrId]);

  async function stopCamera() {
    const stream = cameraStreamRef.current;
    cameraStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
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
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState({ starting: false, ready: true, error: "" });
    } catch (err) {
      setCameraState({
        starting: false,
        ready: false,
        error: err?.message || "Camera access was blocked. Please allow camera permission and try again.",
      });
    }
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (!vw || !vh) {
      setCameraState((prev) => ({ ...prev, error: "Camera not ready yet. Try again in a second." }));
      return;
    }

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / vw);
    const targetW = Math.round(vw * scale);
    const targetH = Math.round(vh * scale);
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.68);
    setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: dataUrl }));
    stopCamera();
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setDoorId(data?.doors?.[0] ?? "");
      } catch (fetchError) {
        if (!mounted) return;
        setError(fetchError.message ?? "QR could not be resolved");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [consentAccepted, qrId]);

  useEffect(() => {
    if (!consentAccepted || loading) return;
    if (requestState.sent) return;
    if (!qr) return;
    if (visitorForm.snapshotDataUrl) return;
    if (cameraState.ready || cameraState.starting) return;
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentAccepted, loading, qr, requestState.sent, visitorForm.snapshotDataUrl]);

  useEffect(() => {
    if (!requestState.sent) return;
    const id = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [requestState.sent]);

  useEffect(() => {
    if (!requestState.sending || !requestState.requestStartedAt) return;
    const tick = () => setRequestLatencyMs(Date.now() - requestState.requestStartedAt);
    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [requestState.sending, requestState.requestStartedAt]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId) return;
    let active = true;
    const poll = async () => {
      try {
        const data = await getVisitorSessionStatus(requestState.sessionId);
        if (!active || !data?.status) return;
        const nextStatus = normalizeSessionStatus(data.status);
        // eslint-disable-next-line no-console
        console.info("qring.visitor.session.poll", { sessionId: requestState.sessionId, status: nextStatus });
        setRequestState((prev) => ({ ...prev, status: nextStatus }));
      } catch {
        // silent poll failures
      }
    };
    poll();
    const id = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [requestState.sent, requestState.sessionId]);

  useEffect(() => {
    if (!requestState.sessionId) return;
    if (!isVisitorSessionActive(requestState.status)) return;
    // eslint-disable-next-line no-console
    console.info("qring.visitor.session.navigate", {
      sessionId: requestState.sessionId,
      status: requestState.status
    });
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
      const status = normalizeSessionStatus(payload?.status || payload?.sessionStatus);
      if (!status) return;
      // eslint-disable-next-line no-console
      console.info("qring.visitor.session.status", { sessionId: requestState.sessionId, status });
      setRequestState((prev) => ({ ...prev, status }));
    };

    const handleSessionActivated = (payload) => {
      const incomingSessionId = String(payload?.sessionId || payload?.data?.id || "").trim();
      if (incomingSessionId !== requestState.sessionId) return;
      // eslint-disable-next-line no-console
      console.info("qring.visitor.session.activated", { sessionId: requestState.sessionId });
      setRequestState((prev) => ({ ...prev, status: "approved" }));
    };

    const handleSessionSnapshot = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (incomingSessionId !== requestState.sessionId) return;
      const status = normalizeSessionStatus(payload?.status);
      if (!status) return;
      setRequestState((prev) => ({ ...prev, status }));
    };

    socket.on("connect", handleConnect);
    socket.on(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
    socket.on(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
    socket.on(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);

    return () => {
      socket.off("connect", handleConnect);
      socket.off(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
      socket.off(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
      socket.off(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);
      socketRef.current = null;
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
        autoConnect: true,
        reconnection: true,
        withCredentials: true
      });
    };
  }, [requestState.sent, requestState.sessionId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!consentAccepted) {
      setError("Please accept the privacy notice before continuing.");
      return;
    }
    if (!doorId) {
      setError("Please select a door before submitting.");
      return;
    }
    if (!visitorForm.snapshotDataUrl) {
      setError("Please capture a live snapshot before submitting.");
      return;
    }
    if (!visitorForm.purpose.trim()) {
      setError("Please choose a visit purpose before submitting.");
      return;
    }
    const normalizedPurpose = visitorForm.purpose.trim().toLowerCase();
    const visitorType = normalizedPurpose === "delivery" ? "delivery" : "guest";
    const startedAt = Date.now();
    const requestId = createVisitorRequestId();
    const { snapshotBase64, snapshotMime } = getSnapshotPayloadParts(visitorForm.snapshotDataUrl);
    // eslint-disable-next-line no-console
    console.info("qring.snapshot.submit_payload", {
      hasSnapshotBase64: Boolean(snapshotBase64),
      snapshotMime,
      requestId,
      qrId,
      doorId
    });
    setRequestLatencyMs(0);
    setRequestState((prev) => ({
      ...prev,
      sending: true,
      retrying: false,
      retryAttempt: 0,
      requestStartedAt: startedAt,
      lastLatencyMs: null
    }));
    try {
      const response = await submitVisitorRequestWithRetry(
        {
          requestId,
          qrId,
          doorId: doorId || undefined,
          name: visitorForm.name.trim() || undefined,
          phoneNumber: visitorForm.phone.trim() || undefined,
          purpose: normalizedPurpose,
          visitorType,
          deliveryOption: visitorType === "delivery" ? visitorForm.deliveryOption : undefined,
          snapshotBase64,
          snapshotMime,
          deviceId: visitorDeviceId,
          ...(buildVisitorConsentPayload(consentState) || {})
        },
        ({ attempt }) => {
          setRequestState((prev) => ({
            ...prev,
            sending: true,
            retrying: true,
            retryAttempt: attempt
          }));
        }
      );
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
      const latencyMs = Date.now() - startedAt;
      setRequestState((prev) => ({
        ...prev,
        sending: false,
        retrying: false,
        retryAttempt: 0,
        requestStartedAt: 0,
        lastLatencyMs: latencyMs
      }));
      setRequestLatencyMs(latencyMs);
      setError(getVisitorSubmitErrorMessage(submitError));
    }
  };

  const doorOptions = qr?.doorOptions ?? [];
  const selectedDoor = doorOptions.find((item) => item.id === doorId) ?? null;

  const status = useMemo(
    () => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds]
  );
  const qrMeta = useMemo(() => {
    const raw = String(qrId || "").trim();
    const isSecureToken = raw.startsWith("qt1.") || raw.startsWith("qt2.");
    if (isSecureToken) {
      return {
        label: "Secure Access Token",
        value: `Protected token (${raw.length} chars)`,
        reveal: false,
      };
    }
    if (raw.length <= 28) {
      return { label: "QR ID", value: raw, reveal: true };
    }
    return {
      label: "QR ID",
      value: `${raw.slice(0, 12)}...${raw.slice(-10)}`,
      reveal: true,
    };
  }, [qrId]);
  const snapshotCaptured = Boolean(visitorForm.snapshotDataUrl);
  const canReacceptConsent = canReacceptConsentFromError(error);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-7rem] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-28 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(180deg,rgba(7,17,31,0.88),rgba(7,17,31,1))]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(225deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <VisitorConsentModal
        open={showConsent}
        onAccept={() => {
          const nextConsent = recordVisitorConsent({ persist: false });
          setConsentState(nextConsent);
          setShowConsent(false);
        }}
      />

      {showConsent ? null : (
        <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
          <header className="mb-4 flex items-center justify-between gap-3 rounded-[1.75rem] border border-white/10 bg-white/6 px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-200/80">Visitor capture</p>
              <h1 className="mt-1 truncate font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Qring Camera Pass
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                {requestState.sent ? "Sent" : snapshotCaptured ? "Ready" : "Capture"}
              </div>
            </div>
          </header>

          {error ? (
            <div className="mb-4 rounded-3xl border border-rose-400/25 bg-rose-500/10 px-4 py-4 text-sm text-rose-100 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.26em] text-rose-200/70">Submission error</p>
                  <p className="mt-1 leading-relaxed">{error}</p>
                </div>
                {canReacceptConsent ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setShowConsent(true);
                    }}
                    className="shrink-0 rounded-full border border-rose-200/30 bg-white/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15"
                  >
                    Re-accept
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && qr && !requestState.sent ? (
            <form onSubmit={onSubmit} className="grid flex-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[2rem] border border-white/10 bg-white/8 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                    Live photo required
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">
                    {qrMeta.label}: {qrMeta.value}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#07111f] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Camera deck</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {snapshotCaptured ? "Snapshot locked" : cameraState.ready ? "Frame ready" : cameraState.starting ? "Opening camera..." : "Waiting for camera"}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
                          {cameraState.error ? "Needs attention" : cameraState.ready ? "Live" : "Idle"}
                        </div>
                      </div>

                      {cameraState.error ? (
                        <div className="border-b border-white/10 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                          {cameraState.error}
                        </div>
                      ) : null}

                      {!snapshotCaptured ? (
                        <div className="relative">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_40%)]" />
                          <div className="aspect-[4/3] overflow-hidden">
                            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                          </div>
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute inset-0 border-2 border-dashed border-white/10" />
                          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">Tip</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-200">
                              Center your face, hold steady, and capture one clean frame. The homeowner will see this exact image.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={visitorForm.snapshotDataUrl}
                            alt="Visitor snapshot preview"
                            className="aspect-[4/3] w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                          <div className="absolute left-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100">
                            Snapshot captured
                          </div>
                          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
                            <div className="flex items-start gap-3">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                              <div>
                                <p className="text-sm font-semibold text-white">Image locked in</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-200">
                                  This exact capture will be sent with your visitor details.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        disabled={cameraState.starting || cameraState.ready || snapshotCaptured}
                        className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cameraState.ready ? "Camera ready" : cameraState.starting ? "Starting camera..." : "Start camera"}
                      </button>
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        disabled={!cameraState.ready || snapshotCaptured}
                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {snapshotCaptured ? "Retake to replace" : "Capture snapshot"}
                      </button>
                    </div>
                  </div>

                  <aside className="rounded-[1.7rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Request summary</p>
                        <p className="mt-1 text-sm font-semibold text-white">What the homeowner sees</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">
                        {selectedDoor ? "Door selected" : "No door"}
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">QR route</p>
                        <p className="mt-2 break-all text-sm text-slate-100">{qrMeta.value}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">Door</p>
                        <select
                          value={doorId}
                          onChange={(event) => setDoorId(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none"
                          required
                        >
                          {(doorOptions.length ? doorOptions : (qr.doors ?? []).map((id) => ({ id, name: id }))).map((door) => (
                            <option key={door.id} value={door.id}>
                              {door.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-3">
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Name</span>
                          <input
                            type="text"
                            value={visitorForm.name}
                            onChange={(event) => setVisitorForm((prev) => ({ ...prev, name: event.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                            placeholder="Optional"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Phone</span>
                          <input
                            type="tel"
                            value={visitorForm.phone}
                            onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone: event.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                            placeholder="Optional"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Purpose</span>
                          <select
                            value={visitorForm.purpose}
                            onChange={(event) => setVisitorForm((prev) => ({ ...prev, purpose: event.target.value }))}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                            required
                          >
                            <option value="visitor">Visitor</option>
                            <option value="delivery">Delivery</option>
                            <option value="guest">Guest</option>
                          </select>
                        </label>
                        {visitorForm.purpose === "delivery" ? (
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Delivery instruction</span>
                            <select
                              value={visitorForm.deliveryOption}
                              onChange={(event) => setVisitorForm((prev) => ({ ...prev, deliveryOption: event.target.value }))}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                            >
                              <option value="allow_entry">Request entry</option>
                              <option value="drop_at_gate">Drop at gate</option>
                            </select>
                          </label>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-cyan-400/10 px-4 py-3 text-xs leading-relaxed text-cyan-50">
                        The request will include your live snapshot, visitor details, and the exact door selected above.
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-3 text-xs text-slate-200">
                  {requestState.sending ? (
                    <span>Submitting your request now. If the network blinks, we retry automatically.</span>
                  ) : snapshotCaptured ? (
                    <span>Snapshot captured and ready. Review the details on the right, then submit.</span>
                  ) : (
                    <span>Capture a clear selfie to unlock the request.</span>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/8 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Submit</p>
                    <p className="mt-1 text-sm text-slate-100">
                      {requestState.retrying
                        ? `Retrying ${requestState.retryAttempt}/${MAX_SUBMIT_RETRIES}`
                        : requestState.sending
                          ? "Sending visitor request..."
                          : "Ready to send to the homeowner"}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={!snapshotCaptured || requestState.sending || !doorId}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-white to-cyan-100 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {requestState.retrying
                      ? `Retrying (${requestState.retryAttempt}/${MAX_SUBMIT_RETRIES})...`
                      : requestState.sending
                        ? "Submitting..."
                        : "Send visitor pass"}
                  </button>
                </div>

                {requestState.sending || requestState.lastLatencyMs !== null ? (
                  <p className="mt-3 text-xs text-slate-400">
                    Request latency:{" "}
                    {requestState.sending
                      ? `${(requestLatencyMs / 1000).toFixed(2)}s live`
                      : `${((requestState.lastLatencyMs ?? 0) / 1000).toFixed(2)}s`}
                  </p>
                ) : null}
                {requestState.retrying ? (
                  <p className="mt-2 text-xs text-amber-300">
                    Connection unstable. Retrying automatically.
                  </p>
                ) : null}
              </section>
            </form>
          ) : null}

          {requestState.sent ? (
            <section className="grid flex-1 place-items-center">
              <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/8 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/75">Request submitted</p>
                    <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
                      {isVisitorSessionActive(requestState.status)
                        ? "Homeowner approved your visit"
                        : requestState.status === "rejected"
                          ? "Your request was declined"
                          : "We sent your request to the homeowner"}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                      {isVisitorSessionActive(requestState.status)
                        ? "We’re opening the session automatically now."
                        : "Stay close. The homeowner can approve, reject, or reply with instructions while your request stays active."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-semibold text-white">{requestState.status || "pending"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Timer</p>
                    <p className="mt-1 text-sm font-semibold text-white">{status}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Session</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{requestState.sessionId || "Pending"}</p>
                  </div>
                </div>

                {requestState.status === "rejected" ? (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-950"
                    >
                      Start new request
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(requestState.sessionId)}`)}
                      className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Open message thread
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </main>
      )}
    </div>
  );
}
