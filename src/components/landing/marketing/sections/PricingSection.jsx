import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "₦25,000",
    period: "/month",
    description: "Perfect for small gated communities and residential compounds.",
    features: ["Up to 50 residents", "2 gate access points", "QR visitor check-in", "Instant approvals", "7-day visitor logs", "Email support"],
    cta: { label: "Get Started", to: "/signup" },
    featured: false,
  },
  {
    name: "Estate",
    price: "₦75,000",
    period: "/month",
    description: "For mid-size estates with active security operations.",
    features: ["Up to 300 residents", "Unlimited gate points", "Visitor snapshot verification", "Live visitor queue", "90-day audit logs", "Priority support"],
    cta: { label: "Request Demo", to: "/contact" },
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large communities and multi-property portfolios.",
    features: ["Unlimited residents", "Multi-estate dashboard", "Custom integrations", "Dedicated account manager", "SLA support", "Unlimited history"],
    cta: { label: "Contact Sales", to: "/contact" },
    featured: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-white py-16 dark:bg-slate-950 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Pricing</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Simple pricing that scales</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Choose a plan that fits your estate today. Upgrade when you grow.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={[
                "relative overflow-hidden rounded-[2rem] border p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lg",
                tier.featured
                  ? "border-brand-200 bg-slate-950 text-white dark:border-slate-800"
                  : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100",
              ].join(" ")}
            >
              {tier.featured ? (
                <span className="absolute right-6 top-6 rounded-full bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-brand-500/30">
                  Most popular
                </span>
              ) : null}

              <p className="text-sm font-semibold tracking-tight">{tier.name}</p>
              <p className={tier.featured ? "mt-2 text-sm text-white/70" : "mt-2 text-sm text-slate-600 dark:text-slate-300"}>{tier.description}</p>

              <div className="mt-6 flex items-end gap-2">
                <p className="text-4xl font-black tracking-tight">{tier.price}</p>
                {tier.period ? <p className={tier.featured ? "pb-1 text-sm text-white/60" : "pb-1 text-sm text-slate-500"}>{tier.period}</p> : null}
              </div>

              <div className={tier.featured ? "mt-6 h-px bg-white/10" : "mt-6 h-px bg-slate-200 dark:bg-slate-800"} />

              <ul className="mt-6 space-y-3 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className={tier.featured ? "mt-0.5 h-4 w-4 text-emerald-300" : "mt-0.5 h-4 w-4 text-emerald-600"} aria-hidden="true" />
                    <span className={tier.featured ? "text-white/80" : "text-slate-700 dark:text-slate-200"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={tier.cta.to}
                className={[
                  "mt-8 inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition",
                  tier.featured
                    ? "bg-white text-slate-950 hover:bg-slate-100"
                    : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900",
                ].join(" ")}
              >
                {tier.cta.label}
              </Link>

              <div className="pointer-events-none absolute inset-0 opacity-0 transition hover:opacity-100">
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(36,86,245,0.25),transparent_65%)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

