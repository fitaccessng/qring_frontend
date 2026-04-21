import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { acknowledgePanicAlert, getActivePanicAlerts, resolvePanicAlert, updatePanicAlertNotes } from "../../services/safetyService";
import { useSocketEvents } from "../../hooks/useSocketEvents";

export default function EstateDashboard({ roleLabel = "Emergency Response Dashboard" }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [notesByAlert, setNotesByAlert] = useState({});
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

  async function handleSaveNotes(panicId) {
    setBusyKey(`notes:${panicId}`);
    try {
      await updatePanicAlertNotes(panicId, notesByAlert[panicId] || "");
      await load({ background: true });
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-[2rem] border border-red-200 bg-[linear-gradient(135deg,#fff5f5_0%,#ffe4e6_100%)] p-5 shadow-[0_18px_40px_rgba(127,29,29,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-red-600">{roleLabel}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Live Panic Feed</h1>
            <p className="mt-2 text-sm text-slate-600">Realtime panic events from residents, contacts, and estate-linked homes.</p>
          </div>
          <div className="flex gap-3">
            <MetricCard label="Active" value={alerts.length} />
            <MetricCard label="Waiting" value={unacknowledgedAlerts.length} tone="danger" />
          </div>
        </div>
        {isOffline ? (
          <p className="mt-4 rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
            Offline mode. Reconnect to receive live panic updates.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4">
        {loading ? <p className="text-sm text-slate-500">Loading active panic alerts...</p> : null}
        {!loading && !alerts.length ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No active panic events.
          </div>
        ) : null}

        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`rounded-[2rem] border bg-[#160203] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,0.24)] ${
              alert.acknowledged ? "border-emerald-400/40" : "animate-pulse border-rose-500"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl ${alert.acknowledged ? "bg-emerald-600" : "bg-rose-600"}`}>
                  {alert.acknowledged ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{alert.userName}</h2>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
                      {alert.mode}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/78">{alert.location?.doorName || alert.unitLabel || "Unknown unit"}</p>
                  {alert.responders?.length ? (
                    <p className="mt-2 text-sm text-emerald-200">
                      Responders: {alert.responders.map((item) => item.name || "Responder").join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-rose-200">
                    {alert.acknowledged ? "Acknowledged" : "Needs response"} • {formatTime(alert.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busyKey === `ack:${alert.id}` || alert.acknowledged}
                  onClick={() => handleAcknowledge(alert.id)}
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                >
                  {busyKey === `ack:${alert.id}` ? "Working..." : alert.acknowledged ? "Acknowledged" : "Acknowledge"}
                </button>
                <button
                  type="button"
                  disabled={busyKey === `resolve:${alert.id}`}
                  onClick={() => handleResolve(alert.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {busyKey === `resolve:${alert.id}` ? "Working..." : "Mark Resolved"}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <textarea
                value={notesByAlert[alert.id] ?? alert.incidentNotes ?? ""}
                onChange={(event) => setNotesByAlert((current) => ({ ...current, [alert.id]: event.target.value }))}
                placeholder="Add incident notes"
                className="min-h-[96px] rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                disabled={busyKey === `notes:${alert.id}`}
                onClick={() => handleSaveNotes(alert.id)}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {busyKey === `notes:${alert.id}` ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone = "default" }) {
  return (
    <div className={`rounded-[1.4rem] px-4 py-3 ${tone === "danger" ? "bg-red-600 text-white" : "bg-white text-slate-950"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString();
}
