import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Bell, Car, UserCheck, Shield, Clock, MapPin, User } from "lucide-react";
import { getEstateAccessLogs, getEstateAccessLogsSnapshot } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";
import { showError } from "../../utils/flash";

export default function EstateLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState(() => getEstateAccessLogsSnapshot() ?? []);
  const [category, setCategory] = useState("visitors");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !getEstateAccessLogsSnapshot());

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getEstateAccessLogs({ category });
        if (!mounted) return;
        setLogs(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load access logs");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [category]);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const approvedCount = logs.filter((log) => 
    String(log.status || log.action || "").toLowerCase().includes("approved")
  ).length;

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 antialiased pb-16 selection:bg-[#4955b3] selection:text-white">
      {/* Mobile-First Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          {/* Back Navigation */}
          <button
            type="button"
            onClick={() => navigate("/dashboard/estate")}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4955b3] transition-colors hover:bg-indigo-50 active:bg-indigo-100"
            aria-label="Go back to Estate Dashboard"
          >
            <ArrowLeft size={22} />
          </button>

          {/* Title */}
          <div className="flex flex-col items-center">
            <h1 className="text-sm font-bold text-slate-900 sm:text-base">Access Logs</h1>
            <span className="text-[10px] font-medium text-slate-400">Real-time Activity</span>
          </div>

          {/* Notification Button */}
          <Link
            to="/dashboard/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>

        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 space-y-4">
        
        {/* Metric Bar & Category Filter Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          
          {/* Compact Stat Badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Total:</span>
              <span className="text-xs font-bold text-slate-900">{logs.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-600">Approved:</span>
              <span className="text-xs font-bold text-emerald-700">{approvedCount}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              ["visitors", "Visitors"],
              ["vehicles", "Vehicles"],
              ["all", "All Logs"]
            ].map(([value, label]) => {
              const isActive = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
                    isActive
                      ? "bg-[#4955b3] text-white shadow-sm shadow-indigo-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

        </div>

        {/* Loading State */}
        {loading && <PageSkeleton blocks={4} />}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
            No access logs found for this filter.
          </div>
        )}

        {/* Access Log Responsive Cards Grid */}
        {!loading && logs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {logs.map((log) => {
              const isVehicle = log.category === "vehicle";
              const isApproved = String(log.status || log.action || "").toLowerCase().includes("approved");

              return (
                <article
                  key={log.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all active:scale-[0.99] hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isVehicle ? "bg-indigo-50 text-[#4955b3]" : "bg-emerald-50 text-emerald-600"
                        }`}>
                          {isVehicle ? <Car size={18} /> : <UserCheck size={18} />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                            {isVehicle ? "Vehicle" : "Visitor"}
                          </span>
                          <h2 className="text-sm font-bold text-slate-900 truncate max-w-[150px] sm:max-w-[180px]">
                            {isVehicle ? log.vehiclePlate || "Vehicle" : log.visitor || "Visitor"}
                          </h2>
                        </div>
                      </div>

                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {log.status || log.action || "Logged"}
                      </span>
                    </div>

                    {/* Compact Key-Value Grid */}
                    <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                      {isVehicle ? (
                        <>
                          <CompactMetric icon={<MapPin size={12} />} label="Home" value={log.homeName || "N/A"} />
                          <CompactMetric icon={<User size={12} />} label="Resident" value={log.residentName || "N/A"} />
                          <CompactMetric icon={<Shield size={12} />} label="Gate" value={log.gateId || "N/A"} />
                          <CompactMetric icon={<User size={12} />} label="Guard" value={log.guardName || "Security"} />
                          <CompactMetric icon={<Clock size={12} />} label="Time" value={log.timestamp ? formatLogTime(log.timestamp) : "N/A"} spanFull />
                        </>
                      ) : (
                        <>
                          <CompactMetric icon={<Shield size={12} />} label="Door" value={log.doorName || "N/A"} />
                          <CompactMetric icon={<MapPin size={12} />} label="Home" value={log.homeName || "N/A"} />
                          <CompactMetric icon={<Clock size={12} />} label="Time" value={log.startedAt ? formatLogTime(log.startedAt) : "N/A"} spanFull />
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}

function CompactMetric({ label, value, icon, spanFull = false }) {
  return (
    <div className={`rounded-xl bg-slate-50 p-2 ${spanFull ? "col-span-2" : ""}`}>
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function formatLogTime(val) {
  const d = new Date(val);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}