import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Search, SlidersHorizontal, Users, Clock, CheckCircle } from "lucide-react";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficeVisitorRow from "../../../components/office/OfficeVisitorRow";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";

const QUERY_KEY = ["office", "visitors"];

export default function OfficeVisitorsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active"); // "active" | "completed" | "all"
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Map our segmented tabs to specific database statuses
  const apiStatus = useMemo(() => {
    if (status) return status; // Manual dropdown override takes priority
    if (activeTab === "active") return "checked_in";
    if (activeTab === "completed") return "checked_out";
    return undefined;
  }, [activeTab, status]);

  const config = useMemo(() => ({ 
    params: { 
      search: search || undefined, 
      status: apiStatus || undefined 
    } 
  }), [search, apiStatus]);

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: [...QUERY_KEY, search, apiStatus],
    url: endpoints.office.visitors,
    config,
    refetchInterval: 20000
  });

  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visit.checked_in",
    "office.visit.checked_out"
  ]);

  const rows = data?.items || [];

  // Compute live analytics for the KPI header
  const stats = useMemo(() => {
    return {
      totalCount: rows.length,
      checkedIn: rows.filter(r => r.status === "checked_in").length,
      checkedOut: rows.filter(r => r.status === "checked_out").length
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <OfficeLoadingState />
      </div>
    );
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="bg-[#fafafa] min-h-screen font-sans text-slate-900 antialiased pb-28">
      
      {/* HEADER BAR */}
      <header className="w-full bg-white/70 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base text-slate-950 tracking-tight">Visitor History</h1>
              <p className="text-[11px] text-slate-400 font-medium">Global Access Records</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sync Data</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isError && (
          <OfficeErrorBanner message={error?.message || "Unable to load visitor records."} onRetry={() => refetch()} />
        )}

        {/* BENTO BLOCK: KEY PERFORMANCE INDICATORS */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[90px]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Users className="h-3 w-3 text-slate-400" />
              <span>Loaded Log</span>
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1 text-center">{stats.totalCount}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[90px]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>Active</span>
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1 text-center">{stats.checkedIn}</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between min-h-[90px]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span>Completed</span>
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 mt-1 text-center">{stats.checkedOut}</span>
          </div>
        </div>

        {/* SEARCH & FILTERS PANEL */}
        <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
          
          {/* Custom iOS-Inspired Segmented Control */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1 border border-slate-100">
            <button
              type="button"
              onClick={() => { setActiveTab("active"); setStatus(""); }}
              className={`rounded-lg py-2 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] ${
                activeTab === "active" && !status
                  ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100"
                  : "text-slate-400 hover:text-slate-600 border border-transparent"
              }`}
            >
              On-Site
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("completed"); setStatus(""); }}
              className={`rounded-lg py-2 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] ${
                activeTab === "completed" && !status
                  ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100"
                  : "text-slate-400 hover:text-slate-600 border border-transparent"
              }`}
            >
              Departed
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("all"); setStatus(""); }}
              className={`rounded-lg py-2 text-xs font-semibold tracking-tight transition-all active:scale-[0.98] ${
                activeTab === "all" && !status
                  ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100"
                  : "text-slate-400 hover:text-slate-600 border border-transparent"
              }`}
            >
              All Records
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="Search visitor names, numbers, or motives..." 
                className="w-full rounded-xl border border-slate-200/80 bg-[#fafafa]/50 py-2.5 pl-10 pr-4 text-xs font-medium outline-none transition focus:border-slate-400 focus:bg-white" 
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-[0.98] ${
                showAdvanced 
                  ? "border-slate-950 bg-slate-950 text-white" 
                  : "border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50"
              }`}
              title="Advanced Filter Settings"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Collapsible Advanced Parameters */}
          {showAdvanced && (
            <div className="pt-3 border-t border-slate-50 animate-fadeIn">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Exact Status Override</label>
                <select 
                  value={status} 
                  onChange={(event) => setStatus(event.target.value)} 
                  className="w-full appearance-none rounded-xl border border-slate-200/80 bg-[#fafafa]/50 px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  <option value="">Use timeline selection above</option>
                  <option value="pending">Pending Queue</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* FEED MATRIX */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-50 pb-4">
            <div>
              <h3 className="font-semibold text-sm text-slate-950 tracking-tight capitalize">
                {status ? status.replace('_', ' ') : activeTab} Feed
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {rows.length === 0 ? 'No sessions match this filter' : `${rows.length} session${rows.length === 1 ? "" : "s"} found`}
              </p>
            </div>
            <span className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-slate-200" />
          </div>

          {/* Interactive Row Grid */}
          <div className="space-y-3">
            {rows.length > 0 ? rows.map((item) => (
              <div 
                key={item.id} 
                className="group relative rounded-xl border border-slate-100/50 bg-[#fafafa]/30 p-4 transition-all duration-200 hover:border-slate-200/60 hover:bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.01)]"
              >
                <OfficeVisitorRow item={item} />
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-slate-100 p-8">
                <OfficeEmptyState title="Log Empty" description="All historical traffic matching these parameters will populate here." />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}