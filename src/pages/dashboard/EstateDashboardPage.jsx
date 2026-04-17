import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Plus,
  UserPlus,
  Crown,
  Calendar,
  DoorOpen,
  MapPin,
  ChevronRight,
  Megaphone,
  Users,
  Vote,
  CreditCard,
  Wrench,
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  Building2,
  Home,
  ShieldCheck,
  QrCode,
  Settings,
  Shield,
  Network,
  ClipboardList,
  ArrowDown,
  ArrowUp
} from "lucide-react";
import { useNotifications } from "../../state/NotificationsContext";
import { useEstateNotifications } from "../../hooks/useEstateNotifications";
import { showError } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

const PRIMARY_TOOLKIT_ITEMS = [
  { label: "Broadcast", icon: <Megaphone size={20} />, to: "/dashboard/estate/broadcasts" },
  { label: "Meetings", icon: <Users size={20} />, to: "/dashboard/estate/meetings" },
  { label: "Polls", icon: <Vote size={20} />, to: "/dashboard/estate/polls" },
  { label: "Dues", icon: <CreditCard size={20} />, to: "/dashboard/estate/dues" },
  { label: "Repair", icon: <Wrench size={20} />, to: "/dashboard/estate/maintenance" },
  { label: "Stats", icon: <BarChart3 size={20} />, to: "/dashboard/estate/stats" }
];

const EXTRA_TOOLKIT_ITEMS = [
  { label: "Estates", icon: <Building2 size={20} />, to: "/dashboard/estate/create" },
  { label: "Homes", icon: <Home size={20} />, to: "/dashboard/estate/homes" },
  { label: "Doors", icon: <DoorOpen size={20} />, to: "/dashboard/estate/doors" },
  { label: "Residents", icon: <UserPlus size={20} />, to: "/dashboard/estate/invites" },
  { label: "Mappings", icon: <Network size={20} />, to: "/dashboard/estate/mappings" },
  { label: "Security", icon: <Shield size={20} />, to: "/dashboard/estate/security" },
  { label: "Logs", icon: <ClipboardList size={20} />, to: "/dashboard/estate/logs" },
  { label: "Settings", icon: <Settings size={20} />, to: "/dashboard/estate/settings" }
];

