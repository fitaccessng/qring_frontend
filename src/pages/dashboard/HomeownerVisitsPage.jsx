import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import SessionModePickerModal from "../../components/SessionModePickerModal";
import { decideVisit, endHomeownerSession, getHomeownerVisits } from "../../services/homeownerService";
import { markVisitRequestNotificationsRead } from "../../services/notificationService";

export default function HomeownerVisitsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [endingId, setEndingId] = useState("");
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [sessionForPicker, setSessionForPicker] = useState("");

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHomeownerVisits();
      setRows(data);
    } catch (requestError) {
      setError(requestError.message ?? "Failed to load visits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    const id = setInterval(loadVisits, 5000);
    return () => clearInterval(id);
  }, [loadVisits]);

  async function handleDecision(sessionId, action) {
    setBusyId(sessionId);
    setError("");
    try {
      const updated = await decideVisit(sessionId, action);
      await markVisitRequestNotificationsRead(sessionId);
      setRows((prev) =>
        prev.map((row) =>
          row.id === sessionId
            ? {
                ...row,
                status: updated?.status === "approved" ? "Approved" : "Rejected",
                sessionStatus: updated?.status ?? row.sessionStatus,
                canDecide: false
              }
            : row
        )
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to update visit");
    } finally {
      setBusyId("");
    }
  }

  async function handleEndSession(sessionId) {
    setEndingId(sessionId);
    setError("");
    try {
      await endHomeownerSession(sessionId);
      setRows((prev) =>
        prev.map((row) =>
          row.id === sessionId
            ? {
                ...row,
                status: "Completed",
                sessionStatus: "closed",
                canDecide: false
              }
            : row
        )
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to end session");
    } finally {
      setEndingId("");
    }
  }

  function handleOpenSession(sessionId) {
    setSessionForPicker(sessionId);
    setModePickerOpen(true);
  }

  function handleSelectMode(mode) {
    if (!sessionForPicker) return;
    setModePickerOpen(false);
    navigate(`/session/${sessionForPicker}/${mode}`);
  }

  return (
    <AppShell title="Visits">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Visitor Log</h2>
          <button
            type="button"
            onClick={loadVisits}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="py-2 text-sm text-slate-500">Loading visits...</p>
        ) : rows.length === 0 ? (
          <p className="py-2 text-sm text-slate-500">No visit records yet.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{row.visitor}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.door}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatTime(row.time)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.canDecide ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDecision(row.id, "approve")}
                          className="rounded-lg bg-success px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleDecision(row.id, "reject")}
                          className="rounded-lg bg-danger px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : row.sessionStatus === "approved" || row.sessionStatus === "active" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenSession(row.id)}
                          className="rounded-lg bg-brand-500 px-3 py-1.5 text-[11px] font-semibold text-white"
                        >
                          Open Session
                        </button>
                        <button
                          type="button"
                          disabled={endingId === row.id}
                          onClick={() => handleEndSession(row.id)}
                          className="rounded-lg bg-danger px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          {endingId === row.id ? "Ending..." : "End Session"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                    <th className="py-3 font-semibold">Visitor</th>
                    <th className="py-3 font-semibold">Door</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Time</th>
                    <th className="py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-medium">{row.visitor}</td>
                      <td className="py-3">{row.door}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{formatTime(row.time)}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.canDecide ? (
                            <>
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => handleDecision(row.id, "approve")}
                                className="rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => handleDecision(row.id, "reject")}
                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : row.sessionStatus === "approved" || row.sessionStatus === "active" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenSession(row.id)}
                                className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                Open Session
                              </button>
                              <button
                                type="button"
                                disabled={endingId === row.id}
                                onClick={() => handleEndSession(row.id)}
                                className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {endingId === row.id ? "Ending..." : "End Session"}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">No action</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <SessionModePickerModal
        open={modePickerOpen}
        sessionId={sessionForPicker}
        onClose={() => setModePickerOpen(false)}
        onSelect={handleSelectMode}
      />
    </AppShell>
  );
}

function statusClass(status) {
  if (status === "Approved" || status === "Completed" || status === "Active") {
    return "bg-success/15 text-success";
  }

  if (status === "Pending") {
    return "bg-warning/20 text-warning";
  }

  if (status === "Rejected") {
    return "bg-danger/15 text-danger";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

