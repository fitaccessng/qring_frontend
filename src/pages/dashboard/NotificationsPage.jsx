import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCheck, ShieldAlert, Trash2 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import NotificationFeed from "../../components/notifications/NotificationFeed";
import { useNotifications } from "../../state/NotificationsContext";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    unreadCount,
    connected,
    permission,
    enableBrowserAlerts,
    markRead,
    markAllRead,
    clearAll,
    runVisitorAction
  } =
    useNotifications();
  const [activeActionId, setActiveActionId] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleNotificationClick(item) {
    setActionError("");
    if (item.unread) {
      await markRead(item.id);
    }
    navigate(item.route || "/dashboard/notifications");
  }

  async function handleVisitorAction(item, action) {
    const key = `${item.id}:${action}`;
    setActiveActionId(key);
    setActionError("");
    const result = await runVisitorAction(item, action);
    if (!result?.ok) {
      setActionError(result?.error || "Unable to update visitor request.");
    }
    setActiveActionId("");
  }

  return (
    <AppShell title="Notifications">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(135deg,#020617_0%,#0f172a_35%,#0f766e_100%)] px-5 py-6 text-white dark:border-slate-800 sm:px-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,211,252,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.16),transparent_38%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-100">
                  <BellRing className="h-3.5 w-3.5" />
                  Notification Center
                </div>
                <h2 className="mt-4 text-2xl font-black sm:text-3xl">Stay on top of every gate event</h2>
                <p className="mt-2 text-sm text-slate-200">
                  {connected ? "Realtime sync is live." : "Automatic fallback refresh is active."} You currently have {unreadCount} unread notifications.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[23rem]">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">Unread</p>
                  <p className="mt-2 text-3xl font-black">{unreadCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">Feed Size</p>
                  <p className="mt-2 text-3xl font-black">{items.length}</p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-200">Delivery</p>
                  <p className="mt-2 text-base font-black">{connected ? "Realtime" : "Fallback"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-3 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all as read
                </button>
                <button
                  type="button"
                  onClick={() => clearAll()}
                  disabled={items.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear feed
                </button>
                <button
                  type="button"
                  onClick={() => enableBrowserAlerts()}
                  disabled={permission === "granted"}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {permission === "granted" ? "Browser alerts enabled" : "Enable browser alerts"}
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Actionable notifications let residents approve or reject visitor requests directly from the feed.
              </p>
            </div>

            <NotificationFeed
              items={items}
              loading={loading}
              activeActionId={activeActionId}
              actionError={actionError}
              onOpen={handleNotificationClick}
              onMarkRead={markRead}
              onVisitorAction={handleVisitorAction}
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
