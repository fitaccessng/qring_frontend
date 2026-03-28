import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

const estatePlans = [
  {
    id: "starter-estate",
    name: "Starter Estate",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    intro: "Up to 3 houses",
    subsidy: "Trial only",
    note: "30 days of full system access at limited scale.",
    cta: "Start Free Trial",
    to: "/signup",
    features: ["Up to 3 houses", "Full system access (limited scale)", "Trial only - 30 days"],
  },
  {
    id: "estate-basic",
    name: "Estate Basic",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    monthlyBilling: "/house/month",
    yearlyBilling: "/house/year",
    intro: "Core tools for daily estate operations",
    subsidy: "First 2 houses free",
    note: "Typical 10-house estate: ~₦2,400/month",
    cta: "Start Basic",
    to: "/signup",
    features: ["Visitor logs", "Resident management", "Mobile dashboard", "Real-time alerts"],
  },
  {
    id: "estate-plus",
    name: "Estate Plus",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    monthlyBilling: "/house/month",
    yearlyBilling: "/house/year",
    intro: "Adds scheduling and verified access flow",
    subsidy: "First 2 houses free",
    note: "Typical 15-house estate: ~₦3,900/month",
    cta: "Choose Plus",
    to: "/signup",
    features: ["Everything in Basic", "Visitor scheduling", "Access time windows", "Chat & call verification"],
  },
  {
    id: "estate-growth",
    name: "Estate Growth",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    monthlyBilling: "/house/month",
    yearlyBilling: "/house/year",
    intro: "Built for growing estates that need more oversight",
    subsidy: "First 2 houses free",
    note: "Typical 30-house estate: ~₦8,400/month",
    cta: "Choose Growth",
    to: "/signup",
    popular: true,
    features: ["Everything in Plus", "Multi-admin roles", "Activity tracking", "Analytics dashboard"],
  },
  {
    id: "estate-pro",
    name: "Estate Pro",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    monthlyBilling: "/house/month",
    yearlyBilling: "/house/year",
    intro: "More control for larger and security-focused estates",
    subsidy: "First 2 houses free",
    note: "Typical 50-house estate: ~₦14,400/month",
    cta: "Choose Pro",
    to: "/signup",
    features: ["Everything in Growth", "Advanced analytics", "Security audit logs", "Role permissions", "Priority support"],
  },
];

const homeownerPlans = [
  {
    id: "home-pro",
    name: "Home Pro",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    note: "Included for residents in QRing-enabled estates",
    cta: "Choose Home Pro",
    to: "/signup",
    features: ["Visitor history", "Visitor scheduling", "Chat & call verification", "Real-time notifications"],
  },
  {
    id: "home-premium",
    name: "Home Premium",
    monthlyPrice: 1000,
    yearlyPrice: 12000,
    monthlyBilling: "/month",
    yearlyBilling: "/year",
    note: "For households that want more control across entry points",
    cta: "Choose Home Premium",
    to: "/signup",
    features: ["Everything in Home Pro", "Multiple door access", "Access time windows", "Advanced privacy controls", "Priority support"],
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
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          {billingCycle === "yearly" ? plan.note.replace("/month", "/month equivalent") : plan.note}
        </p>
      </div>

      <PlanFeatureList items={plan.features} />

      <div className="border-t border-slate-200/70 pt-4 lg:border-t-0 lg:border-l lg:border-slate-200/70 lg:pl-8 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">Why it works</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Affordable, predictable pricing for estates that want secure visitor access without heavy setup costs.
        </p>
        <p className="mt-4 text-sm font-semibold text-blue-700 dark:text-blue-300">Less than the cost of airtime per household</p>
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

function HomeownerPlanBlock({ plan, billingCycle }) {
  const price = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const billing = billingCycle === "yearly" ? plan.yearlyBilling : plan.monthlyBilling;

  return (
    <article className="grid gap-5 border-t border-slate-200/80 py-6 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-8 dark:border-slate-800">
      <div>
        <div className="flex flex-wrap items-end gap-3">
          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{plan.name}</h3>
          <div className="flex items-end gap-1 text-slate-950 dark:text-white">
            <span className="text-3xl font-black tracking-tight">{formatPrice(price)}</span>
            <span className="pb-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{billing}</span>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">{plan.note}</p>
        <div className="mt-5">
          <PlanFeatureList items={plan.features} subtle />
        </div>
      </div>

      <div className="md:min-w-[190px]">
        <Link
          to={plan.to}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-blue-300 hover:text-blue-700 dark:border-blue-900/60 dark:bg-slate-950 dark:text-white"
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
  const anchorPrice = billingCycle === "yearly" ? "₦3,600" : "₦300";
  const anchorBilling = billingCycle === "yearly" ? "/ house / year" : "/ house / month";

  return (
    <section id="pricing" className={compact ? "py-16 sm:py-20" : "pb-16 pt-8 sm:pb-20 sm:pt-10"}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pricing</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
            Clear pricing for estates and homeowners
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            Start small, scale by household, and keep costs predictable as your community grows.
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

        <div className="mt-6 rounded-2xl border border-blue-100 bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(255,255,255,1))] px-5 py-5 sm:px-7 dark:border-blue-900/40 dark:bg-[linear-gradient(180deg,rgba(2,132,199,0.14),rgba(2,6,23,0.24))]">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700 dark:text-blue-300">Estate pricing anchor</p>
              <div className="mt-3 flex flex-wrap items-end gap-2 text-slate-950 dark:text-white">
                <span className="text-5xl font-black tracking-tight sm:text-6xl">{anchorPrice}</span>
                <span className="pb-2 text-base font-semibold text-slate-500 dark:text-slate-400">{anchorBilling}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">First 2 houses free on every estate plan.</p>
              <p>That means many estates get started at a very low monthly cost while keeping the same trusted QRing workflow.</p>
              <p className="font-semibold text-blue-700 dark:text-blue-300">Less than the cost of airtime per household.</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Section 1</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">Estate Plans</h3>
            </div>
            <p className="hidden text-sm font-medium text-slate-500 lg:block dark:text-slate-400">Simple monthly billing. Scale only when the estate grows.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 sm:px-7 dark:border-slate-800 dark:bg-slate-950">
            {estatePlans.map((plan) => (
              <EstatePlanRow key={plan.id} plan={plan} billingCycle={billingCycle} />
            ))}
          </div>

          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Minimum monthly billing: ₦2,000 per estate</p>
        </div>

        <div className="mt-14 rounded-2xl border border-slate-200/90 bg-slate-50/70 px-5 py-6 sm:px-7 sm:py-8 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Section 2</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">Homeowner Plans</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Personal plans for households that want extra control, with simple monthly pricing and the same trusted visitor flow.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white bg-white px-5 sm:px-7 dark:border-slate-800 dark:bg-slate-950">
            {homeownerPlans.map((plan) => (
              <HomeownerPlanBlock key={plan.id} plan={plan} billingCycle={billingCycle} />
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
