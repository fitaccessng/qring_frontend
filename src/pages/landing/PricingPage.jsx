import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  Crown,
  DoorClosed,
  Landmark,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const pricingSections = [
  {
    id: "estate",
    label: "Estate",
    title: "Estate Security Plans",
    eyebrow: "Managed communities",
    description: "Plans for estates that need resident management, gate records, visitor approvals, security operations, and clear activity history.",
    icon: Building2,
    plans: [
      {
        name: "Starter",
        price: "₦15,000",
        cadence: "/month",
        capacity: "Up to 8 Houses/Units",
        cta: "Start 30-Day Free Trial",
        to: "/signup",
        icon: Building2,
        features: [
          "30-day free trial",
          "Register residents and security guards",
          "Approve visitors from phone",
          "Each registered house gets its own QR code",
          "Record visitor entry and exit",
          "See visitor history by house",
          "Digital gate records"
        ]
      },
      {
        name: "Basic",
        price: "₦25,000",
        cadence: "/month",
        capacity: "Up to 30 Houses/Units",
        cta: "Choose Basic",
        to: "/signup",
        icon: ShieldCheck,
        features: [
          "Everything in Starter",
          "Resident vehicle registration",
          "Delivery and dispatch rider approvals",
          "Instant resident alerts",
          "Emergency alerts to security",
          "See visitors currently inside",
          "Daily visitor and gate activity"
        ]
      },
      {
        name: "Plus",
        price: "₦45,000",
        cadence: "/month",
        capacity: "Up to 50 Houses/Units",
        cta: "Choose Plus",
        to: "/signup",
        icon: BadgeCheck,
        popular: true,
        features: [
          "Everything in Basic",
          "Schedule future visitors",
          "Expiring and frequent visitor passes",
          "Visitor access days and time windows",
          "Video and audio verification",
          "Package tracking",
          "Security incident reporting"
        ]
      },
      {
        name: "Growth",
        price: "₦85,000",
        cadence: "/month",
        capacity: "Up to 100 Houses/Units",
        cta: "Choose Growth",
        to: "/signup",
        icon: Layers3,
        features: [
          "Everything in Plus",
          "Multiple estate administrators",
          "Decide what each manager can access",
          "Daily, weekly, and monthly visitor stats",
          "Download visitor and resident records",
          "Download security and gate reports",
          "Keep a history of management activities"
        ]
      },
      {
        name: "Pro",
        price: "Custom Pricing",
        cadence: "",
        capacity: "Custom house capacity",
        cta: "Contact Sales",
        to: "/contact",
        icon: Crown,
        enterprise: true,
        features: [
          "Everything in Growth",
          "Multiple estates under one account",
          "Central dashboard for estate groups",
          "Unlimited administrators and security guards",
          "Custom reports and estate branding",
          "Dedicated onboarding and training",
          "Dedicated account support"
        ]
      }
    ]
  }
];

