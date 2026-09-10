import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Settings,
  Bell,
  Check,
  ShieldCheck,
  Trash2,
  Users,
  AlertTriangle,
  Zap
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
    { key: "all", label: "All", count: items.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "visitor", label: "Visitors", count: items.filter((item) => item.category === "visitor" || item.canRespondToVisit).length },
    { key: "security", label: "Security", count: items.filter((item) => item.category === "security" || item.priority === "critical").length },
    { key: "system", label: "System", count: items.filter((item) => item.category === "system" || item.category === "payment").length }
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
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100">
      
      {/* Clean, Floating Header */}
      <header className="sticky top-0 z-40 bg-white/85 px-4 py-4 backdrop-blur-md dark:bg-gray-950/85">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread message{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dashboard/homeowner/settings")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-4 max-w-xl space-y-4 px-4">
        
        {/* Simple Control Bar (Mark all read, clear, push status) */}
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
          <div className="flex items-center gap-3">
            <button 
              onClick={markAllRead} 
              className="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white transition"
            >
              <Check size={14} /> Mark all read
            </button>
            <span>•</span>
            <button 
              onClick={clearAll} 
              disabled={items.length === 0}
              className="flex items-center gap-1.5 hover:text-red-600 disabled:opacity-40 transition"
            >
              <Trash2 size={14} /> Clear all
            </button>
          </div>

          {permission !== "granted" && (
            <button 
              onClick={enableBrowserAlerts}
              className="text-primary-600 hover:underline dark:text-primary-400"
            >
              Enable alerts
            </button>
          )}
        </div>

        {/* Minimalist Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {filters.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-950 shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
                {item.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${active ? "bg-white/20 text-white dark:bg-gray-200 dark:text-gray-900" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feed Wrapper - Clean backdrop */}
        <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-xs dark:border-gray-800/80 dark:bg-gray-900">
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
      </main>

    </div>
  );
}