import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

const estatePlans = [
  {
    id: "starter-estate",
    name: "Starter",
    monthlyPrice: 15000,
    yearlyPrice: 180000,
    monthlyBilling: "/month",
    yearlyBilling: "/month",
    intro: "Up to 8 Houses/Units",
    subsidy: "30-day free trial",
    note: "Everything a small estate needs to move away from manual gate records.",
    cta: "Start 30-Day Free Trial",
    to: "/signup",
    features: ["Up to 8 Houses/Units", "Register residents", "House QR code for each registered house", "Digital gate records"],
  },
  {
    id: "estate-basic",
    name: "Basic",
    monthlyPrice: 25000,
    yearlyPrice: 300000,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    intro: "Up to 30 Houses/Units",
    subsidy: "Standard plan",
    note: "Everything needed to manage everyday estate access and security.",
    cta: "Choose Basic",
    to: "/signup",
    features: ["Up to 30 Houses/Units", "Instant resident alerts", "Emergency alerts", "Daily gate activity"],
  },
  {
    id: "estate-plus",
    name: "Plus",
    monthlyPrice: 45000,
    yearlyPrice: 540000,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    intro: "Up to 50 Houses/Units",
    subsidy: "Growing estates",
    note: "For estates that want stronger security and more control.",
    cta: "Choose Plus",
    to: "/signup",
    features: ["Everything in Basic", "Schedule future visitors", "Access time windows", "Video and audio verification"],
  },
  {
    id: "estate-growth",
    name: "Growth",
    monthlyPrice: 85000,
    yearlyPrice: 1020000,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    intro: "Up to 100 Houses/Units",
    subsidy: "Popular",
    note: "For larger and professionally managed estates.",
    cta: "Choose Growth",
    to: "/signup",
    popular: true,
    features: ["Everything in Plus", "Multiple administrators", "Download records", "Management activity history"],
  },
  {
    id: "estate-pro",
    name: "Pro",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyBilling: "",
    yearlyBilling: "",
    intro: "Custom house capacity",
    subsidy: "Custom pricing",
    note: "For large estates, gated communities, estate groups, and multi-estate operators.",
    cta: "Contact Sales",
    to: "/contact",
    features: ["Everything in Growth", "Multiple estates", "Custom reports", "Dedicated onboarding"],
  },
];

function PlanFeatureList({ items, subtle = false }) {
  return (
    <ul className="grid gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:grid-cols-2 xl:grid-cols-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            className={[
              "mt-1 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border",
              subtle
                ? "border-blue-100 bg-white text-blue-700 dark:border-blue-900/60 dark:bg-slate-950"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30",
            ].join(" ")}
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function formatPrice(amount) {
  if (amount === 0) return "Free";
  return `₦${amount.toLocaleString()}`;
}

function EstatePlanRow({ plan, billingCycle }) {
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const billing = billingCycle === "yearly" ? plan.yearlyBilling : plan.monthlyBilling;

  return (
    <article
      className={[
        "grid gap-6 border-t border-slate-200/80 py-8 first:border-t-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_auto] lg:items-start lg:gap-8",
        plan.popular ? "bg-blue-50/70 px-5 -mx-5 rounded-xl border border-blue-100/80" : "",
      ].join(" ")}
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{plan.name}</h3>
          {plan.popular ? (
            <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
              Most Popular
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-end gap-1.5 text-slate-950 dark:text-white">
            <span className="text-4xl font-black tracking-tight sm:text-[2.6rem]">{formatPrice(price)}</span>
            <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{billing}</span>
          </div>
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            {plan.subsidy}
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{plan.note}</p>
      </div>

      <PlanFeatureList items={plan.features} />

      <div className="border-t border-slate-200/70 pt-4 lg:border-t-0 lg:border-l lg:border-slate-200/70 lg:pl-8 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">Why it works</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Clear fixed pricing for estates that want predictable visitor access and resident control.
        </p>
        <p className="mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300">Built to scale from trial to enterprise</p>
      </div>

      <div className="lg:min-w-[180px]">
        <Link
          to={plan.to}
          className={[
            "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition",
            plan.popular
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "border border-slate-300 bg-white text-slate-900 hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white",
          ].join(" ")}
        >
          {plan.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function PricingShowcase({ compact = false }) {
  const [billingCycle, setBillingCycle] = useState("monthly");

  return (
    <section id="pricing" className={compact ? "py-16 sm:py-20" : "pb-16 pt-8 sm:pb-20 sm:pt-10"}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pricing</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
            Clear pricing for estate security
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Fixed plan pricing for estates with clear house limits, visitor controls, and upgrade paths.
          </p>
        </div>

        <div className="mt-8 flex justify-start">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                billingCycle === "monthly"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                billingCycle === "yearly"
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              ].join(" ")}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Section 1</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">Estate Plans</h3>
            </div>
            <p className="hidden text-sm font-medium text-slate-500 lg:block dark:text-slate-400">Fixed plan pricing for every estate size.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7 dark:border-slate-800 dark:bg-slate-950">
            {estatePlans.map((plan) => (
              <EstatePlanRow key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

export default function PricingSection() {
  return <PricingShowcase compact />;
}
