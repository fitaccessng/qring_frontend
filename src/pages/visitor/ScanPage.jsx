import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { apiRequest } from "../../services/apiClient";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import { getVisitorSessionStatus } from "../../services/homeownerService";

const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const MAX_SUBMIT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 700;
const DEVICE_STORAGE_KEY = "qring_visitor_device_id";
let runtimeVisitorDeviceId = "";

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
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
  const visitorDeviceId = useMemo(() => getOrCreateVisitorDeviceId(), []);
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
    purpose: "",
    snapshotDataUrl: "",
  });

  async function stopCamera() {
    const stream = cameraStreamRef.current;
    cameraStreamRef.current = null;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setCameraState((prev) => ({ ...prev, ready: false, starting: false }));
  }

  async function startCamera() {
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

    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / vw);
    const targetW = Math.round(vw * scale);
    const targetH = Math.round(vh * scale);
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
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
  }, [qrId]);

  useEffect(() => {
    if (loading) return;
    if (requestState.sent) return;
    if (!qr) return;
    if (visitorForm.snapshotDataUrl) return;
    if (cameraState.ready || cameraState.starting) return;
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, qr, requestState.sent, visitorForm.snapshotDataUrl]);

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
        setRequestState((prev) => ({ ...prev, status: data.status }));
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
    if (requestState.status !== "approved" && requestState.status !== "active") return;
    navigate(`/session/${requestState.sessionId}/message`, { replace: true });
  }, [navigate, requestState.sessionId, requestState.status]);

  useEffect(() => {
    if (!requestState.sent || !requestState.sessionId) return;
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      reconnection: true,
      reconnectionAttempts: 6,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 7000,
      auth: (cb) => cb({})
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("session.join", { sessionId: requestState.sessionId, displayName: "Visitor" });
    });

    socket.on("session.status", (payload) => {
      if (payload?.sessionId !== requestState.sessionId) return;
      const status = String(payload?.status || "");
      if (!status) return;
      setRequestState((prev) => ({ ...prev, status }));
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [requestState.sent, requestState.sessionId]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!doorId) {
      setError("Please select a door before submitting.");
      return;
    }
    if (!visitorForm.snapshotDataUrl) {
      setError("Please capture a live snapshot before submitting.");
      return;
    }
    if (!visitorForm.name.trim()) {
      setError("Please enter your name before submitting.");
      return;
    }
    if (!visitorForm.purpose.trim()) {
      setError("Please enter a purpose before submitting.");
      return;
    }
    const startedAt = Date.now();
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
          qrId,
          doorId: doorId || undefined,
          name: visitorForm.name.trim(),
          phoneNumber: visitorForm.phone.trim() || undefined,
          purpose: visitorForm.purpose.trim(),
          snapshotBase64: visitorForm.snapshotDataUrl.split(",")[1] || "",
          snapshotMime: "image/jpeg",
          deviceId: visitorDeviceId
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
      setRequestState({
        sending: false,
        retrying: false,
        retryAttempt: 0,
        requestStartedAt: 0,
        lastLatencyMs: latencyMs,
        sent: true,
        sessionId: data?.sessionId ?? "",
        status: data?.status ?? "pending"
      });
      setRequestLatencyMs(latencyMs);
      if (data?.sessionId) {
        navigate(`/session/${data.sessionId}/message`, { replace: true });
      }
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
      setError(submitError.message ?? "Request failed");
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 dark:bg-slate-950 sm:grid sm:place-items-center sm:p-4">
      <article className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/90 sm:p-7">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Qring Visitor Access</h1>
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
          <p className="font-semibold">{qrMeta.label}</p>
          <p className="mt-1 break-all wrap-anywhere font-mono">{qrMeta.value}</p>
        </div>

        {loading ? <p className="mt-5 text-sm">Resolving secure QR route...</p> : null}
        {error ? <p className="mt-5 text-sm text-danger">{error}</p> : null}

        {!loading && qr && !requestState.sent ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              First take a selfie. Then fill your details and submit.
            </p>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Camera Capture</p>
                {visitorForm.snapshotDataUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setVisitorForm((prev) => ({ ...prev, snapshotDataUrl: "" }));
                      setCameraState({ starting: false, ready: false, error: "" });
                      startCamera();
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Retake
                  </button>
                ) : null}
              </div>

              {cameraState.error ? (
                <p className="mt-3 text-xs text-danger">{cameraState.error}</p>
              ) : null}

              {!visitorForm.snapshotDataUrl ? (
                <div className="mt-3">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black/90 dark:border-slate-700">
                    <video ref={videoRef} className="h-64 w-full object-cover" playsInline muted />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={cameraState.starting || cameraState.ready}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {cameraState.ready ? "Camera ready" : cameraState.starting ? "Starting camera..." : "Start camera"}
                    </button>
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      disabled={!cameraState.ready}
                      className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
                    >
                      Capture snapshot
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Required. Make sure your face is clearly visible.
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <img
                    src={visitorForm.snapshotDataUrl}
                    alt="Visitor snapshot preview"
                    className="h-64 w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Preview saved. This will be sent to the homeowner.
                  </p>
                </div>
              )}
            </div>

            {visitorForm.snapshotDataUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visitor Info</p>
                <div className="mt-3 grid gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Name</span>
                    <input
                      type="text"
                      value={visitorForm.name}
                      onChange={(event) => setVisitorForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Phone number (optional)</span>
                    <input
                      type="tel"
                      value={visitorForm.phone}
                      onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="+234..."
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Purpose of visit</span>
                    <textarea
                      value={visitorForm.purpose}
                      onChange={(event) => setVisitorForm((prev) => ({ ...prev, purpose: event.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="e.g. Package delivery"
                      rows={3}
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Door</span>
                    <select
                      value={doorId}
                      onChange={(event) => setDoorId(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      {(doorOptions.length ? doorOptions : (qr.doors ?? []).map((id) => ({ id, name: id }))).map((door) => (
                        <option key={door.id} value={door.id}>
                          {door.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedDoor ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Home: {selectedDoor.homeName || "N/A"} | Homeowner: {selectedDoor.homeownerName || "N/A"}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                Take a selfie to unlock the form fields.
              </div>
            )}
            <button
              type="submit"
              disabled={requestState.sending}
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {requestState.retrying
                ? `Retrying (${requestState.retryAttempt}/${MAX_SUBMIT_RETRIES})...`
                : requestState.sending
                  ? "Submitting..."
                  : "Request Access"}
            </button>
            {requestState.sending || requestState.lastLatencyMs !== null ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Request latency:{" "}
                {requestState.sending
                  ? `${(requestLatencyMs / 1000).toFixed(2)}s (live)`
                  : `${((requestState.lastLatencyMs ?? 0) / 1000).toFixed(2)}s`}
              </p>
            ) : null}
            {requestState.retrying ? (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Connection unstable. Retrying your request automatically...
              </p>
            ) : null}
          </form>
        ) : null}

        {requestState.sent ? (
          <div className="mt-6 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
            <p className="text-sm font-semibold">
              {requestState.status === "approved"
                ? "Request approved"
                : requestState.status === "rejected"
                  ? "Request rejected by homeowner"
                  : "Waiting for homeowner approval"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Timer: {status}</p>
            {requestState.sessionId && (requestState.status === "approved" || requestState.status === "active") ? (
              <p className="mt-3 text-xs text-success">Homeowner is ready. Opening session automatically...</p>
            ) : null}
            {requestState.status === "rejected" ? (
              <p className="mt-3 text-xs font-semibold text-danger">You can retry another request or contact the resident.</p>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
