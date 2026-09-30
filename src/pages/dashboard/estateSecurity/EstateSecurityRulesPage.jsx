import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Bell, 
  Shield, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { useEstateSecurityState } from "./useEstateSecurityState";
import { showError, showSuccess } from "../../../utils/flash";

const ruleCopy = {
  canApproveWithoutHomeowner: {
    title: "Guard instant approval",
    subtitle: "Allow gate personnel to approve visitors without homeowner action."
  },
  mustNotifyHomeowner: {
    title: "Notify homeowners",
    subtitle: "Send resident alerts when security handles a visitor request."
  },
  requirePhotoVerification: {
    title: "Photo verification",
    subtitle: "Require visitor photo capture before access can be approved."
  },
  requireCallBeforeApproval: {
    title: "Call before approval",
    subtitle: "Require a voice or video check before access approval."
  }
};

export default function EstateSecurityRulesPage() {
  const navigate = useNavigate();
  const { currentEstate, error, securityRules, setSecurityRules, saveSettings } = useEstateSecurityState();
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function toggleRule(key) {
    const previous = securityRules;
    const nextRules = { ...securityRules, [key]: !securityRules[key] };
    setSecurityRules(nextRules);
    setBusyKey(key);
    try {
      await saveSettings({ rules: nextRules });
      showSuccess("Security rule updated");
    } catch (requestError) {
      setSecurityRules(previous);
      showError(requestError?.message || "Unable to update rule");
    } finally {
      setBusyKey("");
    }
  }

  const enabledCount = Object.values(securityRules).filter(Boolean).length;

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
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Approval Rules</h1>
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
            Security Policy & Controls
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {currentEstate?.name ? currentEstate.name : "Estate Security Rules"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Define how gate approvals should work for your community.
          </p>
        </section>

        {/* --- STATS GRID --- */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-3xl border border-emerald-100/40 dark:border-emerald-500/10 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/20 shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{enabledCount}</h4>
              <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/50 font-bold uppercase tracking-wider mt-1">Active approval controls</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100/50 shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">
                {securityRules.mustNotifyHomeowner ? "On" : "Off"}
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Homeowner notification rule</p>
            </div>
          </div>
        </section>

        {/* --- APPROVAL POLICY SECTION --- */}
        <section className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Approval Policy</h4>
            <span className="text-[10px] text-slate-400 font-medium">Changes apply immediately</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {Object.entries(ruleCopy).map(([key, copy]) => {
              const active = Boolean(securityRules[key]);
              const busy = busyKey === key;

              return (
                <div key={key} className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">{copy.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{copy.subtitle}</p>
                  </div>

                  <button
                    onClick={() => toggleRule(key)}
                    disabled={busy}
                    aria-label={`Toggle ${copy.title}`}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                      active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    >
                      {busy && <Loader2 size={10} className="animate-spin text-indigo-600" />}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}