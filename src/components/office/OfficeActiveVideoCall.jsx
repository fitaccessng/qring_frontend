import { Camera, Mic, MicOff, PhoneOff, RotateCcw, Volume2 } from "lucide-react";

export default function OfficeActiveVideoCall({
  title = "Active video call",
  status = "",
  networkDetail = "",
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  muted = false,
  speakerOn = true,
  cameraFacing = "user",
  remoteVideoActive = false,
  toggleMute,
  toggleSpeaker,
  switchCamera,
  retryCallConnection,
  endCall
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[16/10] bg-black">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover transition-opacity duration-300 ${remoteVideoActive ? "opacity-100" : "opacity-30"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
          {title}
        </div>
        <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {status ? <p className="text-sm font-bold text-slate-950 dark:text-white">{status}</p> : null}
            {networkDetail ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{networkDetail}</p> : null}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Camera: {cameraFacing}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={toggleSpeaker} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${speakerOn ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
              <Volume2 className="h-3.5 w-3.5" />
              Speaker
            </button>
            <button type="button" onClick={toggleMute} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${muted ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
              {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              Mic
            </button>
            <button type="button" onClick={switchCamera} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <Camera className="h-3.5 w-3.5" />
              Switch
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
        </div>
      </div>
    </section>
  );
}
