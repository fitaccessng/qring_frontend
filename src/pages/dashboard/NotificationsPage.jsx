import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing, CheckCheck, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import NotificationFeed from "../../components/notifications/NotificationFeed";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import { getNotificationDetailRoute } from "../../utils/notificationMeta";
import { getUserInitials } from "../../utils/profile";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useDashboardData();
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
  } = useNotifications();
  const [activeActionId, setActiveActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const profileLabel = profile?.fullName?.trim() || user?.fullName?.trim() || user?.email || "Resident";
  const initials = getUserInitials(profileLabel);

  const summary = useMemo(
    () => [
      { label: "Unread", value: unreadCount },
      { label: "Feed", value: items.length },
    ],
    [connected, items.length, unreadCount]
  );

  async function handleNotificationClick(item) {
    setActionError("");
    if (item.unread) {
      await markRead(item.id);
    }
    navigate(getNotificationDetailRoute(item));
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

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/dashboard/homeowner/overview");
  }

  return (
    <AppShell title="Notifications" showTopBar={false} showMobileNav={false}>
      <div className="min-h-[100dvh] bg-transparent">
        <div className="mx-auto w-full max-w-xl">
          <header className="sticky top-0 z-30 border-b border-white/40 bg-slate-50/88 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-[#00346f] shadow-sm transition hover:bg-slate-50"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Notification Center</p>
                  <h1 className="font-heading text-xl font-extrabold tracking-tight text-[#00346f]">Notifications</h1>
                </div>
              </div>
              <div className="grid h-10 min-w-10 place-items-center rounded-full bg-[#d7e2ff] px-3 text-[11px] font-black text-[#00346f]">
                {initials}
              </div>
            </div>
          </header>

          <main className="space-y-6 px-4 pb-10 pt-4 sm:px-6">
            <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-5 text-white shadow-[0_18px_50px_rgba(0,52,111,0.22)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                    <BellRing className="h-3.5 w-3.5" />
                    Inbox
                  </div>
                  <h2 style={{ color: "white" }} className="mt-4 font-heading text-3xl font-extrabold leading-tight text-white">
                    Stay updated
                  </h2>
                  <p className="mt-2 text-sm text-blue-100">
                    {connected ? "Realtime feed active" : "Background refresh active"}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <Sparkles className="h-5 w-5 text-blue-100" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/10 px-3 py-3 backdrop-blur">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">{item.label}</p>
                    <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => clearAll()}
                  disabled={items.length === 0}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => enableBrowserAlerts()}
                  disabled={permission === "granted"}
                  className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {permission === "granted" ? "Alerts enabled" : "Enable alerts"}
                </button>
              </div>
            </section>

            <section className="rounded-[1.9rem] border border-slate-200 bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:p-5">
              <NotificationFeed
                items={items}
                loading={loading}
                activeActionId={activeActionId}
                actionError={actionError}
                onOpen={handleNotificationClick}
                onMarkRead={markRead}
                onVisitorAction={handleVisitorAction}
              />
            </section>
          </main>
        </div>
      </div>
    </AppShell>
  );
}
