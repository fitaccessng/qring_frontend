import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Settings,
  BellRing,
  CheckCheck, 
  ShieldAlert, 
  Trash2,
  UserRound,
  Sparkles
} from "lucide-react";
import NotificationFeed from "../../components/notifications/NotificationFeed";
import { useNotifications } from "../../state/NotificationsContext";
import { getNotificationDetailRoute } from "../../utils/notificationMeta";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    unreadCount,
    permission,
    enableBrowserAlerts,
    markRead,
    markAllRead,
    clearAll,
    runVisitorAction
  } = useNotifications();

  const [activeActionId, setActiveActionId] = useState("");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("all");
  const filteredItems = useMemo(() => {
    if (filter === "unread") return items.filter((item) => item.unread);
    if (filter === "visitor") return items.filter((item) => item.category === "visitor" || item.canRespondToVisit);
    if (filter === "security") return items.filter((item) => item.category === "security" || item.priority === "critical");
    if (filter === "system") return items.filter((item) => item.category === "system" || item.category === "payment");
    return items;
  }, [filter, items]);

  const filters = useMemo(() => [
    { key: "all", label: "All", count: items.length, icon: BellRing },
    { key: "unread", label: "Unread", count: unreadCount, icon: CheckCheck },
    { key: "visitor", label: "Visitors", count: items.filter((item) => item.category === "visitor" || item.canRespondToVisit).length, icon: UserRound },
    { key: "security", label: "Security", count: items.filter((item) => item.category === "security" || item.priority === "critical").length, icon: ShieldAlert },
    { key: "system", label: "System", count: items.filter((item) => item.category === "system" || item.category === "payment").length, icon: Sparkles }
  ], [items, unreadCount]);

  async function handleNotificationClick(item) {
    setActionError("");
    if (item.unread) {
      await markRead(item.id);
    }
    navigate(getNotificationDetailRoute(item), {
      state: {
        fromNotification: true,
        backTo: "/dashboard/notifications"
      }
    });
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
    <div className="min-h-screen bg-slate-100 pb-40 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-sm font-extrabold leading-none tracking-tight text-slate-900 dark:text-white sm:text-lg">Notifications</h1>
          </div>
          <button
            onClick={() => navigate("/dashboard/homeowner/settings")}
            className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-3xl space-y-5 px-4 sm:px-6">
        
        {/* PREMIUM CARD DESIGN: QUICK STATS BANNER */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <BellRing size={24} />
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Command Inbox</h2>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                Visitor requests, alerts, and account notices in one place.
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-center dark:bg-slate-800">
              <p className="text-2xl font-black leading-none text-slate-950 dark:text-white">{unreadCount}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Unread</p>
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => {
            const Icon = item.icon;
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                  active
                    ? "border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/15" : "bg-slate-100 dark:bg-slate-800"}`}>{item.count}</span>
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ToolbarActionButton 
            label="Mark Read" 
            icon={<CheckCheck size={14} />} 
            onClick={markAllRead} 
            color="text-indigo-600" 
          />
          <ToolbarActionButton 
            label="Clear" 
            icon={<Trash2 size={14} />} 
            onClick={clearAll} 
            disabled={items.length === 0}
            color="text-rose-500" 
          />
          <ToolbarActionButton 
            label={permission === "granted" ? "Alerts On" : "Enable"} 
            icon={<ShieldAlert size={14} />} 
            onClick={enableBrowserAlerts} 
            disabled={permission === "granted"}
            color="text-emerald-600" 
          />
        </section>

        {/* FEED SECTION */}
        <div className="space-y-2">
          <h3 className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Feed</h3>
          
          <div className="min-h-[200px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
            <NotificationFeed
              items={filteredItems}
              loading={loading}
              activeActionId={activeActionId}
              actionError={actionError}
              onOpen={handleNotificationClick}
              onMarkRead={markRead}
              onVisitorAction={handleVisitorAction}
            />
          </div>
        </div>
      </main>

    </div>
  );
}

// Action Button component within the Toolbar Box
function ToolbarActionButton({ label, icon, onClick, disabled, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-center justify-center rounded-xl py-2.5 transition-colors duration-200 hover:bg-slate-50 focus:outline-none disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-slate-800/60"
    >
      <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 ${color} mb-1 flex items-center justify-center`}>
        {icon}
      </div>
      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
    </button>
  );
}
