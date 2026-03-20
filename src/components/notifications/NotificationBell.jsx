import { Bell } from "lucide-react";

export default function NotificationBell({ unreadCount, onClick, isOpen = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border transition-all ${
        isOpen
          ? "border-sky-700 bg-sky-700 text-white shadow-[0_16px_36px_rgba(14,116,144,0.24)] dark:border-sky-400 dark:bg-sky-400 dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-800 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-white"
      }`}
      aria-label="Notifications"
      title="Notifications"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_58%)] opacity-0 transition group-hover:opacity-100" />
      <Bell className={`relative h-6 w-6 transition-transform ${unreadCount > 0 ? "animate-[qring-bell-nudge_3.6s_ease-in-out_infinite]" : ""}`} />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.55rem] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-black leading-none text-white shadow-lg ring-4 ring-white dark:bg-rose-500 dark:text-white dark:ring-slate-900">
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
