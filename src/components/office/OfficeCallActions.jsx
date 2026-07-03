import { PhoneCall, Video } from "lucide-react";

export default function OfficeCallActions({ onVoice, onVideo, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onVoice}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-950"
      >
        <PhoneCall className="h-3.5 w-3.5" />
        Voice
      </button>
      <button
        type="button"
        onClick={onVideo}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Video className="h-3.5 w-3.5" />
        Video
      </button>
    </div>
  );
}
