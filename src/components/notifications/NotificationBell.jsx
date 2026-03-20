import { Bell } from "lucide-react";

export default function NotificationBell({ unreadCount, onClick, isOpen = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border transition-all ${
        isOpen
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] dark:border-white dark:bg-white dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
      }`}
      aria-label="Notifications"
      title="Notifications"
    >
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),transparent_58%)] opacity-0 transition group-hover:opacity-100" />
      <Bell className={`relative h-5 w-5 transition-transform ${unreadCount > 0 ? "animate-[qring-bell-nudge_3.6s_ease-in-out_infinite]" : ""}`} />
      {unreadCount > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-lg ring-4 ring-white dark:ring-slate-900">
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
