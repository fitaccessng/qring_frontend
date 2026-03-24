import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Flame,
  ShieldAlert,
  Siren,
  Vibrate,
  WifiOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { getHomeownerContext, getHomeownerVisits } from "../../services/homeownerService";
import { getHomeownerSettings } from "../../services/homeownerSettingsService";
import { cancelSafetyAlert, getSafetyDashboard, submitVisitorReport, triggerSafetyAlert } from "../../services/safetyService";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { showError, showSuccess } from "../../utils/flash";

const ALERT_TYPES = [
  {
    key: "panic",
    label: "Panic",
    helper: "Threat or kidnapping risk",
    accent: "from-rose-500 to-red-600",
    chip: "bg-rose-100 text-rose-700",
    ring: "ring-rose-200",
    icon: Siren
  },
  {
    key: "fire",
    label: "Fire",
    helper: "Smoke or electrical hazard",
    accent: "from-orange-400 to-orange-600",
    chip: "bg-orange-100 text-orange-700",
    ring: "ring-orange-200",
    icon: Flame
  },
  {
    key: "break_in",
    label: "Break-in",
    helper: "Forced entry or theft",
    accent: "from-amber-400 to-amber-600",
    chip: "bg-amber-100 text-amber-700",
    ring: "ring-amber-200",
    icon: ShieldAlert
  }
];

const HOLD_MS = 3000;

