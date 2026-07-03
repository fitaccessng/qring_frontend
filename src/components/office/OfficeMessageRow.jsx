import OfficeStatusPill from "./OfficeStatusPill";

export default function OfficeMessageRow({ message }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950 dark:text-white">{message.name || message.displayName || message.from || "Conversation"}</p>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{formatTime(message.time)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message.text || message.last || ""}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {message.status ? <OfficeStatusPill label={message.status} /> : null}
        {message.unread ? <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Unread</span> : null}
      </div>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
