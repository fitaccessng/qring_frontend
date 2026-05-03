import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, MessageSquare, Phone, RefreshCw, ShieldCheck, Video, XCircle } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { fetchVisitorSnapshotFileUrl } from "../../services/advancedService";
import { decideVisit, getHomeownerVisits } from "../../services/homeownerService";
import { useSocketEvents } from "../../hooks/useSocketEvents";

const channelOptions = [
  { key: "message", label: "Message", icon: MessageSquare },
  { key: "audio", label: "Audio", icon: Phone },
  { key: "video", label: "Video", icon: Video }
];

export default function HomeownerLiveQueuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [snapshotUrls, setSnapshotUrls] = useState({});
  const snapshotUrlsRef = useRef({});
  const snapshotInFlightRef = useRef(new Set());
  const [channelBySession, setChannelBySession] = useState({});
  const [targetBySession, setTargetBySession] = useState({});
  const defaultChannel = useMemo(() => {
    const raw = String(searchParams.get("channel") || "").trim().toLowerCase();
    return ["message", "audio", "video"].includes(raw) ? raw : "";
  }, [searchParams]);

  const loadQueue = useCallback(async ({ background = false } = {}) => {
    if (!background) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await getHomeownerVisits();
      const nextRows = Array.isArray(data) ? data : [];
      setRows(nextRows);
      setChannelBySession((prev) => {
        const next = { ...prev };
        nextRows.forEach((row) => {
          if (!next[row.id] && defaultChannel) {
            next[row.id] = defaultChannel;
            return;
          }
          if (!next[row.id] && row?.preferredCommunicationChannel) {
            next[row.id] = row.preferredCommunicationChannel;
          }
        });
        return next;
      });
      setTargetBySession((prev) => {
        const next = { ...prev };
        nextRows.forEach((row) => {
          if (!next[row.id] && row?.preferredCommunicationTarget) {
            next[row.id] = row.preferredCommunicationTarget;
          }
        });
        return next;
      });
    } catch (requestError) {
      if (!background) {
        setError(requestError?.message || "Unable to load your live queue.");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [defaultChannel]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useSocketEvents(
    useMemo(
      () => ({
        new_visitor_request: () => loadQueue({ background: true }),
        visitor_forwarded: () => loadQueue({ background: true }),
        gate_action_completed: () => loadQueue({ background: true }),
        "dashboard.patch": () => loadQueue({ background: true })
      }),
      [loadQueue]
    )
  );

  useEffect(() => {
    const id = setInterval(() => loadQueue({ background: true }), 15000);
    return () => clearInterval(id);
  }, [loadQueue]);

  useEffect(() => {
    snapshotUrlsRef.current = snapshotUrls;
  }, [snapshotUrls]);

  useEffect(() => {
    return () => {
      Object.values(snapshotUrlsRef.current || {}).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore cleanup failures
        }
      });
    };
  }, []);

  useEffect(() => {
    let active = true;
    rows
      .map((row) => row?.snapshotAuditId)
      .filter(Boolean)
      .slice(0, 16)
      .forEach(async (snapshotId) => {
        if (!active || snapshotUrlsRef.current[snapshotId] || snapshotInFlightRef.current.has(snapshotId)) return;
        snapshotInFlightRef.current.add(snapshotId);
        try {
          const url = await fetchVisitorSnapshotFileUrl(snapshotId);
          if (!active) {
            if (url) URL.revokeObjectURL(url);
            return;
          }
          setSnapshotUrls((prev) => ({ ...prev, [snapshotId]: url }));
        } catch {
          // best-effort preview
        } finally {
          snapshotInFlightRef.current.delete(snapshotId);
        }
      });
    return () => {
      active = false;
    };
  }, [rows]);

  const pendingRows = useMemo(
    () =>
      rows.filter((row) =>
        ["pending", "submitted", "received_by_security", "handled_by_security", "forwarded", "forwarded_to_homeowner"].includes(
          String(row?.sessionStatus || "").toLowerCase()
        )
      ),
    [rows]
  );

  const activeRows = useMemo(
    () =>
      rows.filter((row) =>
        ["approved", "active", "gate_confirmed"].includes(String(row?.sessionStatus || "").toLowerCase())
      ),
    [rows]
  );

  async function handleDecision(row, action) {
    setBusyId(`${row.id}:${action}`);
    setError("");
    try {
      const communicationChannel = channelBySession[row.id] || row.preferredCommunicationChannel || "message";
      const communicationTarget =
        targetBySession[row.id] ||
        row.preferredCommunicationTarget ||
        (row.requestSource === "gateman_assisted" ? "gateman" : "visitor");
      await decideVisit(row.id, action, {
        communicationChannel,
        communicationTarget
      });
      await loadQueue({ background: true });
      if (action === "approve") {
        const channel = communicationChannel;
        if (channel === "message") {
          navigate(`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(row.id)}`);
        } else {
          navigate(`/session/${row.id}/${channel}`);
        }
      }
    } catch (requestError) {
      setError(requestError?.message || "Unable to update visitor request.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell title="Live Visitor Queue">
      <div className="mx-auto w-full max-w-5xl space-y-5 px-1 pb-14">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f172a_0%,#111827_48%,#0f766e_100%)] p-5 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100">Homeowner Control</p>
              <h1 className="mt-2 text-3xl font-black">Approve, reject, and choose the reply channel in one flow.</h1>
              <p className="mt-2 text-sm text-slate-200">
                Self-service QR and gateman-assisted requests land here with live status updates so you can verify while security handles the gate action.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadQueue()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Queue
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Awaiting Decision" value={pendingRows.length} />
            <MetricCard label="Approved / Active" value={activeRows.length} />
            <MetricCard label="Total Today" value={rows.length} />
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <section className="space-y-4">
          <SectionTitle title="Awaiting Decision" count={pendingRows.length} />
          {loading ? (
            <QueuePlaceholder label="Loading live queue..." />
          ) : pendingRows.length === 0 ? (
            <QueuePlaceholder label="No visitors are waiting for your decision right now." />
          ) : (
            pendingRows.map((row) => {
              const source = row.requestSource === "gateman_assisted" ? "Gateman-assisted" : "Visitor QR";
              const creator = row.creatorRole === "security" ? "Gateman created" : "Visitor created";
              const selectedChannel = channelBySession[row.id] || row.preferredCommunicationChannel || "message";
              const selectedTarget =
                targetBySession[row.id] ||
                row.preferredCommunicationTarget ||
                (row.requestSource === "gateman_assisted" ? "gateman" : "visitor");
              return (
                <article key={row.id} className="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[104px_minmax(0,1fr)]">
                    <div className="h-28 w-28 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {row.snapshotAuditId && snapshotUrls[row.snapshotAuditId] ? (
                        <img src={snapshotUrls[row.snapshotAuditId]} alt="Visitor snapshot" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs font-semibold text-slate-500">No photo</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">{row.visitor || "Visitor"}</h2>
                        <Badge tone="sky">{source}</Badge>
                        <Badge tone="slate">{creator}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.purpose || "Visitor request awaiting verification."}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{row.door}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{labelForStatus(row.sessionStatus)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{timeAgo(row.time)}</span>
                        {row.preferredCommunicationChannel ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Saved {row.preferredCommunicationChannel}</span>
                        ) : null}
                        {row.preferredCommunicationTarget ? (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">Saved target {row.preferredCommunicationTarget}</span>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Reply Target</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {["visitor", "gateman"].map((target) => (
                              <button
                                key={target}
                                type="button"
                                onClick={() => setTargetBySession((prev) => ({ ...prev, [row.id]: target }))}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                  selectedTarget === target
                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                    : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                }`}
                              >
                                {target === "visitor" ? "Visitor" : "Gateman"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Communication Channel</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {channelOptions.map((option) => {
                              const Icon = option.icon;
                              const active = selectedChannel === option.key;
                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => setChannelBySession((prev) => ({ ...prev, [row.id]: option.key }))}
                                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                                    active
                                      ? "bg-emerald-600 text-white"
                                      : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            If the network drops, the flow can fall back from video to audio to chat while security keeps the gate action auditable.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(row, "approve")}
                          disabled={busyId === `${row.id}:approve`}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                        >
                          {busyId === `${row.id}:approve` ? <Clock3 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Approve + Open {selectedChannel}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(row, "reject")}
                          disabled={busyId === `${row.id}:reject`}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 disabled:opacity-60"
                        >
                          {busyId === `${row.id}:reject` ? <Clock3 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="space-y-4">
          <SectionTitle title="Approved / Active" count={activeRows.length} />
          {activeRows.length === 0 ? (
            <QueuePlaceholder label="No approved visitors are currently active." />
          ) : (
            activeRows.map((row) => (
              <article key={row.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{row.visitor || "Visitor"}</h3>
                      <Badge tone="emerald">{labelForStatus(row.sessionStatus)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.door}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/homeowner/messages?sessionId=${encodeURIComponent(row.id)}`)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Open Thread
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SectionTitle({ title, count }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{count}</span>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function QueuePlaceholder({ label }) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
      {label}
    </div>
  );
}

function Badge({ tone = "slate", children }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "sky"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>{children}</span>;
}

function labelForStatus(status) {
  return String(status || "pending").replaceAll("_", " ");
}

function timeAgo(value) {
  if (!value) return "Now";
  const stamp = new Date(value).getTime();
  if (!Number.isFinite(stamp)) return "Now";
  const diffMinutes = Math.max(0, Math.round((Date.now() - stamp) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.round(diffHours / 24)} day ago`;
}