export default function HomeownerSafetyPage() {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [dashboard, setDashboard] = useState({ context: null, alerts: [], watchlist: [], reports: [] });
  const [homeownerContext, setHomeownerContext] = useState({
    managedByEstate: false,
    estateId: null,
    estateName: null
  });
  const [settings, setSettings] = useState({ knownContacts: [], smsFallbackEnabled: false });
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [silentMode, setSilentMode] = useState(true);
  const [holdingKey, setHoldingKey] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const [busyKey, setBusyKey] = useState("");
  const [reportForm, setReportForm] = useState({
    visitorSessionId: "",
    reportedName: "",
    reportedPhone: "",
    reason: "",
    notes: "",
    severity: "medium"
  });

  async function load({ background = false } = {}) {
    if (!background) {
      setLoading(true);
      setError("");
    }
    try {
      const [visitRows, contextData, settingsData] = await Promise.all([
        getHomeownerVisits(),
        getHomeownerContext(),
        getHomeownerSettings()
      ]);
      const nextContext = contextData || { managedByEstate: false, estateId: null, estateName: null };
      setVisits(visitRows || []);
      setHomeownerContext(nextContext);
      setSettings({
        knownContacts: Array.isArray(settingsData?.knownContacts) ? settingsData.knownContacts : [],
        smsFallbackEnabled: Boolean(settingsData?.smsFallbackEnabled)
      });

      if (nextContext?.managedByEstate) {
        const safetyData = await getSafetyDashboard();
        setDashboard(safetyData);
      } else {
        setDashboard({ context: null, alerts: [], watchlist: [], reports: [] });
      }
    } catch (requestError) {
      const message = requestError?.message ?? "Unable to load safety center.";
      if (/not linked to an estate/i.test(message)) {
        setDashboard({ context: null, alerts: [], watchlist: [], reports: [] });
        return;
      }
      setError(message);
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => window.clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useSocketEvents(
    useMemo(
      () => ({
        "safety.alert.created": () => load({ background: true }),
        "safety.alert.updated": () => load({ background: true }),
        "safety.watchlist.updated": () => load({ background: true })
      }),
      []
    )
  );

  const managedByEstate = Boolean(homeownerContext?.managedByEstate);
  const activeAlert = useMemo(
    () => (dashboard?.alerts || []).find((item) => !["resolved", "cancelled"].includes(item.status)),
    [dashboard?.alerts]
  );
  const routeDescription = managedByEstate
    ? {
        badge: "Estate homeowner",
        title: homeownerContext?.estateName || "Estate response flow",
        note: "Your alert goes to estate security first.",
        steps: [
          "Estate security dashboard (PRIMARY)",
          "Guards devices",
          "Estate admin",
          "Then escalates to: Emergency contacts, External services"
        ]
      }
    : {
        badge: "Independent homeowner",
        title: "Personal emergency flow",
        note: "Your alert goes to personal contacts first.",
        steps: [
          "Sends to: Personal emergency contacts",
          "SMS fallback is used heavily",
          "No estate dashboard involved"
        ]
      };

  function stopHold() {
    window.clearInterval(timerRef.current);
    timerRef.current = null;
    setHoldingKey("");
    setHoldProgress(0);
  }

  function startHold(alertType) {
    if (busyKey || activeAlert) return;
    stopHold();
    setHoldingKey(alertType);
    setHoldProgress(0);
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / HOLD_MS);
      setHoldProgress(progress);
      if (progress >= 1) {
        stopHold();
        handleTrigger(alertType);
      }
    }, 60);
  }

  async function handleTrigger(alertType) {
    if (!managedByEstate) {
      if (!settings.knownContacts.length) {
        showError("Add your personal emergency contacts first.");
        navigate("/dashboard/homeowner/emergency-contacts");
        return;
      }
      showError("Independent homeowner SMS/contact dispatch is the next backend step. Your contacts setup is saved.");
      navigate("/dashboard/homeowner/emergency-contacts");
      return;
    }
    setBusyKey(alertType);
    setError("");
    try {
      try {
        navigator.vibrate?.([100, 60, 100]);
      } catch {
        // Best effort.
      }
      const location = await readLocation();
      await triggerSafetyAlert({
        alertType,
        triggerMode: "hold",
        silentTrigger: silentMode,
        cancelWindowSeconds: 8,
        offlineQueued: typeof navigator !== "undefined" ? !navigator.onLine : false,
        location
      });
      showSuccess(silentMode ? "Silent alert sent." : "Emergency alert sent.");
      await load({ background: true });
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to send alert.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleCancel() {
    if (!activeAlert?.id) return;
    setBusyKey(`cancel:${activeAlert.id}`);
    try {
      await cancelSafetyAlert(activeAlert.id, "Resident cancelled during grace window");
      showSuccess("Alert cancelled.");
      await load({ background: true });
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to cancel alert.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleSubmitVisitorReport(event) {
    event.preventDefault();
    setBusyKey("report");
    try {
      await submitVisitorReport(reportForm);
      showSuccess("Visitor report submitted.");
      setReportForm({
        visitorSessionId: "",
        reportedName: "",
        reportedPhone: "",
        reason: "",
        notes: "",
        severity: "medium"
      });
      await load({ background: true });
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to submit visitor report.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <AppShell title="Safety">
      <div className="mx-auto max-w-md space-y-4 px-1 pb-28">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#fff7ed_0%,#fff1f2_44%,#ffffff_100%)] shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
          <div className="px-5 pb-5 pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-600">Safety Center</p>
                <h1 className="mt-2 text-[2rem] font-black leading-none tracking-tight text-slate-950">
                  Help fast.
                </h1>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">
                  Hold for 3 seconds to send an emergency alert.
                </p>
              </div>
              <label className="flex min-w-[112px] gap-2 rounded-[1.3rem] bg-white px-3 py-3 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                <span className="mb-2 inline-flex items-center gap-2 text-slate-900">
                  <Vibrate size={14} className="text-rose-600" />
                  Silent
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-rose-600"
                  checked={silentMode}
                  onChange={(event) => setSilentMode(event.target.checked)}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-[1.3rem] bg-white/90 px-3 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
              {typeof navigator !== "undefined" && !navigator.onLine ? (
                <WifiOff size={16} className="text-amber-600" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-600" />
              )}
              <span>
                {typeof navigator !== "undefined" && !navigator.onLine
                  ? "Offline mode: alert will use queued fallback where available."
                  : "Online: fastest realtime delivery is available."}
              </span>
            </div>

            <div className="mt-4 rounded-[1.5rem] bg-slate-950 px-4 py-4 text-white shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200">
                    {routeDescription.badge}
                  </p>
                  <h2 style={{ fontWeight: 'bold', color: '#ffffff' }} className="mt-1  font-bold">{routeDescription.title}</h2>
                  <p className="mt-1 text-sm text-slate-300">{routeDescription.note}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/homeowner/emergency-contacts")}
                  className="rounded-full bg-white/10 p-2 transition hover:bg-white/15"
                  aria-label="Open emergency contacts"
                >
                  <ChevronRight size={16} className="text-white" />
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {routeDescription.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-[1rem] bg-white/5 px-3 py-2.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-slate-950">
                      {index + 1}
                    </span>
                    <span className="text-sm text-slate-100">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {ALERT_TYPES.map((item) => {
            const Icon = item.icon;
            const isHolding = holdingKey === item.key;
            const isBusy = busyKey === item.key;
            const progress = isHolding ? holdProgress : 0;
            return (
              <button
                key={item.key}
                type="button"
                onMouseDown={() => startHold(item.key)}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={() => startHold(item.key)}
                onTouchEnd={stopHold}
                onTouchCancel={stopHold}
                disabled={Boolean(activeAlert) || Boolean(isBusy)}
                className={`relative w-full overflow-hidden rounded-[1.8rem] bg-white px-4 py-4 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${item.accent} opacity-12 transition-all duration-75`}
                  style={{ width: `${Math.max(progress * 100, 16)}%` }}
                />
                <div className="relative flex items-center gap-4">
                  <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-[1.35rem] bg-gradient-to-br ${item.accent} text-white shadow-lg`}>
                    <Icon size={26} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-bold text-slate-950">{item.label}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.chip}`}>
                        {Math.round(progress * 100)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.helper}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.accent} transition-all duration-75`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {isBusy ? "Sending alert..." : isHolding ? "Keep holding..." : "Press and hold"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {activeAlert ? (
          <section className="rounded-[1.8rem] bg-amber-50 px-4 py-4 shadow-sm ring-1 ring-amber-200">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">Live Alert</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">
              {labelForType(activeAlert.alertType)} sent for {dashboard?.context?.unitLabel || "your home"}
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              {managedByEstate ? "Estate security has been notified." : "Emergency contacts are being notified."}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {(activeAlert.events || []).slice(-4).map((eventItem) => `${eventItem.channel}:${eventItem.deliveryStatus}`).join(" • ")}
            </p>
            {activeAlert.status === "dispatched" ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busyKey === `cancel:${activeAlert.id}`}
                className="mt-4 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {busyKey === `cancel:${activeAlert.id}` ? "Cancelling..." : "Cancel within grace window"}
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[2rem] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600" />
            <h2 className="text-lg font-bold text-slate-950">Report Visitor</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">Flag a suspicious visitor from your recent history or add details manually.</p>

          <form onSubmit={handleSubmitVisitorReport} className="mt-4 space-y-3">
            <select
              className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none"
              value={reportForm.visitorSessionId}
              onChange={(event) => {
                const nextId = event.target.value;
                const visit = visits.find((row) => row.id === nextId);
                setReportForm((prev) => ({
                  ...prev,
                  visitorSessionId: nextId,
                  reportedName: nextId ? visit?.visitorName || "" : prev.reportedName,
                  reportedPhone: nextId ? visit?.visitorPhone || "" : prev.reportedPhone
                }));
              }}
            >
              <option value="">Choose past visitor</option>
              {visits.slice(0, 20).map((visit) => (
                <option key={visit.id} value={visit.id}>
                  {visit.visitorName || "Visitor"} • {visit.time || visit.startedAt || "Unknown time"}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                placeholder="Visitor name"
                value={reportForm.reportedName}
                onChange={(event) => setReportForm((prev) => ({ ...prev, reportedName: event.target.value }))}
              />
              <select
                className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none"
                value={reportForm.severity}
                onChange={(event) => setReportForm((prev) => ({ ...prev, severity: event.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <input
              className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              placeholder="Phone number"
              value={reportForm.reportedPhone}
              onChange={(event) => setReportForm((prev) => ({ ...prev, reportedPhone: event.target.value }))}
            />
            <input
              className="w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              placeholder="Why are you reporting this visitor?"
              value={reportForm.reason}
              onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
              required
            />
            <textarea
              className="min-h-24 w-full rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              placeholder="Extra notes"
              value={reportForm.notes}
              onChange={(event) => setReportForm((prev) => ({ ...prev, notes: event.target.value }))}
            />

            <button
              type="submit"
              disabled={busyKey === "report"}
              className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white"
            >
              {busyKey === "report" ? "Submitting..." : "Submit Visitor Report"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-950">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {managedByEstate
              ? (dashboard?.alerts || []).slice(0, 3).map((alert) => (
                  <article key={alert.id} className="rounded-[1.35rem] bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{labelForType(alert.alertType)}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                        {alert.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{new Date(alert.triggeredAt).toLocaleString()}</p>
                  </article>
                ))
              : (
                <article className="rounded-[1.35rem] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Personal emergency contacts</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {settings.knownContacts.length
                      ? `${settings.knownContacts.length} contact${settings.knownContacts.length === 1 ? "" : "s"} saved for independent homeowner escalation.`
                      : "No personal emergency contacts added yet."}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard/homeowner/emergency-contacts")}
                    className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Manage contacts
                  </button>
                </article>
              )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

async function readLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) return { source: "unavailable" };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: "device_gps"
        }),
      () => resolve({ source: "permission_denied" }),
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 15000 }
    );
  });
}

function labelForType(type) {
  if (type === "break_in") return "Break-in";
  if (type === "fire") return "Fire";
  return "Panic";
}