export default function EstateManagerDashboard() {
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
  const estateSecurityUsers = useMemo(
    () => (overview?.securityUsers ?? []).filter((row) => !currentEstateId || String(row.estateId) === String(currentEstateId)),
    [currentEstateId, overview]
  );

  const planRestrictions = overview?.planRestrictions ?? {};
  const subscription = overview?.subscription ?? {};
  const activeDoors = Number(planRestrictions.usedDoors ?? estateDoors.length ?? 0);
  const maxDoors = Math.max(Number(planRestrictions.maxDoors ?? 0), activeDoors, 1);
  const usedQrCodes = Number(planRestrictions.usedQrCodes ?? 0);
  const maxQrCodes = Math.max(Number(planRestrictions.maxQrCodes ?? 0), usedQrCodes, 1);
  const progressPercentage = Math.min(100, (activeDoors / maxDoors) * 100);
  const qrProgressPercentage = Math.min(100, (usedQrCodes / maxQrCodes) * 100);

  const analytics = overview?.analytics ?? {};
  const peakHour = analytics?.peakEntryTimes?.[0] ?? null;
  const busiestHome = analytics?.mostVisitedHouses?.[0] ?? null;

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

  const detailProgressItems = [
    {
      label: "Doors Configured",
      value: `${activeDoors} / ${maxDoors}`,
      helper: `${Math.max(maxDoors - activeDoors, 0)} slot${maxDoors - activeDoors === 1 ? "" : "s"} left`,
      percent: progressPercentage,
      tone: "indigo"
    },
    {
      label: "QR Codes Ready",
      value: `${usedQrCodes} / ${maxQrCodes}`,
      helper: `${Math.max(maxQrCodes - usedQrCodes, 0)} QR slot${maxQrCodes - usedQrCodes === 1 ? "" : "s"} left`,
      percent: qrProgressPercentage,
      tone: "sky"
    },
    {
      label: "Homes Added",
      value: `${estateHomes.length}`,
      helper: estateHomes.length ? "Estate properties connected" : "No homes added yet",
      percent: estateHomes.length ? 100 : 0,
      tone: "emerald"
    },
    {
      label: "Homeowners Added",
      value: `${estateHomeowners.length}`,
      helper: estateHomeowners.length ? "Estate homeowners available for mapping" : "Invite estate homeowners next",
      percent: estateHomeowners.length ? 100 : 0,
      tone: "amber"
    }
  ];

  const taskItems = [
    {
      icon: <DoorOpen size={18} />,
      title: "Door Coverage",
      subtitle: `${activeDoors}/${maxDoors} configured`,
      to: "/dashboard/estate/doors"
    },
    {
      icon: <MapPin size={18} />,
      title: "Resident Onboarding",
      subtitle: `${estateHomeowners.length} estate homeowners linked`,
      to: "/dashboard/estate/invites"
    },
    {
      icon: <QrCode size={18} />,
      title: "QR Provisioning",
      subtitle: `${usedQrCodes}/${maxQrCodes} live access codes`,
      to: "/dashboard/estate/doors"
    },
    {
      icon: <Shield size={18} />,
      title: "Security Team",
      subtitle: `${estateSecurityUsers.length} guard${estateSecurityUsers.length === 1 ? "" : "s"} active`,
      to: "/dashboard/estate/security"
    }
  ];

  const toolkitItems = showAllToolkit ? [...PRIMARY_TOOLKIT_ITEMS, ...EXTRA_TOOLKIT_ITEMS] : PRIMARY_TOOLKIT_ITEMS;

  return (
    <div className="bg-[#f8f9fa] text-slate-800 min-h-screen pb-32 font-sans overflow-x-hidden">
      <header className="backdrop-blur-xl border-b border-slate-100 fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 flex-shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <ShieldCheck size={18} className="text-indigo-600" />
          </div>
          <span className="text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate">
            {stats.estateName}
          </span>
        </div>
        <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-500 rounded-full flex-shrink-0">
          <Bell size={20} />
          {unreadCount > 0 ? <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" /> : null}
        </Link>
      </header>

      <main className="pt-24 px-4 md:px-6 max-w-5xl mx-auto space-y-8 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="min-w-0">
            <span className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-2 block">Executive Dashboard</span>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 truncate">Estate Overview</h1>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Link
              to="/dashboard/estate/create"
              className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-4 md:px-5 py-3 rounded-2xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={16} /> <span className="whitespace-nowrap">Estate</span>
            </Link>
            <Link
              to="/dashboard/estate/invites"
              className="flex-1 md:flex-none bg-indigo-600 text-white px-4 md:px-5 py-3 rounded-2xl text-xs md:text-sm font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <UserPlus size={16} /> <span className="whitespace-nowrap">Homeowner</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="md:col-span-7 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="min-w-0">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 flex-shrink-0">
                  <Crown size={22} fill="currentColor" fillOpacity={0.2} />
                </div>
                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${loading ? "bg-slate-50 text-slate-400 border-slate-100" : badgeToneForStatus(stats.status)}`}>
                  {loading ? "Syncing" : labelForStatus(stats.status)}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-1 truncate">{stats.estateName}</h3>
              <p className="text-slate-500 font-medium text-xs md:text-sm mb-6 md:mb-8">
                {toTitleCase(stats.tier)} management tier
              </p>
            </div>
            <div className="space-y-4 md:space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-black uppercase tracking-tighter text-[10px]">Active Doors</span>
                <span className="font-black text-slate-900 text-sm">{activeDoors} / {maxDoors}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${progressPercentage}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniDetail label="Homes" value={stats.portfolio.homes} />
                <MiniDetail label="Residents" value={stats.portfolio.residents} />
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                <Calendar size={12} /> <span>Expires {stats.expiryDate}</span>
              </div>
            </div>
          </div>


        </div>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] gap-4 md:gap-6">



        </section>

        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8 px-1">
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">Toolkit</h2>
            <button
              type="button"
              onClick={() => setShowAllToolkit((prev) => !prev)}
              className="inline-flex items-center gap-1 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em]"
            >
              {showAllToolkit ? "Show Less" : "View All"}
              {showAllToolkit ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-5">
            {toolkitItems.map((item) => (
              <ToolkitItem key={item.label} {...item} />
            ))}
          </div>
        </section>

        <section className="pb-4">
          <h2 className="text-xl md:text-2xl font-black tracking-tight mb-6 md:mb-8 px-1 text-slate-900">Assets</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            <AssetCard count={stats.portfolio.estates} label="Estates" icon={<Building2 size={18} />} primary />
            <AssetCard count={stats.portfolio.homes} label="Homes" icon={<Home size={18} />} />
            <AssetCard count={stats.portfolio.doors} label="Doors" icon={<DoorOpen size={18} />} />
            <AssetCard count={stats.portfolio.residents} label="Residents" icon={<Users size={18} />} />
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 py-3 pb-8 bg-white/95 backdrop-blur-md border-t border-slate-100 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <BottomNavLink to="/dashboard/estate" icon={<LayoutDashboard size={20} />} label="Overview" active />
        <BottomNavLink to="/dashboard/estate/invites" icon={<Users size={20} />} label="Residents" />
        <BottomNavLink to="/dashboard/estate/broadcasts" icon={<MessageSquare size={20} />} label="Chat" />
        <BottomNavLink to="/dashboard/estate/settings" icon={<Wrench size={20} />} label="Tools" />
      </nav>
    </div>
  );
}

function TaskItem({ icon, title, subtitle, to }) {
  return (
    <Link to={to} className="bg-white p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center gap-4 border border-transparent hover:border-indigo-100 transition-all active:scale-[0.98]">
      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-[13px] md:text-sm text-slate-900 truncate">{title}</h4>
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </Link>
  );
}

function ToolkitItem({ icon, label, to }) {
  return (
    <Link
      to={to}
      className="group bg-white p-5 md:p-7 rounded-[1.8rem] md:rounded-[2.5rem] text-center hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 shadow-sm active:scale-95 flex flex-col items-center justify-center"
    >
      <div className="mb-2 text-indigo-600 transition-colors group-hover:text-white">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    </Link>
  );
}

function AssetCard({ count, label, icon, primary = false }) {
  return (
    <div className="bg-white p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
      <div className={`mb-3 p-2 rounded-lg ${primary ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"}`}>
        {icon}
      </div>
      <span className={`text-3xl md:text-5xl font-black mb-1 tracking-tighter ${primary ? "text-indigo-600" : "text-slate-900"}`}>{count}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

function BottomNavLink({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 flex-1 transition-all active:scale-90 ${active ? "text-indigo-600" : "text-slate-400"}`}>
      <div className={`${active ? "bg-indigo-50 p-2 rounded-xl" : "p-2"}`}>{icon}</div>
      <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
    </Link>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function ProgressDetailRow({ label, value, helper, percent, tone }) {
  const barClassName = {
    indigo: "bg-indigo-600",
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500"
  }[tone] || "bg-indigo-600";

  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
        </div>
        <p className="text-base font-black text-slate-900 whitespace-nowrap">{value}</p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`${barClassName} h-full rounded-full transition-all duration-1000`} style={{ width: `${Math.max(6, percent)}%` }} />
      </div>
    </div>
  );
}

function SignalCard({ label, value, helper }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 border border-slate-100 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-900 truncate">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatHour(hour) {
  if (!Number.isFinite(Number(hour))) return "N/A";
  const date = new Date();
  date.setHours(Number(hour), 0, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
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
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }
  if (value === "grace_period" || value === "payment_pending") {
    return "bg-amber-50 text-amber-600 border-amber-100";
  }
  return "bg-rose-50 text-rose-600 border-rose-100";
}
