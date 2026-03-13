import { Link } from "react-router-dom";
import LandingShell from "../../components/landing/LandingShell";

const values = [
  {
    title: "Security by design",
    text: "Every session is signed, scoped, and logged so estates can always trace access decisions."
  },
  {
    title: "Realtime without chaos",
    text: "Low-latency delivery with stable fallbacks keeps residents and security aligned."
  },
  {
    title: "Human-first operations",
    text: "Clear workflows for approvals, dues, and maintenance so teams stay in control."
  }
];

const milestones = [
  { year: "2024", event: "Qring prototype tested in private residential communities." },
  { year: "2025", event: "Estate operations suite launched with realtime visitor verification." },
  { year: "2026", event: "Platform expanded to dues, polls, maintenance, and analytics." }
];

export default function AboutPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">About Qring</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Building trusted access communication for modern communities.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring replaces analog doorbell friction with secure, realtime, and auditable access control for estates and homeowners.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Mission</p>
            <h2 className="mt-3 text-2xl font-black">Secure access, calm operations.</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              We help estates deliver fast, accountable entry while giving homeowners visibility and control at every step.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { value: "150k+", label: "Sessions handled" },
                { value: "98%", label: "Fast approvals" },
                { value: "24/7", label: "Operations" }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xl font-black">{item.value}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            {values.map((item) => (
              <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:p-8">
          <h2 className="text-2xl font-black">Journey</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {milestones.map((item) => (
              <div key={item.year} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{item.year}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Ready to deploy Qring?</h2>
              <p className="mt-2 text-sm text-white/70 dark:text-slate-600">Let us map the right rollout for your estate.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/contact" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
                Contact Sales
              </Link>
              <Link to="/pricing" className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white dark:border-slate-900 dark:text-slate-900">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
