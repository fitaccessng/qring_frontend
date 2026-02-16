import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../../components/BrandMark";

const NAIRA = "\u20A6";

const plans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    bestFor: "Single homeowner getting started",
    features: ["1 door", "1 QR code", "Realtime alerts", "Basic access history"]
  },
  {
    id: "doors_20",
    name: "1-20 Doors",
    monthly: 20000,
    yearly: 240000,
    bestFor: "Small compounds",
    features: ["Up to 20 doors", "Up to 20 QR codes", "Realtime approvals", "Chat and calls"]
  },
  {
    id: "doors_40",
    name: "1-40 Doors",
    monthly: 50000,
    yearly: 600000,
    bestFor: "Growing estates",
    features: ["Up to 40 doors", "Up to 40 QR codes", "Session logs", "Priority support"],
    popular: true
  },
  {
    id: "doors_80",
    name: "1-80 Doors",
    monthly: 80000,
    yearly: 960000,
    bestFor: "Large compounds",
    features: ["Up to 80 doors", "Up to 80 QR codes", "Advanced analytics", "Realtime controls"]
  },
  {
    id: "doors_100",
    name: "1-100 Doors",
    monthly: 120000,
    yearly: 1440000,
    bestFor: "Enterprise estates",
    features: ["Up to 100 doors", "Up to 100 QR codes", "Dedicated onboarding", "Priority SLA"]
  }
];

export default function PricingPage() {
  const { isDark, toggleTheme } = useTheme();
  const [mode, setMode] = useState("monthly");
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
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Paystack-ready pricing for every property size</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Choose a plan based on your number of doors. Free plan supports one door and one QR code.
          </p>
          <div className="mt-6 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                mode === "monthly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setMode("yearly")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                mode === "yearly" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              Yearly
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
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
                {NAIRA}
                {formatAmount(mode === "monthly" ? plan.monthly : plan.yearly)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{mode === "monthly" ? "per month" : "per year"}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{plan.bestFor}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <Link
                to="/billing/paywall"
                className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition ${
                  plan.popular
                    ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    : "border border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-NG").format(amount);
}
