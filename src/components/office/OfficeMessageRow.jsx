import OfficeStatusPill from "./OfficeStatusPill";
import { getConversationPreviewText } from "../../utils/messageDisplay";

export default function OfficeMessageRow({ message }) {
  const preview = getConversationPreviewText(message);
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-white">
            {message.name || message.displayName || message.from || "Conversation"}
          </p>
          {message.purpose ? (
            <p className="mt-1 truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {message.purpose}
            </p>
          ) : null}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{formatTime(message.time)}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{preview}</p>
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
