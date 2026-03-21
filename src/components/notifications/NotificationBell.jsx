import { Bell } from "lucide-react";

export default function NotificationBell({ unreadCount, onClick, isOpen = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative grid h-12 w-12 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 ${
        isOpen
          ? "border-sky-700/80 bg-slate-900 text-white shadow-[0_16px_36px_rgba(15,23,42,0.24)] dark:border-sky-400/70 dark:bg-sky-300 dark:text-slate-950"
          : "border-slate-200/80 bg-white/90 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-sky-300/70 hover:text-sky-800 hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)] dark:border-slate-700/80 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:border-sky-500/70 dark:hover:text-white"
      }`}
      aria-label="Notifications"
      title="Notifications"
    >
      <span
        className={`pointer-events-none absolute inset-0 rounded-full transition-opacity duration-200 ${
          isOpen
            ? "bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.24),transparent_38%),linear-gradient(145deg,rgba(14,116,144,0.2),rgba(15,23,42,0.18))] opacity-100 dark:bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.18),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.18),rgba(14,165,233,0.1))]"
            : "bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.98),rgba(255,255,255,0.3)_34%,transparent_36%),linear-gradient(180deg,rgba(148,163,184,0.08),rgba(148,163,184,0.02))] opacity-100 dark:bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.14),transparent_34%),linear-gradient(180deg,rgba(148,163,184,0.16),rgba(15,23,42,0.02))]"
        }`}
      />
      <span
        className={`pointer-events-none absolute inset-[3px] rounded-full transition-all duration-200 ${
          isOpen
            ? "border border-white/10 bg-white/10 dark:border-slate-950/10 dark:bg-white/10"
            : "border border-white/80 bg-white/70 group-hover:bg-white/85 dark:border-white/10 dark:bg-slate-900/70 dark:group-hover:bg-slate-900"
        }`}
      />
      <Bell
        strokeWidth={1.9}
        className={`relative h-[1.05rem] w-[1.05rem] transition-transform duration-200 ${
          unreadCount > 0 ? "animate-[qring-bell-nudge_3.6s_ease-in-out_infinite]" : ""
        } ${isOpen ? "scale-105" : "group-hover:scale-105"}`}
      />
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 z-10 inline-flex min-w-[1.35rem] items-center justify-center rounded-full border border-white/90 bg-gradient-to-br from-rose-500 to-rose-600 px-1 py-0.5 text-[10px] font-black leading-none text-white shadow-[0_10px_18px_rgba(225,29,72,0.32)] ring-2 ring-white/90 dark:border-slate-950 dark:from-rose-400 dark:to-rose-500 dark:ring-slate-950">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
      <span className="sr-only">{unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}</span>
      <style>{`
        @keyframes qring-bell-nudge {
          0%, 82%, 100% { transform: rotate(0deg); }
          86% { transform: rotate(10deg); }
          90% { transform: rotate(-8deg); }
          94% { transform: rotate(5deg); }
        }
      `}</style>
    </button>
  );
}
