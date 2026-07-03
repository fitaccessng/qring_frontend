import { Mic, MicOff, PhoneOff, RotateCcw, Volume2 } from "lucide-react";

export default function OfficeActiveVoiceCall({
  title = "Active voice call",
  status = "",
  networkDetail = "",
  muted = false,
  speakerOn = true,
  toggleMute,
  toggleSpeaker,
  retryCallConnection,
  endCall
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-500">Qring Office Call</p>
          <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{title}</h2>
          {status ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{status}</p> : null}
        </div>
        {networkDetail ? <p className="text-xs text-slate-500 dark:text-slate-400">{networkDetail}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={toggleSpeaker} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${speakerOn ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
          <Volume2 className="h-3.5 w-3.5" />
          {speakerOn ? "Speaker on" : "Speaker off"}
        </button>
        <button type="button" onClick={toggleMute} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${muted ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {muted ? "Muted" : "Mic on"}
        </button>
        <button type="button" onClick={retryCallConnection} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </button>
        <button type="button" onClick={() => void endCall()} className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-rose-700">
          <PhoneOff className="h-3.5 w-3.5" />
          End
        </button>
      </div>
    </section>
  );
}
