import { CheckCircle2, LockKeyhole, ShieldCheck, Zap } from "lucide-react";

const bullets = [
  { icon: ShieldCheck, title: "Improves estate security", description: "Snapshot verification and approval logs reduce impersonation and disputes." },
  { icon: Zap, title: "Eliminates gate congestion", description: "Fast approvals reduce phone calls and waiting time at busy gates." },
  { icon: CheckCircle2, title: "Creates digital visitor records", description: "Every visit is stored with timestamps for accountability and reporting." },
  { icon: LockKeyhole, title: "Increases transparency", description: "Homeowners and managers share a consistent view of who entered and when." },
];

const stats = [
  { label: "Approval speed", value: "< 5s" },
  { label: "Gate check-in", value: "QR + snapshot" },
  { label: "Audit trail", value: "Searchable logs" },
];

export default function TrustSection() {
  return (
    <section id="trust" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Trust</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Built for Secure Communities</h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            QRing is designed around clarity: who arrived, who approved, and what security saw at the gate. Simple workflows. Strong accountability.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {bullets.map((b) => (
            <div key={b.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-slate-900 dark:text-brand-100 dark:ring-slate-800">
                <b.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-950 dark:text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

