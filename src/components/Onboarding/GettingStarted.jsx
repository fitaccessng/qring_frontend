import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Home, HardHat, Shield, Sparkles, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getEstateOverview, listEstateArtisans, listEstateSecurityUsers } from "../../services/estateService";
import { getHomeownerContext } from "../../services/homeownerService";
import { getOnboardingState, updateOnboardingState } from "../../services/onboardingService";

const homeownerSteps = [
  { id: "visitors", title: "Manage visitors", body: "Review visitor requests and decide who can access your home.", route: "/dashboard/homeowner/visits", icon: Users },
  { id: "communication", title: "Communicate with visitors", body: "Use secure messaging and audio/video calls when a visitor needs you.", route: "/dashboard/homeowner/messages", icon: Sparkles },
  { id: "packages", title: "Packages", body: "Keep package arrivals and collection details visible to your household.", route: "/dashboard/homeowner/overview", icon: Home },
  { id: "estate", title: "Estate information", body: "Stay connected to broadcasts, meetings, maintenance, and estate updates.", route: "/dashboard/homeowner/overview", icon: Shield },
  { id: "notifications", title: "Notifications", body: "Keep important visitor and estate alerts close at hand.", route: "/dashboard/notifications", icon: Sparkles }
];

export default function GettingStarted({ user, openOnMount = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [serverState, setServerState] = useState(null);
  const [estateData, setEstateData] = useState({ estates: [], homeowners: [], securityUsers: [], artisans: [] });
  const [homeownerContext, setHomeownerContext] = useState(null);
  const [open, setOpen] = useState(openOnMount);
  const [stepIndex, setStepIndex] = useState(0);

  const role = user?.role;
  const eligible = role === "estate" || role === "homeowner";

  useEffect(() => {
    if (!eligible) return undefined;
    let active = true;
    async function loadProgressAndData() {
      try {
        const onboardingResult = await getOnboardingState();
        if (!active) return;
        setServerState(onboardingResult);
        setProgress(onboardingResult?.state || {});
      } catch {
        // Keep the dashboard usable when onboarding state is temporarily unavailable.
      }
      if (role === "estate") {
        Promise.allSettled([getEstateOverview({ force: true })]).then(async ([overviewResult]) => {
          if (!active) return;
          const overview = overviewResult.status === "fulfilled" ? overviewResult.value || {} : {};
          const estates = overview.estates || (overview.estate ? [overview.estate] : []);
          const estateId = estates[0]?.id || overview.estateId;
          const [securityResult, artisanResult] = estateId
            ? await Promise.allSettled([listEstateSecurityUsers(estateId), listEstateArtisans(estateId)])
            : [];
          if (!active) return;
          setEstateData({
            estates,
            homeowners: overview.homeowners || overview.residents || [],
            securityUsers: securityResult?.status === "fulfilled" ? securityResult.value : [],
            artisans: artisanResult?.status === "fulfilled" ? artisanResult.value : []
          });
        });
      } else {
        getHomeownerContext().then((data) => {
          if (active) setHomeownerContext(data || {});
        }).catch(() => {});
      }
    };
    loadProgressAndData();
    const refresh = () => {
      if (document.visibilityState === "visible") loadProgressAndData();
    };
    const interval = window.setInterval(loadProgressAndData, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    }
  }, [eligible, role]);

  const estateSteps = useMemo(() => [
    { id: "estate", title: "Create your estate", body: "Your estate is the home base for residents, doors, visitors, and security activity.", route: "/dashboard/estate/create", icon: Home, complete: estateData.estates.length > 0 },
    { id: "residents", title: "Add residents", body: "Invite homeowners so they can manage visitors and receive estate updates.", route: "/dashboard/estate/invites", icon: Users, complete: estateData.homeowners.length > 0 },
    { id: "security", title: "Add security staff", body: "Give your security team the tools to verify visitors and manage the gate.", route: "/dashboard/estate/security/team", icon: Shield, optional: true, complete: estateData.securityUsers.length > 0 || progress.securitySkipped },
    { id: "artisans", title: "Add artisans", body: "Keep electricians, plumbers, technicians, cleaners, and other trusted artisans organized.", route: "/dashboard/estate/artisans", icon: HardHat, optional: true, complete: estateData.artisans.length > 0 || progress.artisansSkipped },
    { id: "explore", title: "Explore Qring", body: "Visit your dashboard to see estate activity, broadcasts, meetings, security, and access logs.", route: "/dashboard/estate", icon: Sparkles, complete: Boolean(progress.explore) }
  ], [estateData, progress]);

  const steps = role === "estate" ? estateSteps : homeownerSteps.map((item) => ({ ...item, complete: Boolean(progress[item.id]) }));
  const requiredComplete = Boolean(serverState?.requiredComplete) || (role === "homeowner" ? Boolean(progress.completed) : false);
  const allComplete = Boolean(serverState?.complete) || (role === "homeowner" ? Boolean(progress.completed) : false);
  const completeCount = steps.filter((item) => item.complete).length;
  const progressPercentage = Math.round((completeCount / steps.length) * 100);

  if (!eligible || !serverState?.eligible || allComplete) return null;

  function updateProgress(patch) {
    const next = { ...progress, ...patch };
    setProgress(next);
    updateOnboardingState(patch).then((data) => {
      setServerState(data);
      setProgress(data?.state || next);
    }).catch(() => {});
  }

  function openStep(index = 0) {
    setStepIndex(index);
    setOpen(true);
  }

  function handleCta(item) {
    if (role === "homeowner") {
      updateProgress({ [item.id]: true, ...(item.id === "notifications" ? { completed: true } : {}) });
    }
    if (item.id === "explore") updateProgress({ explore: true });
    if (item.route) navigate(item.route);
    setOpen(false);
  }

  function skipOptional(item) {
    updateProgress({ [`${item.id}Skipped`]: true });
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  const current = steps[stepIndex] || steps[0];
  const CurrentIcon = current?.icon || Sparkles;

  return (
    <>
      <button
        type="button"
        onClick={() => openStep(Math.max(0, steps.findIndex((item) => !item.complete)))}
        className="fixed bottom-6 right-6 z-[55] flex items-center gap-3 rounded-full bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-2xl ring-4 ring-slate-900/10 transition-all hover:scale-105 hover:bg-slate-800 active:scale-95"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500"></span>
        </span>
        Setup Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md transition-all animate-in fade-in duration-200">
          <section className="relative w-full max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 duration-300">
            
            {/* Close Button */}
            <button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="absolute right-5 top-5 z-20 rounded-full bg-white/10 p-2.5 text-slate-400 backdrop-blur-md transition-colors hover:bg-slate-100 hover:text-slate-900 md:text-white md:hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid md:grid-cols-[1fr_1.3fr]">
              
              {/* Left Panel - Dynamic Hero */}
              <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-brand-600 p-8 text-white md:min-h-[600px] md:p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900" />
                <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-brand-100 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Getting Started
                  </div>
                  <h2 className="mt-6 text-3xl font-black leading-tight tracking-tight md:text-4xl">
                    {role === "estate" ? "Build your calm control room." : "Your Qring day, simplified."}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-brand-100">
                    {role === "estate" 
                      ? "Set up the essentials first. Everything else can grow with your community." 
                      : "A quick tour of the tools that keep visitors, messages, packages, and estate updates in one place."}
                  </p>
                </div>

                <div className="relative z-10 mt-8 hidden items-center justify-center md:flex">
                  <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md transition-all">
                    <CurrentIcon className="h-16 w-16 text-white drop-shadow-md animate-in zoom-in" key={stepIndex} />
                  </div>
                </div>
              </div>

              {/* Right Panel - Timeline */}
              <div className="flex max-h-[75vh] flex-col bg-slate-50 md:max-h-[600px]">
                
                {/* Progress Header */}
                <div className="border-b border-slate-100 bg-white px-8 py-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800">
                      Setup Progress
                    </p>
                    <p className="text-sm font-bold text-brand-600">{progressPercentage}%</p>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div 
                      className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out" 
                      style={{ width: `${progressPercentage}%` }} 
                    />
                  </div>
                </div>

                {/* Steps List */}
                <div className="flex-1 overflow-y-auto px-8 py-8">
                  <div className="space-y-6">
                    {steps.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = index === stepIndex;
                      const isComplete = item.complete;
                      
                      return (
                        <div key={item.id} className="relative flex gap-5">
                          {/* Timeline Line */}
                          {index !== steps.length - 1 && (
                            <div className="absolute bottom-0 left-[1.15rem] top-12 w-[2px] bg-slate-200" />
                          )}
                          
                          {/* Step Indicator */}
                          <div className="relative z-10 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-all">
                            {isComplete ? (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Check className="h-5 w-5" />
                              </div>
                            ) : isActive ? (
                              <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-brand-500 bg-brand-50 text-brand-600">
                                <Icon className="h-4 w-4" />
                              </div>
                            ) : (
                              <Icon className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 pb-2">
                            <button 
                              type="button" 
                              onClick={() => setStepIndex(index)}
                              className="flex w-full items-center justify-between text-left focus:outline-none"
                            >
                              <div className="flex items-center gap-3">
                                <h3 className={`text-base font-bold transition-colors ${isActive ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}>
                                  {item.title}
                                </h3>
                                {item.optional && !isComplete && (
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Optional
                                  </span>
                                )}
                              </div>
                              {!isActive && <ChevronRight className="h-4 w-4 text-slate-300" />}
                            </button>

                            {/* Active Step Details */}
                            {isActive && (
                              <div className="mt-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                <p className="text-sm leading-relaxed text-slate-500">
                                  {item.body}
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                  <button 
                                    type="button" 
                                    onClick={() => handleCta(item)} 
                                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-95"
                                  >
                                    {role === "homeowner" ? "Go to dashboard" : item.id === "explore" ? "Explore Qring" : "Take Action"}
                                    <ArrowRight className="h-4 w-4" />
                                  </button>
                                  {item.optional && !isComplete && (
                                    <button 
                                      type="button" 
                                      onClick={() => skipOptional(item)} 
                                      className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                                    >
                                      Skip for now
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-8 flex justify-center pt-6">
                    <button 
                      type="button" 
                      onClick={() => setOpen(false)} 
                      className="text-sm font-semibold text-slate-400 hover:text-slate-700"
                    >
                      I'll do this later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}