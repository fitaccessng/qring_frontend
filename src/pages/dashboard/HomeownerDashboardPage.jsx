import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bell, 
  ClipboardCheck, 
  Users, 
  MessageSquare, 
  DoorOpen, 
  PhoneCall, 
  ShieldAlert, 
  Settings, 
  CreditCard,
  CalendarDays,
  Unlock,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  QrCode,
  HardHat
} from "lucide-react";

import { useApiQuery, useSocketQueryInvalidation } from "../../hooks/useApi";
import { endpoints } from "../../services/endpoints";
import { normalizeDashboard } from "../../services/dashboardService";
import { getHomeownerContext } from "../../services/homeownerService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import useSubscription from "../../hooks/useSubscription";

const QUERY_KEY = ["homeowner", "overview"];
const quickActionFeatureByRoute = {
  "/dashboard/homeowner/messages": "chat_call_verification",
  "/dashboard/homeowner/appointments": "visitor_scheduling",
  "/dashboard/homeowner/estate-video-calls": "chat_call_verification",
  "/dashboard/homeowner/estate-audio-calls": "chat_call_verification",
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function HomeownerDashboardPage() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { hasFeature } = useSubscription();
  const [homeownerContext, setHomeownerContext] = useState({ managedByEstate: false, estateName: "" });
  
  const { data, isLoading, isError, refetch, isFetching } = useApiQuery({
    queryKey: QUERY_KEY,
    url: endpoints.dashboard.overview,
    select: normalizeDashboard,
    refetchInterval: 30000
  });

  useSocketQueryInvalidation(QUERY_KEY, ["dashboard.snapshot", "dashboard.patch", "incoming-call", "connect"]);

  const overview = data ?? normalizeDashboard({});

  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const data = await getHomeownerContext();
        if (active) setHomeownerContext(data ?? { managedByEstate: false, estateName: "" });
      } catch {
        if (active) setHomeownerContext({ managedByEstate: false, estateName: "" });
      }
    }
    loadContext();
    return () => { active = false; };
  }, []);
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const firstName = useMemo(() => {
    return overview.profile?.fullName?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Resident";
  }, [overview.profile?.fullName, user?.fullName]);

  const isEstateManagedHomeowner = Boolean(homeownerContext?.managedByEstate);
  
  const quickActions = useMemo(() => {
    const actions = isEstateManagedHomeowner ? [
      { to: "/dashboard/homeowner/estate-broadcasts", icon: Bell, label: "Announcements" },
      { to: "/dashboard/homeowner/estate-meetings", icon: CalendarDays, label: "Meetings" },
      { to: "/dashboard/homeowner/estate-polls", icon: Activity, label: "Polls" },
      { to: "/dashboard/homeowner/estate-dues", icon: CreditCard, label: "Payments" },
      { to: "/dashboard/homeowner/estate-maintenance", icon: AlertTriangle, label: "Repairs" },
      { to: "/dashboard/homeowner/estate-doors", icon: DoorOpen, label: "Gates & Doors" },
      { to: "/dashboard/homeowner/artisans", icon: HardHat, label: "Artisans" },
      { to: "/dashboard/homeowner/estate-approvals", icon: ClipboardCheck, label: "Approval Logs" },
      { to: "/dashboard/homeowner/messages", icon: MessageSquare, label: "Messages" },
      // { to: "/dashboard/homeowner/estate-video-calls", icon: PhoneCall, label: "Video Calls" },
      // { to: "/dashboard/homeowner/estate-audio-calls", icon: PhoneCall, label: "Audio Calls" },
      // { to: "/dashboard/homeowner/estate-alerts", icon: Bell, label: "Alerts" },
      { to: "/dashboard/homeowner/settings", icon: Settings, label: "Settings" }
    ] : [
      { to: "/dashboard/homeowner/messages", icon: ClipboardCheck, label: "Approvals" },
      { to: "/dashboard/homeowner/visits", icon: Users, label: "Guests" },
      { to: "/dashboard/homeowner/messages", icon: MessageSquare, label: "Inbox" },
      { to: "/dashboard/homeowner/doors", icon: DoorOpen, label: "Gates & Doors" },
      { to: "/dashboard/homeowner/emergency-contacts", icon: PhoneCall, label: "Emergency Contacts" },
      { to: "/dashboard/homeowner/safety", icon: ShieldAlert, label: "Panic Button", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50" },
      { to: "/dashboard/homeowner/settings", icon: Settings, label: "Settings" },
      { to: "/billing/paywall", icon: CreditCard, label: "Billing" }
    ];

    return actions.filter(item => {
      const requiredFeature = quickActionFeatureByRoute[item.to];
      return requiredFeature ? hasFeature(requiredFeature) : true;
    });
  }, [hasFeature, isEstateManagedHomeowner]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 antialiased">
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm sm:text-base tracking-tight text-slate-900">My Home</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                <p className="text-[10px] text-slate-500 font-medium uppercase">
                  {isFetching ? "Updating..." : "Connected"}
                </p>
              </div>
            </div>
          </div>
          
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all group">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white" />
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Welcome Section */}
        <section>
          <h2 className="font-bold text-2xl sm:text-3xl md:text-4xl text-slate-900 tracking-tight">
            {greeting}, <span className="text-blue-600 font-extrabold">{firstName}</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            {isEstateManagedHomeowner
              ? `Your account is connected to ${homeownerContext?.estateName || "your estate"}.`
              : "Everything looks safe and secure today."}
          </p>
        </section>

        {/* Combined Action Card Container */}
      {/* Combined Action Card Container */}
<motion.div 
  variants={containerVariants}
  initial="hidden"
  animate="show"
  className="w-full"
>
  {/* Unified Access & Guest Card */}
  <motion.div 
    variants={itemVariants}
    className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800"
  >
    <div className="relative z-10 flex justify-between items-start">
      <div>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
          Quick Access
        </span>
        <h3 className="text-xl sm:text-2xl font-bold mt-3 tracking-tight">
          Manage who comes in
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mt-1.5 leading-relaxed">
  Visitors simply scan your QR code at your gate or door. You can also send them an invitation before they arrive.
        </p>
      </div>
      <div className="bg-slate-800/80 p-3 rounded-2xl text-slate-300 hidden sm:block">
        <QrCode className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
    </div>

    {/* Twin Action Buttons Layout */}
    <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-stretch gap-3">
      <Link
        to="/dashboard/homeowner/doors"
        className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3.5 rounded-xl transition-all whitespace-nowrap group"
      >
        <QrCode className="w-4 h-4" />
        <span>Show QR Code</span>
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
      
      <Link
        to="/dashboard/homeowner/safety"
        className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-5 py-3.5 rounded-xl border border-rose-500/70 transition-all whitespace-nowrap group"
      >
        <ShieldAlert className="w-4 h-4" />
        <span>Panic Button</span>
        <AlertTriangle className="w-3.5 h-3.5 text-rose-100 ml-0.5" />
      </Link>
    </div>
  </motion.div>
</motion.div>

        {/* Quick Actions Grid */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Quick Menu</h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {quickActions.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link 
                  key={`${item.to}-${item.label}`}
                  to={item.to} 
                  className="flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-200/60 group transition-all duration-200 active:scale-95"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 ${item.bg ? item.bg : 'bg-slate-50 border border-slate-100 text-slate-700 group-hover:text-blue-600'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 text-center truncate w-full tracking-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Timeline Log Feed */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Recent Activity</h3>
            <Link 
              to="/dashboard/homeowner/visits" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 tracking-tight flex items-center gap-0.5 group"
            >
              <span>See All History</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {overview.activity?.length > 0 ? (
              overview.activity.slice(0, 5).map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200/60 gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      {item.event?.toLowerCase().includes('door') ? <Unlock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate tracking-tight">{item.event}</p>
                      <p className="text-slate-500 text-xs truncate mt-0.5 font-medium">{item.details || item.message}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 whitespace-nowrap">
                    {formatTime(item.createdAt || item.time)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
                <p className="text-sm text-slate-400 font-medium italic">No recent activity to show.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <ShieldCheck className="absolute text-blue-600 w-5 h-5" />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
        Opening App...
      </p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
