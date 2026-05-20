import { AlertTriangle, Radio } from "lucide-react";

export default function PanicAudioPanel({ alert, compact = false }) {
  const audioActive = Boolean(alert?.audio?.active);

  return (
    <div className={`rounded-[1.5rem] border border-white/10 bg-black/20 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Panic Live Audio</p>
          <p className="mt-1 text-sm text-white/90">
            {audioActive
              ? "Legacy panic audio has been disabled while the app moves to direct WebRTC."
              : "Panic audio is unavailable until the safety flow is migrated to the new WebRTC stack."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
          {audioActive ? <AlertTriangle className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
          Migration pending
        </div>
      </div>
    </div>
  );
}
