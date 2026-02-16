import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SessionModePickerModal from "../../components/SessionModePickerModal";
import { apiRequest } from "../../services/apiClient";
import { getVisitorSessionStatus } from "../../services/homeownerService";

export default function ScanPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qr, setQr] = useState(null);
  const [doorId, setDoorId] = useState("");
  const [requestState, setRequestState] = useState({
    sending: false,
    sent: false,
    sessionId: "",
    status: ""
  });
  const [seconds, setSeconds] = useState(0);
  const [visitorForm, setVisitorForm] = useState({
    name: "",
    purpose: ""
  });
  const [modePickerOpen, setModePickerOpen] = useState(false);

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

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setRequestState((prev) => ({ ...prev, sending: true }));
    try {
        const response = await apiRequest("/visitor/request", {
        method: "POST",
        body: JSON.stringify({
          qrId,
          doorId,
          name: visitorForm.name,
          purpose: visitorForm.purpose
        })
      });
      const data = response?.data ?? response;
      setRequestState({
        sending: false,
        sent: true,
        sessionId: data?.sessionId ?? "",
        status: data?.status ?? "pending"
      });
    } catch (submitError) {
      setRequestState((prev) => ({ ...prev, sending: false }));
      setError(submitError.message ?? "Request failed");
    }
  };

  const doorOptions = qr?.doorOptions ?? [];
  const selectedDoor = doorOptions.find((item) => item.id === doorId) ?? null;

  const status = useMemo(
    () => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds]
  );

  function handleOpenSessionClick() {
    setModePickerOpen(true);
  }

  function handleSelectMode(mode) {
    if (!requestState.sessionId) return;
    setModePickerOpen(false);
    navigate(`/session/${requestState.sessionId}/${mode}`);
  }

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
              {requestState.sending ? "Submitting..." : "Request Access"}
            </button>
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
            {requestState.sessionId && requestState.status === "approved" ? (
              <button
                type="button"
                onClick={handleOpenSessionClick}
                className="mt-4 inline-block rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white"
              >
                Open Session
              </button>
            ) : null}
            {requestState.status === "rejected" ? (
              <p className="mt-3 text-xs font-semibold text-danger">You can retry another request or contact the resident.</p>
            ) : null}
          </div>
        ) : null}
      </article>
      <SessionModePickerModal
        open={modePickerOpen}
        sessionId={requestState.sessionId}
        onClose={() => setModePickerOpen(false)}
        onSelect={handleSelectMode}
      />
    </div>
  );
}
