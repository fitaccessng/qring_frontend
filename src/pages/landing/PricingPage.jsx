import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  Building2,
  CalendarClock,
  ChevronRight,
  DoorClosed,
  History,
  LayoutDashboard,
  MessageSquareMore,
  PhoneCall,
  QrCode,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import LandingPageNavbar from "../../components/landing/marketing/sections/LandingPageNavbar";

const estatePlans = [
  {
    name: "Starter Estate",
    subtitle: "Up to 3 houses (trial only, 30 days)",
    monthly: "₦0",
    yearly: "₦0",
    cadence: "/month",
    cta: "Start Free Trial",
    to: "/signup",
    accent: "light",
    icon: Building2,
    features: [
      "Up to 3 houses",
      "Full system access (limited scale)",
      "Trial only - 30 days"
    ]
  },
  {
    name: "Estate Basic",
    subtitle: "Up to 10 houses",
    monthly: "₦6,000",
    yearly: "₦57,600",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Start Basic",
    to: "/signup",
    accent: "light",
    icon: BellRing,
    features: [
      "Up to 10 houses",
      "Realtime alerts",
      "Visitor logs",
      "Resident management",
      "Mobile dashboard"
    ]
  },
  {
    name: "Estate Plus",
    subtitle: "Up to 15 houses",
    monthly: "₦9,000",
    yearly: "₦86,400",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Choose Plus",
    to: "/signup",
    accent: "light",
    icon: CalendarClock,
    features: [
      "Everything in Basic",
      "Visitor scheduling",
      "Access time windows",
      "Chat + call verification"
    ]
  },
  {
    name: "Estate Growth",
    subtitle: "Up to 30 houses",
    monthly: "₦18,000",
    yearly: "₦172,800",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Choose Growth",
    to: "/signup",
    accent: "featured",
    badge: "Popular",
    icon: LayoutDashboard,
    features: [
      "Everything in Plus",
      "Multi-admin roles",
      "Analytics dashboard",
      "Activity tracking"
    ]
  },
  {
    name: "Estate Pro",
    subtitle: "Up to 50 houses",
    monthly: "₦30,000",
    yearly: "₦288,000",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Start Pro",
    to: "/signup",
    accent: "light",
    icon: UserCog,
    features: [
      "Everything in Growth",
      "Advanced analytics",
      "Security audit logs",
      "Role permissions",
      "Priority support"
    ]
  },
  {
    name: "Enterprise Estate",
    subtitle: "Custom plan for large estates",
    monthly: "Custom Pricing",
    yearly: "Custom Pricing",
    cadence: "",
    cta: "Contact Sales",
    to: "/contact",
    accent: "dark",
    icon: ShieldCheck,
    features: [
      "Unlimited houses",
      "SLA + API access",
      "Multi-location control",
      "Dedicated support"
    ]
  }
];

const homeownerPlans = [
  {
    name: "Free",
    subtitle: "1 door",
    monthly: "Free",
    yearly: "Free",
    cadence: "",
    cta: "Get Started Free",
    to: "/signup",
    accent: "light",
    icon: DoorClosed,
    features: [
      "1 door",
      "Basic notifications",
      "Limited logs"
    ]
  },
  {
    name: "Home Pro",
    subtitle: "Smart homeowner controls",
    monthly: "₦2,500",
    yearly: "₦24,000",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Choose Home Pro",
    to: "/signup",
    accent: "featured",
    icon: MessageSquareMore,
    features: [
      "Chat + call verification",
      "Visitor history",
      "Visitor scheduling",
      "Advanced notifications"
    ]
  },
  {
    name: "Home Premium",
    subtitle: "Advanced access and privacy",
    monthly: "₦4,500",
    yearly: "₦43,200",
    cadence: billing => billing === "monthly" ? "/month" : "/year",
    cta: "Choose Home Premium",
    to: "/signup",
    accent: "light",
    icon: QrCode,
    features: [
      "Multiple doors",
      "Access time windows",
      "Priority support",
      "Advanced privacy controls"
    ]
  }
];

const footerLinks = [
  "Privacy Policy",
  "Terms of Service",
  "Cookie Policy",
  "Contact Support"
];

function formatCadence(cadence, billing) {
  return typeof cadence === "function" ? cadence(billing) : cadence;
}

