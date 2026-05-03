import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Flame, ShieldAlert, Siren, UserX } from "lucide-react";
import { actOnSafetyAlert, getSafetyDashboard } from "../../services/safetyService";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { showError, showSuccess } from "../../utils/flash";

const ICON_BY_TYPE = {
  panic: Siren,
  fire: Flame,
  break_in: ShieldAlert
};

const COLOR_BY_STATUS = {
  dispatched: "bg-rose-100 text-rose-700",
  acknowledged: "bg-amber-100 text-amber-700",
  escalated: "bg-orange-100 text-orange-700",
  resolved: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600"
};

export default function SafetyOperationsConsole({ roleLabel = "Security Operations" }) {
  const [dashboard, setDashboard] = useState({ context: null, metrics: {}, alerts: [], reports: [], watchlist: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  async function load({ background = false } = {}) {
    if (!background) {
      setLoading(true);
      setError("");
    }
    try {
      setDashboard(await getSafetyDashboard());
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to load safety console.");
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useSocketEvents(
    useMemo(
      () => ({
        "safety.alert.created": () => load({ background: true }),
        "safety.alert.updated": () => load({ background: true }),
        "safety.report.created": () => load({ background: true }),
        "safety.watchlist.updated": () => load({ background: true })
      }),
      []
    )
  );

  async function handleAction(alertId, action) {
    const key = `${alertId}:${action}`;
    setBusyKey(key);
    try {
      await actOnSafetyAlert(alertId, action);
      showSuccess(
        action === "acknowledge"
          ? "Alert acknowledged."
          : action === "escalate"
            ? "Alert escalated."
            : "Alert resolved."
      );
      await load({ background: true });
    } catch (requestError) {
      setError(requestError?.message ?? "Action failed.");
    } finally {
      setBusyKey("");
    }
  }

  const activeAlerts = useMemo(
    () => (dashboard?.alerts || []).filter((item) => !["resolved", "cancelled"].includes(item.status)),
    [dashboard?.alerts]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Active Alerts" value={dashboard?.metrics?.activeAlerts ?? 0} tone="rose" />
        <MetricCard label="Critical" value={dashboard?.metrics?.criticalAlerts ?? 0} tone="amber" />
        <MetricCard label="Pending Reports" value={dashboard?.metrics?.pendingReports ?? 0} tone="sky" />
        <MetricCard label="Watchlist" value={dashboard?.metrics?.watchlistCount ?? 0} tone="slate" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">{roleLabel}</p>
              <h2 className="text-xl font-semibold text-slate-900">
                Live Emergency Feed
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {dashboard?.context?.estateName || "Estate"} incidents, delivery traces, and response actions.
              </p>
            </div>
            {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
          </div>
          <div className="mt-4 space-y-3">
            {activeAlerts.map((alert) => {
              const Icon = ICON_BY_TYPE[alert.alertType] || AlertTriangle;
              return (
                <article key={alert.id} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-rose-600 p-2 text-white">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {labelForType(alert.alertType)} at {alert.unitLabel || "Unknown unit"}
                          </h3>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${COLOR_BY_STATUS[alert.status] || COLOR_BY_STATUS.dispatched}`}>
                            {alert.status}
                          </span>
                          <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                            {alert.priority}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Triggered {formatTime(alert.triggeredAt)}
                          {alert.silentTrigger ? " in silent mode." : "."}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Last location: {renderLocation(alert.location)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          Delivery trail: {(alert.events || []).slice(-3).map((event) => `${event.channel}:${event.deliveryStatus}`).join(" • ") || "Awaiting"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        busy={busyKey === `${alert.id}:acknowledge`}
                        label="Acknowledge"
                        onClick={() => handleAction(alert.id, "acknowledge")}
                      />
                      <ActionButton
                        busy={busyKey === `${alert.id}:escalate`}
                        label="Escalate"
                        variant="warning"
                        onClick={() => handleAction(alert.id, "escalate")}
                      />
                      <ActionButton
                        busy={busyKey === `${alert.id}:resolve`}
                        label="Resolve"
                        variant="success"
                        onClick={() => handleAction(alert.id, "resolve")}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
            {!loading && activeAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No active emergency incidents right now.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserX className="text-slate-700" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">Flagged Visitors</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(dashboard?.watchlist || []).slice(0, 6).map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{entry.displayName}</h3>
                      <p className="text-xs text-slate-500">{entry.displayPhone || "Phone not captured"}</p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white">
                      {entry.riskLevel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {entry.reportCount} reports • Last seen {formatTime(entry.lastReportedAt)}
                  </p>
                </article>
              ))}
              {!(dashboard?.watchlist || []).length ? (
                <p className="text-sm text-slate-500">No flagged individuals in this estate yet.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={18} />
              <h2 className="text-lg font-semibold text-slate-900">Response Notes</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>Primary path: realtime socket updates to estate dashboard and guard devices in under two seconds where connectivity allows.</p>
              <p>Fallback path: queued SMS escalation events for estates that enable fallback delivery.</p>
              <p>Liability wording: QRing facilitates emergency alerting and coordination. It does not guarantee police, fire, or medical response.</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }) {
  const toneMap = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return (
    <article className={`rounded-3xl border p-4 shadow-sm ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </article>
  );
}

function ActionButton({ busy, label, variant = "default", onClick }) {
  const classes = {
    default: "bg-slate-900 text-white",
    warning: "bg-amber-500 text-slate-950",
    success: "bg-emerald-600 text-white"
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${classes[variant] || classes.default}`}
    >
      {busy ? "Working..." : label}
    </button>
  );
}

function labelForType(type) {
  if (type === "break_in") return "Break-in";
  if (type === "fire") return "Fire";
  return "Panic";
}

function renderLocation(location) {
  if (location?.address) return location.address;
  if (location?.lat && location?.lng) return `${location.lat}, ${location.lng}`;
  return "No location captured";
}

function formatTime(value) {
  if (!value) return "just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "just now" : date.toLocaleString();
}