function PricingCard({ plan }) {
  const Icon = plan.icon;
  const isHighlighted = Boolean(plan.popular || plan.enterprise);

  return (
    <article
      className={[
        "group flex h-full min-h-[560px] flex-col justify-between rounded-2xl border p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-6",
        isHighlighted
          ? "border-[#00346f] bg-[#00346f] text-white shadow-[0_24px_70px_rgba(0,52,111,0.22)]"
          : "border-slate-200 bg-white text-slate-900 hover:border-[#004a99]/35"
      ].join(" ")}
    >
      <div className="mb-5 flex h-10 items-center justify-between gap-3">
        <span
          className={[
            "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            plan.popular
              ? "bg-emerald-300 text-[#00346f]"
              : plan.enterprise
                ? "bg-white/14 text-white"
                : "bg-slate-100 text-slate-600"
          ].join(" ")}
        >
          {plan.popular ? "Popular" : plan.enterprise ? "Enterprise" : "Core plan"}
        </span>
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-lg transition group-hover:scale-105",
            isHighlighted ? "bg-white/12 text-white" : "bg-[#00346f]/8 text-[#00346f]"
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="min-h-[128px]">
        <h3 className={["font-heading text-2xl font-black tracking-tight", isHighlighted ? "text-white" : "text-[#00346f]"].join(" ")}>
          {plan.name}
        </h3>
        <p className={["mt-3 text-sm font-bold", isHighlighted ? "text-blue-100" : "text-slate-500"].join(" ")}>
          {plan.capacity}
        </p>
        <div className="mt-5 flex flex-wrap items-end gap-x-1.5 gap-y-1">
          <span className="font-heading text-4xl font-black tracking-tight sm:text-[2.65rem]">{plan.price}</span>
          {plan.cadence ? (
            <span className={["pb-1.5 text-sm font-bold", isHighlighted ? "text-blue-100/85" : "text-slate-400"].join(" ")}>
              {plan.cadence}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span
              className={[
                "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full",
                isHighlighted ? "bg-white/12 text-emerald-300" : "bg-emerald-50 text-emerald-700"
              ].join(" ")}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className={["text-sm leading-6", isHighlighted ? "text-white/90" : "text-slate-650"].join(" ")}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to={plan.to}
        className={[
          "mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-center text-sm font-black uppercase tracking-[0.12em] transition",
          isHighlighted
            ? "bg-white text-[#00346f] hover:bg-blue-50"
            : "border border-[#00346f] bg-white text-[#00346f] hover:bg-[#00346f] hover:text-white"
        ].join(" ")}
      >
        {plan.cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function PricingSection({ section }) {
  const Icon = section.icon;

  return (
    <section id={section.id} className="scroll-mt-28">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00346f]/15 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#00346f] shadow-sm">
            <Icon className="h-3.5 w-3.5" />
            {section.eyebrow}
          </div>
          <h2 className="font-heading text-3xl font-black tracking-tight text-[#00346f] sm:text-4xl">
            {section.title}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {section.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {section.plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900 selection:bg-[#004a99] selection:text-white">
      <LandingPageNavbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-28 sm:px-6 lg:pt-32">
        <section className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-[#00346f] shadow-sm">
              Qring pricing
            </div>
            <h1 className="font-heading text-4xl font-black tracking-tight text-[#00346f] sm:text-5xl lg:text-6xl">
              Plans for estate security and visitor access.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Pick the estate plan that matches your house count, gate operations, and resident visitor workflow without changing how QRing works.
            </p>
          </div>

          <nav className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm" aria-label="Pricing sections">
            {pricingSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md px-3 py-2.5 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-600 transition hover:bg-[#00346f] hover:text-white"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </section>

        <div className="flex flex-col gap-16">
          {pricingSections.map((section) => (
            <PricingSection key={section.id} section={section} />
          ))}
        </div>

        <section className="mt-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-10">
            <div>
              <h2 className="font-heading text-3xl font-black tracking-tight text-[#00346f]">Need a custom rollout?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Large estates and gated communities can speak with QRing about onboarding, integrations, training, and dedicated support.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <Link
                to="/request-demo"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#00346f] px-6 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#004a99] sm:w-auto"
              >
                Schedule a Demo
              </Link>
              <Link
                to="/contact"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-sm font-black uppercase tracking-[0.12em] text-[#00346f] transition hover:border-[#00346f] sm:w-auto"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-10 md:flex-row">
          <div>
            <span className="font-heading text-lg font-black text-[#00346f]">QRing</span>
            <p className="mt-1 text-sm text-slate-500">© 2024 QRing. Architectural Security Systems.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              ["Privacy Policy", "/privacy"],
              ["Terms of Service", "/terms"],
              ["Security", "/security"],
              ["Contact Support", "/contact"]
            ].map(([label, to]) => (
              <Link key={label} className="text-sm font-semibold text-slate-500 transition hover:text-[#00346f] hover:underline" to={to}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
