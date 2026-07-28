import { useEffect, useMemo, useRef, useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Radio, 
  WifiOff, 
  MapPin, 
  Clock, 
  Loader2, 
  ShieldCheck 
} from "lucide-react";
import { acknowledgePanicAlert, getActivePanicAlerts, resolvePanicAlert } from "../../services/safetyService";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import PanicAudioPanel from "./PanicAudioPanel";

export default function EstateDashboard({ roleLabel = "Emergency Response Dashboard" }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));
  const audioContextRef = useRef(null);

  async function load({ background = false } = {}) {
    if (!background) setLoading(true);
    try {
      setAlerts(await getActivePanicAlerts());
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function syncOnlineStatus() {
      setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    }
    window.addEventListener("online", syncOnlineStatus);
    window.addEventListener("offline", syncOnlineStatus);
    return () => {
      window.removeEventListener("online", syncOnlineStatus);
      window.removeEventListener("offline", syncOnlineStatus);
    };
  }, []);

  useSocketEvents(
    useMemo(
      () => ({
        panic_alert: () => load({ background: true }),
        panic_alert_update: () => load({ background: true })
      }),
      []
    )
  );

  const unacknowledgedAlerts = useMemo(() => alerts.filter((item) => !item.acknowledged), [alerts]);

  useEffect(() => {
    if (!unacknowledgedAlerts.length) {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      return undefined;
    }

    let cancelled = false;
    async function startAlarmLoop() {
      if (typeof window === "undefined") return;
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor || audioContextRef.current) return;
      const context = new AudioContextCtor();
      audioContextRef.current = context;

      while (!cancelled && audioContextRef.current === context) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 740;
        gain.gain.value = 0.001;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
        oscillator.stop(context.currentTime + 0.42);
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      }
    }

    startAlarmLoop();
    return () => {
      cancelled = true;
    };
  }, [unacknowledgedAlerts.length]);

  async function handleAcknowledge(panicId) {
    setBusyKey(`ack:${panicId}`);
    try {
      await acknowledgePanicAlert(panicId);
      await load({ background: true });
    } finally {
      setBusyKey("");
    }
  }

  async function handleResolve(panicId) {
    setBusyKey(`resolve:${panicId}`);
    try {
      await resolvePanicAlert(panicId);
      await load({ background: true });
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 font-sans antialiased text-slate-900">
      
      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-amber-900 shadow-sm">
          <WifiOff className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold">
            Offline Mode — Connect to network to resume live panic alerts.
          </p>
        </div>
      )}

      {/* Dynamic Summary Card */}
      <section className="relative overflow-hidden rounded-3xl bg-white p-5 text-black shadow-xl shadow-slate-900/10">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300 backdrop-blur-md">
              <Radio className="h-3 w-3 animate-pulse text-rose-400" />
              {roleLabel}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              Auto-sync enabled
            </span>
          </div> */}

          <div>
            <h1 className="text-xl text-black font-black tracking-tight sm:text-2xl">Live Emergency Feed</h1>
            <p className="mt-0.5 text-xs text-black">
              Active panic events requiring guard dispatch.
            </p>
          </div>

          {/* Quick Metric Badges */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <MetricCard 
              label="Total Active" 
              value={alerts.length} 
              isWarning={alerts.length > 0} 
            />
            <MetricCard 
              label="Pending Action" 
              value={unacknowledgedAlerts.length} 
              isCritical={unacknowledgedAlerts.length > 0} 
            />
          </div>
        </div>
      </section>

      {/* Main Alert List */}
      <section className="space-y-3">
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-8 text-xs font-medium text-slate-500 shadow-xs">
            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            <span>Fetching live panic events...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !alerts.length && (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">All Sectors Clear</h2>
            <p className="mt-1 text-xs text-slate-500">There are no active panic events at this time.</p>
          </div>
        )}

        {/* Alert Cards */}
        {alerts.map((alert) => {
          const isAck = alert.acknowledged;
          const isAckBusy = busyKey === `ack:${alert.id}`;
          const isResolveBusy = busyKey === `resolve:${alert.id}`;

          return (
            <article
              key={alert.id}
              className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 transition-all shadow-md ${
                isAck 
                  ? "bg-white border-slate-200 shadow-slate-100" 
                  : "bg-gradient-to-b from-rose-950 to-slate-950 border-rose-600/80 text-white shadow-rose-900/20 animate-pulse"
              }`}
            >
              {/* Top Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm ${
                    isAck ? "bg-emerald-100 text-emerald-700" : "bg-rose-600 text-white"
                  }`}>
                    {isAck ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-base font-bold ${isAck ? "text-slate-900" : "text-white"}`}>
                        {alert.userName || "Resident Alert"}
                      </h2>
                      {alert.mode && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          isAck ? "bg-slate-100 text-slate-600" : "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                        }`}>
                          {alert.mode}
                        </span>
                      )}
                    </div>

                    <div className={`mt-1 flex items-center gap-1.5 text-xs font-medium ${isAck ? "text-slate-600" : "text-rose-100/90"}`}>
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span>{alert.location?.doorName || alert.unitLabel || "Unknown Location"}</span>
                    </div>
                  </div>
                </div>

                {/* Status Pill */}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  isAck 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-rose-600 text-white ring-2 ring-rose-400/40"
                }`}>
                  {isAck ? "Acknowledged" : "Needs Response"}
                </span>
              </div>

              {/* Timestamp Details */}
              <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-medium border-t pt-2.5 ${
                isAck ? "border-slate-100 text-slate-400" : "border-white/10 text-slate-400"
              }`}>
                <Clock className="h-3.5 w-3.5" />
                <span>Triggered: {formatTime(alert.createdAt)}</span>
              </div>

              {/* Panic Audio Player Integration */}
              <div className="mt-3">
                <PanicAudioPanel alert={alert} canEnd={alert.acknowledged} />
              </div>

              {/* Action Button Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isAckBusy || isAck}
                  onClick={() => handleAcknowledge(alert.id)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${
                    isAck
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-white text-slate-900 hover:bg-slate-100 shadow-md"
                  }`}
                >
                  {isAckBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>{isAckBusy ? "Updating..." : isAck ? "Acknowledged" : "Acknowledge"}</span>
                </button>

                <button
                  type="button"
                  disabled={isResolveBusy}
                  onClick={() => handleResolve(alert.id)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-md ${
                    isAck 
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20" 
                      : "bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-400/30 shadow-emerald-950/40"
                  }`}
                >
                  {isResolveBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                  )}
                  <span>{isResolveBusy ? "Resolving..." : "Mark Resolved"}</span>
                </button>
              </div>

            </article>
          );
        })}
      </section>
    </div>
  );
}

function MetricCard({ label, value, isCritical = false, isWarning = false }) {
  let bgStyle = "bg-black text-center text-white border-white/10";
  if (isCritical) bgStyle = "bg-rose-600/90 text-white border-rose-500/50 shadow-rose-900/30";
  else if (isWarning) bgStyle = "bg-amber-500/20 text-amber-200 border-amber-500/30";

  return (
    <div className={`flex flex-col justify-between rounded-2xl border p-3 backdrop-blur-md transition-all ${bgStyle}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric"
  });
}