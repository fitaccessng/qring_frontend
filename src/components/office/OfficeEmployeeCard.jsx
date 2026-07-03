import { PhoneCall, Video } from "lucide-react";
import OfficeStatusPill from "./OfficeStatusPill";

export default function OfficeEmployeeCard({ member, onVoiceCall, onVideoCall, callDisabled = false }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950 dark:text-white">{member.name}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {member.role || "Employee"}{member.department ? ` · ${member.department}` : ""}{member.floor ? ` · ${member.floor}` : ""}
          </p>
        </div>
        <OfficeStatusPill label={member.availability || member.status || "available"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        {member.extension ? <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">{member.extension}</span> : null}
        {member.userId ? <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">User linked</span> : null}
      </div>
      {(onVoiceCall || onVideoCall) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {onVoiceCall ? (
            <button
              type="button"
              onClick={onVoiceCall}
              disabled={callDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Voice
            </button>
          ) : null}
          {onVideoCall ? (
            <button
              type="button"
              onClick={onVideoCall}
              disabled={callDisabled}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <Video className="h-3.5 w-3.5" />
              Video
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
