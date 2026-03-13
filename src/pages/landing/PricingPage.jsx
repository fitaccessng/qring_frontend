import { Link } from "react-router-dom";
import LandingShell from "../../components/landing/LandingShell";

const NAIRA = "\u20A6";

const estatePlans = [
  {
    id: "estate_starter",
    name: "Starter Estate",
    monthly: 0,
    bestFor: "Up to 3 doors (trial only, 60 days)",
    cta: "Start Free Trial",
    features: ["Up to 3 doors", "Trial only - 60 days"]
  },
  {
    id: "estate_basic",
    name: "Estate Basic",
    monthly: 8000,
    bestFor: "Up to 10 doors",
    cta: "Start Basic",
    features: ["Up to 10 doors", "Realtime alerts", "Visitor logs", "Resident management", "Mobile dashboard"]
  },
  {
    id: "estate_growth",
    name: "Estate Growth",
    monthly: 18000,
    bestFor: "Up to 25 doors",
    cta: "Choose Growth",
    features: ["Up to 25 doors", "Chat + call access", "Multi-admin roles", "Visitor scheduling", "Access windows", "Analytics"]
  },
  {
    id: "estate_pro",
    name: "Estate Pro",
    monthly: 35000,
    bestFor: "Up to 60 doors",
    cta: "Start Pro",
    features: ["Advanced analytics", "Security audit logs", "Multi-location control", "Role permissions", "Priority support"],
    popular: true
  },
  {
    id: "estate_enterprise",
    name: "Enterprise Estate",
    monthly: null,
    bestFor: "Custom annual contract - unlimited doors",
    cta: "Contact Sales",
    features: ["Unlimited doors", "SLA + API access"]
  }
];

const homePlans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    bestFor: "1 door",
    cta: "Get Started Free",
    features: ["1 door", "Basic notifications", "Limited logs"]
  },
  {
    id: "home_pro",
    name: "Home Pro",
    monthly: 2500,
    bestFor: "Smart homeowner controls",
    cta: "Choose Home Pro",
    features: ["Chat + call verification", "Visitor history", "Visitor scheduling", "Advanced notifications"]
  },
  {
    id: "home_premium",
    name: "Home Premium",
    monthly: 4500,
    bestFor: "Advanced access and privacy",
    cta: "Choose Home Premium",
    features: ["Multiple doors", "Access time windows", "Priority support", "Advanced privacy controls"]
  }
];

export default function PricingPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Pricing</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Plans for estates and homeowners</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Choose a plan based on property size. Estate plans scale by doors, homeowners get flexible personal tiers.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">Estate Plans</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Monthly</span>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {estatePlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[1.8rem] border p-6 shadow-sm ${
                plan.popular
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">{plan.name}</p>
                {plan.popular ? (
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]">Popular</span>
                ) : null}
              </div>
              <p className={`mt-2 text-sm ${plan.popular ? "text-white/70" : "text-slate-500"}`}>{plan.bestFor}</p>
              <div className="mt-4 text-3xl font-black">
                {plan.monthly === null ? "Custom" : `${NAIRA}${plan.monthly.toLocaleString()}`}
                {plan.monthly === null ? null : <span className="text-sm font-semibold text-slate-500">/month</span>}
              </div>
              <ul className={`mt-4 space-y-2 text-sm ${plan.popular ? "text-white/80" : "text-slate-600 dark:text-slate-300"}`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${plan.popular ? "bg-white" : "bg-slate-900"}`} />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to={plan.monthly === null ? "/contact" : "/signup"}
                className={`mt-6 inline-flex w-full justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  plan.popular
                    ? "bg-white text-slate-900 hover:bg-slate-200"
                    : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <h2 className="text-2xl font-black">Homeowner Plans</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {homePlans.map((plan) => (
            <div key={plan.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-lg font-bold">{plan.name}</p>
              <p className="mt-2 text-sm text-slate-500">{plan.bestFor}</p>
              <div className="mt-4 text-2xl font-black">
                {plan.monthly === 0 ? "Free" : `${NAIRA}${plan.monthly.toLocaleString()}`}
                {plan.monthly === 0 ? null : <span className="text-sm font-semibold text-slate-500">/month</span>}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-900" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="mt-6 inline-flex w-full justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Need a custom deployment?</h2>
              <p className="mt-2 text-sm text-white/70 dark:text-slate-600">We handle multi-estate rollouts, SLAs, and API integrations.</p>
            </div>
            <Link to="/contact" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
