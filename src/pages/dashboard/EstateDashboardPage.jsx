import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  CircleHelp,
  Plus,
  UserPlus,
  Crown,
  Calendar,
  DoorOpen,
  Megaphone,
  Users,
  Vote,
  CreditCard,
  Wrench,
  BarChart3,
  Building2,
  Home,
  ShieldCheck,
  Settings,
  Shield,
  ClipboardList,
  ArrowDown,
  ArrowUp,
  HardHat
} from "lucide-react";
import { useNotifications } from "../../state/NotificationsContext";
import { useEstateNotifications } from "../../hooks/useEstateNotifications";
import { showError } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

const PRIMARY_TOOLKIT_ITEMS = [
  { label: "Broadcast", icon: <Megaphone size={18} />, to: "/dashboard/estate/broadcasts" },
  { label: "Meetings", icon: <Users size={18} />, to: "/dashboard/estate/meetings" },
  { label: "Polls", icon: <Vote size={18} />, to: "/dashboard/estate/polls" },
  { label: "Dues", icon: <CreditCard size={18} />, to: "/dashboard/estate/dues" },
  { label: "Repair", icon: <Wrench size={18} />, to: "/dashboard/estate/maintenance" },
  { label: "Stats", icon: <BarChart3 size={18} />, to: "/dashboard/estate/stats" }
];

const EXTRA_TOOLKIT_ITEMS = [
  { label: "Estates", icon: <Building2 size={18} />, to: "/dashboard/estate/create" },
  { label: "Residents", icon: <UserPlus size={18} />, to: "/dashboard/estate/invites" },
  { label: "Security", icon: <Shield size={18} />, to: "/dashboard/estate/security" },
  { label: "Logs", icon: <ClipboardList size={18} />, to: "/dashboard/estate/logs" },
  { label: "Artisans", icon: <HardHat size={18} />, to: "/dashboard/estate/artisans" },
  { label: "Settings", icon: <Settings size={18} />, to: "/dashboard/estate/settings" }
];

