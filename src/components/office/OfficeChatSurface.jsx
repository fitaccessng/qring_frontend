import { SendHorizontal } from "lucide-react";
import { getConversationMessageText } from "../../utils/messageDisplay";

export default function OfficeChatSurface({
  conversation,
  messages = [],
  draft,
  onDraftChange,
  onSend,
  sending = false,
  emptyLabel = "Select a conversation to begin."
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-500">Conversation</p>
            <h3 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">
              {conversation?.visitorName || conversation?.name || "Office chat"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {conversation?.purpose || "Visitor and employee communication"}
            </p>
          </div>
          <div className="shrink-0">
            {conversation?.status ? <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{conversation.status}</span> : null}
          </div>
        </div>
      </div>

      <div className="max-h-[48vh] min-h-[18rem] space-y-3 overflow-y-auto p-4 sm:max-h-[56vh] sm:p-5">
        {messages.length > 0 ? messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        )) : (
          <div className="grid min-h-[18rem] place-items-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
            <p className="font-black text-slate-900 dark:text-white">{emptyLabel}</p>
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend?.();
        }}
        className="border-t border-slate-200 p-4 dark:border-slate-800"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange?.(event.target.value)}
            rows={2}
            placeholder="Write a message..."
            className="min-h-[3.5rem] w-full flex-1 resize-none rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-brand-500 px-4 py-3 text-sm font-black text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }) {
  const isOffice = String(message.senderType || "").toLowerCase() === "office";
  return (
    <div className={`flex ${isOffice ? "justify-end" : "justify-start"}`}>
      <div className={[
        "max-w-[90%] rounded-[1.4rem] px-4 py-3 text-sm shadow-sm sm:max-w-[80%]",
        isOffice
          ? "bg-brand-500 text-white"
          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
      ].join(" ")}>
        <p>{getConversationMessageText(message)}</p>
        <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${isOffice ? "text-white/70" : "text-slate-400"}`}>
          {formatTime(message.time)}
        </p>
      </div>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}
