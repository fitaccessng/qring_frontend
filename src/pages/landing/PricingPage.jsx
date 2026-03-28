import { Link } from "react-router-dom";
import LandingShell from "../../components/landing/LandingShell";
import { PricingShowcase } from "../../components/landing/marketing/sections/PricingSection";

export default function PricingPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="border-b border-slate-200 pb-8 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pricing</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
            Fair, transparent pricing for estates and modern homes
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
            QRing keeps access control affordable with simple per-house billing for estates and flexible plans for homeowners.
          </p>
        </div>
      </section>

      <PricingShowcase />

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10">
        <div className="flex flex-col gap-6 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Need a custom rollout?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              We support multi-estate deployments, guided onboarding, and custom setup for larger property portfolios.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/request-demo"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Request Demo
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