export default function EstateManagerDashboard() {
  const location = useLocation();
  const { overview, estateId, setEstateId, loading, error } = useEstateOverviewState();
  const { unreadCount } = useEstateNotifications(estateId);
  const [showAllToolkit, setShowAllToolkit] = useState(false);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const estates = overview?.estates ?? [];
  const currentEstate = useMemo(() => {
    if (!estates.length) return null;
    return estates.find((row) => String(row.id) === String(estateId)) ?? estates[0];
  }, [estateId, estates]);

  useEffect(() => {
    if (!estateId && currentEstate?.id) {
      setEstateId(currentEstate.id);
    }
  }, [currentEstate, estateId, setEstateId]);

  const currentEstateId = currentEstate?.id ?? "";
  const estateHomes = useMemo(
    () => (overview?.homes ?? []).filter((row) => !currentEstateId || String(row.estateId) === String(currentEstateId)),
    [currentEstateId, overview]
  );
  const estateHomeIds = useMemo(() => new Set(estateHomes.map((row) => String(row.id))), [estateHomes]);
  const estateDoors = useMemo(
    () => (overview?.doors ?? []).filter((row) => estateHomeIds.has(String(row.homeId))),
    [estateHomeIds, overview]
  );
  const homeownerIds = useMemo(
    () => new Set(estateHomes.map((row) => String(row.homeownerId || "")).filter(Boolean)),
    [estateHomes]
  );
  const estateHomeowners = useMemo(
    () => (overview?.homeowners ?? []).filter((row) => homeownerIds.has(String(row.id))),
    [homeownerIds, overview]
  );

  const planRestrictions = overview?.planRestrictions ?? {};
  const subscription = overview?.subscription ?? {};
  const maxHomes = Math.max(Number(planRestrictions.maxHomes ?? 0), estateHomes.length, 1);
  const homeProgressPercentage = Math.min(100, (estateHomes.length / maxHomes) * 100);

  const stats = useMemo(
    () => ({
      estateName: currentEstate?.name || "No estate yet",
      tier: subscription?.planName || subscription?.plan || "Standard",
      status: subscription?.status || "inactive",
      expiryDate: formatDate(subscription?.expiresAt ?? subscription?.endsAt ?? subscription?.currentPeriodEnd),
      portfolio: {
        estates: estates.length,
        homes: estateHomes.length,
        doors: estateDoors.length,
        residents: estateHomeowners.length
      }
    }),
    [currentEstate, estateDoors.length, estateHomeowners.length, estateHomes.length, estates.length, subscription]
  );

  const toolkitItems = showAllToolkit ? [...PRIMARY_TOOLKIT_ITEMS, ...EXTRA_TOOLKIT_ITEMS] : PRIMARY_TOOLKIT_ITEMS;

  return (
    <div className="bg-white text-slate-900 min-h-screen pb-40 font-sans">
      {/* Top Minimalist Header */}
      <header className="fixed top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 h-20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/50">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block leading-tight mb-0.5">Portal</span>
            <span className="text-base font-bold text-slate-900 tracking-tight block truncate max-w-[180px] sm:max-w-xs">
              {stats.estateName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/onboarding" 
            aria-label="Getting Started" 
            className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors border border-slate-100 shadow-sm"
          >
            <CircleHelp size={20} />
          </Link>
          <Link 
            to="/dashboard/notifications" 
            aria-label="Notifications" 
            className="relative p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors border border-slate-100 shadow-sm"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full" />
            )}
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-28 px-6 max-w-3xl mx-auto space-y-8">
        
        {/* Title & Quick Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Overview</h1>
            <p className="text-sm text-slate-400 mt-0.5">Manage your estate properties & operations</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/estate/create"
              className="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-700 px-5 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-slate-200/60 shadow-sm"
            >
              <Plus size={18} className="text-slate-400" /> <span>Estate</span>
            </Link>
            <Link
              to="/dashboard/estate/invites"
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> <span>Resident</span>
            </Link>
          </div>
        </div>

        {/* Clean Subscription Card */}
        <div className="bg-slate-50/70 p-7 sm:p-8 rounded-[2.5rem] border border-slate-100 space-y-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white shadow-sm rounded-2xl text-blue-600 border border-slate-100">
                <Crown size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{stats.estateName}</h3>
                <p className="text-xs text-slate-500 font-medium">{toTitleCase(stats.tier)} Plan</p>
              </div>
            </div>
            <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide border ${loading ? "bg-slate-100 text-slate-400 border-slate-200" : badgeToneForStatus(stats.status)}`}>
              {loading ? "Syncing..." : labelForStatus(stats.status)}
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Capacity Used</span>
              <span className="font-bold text-slate-800">{estateHomes.length} of {maxHomes} homes</span>
            </div>
            <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full transition-all duration-500 rounded-full" 
                style={{ width: `${homeProgressPercentage}%` }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <MiniDetail label="Total Homes" value={stats.portfolio.homes} />
            <MiniDetail label="Total Residents" value={stats.portfolio.residents} />
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium pt-1">
            <Calendar size={15} className="text-blue-500" /> 
            <span>Renews / Expires {stats.expiryDate}</span>
          </div>
        </div>

        {/* Toolkit Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Toolkit</h2>
            <button
              type="button"
              onClick={() => setShowAllToolkit((prev) => !prev)}
              className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-blue-50/50 transition-colors"
            >
              {showAllToolkit ? "Show Less" : "View All"}
              {showAllToolkit ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {toolkitItems.map((item) => (
              <ToolkitItem key={item.label} {...item} />
            ))}
          </div>
        </section>

      </main>

      {/* Floating Minimalist Bottom Navigation */}
      <nav className="fixed bottom-6 left-5 right-5 z-50 max-w-md mx-auto bg-white/95 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-2xl shadow-slate-300/50 px-4 py-3">
        <div className="flex items-center justify-around gap-2">
          <BottomNavLink
            to="/dashboard/estate"
            icon={<Home size={22} />}
            label="Home"
            active={location.pathname === "/dashboard/estate"}
          />
          <BottomNavLink
            to="/dashboard/estate/create"
            icon={<Plus size={22} />}
            label="Create"
            active={location.pathname === "/dashboard/estate/create"}
          />
          <BottomNavLink
            to="/dashboard/estate/logs"
            icon={<ClipboardList size={22} />}
            label="Logs"
            active={location.pathname === "/dashboard/estate/logs"}
          />
          <BottomNavLink
            to="/dashboard/estate/settings"
            icon={<Settings size={22} />}
            label="Settings"
            active={location.pathname === "/dashboard/estate/settings"}
          />
        </div>
      </nav>
    </div>
  );
}

function ToolkitItem({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-200/80 active:scale-95 p-3 rounded-2xl text-center transition-all border border-slate-100 flex flex-col items-center justify-center gap-1.5 group shadow-xs"
    >
      <div className="p-2 rounded-xl bg-white text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-100/50 transition-all border border-slate-100">
        {icon}
      </div>
      <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-700 transition-colors tracking-tight">{label}</span>
    </Link>
  );
}

function BottomNavLink({ to, icon, label, active = false }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center flex-1 py-2 px-3 rounded-2xl transition-all active:scale-95 ${
        active ? "text-blue-600 bg-blue-50/80 font-bold shadow-xs border border-blue-100/50" : "text-slate-400 hover:text-slate-600 font-medium"
      }`}
    >
      {icon}
      <span className="text-[11px] tracking-tight mt-1">{label}</span>
    </Link>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function toTitleCase(value) {
  return String(value || "standard")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function labelForStatus(status) {
  const value = String(status || "inactive").trim().toLowerCase();
  if (!value) return "Inactive";
  return value.replace(/_/g, " ");
}

function badgeToneForStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "active" || value === "trial" || value === "expiring_soon") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
  }
  if (value === "grace_period" || value === "payment_pending") {
    return "bg-amber-50 text-amber-700 border-amber-200/60";
  }
  return "bg-rose-50 text-rose-700 border-rose-200/60";
}