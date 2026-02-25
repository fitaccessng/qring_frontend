import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../../services/apiClient";
import { getVisitorSessionStatus } from "../../services/homeownerService";

const RETRYABLE_STATUSES = new Set([0, 502, 503, 504]);
const MAX_SUBMIT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 700;

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
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    purpose: ""
  });

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
    const id = setInterval(async () => {
      try {
        const data = await getVisitorSessionStatus(requestState.sessionId);
        if (!active || !data?.status) return;
        setRequestState((prev) => ({ ...prev, status: data.status }));
      } catch {
        // silent poll failures
      }
    }, 3000);
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

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
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
          doorId,
          name: visitorForm.name,
          purpose: visitorForm.purpose
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

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <article className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
        <h1 className="font-heading text-3xl font-bold">Qring Visitor Access</h1>
        <p className="mt-2 text-sm text-slate-500">QR ID: {qrId}</p>

        {loading ? <p className="mt-5 text-sm">Resolving secure QR route...</p> : null}
        {error ? <p className="mt-5 text-sm text-danger">{error}</p> : null}

        {!loading && qr && !requestState.sent ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Select the door and submit your entry request.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Your Name</span>
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
              <span className="mb-1 block font-medium">Purpose of Visit</span>
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
            {selectedDoor ? (
              <p className="text-xs text-slate-500">
                Home: {selectedDoor.homeName || "N/A"} | Homeowner: {selectedDoor.homeownerName || "N/A"}
              </p>
            ) : null}
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
                Network is unstable. Retrying your request automatically...
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
