import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, FileSpreadsheet, Smartphone, UsersRound } from "lucide-react";

const timeline = [
  {
    day: "Day 0",
    title: "Estate setup",
    description: "Create your estate, add gates, and create guard accounts.",
    icon: Clock3,
  },
  {
    day: "Day 1",
    title: "Residents onboarding",
    description: "Import residents (CSV) and share simple approval instructions.",
    icon: UsersRound,
  },
  {
    day: "Day 2",
    title: "Go live at the gate",
    description: "Guards scan, homeowners approve, logs start recording automatically.",
    icon: Smartphone,
  },
];

const requirements = [
  { icon: Smartphone, label: "A smartphone or tablet at each gate" },
  { icon: FileSpreadsheet, label: "Resident list (CSV) or manual entry" },
  { icon: CheckCircle2, label: "A short guard briefing (we provide the checklist)" },
];

export default function SwitchingPlanSection() {
  return (
    <section id="switching-plan" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Switching Plan</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Be operational in 48 hours
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Estates hesitate because onboarding feels like a project. QRing is designed to go live quickly with minimal setup and no hardware installs.
          </p>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">What you need</p>
            <div className="mt-4 grid gap-3">
              {requirements.map((r) => (
                <div key={r.label} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-slate-950 dark:text-brand-100 dark:ring-slate-800">
                    <r.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">{r.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Timeline</p>
          <div className="mt-5 space-y-4">
            {timeline.map((t) => (
              <div key={t.day} className="flex gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900">
                  <t.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">{t.title}</p>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">{t.day}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{t.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Request a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

