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
  History,
  CalendarDays,
  User,
  LayoutGrid,
  Unlock,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Activity
} from "lucide-react";

import { useApiQuery, useSocketQueryInvalidation } from "../../hooks/useApi";
import { endpoints } from "../../services/endpoints";
import { normalizeDashboard } from "../../services/dashboardService";
import { getResidentContext } from "../../services/residentService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import useSubscription from "../../hooks/useSubscription";

const QUERY_KEY = ["resident", "overview"];
const quickActionFeatureByRoute = {
  "/dashboard/resident/messages": "chat_call_verification",
  "/dashboard/resident/appointments": "visitor_scheduling",
  "/dashboard/resident/estate-messages": "chat_call_verification",
  "/dashboard/resident/estate-video-calls": "chat_call_verification",
  "/dashboard/resident/estate-audio-calls": "chat_call_verification",
};

export default function ResidentDashboardPage() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { hasFeature } = useSubscription();
  const [residentContext, setResidentContext] = useState({ managedByEstate: false, estateName: "" });
  
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
        const data = await getResidentContext();
        if (active) setResidentContext(data ?? { managedByEstate: false, estateName: "" });
      } catch {
        if (active) setResidentContext({ managedByEstate: false, estateName: "" });
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, []);
  
  // 1. DYNAMIC GREETING LOGIC
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const firstName = useMemo(() => {
    return overview.profile?.fullName?.split(" ")[0] || user?.fullName?.split(" ")[0] || "Resident";
  }, [overview.profile?.fullName, user?.fullName]);

  const isEstateManagedResident = Boolean(residentContext?.managedByEstate);
  const quickActions = useMemo(() => {
    if (isEstateManagedResident) {
      return [
        { to: "/dashboard/resident/estate-broadcasts", icon: <Bell size={24} />, label: "Broadcasts" },
        { to: "/dashboard/homeowner/estate-meetings", icon: <CalendarDays size={24} />, label: "Meetings" },
        { to: "/dashboard/homeowner/estate-polls", icon: <Activity size={24} />, label: "Polls" },
        { to: "/dashboard/homeowner/estate-dues", icon: <CreditCard size={24} />, label: "Dues" },
        { to: "/dashboard/homeowner/estate-maintenance", icon: <AlertTriangle size={24} />, label: "Maintenance" },
        { to: "/dashboard/homeowner/estate-doors", icon: <DoorOpen size={24} />, label: "Doors" },
        { to: "/dashboard/homeowner/estate-approvals", icon: <ClipboardCheck size={24} />, label: "Approvals" },
        { to: "/dashboard/homeowner/estate-messages", icon: <MessageSquare size={24} />, label: "Messages" },
        { to: "/dashboard/homeowner/estate-video-calls", icon: <PhoneCall size={24} />, label: "Video Calls" },
        { to: "/dashboard/homeowner/estate-audio-calls", icon: <PhoneCall size={24} />, label: "Audio Calls" },
        { to: "/dashboard/homeowner/estate-alerts", icon: <Bell size={24} />, label: "Alerts" },
        { to: "/dashboard/homeowner/estate-panic", icon: <ShieldAlert size={24} />, label: "Panic", color: "text-rose-600", bg: "bg-rose-50" }
      ].filter((item) => {
        const requiredFeature = quickActionFeatureByRoute[item.to];
        return requiredFeature ? hasFeature(requiredFeature) : true;
      });
    }
    return [
      { to: "/dashboard/homeowner/messages", icon: <ClipboardCheck size={24} />, label: "Approvals" },
      { to: "/dashboard/homeowner/visits", icon: <Users size={24} />, label: "Visits" },
      { to: "/dashboard/homeowner/messages", icon: <MessageSquare size={24} />, label: "Inbox" },
      { to: "/dashboard/homeowner/doors", icon: <DoorOpen size={24} />, label: "Doors" },
      { to: "/dashboard/homeowner/emergency-contacts", icon: <PhoneCall size={24} />, label: "Calls" },
      { to: "/dashboard/homeowner/safety", icon: <ShieldAlert size={24} />, label: "Panic", color: "text-rose-600", bg: "bg-rose-50" },
      { to: "/dashboard/homeowner/settings", icon: <Settings size={24} />, label: "Settings" },
      { to: "/billing/paywall", icon: <CreditCard size={24} />, label: "Billing" }
    ].filter((item) => {
      const requiredFeature = quickActionFeatureByRoute[item.to];
      return requiredFeature ? hasFeature(requiredFeature) : true;
    });
  }, [hasFeature, isEstateManagedHomeowner]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="bg-[#f8f9fa] min-h-screen pb-32 font-sans overflow-x-hidden">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-100 bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200">
              {firstName[0]}
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Home Security</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                {isFetching ? "Syncing..." : "Live Connection"}
              </p>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <Bell size={18} />
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </Link>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
        {/* Hero Section Redesign */}
        <section>
          <div className="mb-6">
            <h2 className="font-extrabold text-3xl text-slate-900 tracking-tight">{greeting}, {firstName}</h2>
            <p className="text-slate-500 text-sm font-medium">
              {isEstateManagedHomeowner
                ? `Your residence is covered by ${residentContext?.estateName || "your estate"} plan benefits.`
                : "Your residence is currently under protection."}
            </p>
          </div>

        {/* --- ADD THIS SECTION ABOVE THE HERO/BENTO SECTION --- */}

<section className="space-y-4">
  {/* Top Tier Action */}
  <Link
    to="/dashboard/resident/appointments"
    className="group w-full bg-indigo-600 hover:bg-indigo-700 p-4 rounded-[1.5rem] flex items-center justify-between transition-all shadow-xl shadow-indigo-100"
  >
    <div className="flex items-center gap-3">
      <div className="bg-white/20 p-2 rounded-xl text-white">
        <Users size={20} />
      </div>
      <span className="text-white font-bold text-sm tracking-tight">Invite New Guest</span>
    </div>
    <div className="bg-white/10 group-hover:bg-white/20 p-2 rounded-full transition-colors">
      <Unlock size={16} className="text-white" />
    </div>
  </Link>

  {/* Resident QR Card */}
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
    <div className="flex flex-col sm:flex-row">
      
      {/* Visual Side */}
      <div className="bg-slate-900 p-8 sm:w-1/2 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', size: '20px 20px' }}></div>
        
        <div className="relative z-10">
          <h3 className="text-white text-2xl font-extrabold leading-tight">Your Resident<br/>QR Code</h3>
        </div>
        
        <div className="mt-8 relative z-10">
          <p className="text-slate-400 text-xs font-medium mb-4">Use this code for quick entry and identity verification at all estate checkpoints.</p>
          <Link
            to="/dashboard/resident/doors"
            className="inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-900/50"
          >
            Show My Code
          </Link>
        </div>
      </div>

    

    </div>
  </div>
</section>

{/* --- THEN FOLLOWS YOUR PREVIOUS BENTO/STATS SECTION --- */}
        </section>

        {/* Quick Actions Grid */}
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="font-bold text-lg text-slate-800">Action Items</h3>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Quick Access</span>
          </div>
          <div className={`grid gap-4 ${isEstateManagedResident ? "grid-cols-3 md:grid-cols-6" : "grid-cols-4 md:grid-cols-8"}`}>
            {quickActions.map((item) => (
              <ActionIcon
                key={`${item.to}-${item.label}`}
                to={item.to}
                icon={item.icon}
                label={item.label}
                color={item.color}
                bg={item.bg}
              />
            ))}
          </div>
        </section>

        {/* Activity Feed */}
        <section className="space-y-6 pb-12">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">Recent Activity</h3>
            <Link to="/dashboard/resident/activity" className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">View All</Link>
          </div>
          <div className="space-y-3">
            {overview.activity?.length > 0 ? (
                overview.activity.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex-shrink-0 flex items-center justify-center text-indigo-600">
                            {item.event?.toLowerCase().includes('door') ? <Unlock size={18} /> : <Zap size={18} />}
                        </div>
                        <div className="flex-1 flex justify-between items-start">
                            <div className="space-y-0.5">
                                <p className="font-bold text-sm text-slate-900">{item.event}</p>
                                <p className="text-slate-500 text-xs leading-tight">{item.details || item.message}</p>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase ml-2 bg-slate-50 px-2 py-1 rounded-md">
                                {formatTime(item.createdAt || item.time)}
                            </span>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <p className="text-sm text-slate-500 font-medium italic">Your security timeline is clear.</p>
                </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Navigation Fix: Using fixed background and z-index to stay visible */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem to="/dashboard/resident/overview" icon={<LayoutGrid size={22} />} label="Home" active />
        <NavItem to="/dashboard/resident/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/resident/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
        <NavItem to="/dashboard/resident/messages" icon={<MessageSquare size={22} />} label="Inbox" />
        <NavItem to="/dashboard/resident/settings" icon={<User size={22} />} label="Profile" />
      </nav>
    </div>
  );
}

// Sub-components
function ActionIcon({ to, icon, label, color = "text-indigo-600", bg = "bg-white" }) {
    return (
        <Link to={to} className="flex flex-col items-center gap-2 group outline-none">
            <div className={`w-full aspect-square rounded-[1.3rem] ${bg} shadow-sm border border-slate-100 flex items-center justify-center ${color} group-hover:scale-105 group-active:scale-95 transition-all duration-200`}>
                {icon}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase text-center truncate w-full tracking-tighter">{label}</span>
        </Link>
    );
}

function NavItem({ to, icon, label, active = false }) {
    return (
        <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] transition-all active:scale-90 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : ''}`}>
              {icon}
            </div>
            <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{label}</span>
        </Link>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white flex-col gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <ShieldCheck className="absolute inset-0 m-auto text-indigo-600" size={24} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Establishing Secure Link</p>
        </div>
    );
}

function formatTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}
