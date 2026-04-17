import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Settings, 
  BellRing, 
  CheckCheck, 
  ShieldAlert, 
  Trash2,
  Home,
  ShieldCheck,
  Bell,
  Settings2
} from "lucide-react";
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
    <div className="min-h-[100dvh] bg-[#f8f9fa] text-[#2b3437] font-body">
      
      {/* Header: Back Arrow | Title | Settings */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-100">
        <button 
          onClick={handleBack}
          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        
        <h1 className="font-['Manrope'] text-xl font-bold tracking-tight text-indigo-700">
          Notifications
        </h1>

        <button 
          onClick={() => navigate("/dashboard/homeowner/settings")}
          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        
        {/* Quick Stats Banner */}
        <section className="bg-indigo-700 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-200 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">Unread Alerts</h2>
            <p className="text-4xl font-black mt-1">{unreadCount}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <BellRing className="h-8 w-8 text-white" />
          </div>
        </section>

        {/* Action Toolbar */}
        <section className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:justify-center">
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-2 whitespace-nowrap bg-white px-4 py-2.5 rounded-full border border-slate-200 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-indigo-300 transition-all"
          >
            <CheckCheck className="h-3.5 w-3.5 text-indigo-600" />
            Mark Read
          </button>
          <button
            onClick={() => clearAll()}
            disabled={items.length === 0}
            className="flex items-center gap-2 whitespace-nowrap bg-white px-4 py-2.5 rounded-full border border-slate-200 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-red-300 disabled:opacity-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Clear
          </button>
          <button
            onClick={() => enableBrowserAlerts()}
            disabled={permission === "granted"}
            className="flex items-center gap-2 whitespace-nowrap bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-black transition-all"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
            {permission === "granted" ? "Alerts On" : "Enable Alerts"}
          </button>
        </section>

        {/* Feed Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">Activity Feed</h2>
            <div className="h-px flex-1 bg-slate-200 ml-4"></div>
          </div>

          <div className="bg-white rounded-3xl p-2 shadow-[0_12px_32px_rgba(43,52,55,0.04)] border border-slate-100">
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
      </main>

      {/* Bottom Navigation Bar (Serene Sentinel Style) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-4 bg-white/90 backdrop-blur-2xl rounded-t-[2rem] shadow-[0_-12px_32px_rgba(43,52,55,0.08)] border-t border-slate-50">
        <Link to="/dashboard/homeowner/overview" className="flex flex-col items-center justify-center text-slate-400 px-5 py-2 hover:text-indigo-500 transition-all">
          <Home className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-widest">Home</span>
        </Link>
        
        <Link to="/dashboard/homeowner/security" className="flex flex-col items-center justify-center text-slate-400 px-5 py-2 hover:text-indigo-500 transition-all">
          <ShieldCheck className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-widest">Security</span>
        </Link>

        {/* Active State */}
        <div className="flex flex-col items-center justify-center bg-indigo-50 text-indigo-700 rounded-2xl px-5 py-2">
          <Bell className="h-6 w-6 mb-1 fill-current" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Activity</span>
        </div>

        <Link to="/dashboard/homeowner/settings" className="flex flex-col items-center justify-center text-slate-400 px-5 py-2 hover:text-indigo-500 transition-all">
          <Settings2 className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-widest">Settings</span>
        </Link>
      </nav>

      {/* Profile Initials Floating Indicator */}
      <div className="fixed bottom-28 right-6 hidden sm:block">
         <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-1.5 pl-4 rounded-full shadow-lg border border-indigo-50">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-900">{user?.fullName || "User"}</span>
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-inner">
               {initials}
            </div>
         </div>
      </div>
    </div>
  );
}