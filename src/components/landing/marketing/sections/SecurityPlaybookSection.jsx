import { Camera, CheckCircle2, ClipboardList, LockKeyhole, UserCheck } from "lucide-react";

const policies = [
  {
    icon: Camera,
    title: "Snapshot verification",
    points: [
      "Capture a visitor snapshot at the gate with the entry request.",
      "Homeowners approve with visual context, not just a name.",
      "Guards see the same snapshot alongside the decision.",
    ],
  },
  {
    icon: UserCheck,
    title: "Approval rules that match estates",
    points: [
      "Every entry has an explicit approve or reject decision.",
      "Decisions are tied to a specific resident or unit.",
      "Guards follow the decision, not phone calls and guesswork.",
    ],
  },
  {
    icon: ClipboardList,
    title: "Audit logs you can trust",
    points: [
      "Every request, decision, and gate action is time-stamped.",
      "You can filter by resident, gate, date, and decision outcome.",
      "Exports support incident review, reporting, and transparency.",
    ],
  },
];

const guarantees = [
  { icon: LockKeyhole, title: "Role-based access", description: "Residents, managers, and guards see only what they need to do their job." },
  { icon: CheckCircle2, title: "Clear accountability", description: "Each visit shows who approved, when it happened, and what security saw." },
];

export default function SecurityPlaybookSection() {
  return (
    <section id="security-playbook" className="bg-slate-50 py-16 dark:bg-slate-900/20 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Security Playbook</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              A security system your estate can actually enforce
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              QRing turns “Who is that?” into a repeatable policy: snapshot, decision, and a permanent record. Clear for guards. Fast for homeowners.
            </p>

            <div className="mt-8 grid gap-3">
              {guarantees.map((g) => (
                <div key={g.title} className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-950">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-slate-900/40 dark:text-brand-100 dark:ring-slate-800">
                    <g.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">{g.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{g.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {policies.map((p) => (
              <div
                key={p.title}
                className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(36,86,245,0.14),transparent_48%),radial-gradient(circle_at_80%_75%,rgba(31,157,98,0.10),transparent_55%)]" />
                <div className="relative">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900">
                      <p.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{p.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