function PricingCard({ plan, billing }) {
  const Icon = plan.icon;
  const price = billing === "monthly" ? plan.monthly : plan.yearly;
  const cadence = formatCadence(plan.cadence, billing);
  const isFeatured = plan.accent === "featured";
  const isDark = plan.accent === "dark";

  return (
    <article
      className={
        isDark
          ? "flex h-full flex-col rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-6 text-white shadow-[0_30px_80px_rgba(0,52,111,0.18)] sm:p-8"
          : isFeatured
            ? "flex h-full flex-col rounded-[2rem] bg-[#00346f] p-6 text-white shadow-[0_30px_80px_rgba(0,52,111,0.18)] sm:p-8"
            : "flex h-full flex-col rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8"
      }
    >
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {plan.badge ? (
            <span className="mb-3 inline-flex rounded-full bg-white/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
              {plan.badge}
            </span>
          ) : null}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                isDark || isFeatured ? "bg-white/10 text-blue-100" : "bg-slate-100 text-[#00346f]"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3
                className={`font-heading text-2xl font-extrabold tracking-tight ${
                  isDark || isFeatured ? "text-white" : "text-[#00346f]"
                }`}
              >
                {plan.name}
              </h3>
              <p className={`${isDark || isFeatured ? "text-blue-200/85" : "text-slate-500"} text-sm leading-6`}>
                {plan.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-black/[0.04] px-4 py-3 text-left sm:min-w-[132px] sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
          <div className={`font-heading text-3xl font-extrabold sm:text-4xl ${isDark || isFeatured ? "text-white" : "text-[#00346f]"}`}>
            {price}
          </div>
          {cadence ? (
            <div className={`${isDark || isFeatured ? "text-blue-200/80" : "text-slate-400"} text-xs font-medium`}>
              {cadence}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-grow space-y-4">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <ChevronRight
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                isDark || isFeatured ? "text-emerald-300" : "text-emerald-600"
              }`}
            />
            <span className={`${isDark || isFeatured ? "text-white/90" : "text-slate-700"} text-sm leading-6`}>
              {feature}
            </span>
          </div>
        ))}
      </div>

      <Link
        to={plan.to}
        className={
          isDark || isFeatured
            ? "mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-4 text-center text-sm font-extrabold uppercase tracking-[0.16em] text-[#00346f] transition hover:bg-blue-50"
            : "mt-8 inline-flex w-full items-center justify-center rounded-xl border border-[#00346f] px-4 py-4 text-center text-sm font-bold uppercase tracking-[0.16em] text-[#00346f] transition hover:bg-[#00346f]/5"
        }
      >
        {plan.cta}
      </Link>
    </article>
  );
}

export default function PricingPage() {
  const [audience, setAudience] = useState("estate");
  const [billing, setBilling] = useState("monthly");

  const visiblePlans = useMemo(
    () => (audience === "estate" ? estatePlans : homeownerPlans),
    [audience]
  );

  return (
    <div className="flex min-h-[105dvh] flex-col overflow-x-hidden bg-[#f8f9fa] font-saas text-slate-900 selection:bg-[#004a99] selection:text-white">
      <LandingPageNavbar />

      <main className="mx-auto flex-1 max-w-7xl px-6 pb-24 pt-32">
        <section className="mb-20 text-center">
          <h1 className="font-heading text-5xl font-extrabold tracking-[-0.06em] text-[#00346f] md:text-7xl">
            Plans for Every Home and Estate
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
            Choose the architectural security layer that fits your lifestyle.
            From single gates to sprawling multi-unit developments.
          </p>

          <div className="mt-10 flex justify-center">
            <div className="inline-flex flex-wrap justify-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {[
                ["estate", "Estate Plans"],
                ["homeowner", "Homeowner Plans"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAudience(value)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    audience === value
                      ? "bg-[#00346f] text-white shadow-sm"
                      : "text-slate-600 hover:text-[#00346f]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <div
              className="inline-flex flex-col items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm sm:flex-row"
              role="tablist"
              aria-label="Billing period"
            >
              <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1">
                {[
                  ["monthly", "Monthly"],
                  ["yearly", "Yearly"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={billing === value}
                    onClick={() => setBilling(value)}
                    className={`min-w-[120px] rounded-full px-4 py-2.5 text-sm font-bold transition ${
                      billing === value
                        ? "bg-[#00346f] text-white shadow-sm"
                        : "text-slate-500 hover:text-[#00346f]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
                Save 20% Yearly
              </span>
            </div>
          </div>
        </section>

        <section className="mb-32 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visiblePlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} billing={billing} />
          ))}
        </section>

        <section className="relative mt-20 overflow-hidden rounded-[2rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,74,153,0.14),transparent_55%)]" />
          <div className="relative z-10 bg-slate-200/70 p-16 text-center backdrop-blur-sm md:p-24">
            <h2 className="mb-6 font-heading text-4xl font-extrabold text-[#00346f]">
              Still not sure which plan is right?
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-slate-600">
              Our security consultants are ready to help you architect the
              perfect access solution for your property.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/request-demo"
                className="rounded-xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-10 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:shadow-lg"
              >
                Schedule a Demo
              </Link>
              <Link
                to="/contact"
                className="rounded-xl border border-slate-200 bg-white px-10 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#00346f] transition hover:bg-slate-50"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>


          <footer className="mt-20 rounded-t-[3rem] bg-slate-50">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-8 py-12 md:flex-row">
              <div className="flex flex-col gap-2">
                <span className="font-heading text-lg font-bold text-slate-950">QRing</span>
                <p className="text-sm text-slate-500">© 2024 QRing. Architectural Security Systems.</p>
              </div>

              <div className="flex flex-wrap justify-center gap-8">
                <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                  Privacy Policy
                </Link>
                <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                  Terms of Service
                </Link>
                <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                  Security Whitepaper
                </Link>
                <Link className="text-sm text-slate-500 transition hover:text-blue-700 hover:underline" to="/contact">
                  Contact Support
                </Link>
              </div>
            </div>
          </footer>


    </div>
  );
}
