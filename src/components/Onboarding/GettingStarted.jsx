import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronRight, Home, HardHat, Shield, Sparkles, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getEstateOverview, listEstateArtisans, listEstateSecurityUsers } from "../../services/estateService";
import { getHomeownerContext } from "../../services/homeownerService";
import { getOnboardingState, updateOnboardingState } from "../../services/onboardingService";

const NEW_USER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isNewUser(user) {
  const createdAt = Date.parse(user?.createdAt || "");
  return Number.isFinite(createdAt) && Date.now() - createdAt <= NEW_USER_WINDOW_MS;
}

const homeownerSteps = [
  { id: "visitors", title: "Manage visitors", body: "Review visitor requests and decide who can access your home.", route: "/dashboard/homeowner/visits", icon: Users },
  { id: "communication", title: "Communicate with visitors", body: "Use secure messaging and audio/video calls when a visitor needs you.", route: "/dashboard/homeowner/messages", icon: Sparkles },
  { id: "packages", title: "Packages", body: "Keep package arrivals and collection details visible to your household.", route: "/dashboard/homeowner/overview", icon: Home },
  { id: "estate", title: "Estate information", body: "Stay connected to broadcasts, meetings, maintenance, and estate updates.", route: "/dashboard/homeowner/overview", icon: Shield },
  { id: "notifications", title: "Notifications", body: "Keep important visitor and estate alerts close at hand.", route: "/dashboard/notifications", icon: Sparkles }
];

export default function GettingStarted({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [progress, setProgress] = useState({});
  const [serverState, setServerState] = useState(null);
  const [estateData, setEstateData] = useState({ estates: [], homeowners: [], securityUsers: [], artisans: [] });
  const [homeownerContext, setHomeownerContext] = useState(null);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const role = user?.role;
  const eligible = role === "estate" || role === "homeowner";
  const newUser = isNewUser(user);

  useEffect(() => {
    if (!eligible || !newUser) return undefined;
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
  }, [eligible, newUser, role]);

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

  if (!eligible || !newUser || allComplete || location.pathname === "/onboarding") return null;

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
        className="fixed bottom-5 right-5 z-[55] inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(0,52,111,0.3)] transition hover:bg-brand-700 active:scale-95"
      >
        <Sparkles className="h-4 w-4" />
        Get Started
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close getting started" className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-5 w-5" />
            </button>
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="relative overflow-hidden bg-[linear-gradient(145deg,#00346f,#1263a8)] p-7 text-white md:p-9">
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border-[22px] border-white/10" />
                <div className="relative flex h-full flex-col justify-between gap-10">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-200">QRING / GETTING STARTED</p>
                    <h2 className="mt-4 text-3xl font-black tracking-tight">{role === "estate" ? "Build your calm control room." : "Your Qring day, simplified."}</h2>
                    <p className="mt-3 text-sm leading-6 text-blue-100">{role === "estate" ? "Set up the essentials first. Everything else can grow with your community." : "A quick tour of the tools that keep visitors, messages, packages, and estate updates in one place."}</p>
                  </div>
                  <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-[2rem] border border-white/20 bg-white/10 shadow-inner md:mx-0">
                    <CurrentIcon className="h-14 w-14 text-cyan-200" />
                    <div className="absolute -bottom-3 -right-3 rounded-xl bg-emerald-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-950">Live</div>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-9">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Getting Started</p>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{completeCount} of {steps.length} complete</p>
                  </div>
                  <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round((completeCount / steps.length) * 100)}%` }} /></div>
                </div>
                <div className="mt-6 space-y-2">
                  {steps.map((item, index) => {
                    const Icon = item.icon;
                    return <button key={item.id} type="button" onClick={() => setStepIndex(index)} className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${index === stepIndex ? "border-brand-200 bg-blue-50" : "border-transparent hover:bg-slate-50"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800">{item.title}</span>{item.optional ? <span className="text-[11px] font-semibold text-slate-400">Optional</span> : null}</span><ChevronRight className="h-4 w-4 text-slate-300" /></button>;
                  })}
                </div>
                {current ? <div className="mt-5 rounded-2xl bg-slate-50 p-4"><h3 className="text-lg font-black text-slate-900">{current.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{current.body}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => handleCta(current)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">{role === "homeowner" ? "Go to my dashboard" : current.id === "explore" ? "Explore Qring" : "Open"}<ArrowRight className="h-4 w-4" /></button>{current.optional && !current.complete ? <button type="button" onClick={() => skipOptional(current)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-white">Skip for now</button> : null}</div></div> : null}
                <button type="button" onClick={() => setOpen(false)} className="mt-5 text-sm font-semibold text-slate-400 hover:text-slate-700">Continue in dashboard</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
