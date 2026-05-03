import { Clock3, FileX2, PencilLine, Search, ShieldAlert } from "lucide-react";

const problems = [
  {
    icon: FileX2,
    title: "Manual visitor logbooks",
    description: "Paper logs get lost, damaged, or filled with gaps. You cannot audit what is not consistent.",
  },
  {
    icon: Clock3,
    title: "Slow approvals at the gate",
    description: "Phone calls and back-and-forth create queues, gate congestion, and unnecessary friction for residents.",
  },
  {
    icon: PencilLine,
    title: "Fake names and unreadable handwriting",
    description: "Bad entries mean bad security. Estates need clear identification and a record you can trust.",
  },
  {
    icon: Search,
    title: "No visitor history",
    description: "When an incident happens, there is no searchable trail: no timestamps, no snapshots, no accountability.",
  },
  {
    icon: ShieldAlert,
    title: "Security risks",
    description: "Without verification and audit logs, estates rely on guesswork for access decisions.",
  },
];

export default function ProblemSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">The Problem</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            Estate Security Shouldn’t Depend on a Notebook
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Traditional gate logs were never designed for modern residential communities. They slow down approvals, reduce accountability, and create
            security blind spots.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {problems.map((p) => (
            <div
              key={p.title}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 transition group-hover:bg-white dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900 dark:group-hover:bg-slate-950">
                  <p.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{p.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

