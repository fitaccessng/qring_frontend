import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Bell,
  ShieldCheck,
  TrendingUp,
  ThumbsUp,
  Download,
  Building2,
  Users,
  CreditCard,
  Lock,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { getEstateStatsSummary, getEstateStatsSummarySnapshot } from "../../services/estateService";
import useSubscription from "../../hooks/useSubscription";
import { isSubscriptionEntitled } from "../../utils/subscription";

export default function EstateStatsPage() {
  const navigate = useNavigate();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const [summary, setSummary] = useState(() => getEstateStatsSummarySnapshot());
  const [loading, setLoading] = useState(() => !getEstateStatsSummarySnapshot());
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstateStatsSummary();
        if (!active) return;
        setSummary(data);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load stats");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    return {
      totalVisits: summary?.summary?.totalVisits ?? 0,
      approved: summary?.summary?.approved ?? 0,
      rejected: summary?.summary?.rejected ?? 0,
      activeHomes: summary?.summary?.activeHomes ?? 0,
      activeDoors: summary?.summary?.activeDoors ?? 0,
      residents: summary?.summary?.residents ?? 0,
    };
  }, [summary]);

  const entitled = isSubscriptionEntitled(subscription, { requiredFeature: "analytics" });
  const restricted = !subscriptionLoading && !entitled && !loading && !summary && Boolean(error);

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">

      {/* --- STICKY GLASS HEADER --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Estate Stats</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Analytics & Metrics</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-6 px-4 max-w-7xl mx-auto w-full space-y-6 flex-1">

        {/* --- TITLE & ACTION SEGMENTS --- */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
          <div>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">
              {loading ? "Refreshing Database..." : "Live Performance Monitor"}
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Operational Analytics</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 max-w-md leading-relaxed">
              Real-time audit records, traffic behavior, and community density summaries.
            </p>
          </div>

          {!restricted && (
            <div className="flex items-center gap-2 shrink-0">
              <button className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-50 dark:hover:bg-slate-850 transition-all active:scale-95">
                Last 30 Days
              </button>
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shadow-md shadow-indigo-500/10 active:scale-95 transition-all">
                <Download size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </section>

        {restricted ? (
          /* --- RESTRICTED / PAYWALL LAYER --- */
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100/50 dark:border-slate-800/45 shadow-sm text-center flex flex-col items-center max-w-lg mx-auto mt-8">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
              <Lock size={24} />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Analytics unavailable</h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xs mx-auto leading-relaxed">
              Your current access does not include estate analytics yet. If you are in a free trial, this access should be available automatically.
            </p>
            <Link
              to="/billing/paywall"
              className="mt-6 w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95"
            >
              Review plan
            </Link>
          </section>
        ) : (
          <>
            {/* --- BENTO METRICS GRID --- */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1: Total Residents */}
              <div className="bg-indigo-50 dark:bg-indigo-500/5 p-5 rounded-3xl border border-indigo-100/40 dark:border-indigo-500/10 flex flex-col justify-between min-h-[145px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/20 dark:border-indigo-500/10 shadow-sm z-10">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-100/50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                    Verified
                  </span>
                </div>
                <div className="z-10 mt-3">
                  <p className="text-indigo-500/70 dark:text-indigo-400/50 text-[10px] font-bold uppercase tracking-wider">Total Residents</p>
                  <p className="text-2xl font-black text-indigo-950 dark:text-white mt-0.5">{stats.residents}</p>
                </div>
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
              </div>

              {/* Card 2: Total Visits */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col justify-between min-h-[145px] shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-slate-450 dark:text-slate-400 border border-slate-100/50 dark:border-slate-800 shadow-sm">
                    <TrendingUp size={18} />
                  </div>
                  <span className="text-[8px] font-extrabold text-emerald-650 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/5 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Check-Ins</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalVisits}</p>
                </div>
              </div>

              {/* Card 3: Approval Ratio */}
              <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-5 rounded-3xl border border-emerald-100/40 dark:border-emerald-500/10 flex flex-col justify-between min-h-[145px] relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-emerald-600 dark:text-emerald-450 border border-emerald-100/20 dark:border-emerald-500/10 shadow-sm z-10">
                    <ThumbsUp size={18} />
                  </div>
                </div>
                <div className="z-10 mt-3">
                  <p className="text-emerald-600/70 dark:text-emerald-400/50 text-[10px] font-bold uppercase tracking-wider">Approval Rate</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {stats.totalVisits > 0 ? Math.round((stats.approved / stats.totalVisits) * 100) : 0}%
                  </p>
                </div>
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              </div>
            </section>

            {/* --- OPERATIONAL HEALTH CHART & ACTIVITY SHEET --- */}
         
            {/* --- FOOTER CARD METRICS --- */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <InsightCard label="Active Homes" val={stats.activeHomes} icon={<Building2 size={16} />} color="indigo" />
              <InsightCard label="Access Points" val={stats.activeDoors} icon={<CreditCard size={16} />} color="emerald" />
              <InsightCard label="Approved Today" val={stats.approved} icon={<Users size={16} />} color="slate" />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* --- ADAPTED INSIGHT CARD --- */
function InsightCard({ label, val, icon, color }) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100/20",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-100/20",
    },
    slate: {
      bg: "bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-slate-100/50",
    }
  };

  const activeTheme = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${activeTheme.bg}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none">{val}</h4>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">{label}</p>
      </div>
    </div>
  );
}