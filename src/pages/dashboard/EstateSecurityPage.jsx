import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  ShieldCheck, 
  Sliders, 
  Users, 
  ChevronRight,
  UserCheck
} from "lucide-react";
import { useEstateSecurityState } from "./estateSecurity/useEstateSecurityState";
import { showError } from "../../utils/flash";

export default function EstateSecurityPage() {
  const navigate = useNavigate();
  const { currentEstate, error, loading, stats, securityRules, suspiciousHouseThreshold, suspiciousRejectionThreshold } = useEstateSecurityState();

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">
      
      {/* --- STICKY GLASS HEADER --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Security Center</h1>
            </div>
          </div>
          <button 
            onClick={() => navigate("/dashboard/notifications")} 
            aria-label="Notifications"
            className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        
        {/* --- TITLE & SUBTITLE --- */}
        <section className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">
            Access Control & Safety
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {currentEstate?.name ? currentEstate.name : "Estate Security"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Manage guard accounts, resident approval rules, and suspicious activity settings.
          </p>
        </section>

        {/* --- QUICK ACTION BUTTONS (TEAM, RULES, MONITORING) --- */}
        <section className="grid grid-cols-3 gap-2.5">
          <Link
            to="/dashboard/estate/security/team"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all group active:scale-95 text-center"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Team</span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">{stats.total} guards</span>
          </Link>

          <Link
            to="/dashboard/estate/security/rules"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all group active:scale-95 text-center"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
              <Shield size={18} />
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Rules</span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">Access policies</span>
          </Link>

          <Link
            to="/dashboard/estate/security/monitoring"
            className="flex flex-col items-center justify-center p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 dark:hover:border-indigo-500/40 transition-all group active:scale-95 text-center"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform">
              <Sliders size={18} />
            </div>
            <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">Monitoring</span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">Logs & alerts</span>
          </Link>
        </section>

        {/* --- STATS GRID --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/20 shrink-0">
              <UserCheck size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{loading ? "--" : stats.active}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Active Guards ({stats.suspended} suspended)</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-3xl border border-emerald-100/40 dark:border-emerald-500/10 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/20 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{Object.values(securityRules).filter(Boolean).length}</h4>
              <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/50 font-bold uppercase tracking-wider mt-1">Enabled Controls</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100/50 shrink-0">
              <Sliders size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{suspiciousHouseThreshold}/{suspiciousRejectionThreshold}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Risk Threshold</p>
            </div>
          </div>
        </section>

        {/* --- SECURITY MODULES SECTION --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Security Modules</h4>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            <ModuleLink 
              to="/dashboard/estate/security/team" 
              icon={Users} 
              title="Security Team" 
              subtitle="Add guards, suspend access, and review assigned gates." 
              meta={`${stats.total} users`} 
            />
            <ModuleLink 
              to="/dashboard/estate/security/rules" 
              icon={Shield} 
              title="Approval Rules" 
              subtitle="Control when guards may approve visits and how residents are notified." 
            />
            <ModuleLink 
              to="/dashboard/estate/security/monitoring" 
              icon={Sliders} 
              title="Monitoring" 
              subtitle="Tune automated suspicious-visit and reminder settings." 
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function ModuleLink({ to, icon: Icon, title, subtitle, meta }) {
  return (
    <Link 
      to={to} 
      className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-all group"
    >
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform shrink-0">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meta && (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {meta}
          </span>
        )}
        <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}