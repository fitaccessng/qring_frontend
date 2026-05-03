import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, ShieldCheck, TrendingUp, ThumbsUp,
  Download, CreditCard, Building2, Users, LayoutDashboard,
  Settings, Lock
} from 'lucide-react';
import { getEstateStatsSummary, getEstateStatsSummarySnapshot } from "../../services/estateService";

export default function EstateStatsPage() {
  const navigate = useNavigate();
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

  const restricted = !loading && !summary && Boolean(error);

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans selection:bg-indigo-100 pb-32">

      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-slate-100">
        <div className="flex justify-between items-center px-4 h-16 max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[#2b3437] font-black tracking-tight text-lg">Estate Stats</h1>
          <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
            <Bell size={22} strokeWidth={2.5} />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
          </button>
        </div>
      </header>

      <main className="pt-24 px-5 max-w-7xl mx-auto w-full">

        {/* --- PAGE TITLE & ACTIONS --- */}
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[#4955b3] font-bold tracking-[0.15em] uppercase text-[10px] mb-1 block">
              {loading ? "Refreshing..." : "Analytics Dashboard"}
            </span>
            <h2 className="text-4xl font-black tracking-tight text-[#2b3437]">Performance</h2>
          </div>

          {!restricted && (
            <div className="flex items-center gap-2">
              <button className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm active:scale-95 transition-transform">
                Last 30 Days
              </button>
              <button className="bg-[#4955b3] text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-transform">
                <Download size={18} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </section>

        {restricted ? (
          /* --- PAYWALL STATE --- */
          <section className="bg-white p-8 rounded-[3rem] border border-amber-100 shadow-xl shadow-amber-900/5 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-6">
              <Lock size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Upgrade Required</h2>
            <p className="mt-3 text-slate-500 max-w-md mx-auto leading-relaxed">
              Analytics are not available on your current plan. Upgrade to unlock visitor flow, trend reporting, and performance insights.
            </p>
            <Link
              to="/billing/paywall"
              className="mt-8 bg-[#2b3437] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-200 active:scale-95 transition-all"
            >
              Upgrade Now
            </Link>
          </section>
        ) : (
          <>
            {/* --- BENTO METRICS GRID --- */}
            <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <div className="col-span-2 bg-[#dfe0ff] p-6 rounded-[2.5rem] flex flex-col justify-between h-48 border border-indigo-100 relative overflow-hidden">
                <div className="p-2 bg-white/50 w-fit rounded-xl text-[#4955b3] z-10"><ShieldCheck size={20} /></div>
                <div className="z-10">
                  <h3 className="text-3xl font-black text-[#3b48a6]">{stats.residents}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#4652b0] opacity-70">Total Residents</p>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-400/10 rounded-full blur-2xl" />
              </div>

              <div className="col-span-2 bg-white p-6 rounded-[2.5rem] flex flex-col justify-between h-48 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-slate-50 w-fit rounded-xl text-slate-400"><TrendingUp size={20} /></div>
                  <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">LIVE</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[#2b3437]">{stats.totalVisits}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Visits</p>
                </div>
              </div>

              <div className="col-span-2 bg-[#85f6e5]/30 p-6 rounded-[2.5rem] flex flex-col justify-between h-48 border border-[#85f6e5]/50">
                <div className="p-2 bg-white/50 w-fit rounded-xl text-[#006b61]"><ThumbsUp size={20} /></div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-[#005c53]">
                      {stats.totalVisits > 0 ? Math.round((stats.approved / stats.totalVisits) * 100) : 0}%
                    </h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00675d]">Approval Rate</p>
                </div>
              </div>
            </section>

            {/* --- ACTIVITY & CHART --- */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="font-black text-xl">Operational Health</h3>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400"><div className="w-2 h-2 rounded-full bg-[#4955b3]" /> Approved</div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400"><div className="w-2 h-2 rounded-full bg-rose-400" /> Rejected</div>
                  </div>
                </div>
                <div className="flex items-end justify-between h-48 gap-3">
                  {[60, 85, 45, 90, 75, 40, 30].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                      <div className="w-full max-w-[32px] bg-slate-50 rounded-full h-full relative overflow-hidden">
                        <div className="absolute bottom-0 w-full bg-[#4955b3] rounded-full transition-all duration-1000" style={{ height: `${val}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-slate-300 uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-[#2b3437] text-white p-8 rounded-[3rem] h-full shadow-xl">
                  <h3 className="font-black text-xl mb-6">Recent Activity</h3>
                  <div className="space-y-6">
                    {loading && <p className="text-white/40 text-xs italic">Loading latest visits...</p>}
                    {!loading && summary?.recentActivity?.slice(0, 3).map((row) => (
                      <div key={row.id} className="flex gap-4 group">
                        <span className="text-[9px] font-black text-white/30 pt-1 uppercase">
                          {row.startedAt ? new Date(row.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold leading-tight truncate w-32">{row.visitor}</h4>
                          <p className="text-[10px] text-white/50 mt-0.5">{row.homeName}</p>
                        </div>
                      </div>
                    ))}
                    {!loading && (!summary?.recentActivity || summary.recentActivity.length === 0) && (
                      <p className="text-white/30 text-xs uppercase font-black tracking-widest">No Recent Logs</p>
                    )}
                  </div>
                  <button className="w-full mt-10 py-4 rounded-2xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                    View Full Logs
                  </button>
                </div>
              </div>
            </section>

            {/* --- FOOTER INSIGHTS --- */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsightCard label="Active Homes" val={stats.activeHomes} icon={<Building2 />} color="text-indigo-500" />
              <InsightCard label="Access Points" val={stats.activeDoors} icon={<CreditCard />} color="text-emerald-500" />
              <InsightCard label="Approved Today" val={stats.approved} icon={<Users />} color="text-slate-400" />
            </section>
          </>
        )}
      </main>

      {/* --- BOTTOM NAV --- */}

    </div>
  );
}

/* --- REUSABLE SUB-COMPONENTS --- */

function InsightCard({ label, val, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
      <div className={`p-3 bg-slate-50 rounded-2xl ${color}`}>{icon}</div>
      <div>
        <h4 className="text-2xl font-black">{val}</h4>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <button className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${active ? 'text-[#4955b3] bg-indigo-50/50' : 'text-slate-300'}`}>
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tight">{label}</span>
    </button>
  );
}