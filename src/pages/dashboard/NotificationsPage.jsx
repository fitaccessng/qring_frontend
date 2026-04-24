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
  const settingsRoute = String(user?.role || "").toLowerCase() === "estate"
    ? "/dashboard/estate/security"
    : "/dashboard/homeowner/settings";

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
          onClick={() => navigate(settingsRoute)}
          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all active:scale-90"
          aria-label="Settings"
        >
          <Settings className="h-6 w-6" />
        </button>
      </header>

      <main className="pt-24 pb-40 px-6 max-w-2xl mx-auto space-y-6">
        
        {/* Quick Stats Banner */}
        <section className="bg-indigo-700 rounded-[2rem] px-6 py-5 text-white shadow-lg shadow-indigo-200 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-80">Unread Alerts</h2>
            <p className="text-4xl font-black mt-1">{unreadCount}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <BellRing className="h-8 w-8 text-white" />
          </div>
        </section>

        {/* Action Toolbar */}
        <section className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:justify-center">
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-2 whitespace-nowrap bg-white px-4 py-2 rounded-full border border-slate-200 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-indigo-300 transition-all"
          >
            <CheckCheck className="h-3.5 w-3.5 text-indigo-600" />
            Mark Read
          </button>
          <button
            onClick={() => clearAll()}
            disabled={items.length === 0}
            className="flex items-center gap-2 whitespace-nowrap bg-white px-4 py-2 rounded-full border border-slate-200 text-xs font-bold uppercase tracking-wider shadow-sm hover:border-red-300 disabled:opacity-50 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            Clear
          </button>
          <button
            onClick={() => enableBrowserAlerts()}
            disabled={permission === "granted"}
            className="flex items-center gap-2 whitespace-nowrap bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-black transition-all"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
            {permission === "granted" ? "Alerts On" : "Enable Alerts"}
          </button>
        </section>

        {/* Feed Section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">Activity Feed</h2>
            <div className="h-px flex-1 bg-slate-200 ml-4"></div>
          </div>

          <div className="bg-white rounded-3xl p-1.5 shadow-[0_12px_32px_rgba(43,52,55,0.04)] border border-slate-100">
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
<<<<<<< HEAD
  
=======
   
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19

      {/* Profile Initials Floating Indicator */}
     
      {/* Bottom Navigation Bar (Serene Sentinel Style) */}
    
    </div>
  );
}
