import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  ScanLine, 
  ShieldCheck, 
  QrCode,
  ArrowUpRight,
  Clock,
  UserPlus,
  Users,
  MessageSquare,
  Settings,
  ShieldAlert,
  Compass,
  Unlock,
  Zap,
  Bell
} from "lucide-react";

import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { useAuth } from "../../../state/AuthContext";
import { OfficeEmptyState, OfficeErrorBanner } from "../../../components/office/OfficeStates";
import OfficeVisitorRow from "../../../components/office/OfficeVisitorRow";

const QUERY_KEY = ["office", "overview"];

// Dynamic icon mapper matching backend label descriptions seamlessly
const getActionIcon = (label = "") => {
  const norm = label.toLowerCase();
  if (norm.includes("queue") || norm.includes("visitor")) return Users;
  if (norm.includes("msg") || norm.includes("message") || norm.includes("chat")) return MessageSquare;
  if (norm.includes("alert") || norm.includes("security")) return ShieldAlert;
  if (norm.includes("setting") || norm.includes("config")) return Settings;
  return Compass;
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

export default function OfficeOverviewPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useApiQuery({
    queryKey: QUERY_KEY,
    url: endpoints.office.overview,
    refetchInterval: 30000
  });

  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visitor_request.approved",
    "office.visitor_request.rejected"
  ]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const displayName = useMemo(() => {
    return user?.fullName?.split(" ")[0] || user?.username?.trim() || "Team";
  }, [user?.fullName, user?.username]);

  const overview = data ?? {};
  const office = overview.office ?? {};
  const officeStaffCapabilities = Array.isArray(overview?.roleCapabilities?.office_staff)
    ? overview.roleCapabilities.office_staff
    : [];
  const showOfficeStaffCapabilities = user?.role === "office_staff" && officeStaffCapabilities.length > 0;

  if (isLoading) return <LoadingState />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-brand-500/10 selection:text-brand-600 pb-24">
      
      {/* Sticky App Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 safe-top">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white dark:bg-slate-900">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm sm:text-base tracking-tight text-slate-900">Office Hub</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                <p className="text-[10px] text-slate-500 font-medium uppercase">
                  {isFetching ? "Syncing..." : "Live System"}
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => refetch()} 
            className="p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all"
            title="Force refresh"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="pt-24 px-4 sm:px-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {isError && (
          <OfficeErrorBanner message={error?.message || "Unable to update overview metrics."} onRetry={() => refetch()} />
        )}

        {/* Welcome Section */}
        <section>
          <h2 className="font-bold text-2xl sm:text-3xl md:text-4xl text-slate-900 tracking-tight">
            {greeting}, <span className="text-blue-600 font-extrabold">{displayName}</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            {office.companyName 
              ? `Managing access control configurations for ${office.companyName}.` 
              : "System initialization operational and secure today."}
          </p>
        </section>

        {/* Combined Action & Showcase Card Container */}
        {office.companyName ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="w-full"
          >
            <motion.div 
              variants={itemVariants}
              className="bg-slate-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden border border-slate-800"
            >
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Gatekeeper System
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold mt-3 tracking-tight">
                    {office.companyName}
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm max-w-xl mt-1.5 leading-relaxed">
                    Visitors scan your specific entrance QR code at terminal reception areas to execute automated logging and instant verified host pings.
                  </p>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl text-slate-300 hidden sm:block border border-slate-800">
                  <ScanLine className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />
                </div>
              </div>

              {/* Quick Navigation Buttons Layout */}
              <div className="relative z-10 mt-6 flex flex-col sm:flex-row items-stretch gap-3">
                <Link
                  to="/dashboard/office/qr"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3.5 rounded-xl transition-all whitespace-nowrap group"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show Gateway QR</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                
                <Link
                  to="/dashboard/office/qr"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-3.5 rounded-xl border border-slate-800 transition-all whitespace-nowrap group"
                >
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>Create Pre-Invite</span>
                  <Unlock className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <OfficeEmptyState title="Office configuration missing" description="Configure your system profile setup to access registry tools." />
        )}

        {showOfficeStaffCapabilities ? (
          <motion.section
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Staff Feature Panel</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Office staff capabilities loaded from the backend role profile.
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                office_staff
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {officeStaffCapabilities.map((group) => (
                <motion.article
                  key={group.key}
                  variants={itemVariants}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
                        {group.key.replace(/_/g, " ")}
                      </p>
                      <h4 className="mt-1 text-sm font-bold text-slate-900">{group.label}</h4>
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(group.items || []).map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.section>
        ) : null}

        {/* Quick Short-cut Matrix */}
        {overview.quickActions && overview.quickActions.length > 0 && (
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Shortcuts Menu</h3>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {overview.quickActions.map((action) => {
                const IconComponent = getActionIcon(action.label);
                return (
                  <Link 
                    key={action.to}
                    to={action.to} 
                    className="flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-200/60 group transition-all duration-200 active:scale-95"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5 bg-slate-50 border border-slate-100 text-slate-700 group-hover:text-blue-600">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 text-center truncate w-full tracking-tight">
                      {action.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Log Entries Timeline */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Live Activity Log</h3>
            <Link 
              to="/dashboard/office/visitors" 
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 tracking-tight flex items-center gap-0.5 group"
            >
              <span>View Logs Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(overview.recentQueue || []).length > 0 ? (
              overview.recentQueue.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 bg-white rounded-2xl border border-slate-200/60 transition-all duration-150 hover:shadow-sm"
                >
                  <OfficeVisitorRow item={item} />
                </div>
              ))
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
                <p className="text-sm text-slate-400 font-medium italic">No recent traffic signals logged.</p>
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
        Securing Environment...
      </p>
    </div>
  );
}
