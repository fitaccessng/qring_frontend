import SessionDiagnosticsPanel from "./SessionDiagnosticsPanel";

export default function SessionDebugOverlay({
  open = false,
  onToggle,
  diagnostics,
  logs = [],
  networkQuality = "good",
  audioRoute = "unknown",
  networkType = "unknown",
  videoQualityProfile = "balanced",
  lowBandwidthMode = false
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed bottom-24 right-4 z-[120] rounded-full border border-cyan-400/30 bg-slate-950/85 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200 shadow-xl backdrop-blur"
      >
        Debug
      </button>
    );
  }

  return (
    <aside className="fixed bottom-24 right-4 z-[120] w-[min(92vw,24rem)] rounded-3xl border border-cyan-400/25 bg-slate-950/92 p-4 text-white shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">Network Debug</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Route: {audioRoute} | Link: {networkType} | Video: {videoQualityProfile}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-bold text-slate-200"
        >
          Close
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] text-slate-200">
        <p>Low bandwidth mode: {lowBandwidthMode ? "on" : "off"}</p>
      </div>

      <SessionDiagnosticsPanel diagnostics={diagnostics} networkQuality={networkQuality} />

      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">Recent RTC Events</p>
        {logs.length ? logs.slice().reverse().slice(0, 8).map((entry) => (
          <div key={entry.id} className="rounded-xl border border-white/5 bg-slate-900/60 px-2 py-2 text-[11px]">
            <p className="font-semibold text-slate-100">{entry.message}</p>
            <p className="mt-1 text-[10px] text-slate-400">{formatTime(entry.at)}</p>
          </div>
        )) : (
          <p className="text-[11px] text-slate-400">No recent call events yet.</p>
        )}
      </div>
    </aside>
  );
}

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return String(value || "");
  }
}
