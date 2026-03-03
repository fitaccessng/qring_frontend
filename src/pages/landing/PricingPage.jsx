import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

const NAIRA = "\u20A6";

const estatePlans = [
  {
    id: "estate_starter",
    name: "Starter Estate",
    monthly: 0,
    bestFor: "Up to 3 doors (Trial only - 60 days)",
    cta: "Start Free Trial",
    features: ["Up to 3 doors", "Trial only - 60 days"]
  },
  {
    id: "estate_basic",
    name: "Estate Basic",
    monthly: 8000,
    bestFor: "Up to 10 doors",
    cta: "Start Basic",
    features: [
      "Up to 10 doors",
      "Realtime alerts",
      "Visitor logs",
      "Resident management",
      "Mobile dashboard"
    ]
  },
  {
    id: "estate_growth",
    name: "Estate Growth",
    monthly: 18000,
    bestFor: "Up to 25 doors",
    cta: "Choose Growth",
    features: [
      "Up to 25 doors",
      "Chat + call access",
      "Multi-admin roles",
      "Visitor scheduling",
      "Access windows",
      "Analytics"
    ]
  },
  {
    id: "estate_pro",
    name: "Estate Pro",
    monthly: 35000,
    bestFor: "Up to 60 doors",
    cta: "Start Pro",
    features: [
      "Advanced analytics",
      "Security audit logs",
      "Multi-location control",
      "Role permissions",
      "Priority support"
    ],
    popular: true
  },
  {
    id: "estate_enterprise",
    name: "Enterprise Estate",
    monthly: null,
    bestFor: "Custom annual contract - Unlimited doors",
    cta: "Contact Sales",
    features: [
      "Unlimited doors",
      "SLA + API access"
    ]
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
    features: [
      "Chat + call verification",
      "Visitor history",
      "Visitor scheduling",
      "Advanced notifications"
    ]
  },
  {
    id: "home_premium",
    name: "Home Premium",
    monthly: 4500,
    bestFor: "Advanced access and privacy",
    cta: "Choose Home Premium",
    features: [
      "Multiple doors",
      "Access time windows",
      "Priority support",
      "Advanced privacy controls"
    ]
  }
];

export default function PricingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-3 sm:gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 dark:bg-white">
              <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
            </span>
            <span>
              <span className="block text-xl font-black tracking-tight sm:text-2xl">Qring</span>
              <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-500">Smart Access Control</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {isDark ? "Light" : "Dark"}
            </button>
            <Link to="/about" className="hidden rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold sm:text-sm sm:inline-block dark:border-slate-700">
              About
            </Link>
            <Link to="/contact" className="hidden rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white sm:px-6 sm:text-sm sm:inline-block dark:bg-white dark:text-slate-900">
              Contact
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden rounded-lg border border-slate-200 px-3 py-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </nav>

        {sidebarOpen && (
          <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
            <div className="space-y-1 px-4 py-4 sm:px-6">
              <Link
                to="/"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                to="/about"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                About
              </Link>
              <Link
                to="/contact"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Contact
              </Link>
              <Link
                to="/signup"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-lg bg-slate-900 px-3 py-2 text-base font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-300">Pricing Plans</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Plans for estates and homeowners</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Pick a plan based on your property size. Estate and Home plans are billed monthly, with Enterprise on custom annual contract.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Estate Plans</h2>
          <div className="mt-4 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {estatePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl md:col-span-2 xl:col-span-3">Homeowner Plans</h2>
          {homePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </section>
      </main>
    </div>
  );
}

function PlanCard({ plan }) {
  return (
    <article
      className={`rounded-xl border bg-white p-6 transition hover:shadow-xl sm:p-8 dark:bg-slate-900 ${
        plan.popular ? "border-slate-900 shadow-lg dark:border-white" : "border-slate-200 dark:border-slate-700"
      }`}
    >
      {plan.popular ? (
        <div className="mb-4 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white dark:bg-white dark:text-slate-900">
          Popular
        </div>
      ) : null}
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{plan.name}</p>
      <p className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
        {plan.monthly === null ? "Custom" : `${NAIRA}${formatAmount(plan.monthly)}`}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{plan.monthly === null ? "Annual contract" : "per month"}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{plan.bestFor}</p>
      <ul className="mt-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
        {plan.features.map((feature) => (
          <li key={feature}>- {feature}</li>
        ))}
      </ul>
      <Link
        to={plan.monthly === null ? "/contact" : "/billing/paywall"}
        className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
          plan.popular
            ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            : "border border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {plan.cta ?? `Choose ${plan.name}`}
      </Link>
    </article>
  );
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-NG").format(amount);
}
