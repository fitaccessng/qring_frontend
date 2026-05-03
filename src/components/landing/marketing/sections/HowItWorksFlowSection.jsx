import { ArrowRight, BellRing, Camera, MapPin, QrCode } from "lucide-react";

const nodes = [
  { icon: MapPin, label: "Visitor arrives" },
  { icon: QrCode, label: "Scans QR" },
  { icon: Camera, label: "Snapshot captured" },
  { icon: BellRing, label: "Homeowner notified" },
  { icon: ArrowRight, label: "Approve or reject" },
];

export default function HowItWorksFlowSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">How it Works</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">A flow your security team can run</h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
          Visitor arrives → scans QR → request sent → homeowner approves → guard sees the decision immediately.
        </p>
      </div>

      <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 lg:grid-cols-9 lg:items-center">
          {nodes.map((n, idx) => (
            <div key={n.label} className={idx === nodes.length - 1 ? "lg:col-span-1" : "lg:col-span-2"}>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-brand-700 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-brand-100 dark:ring-slate-800">
                  <n.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">{n.label}</p>
              </div>
              {idx !== nodes.length - 1 ? (
                <div className="mt-4 hidden items-center justify-center lg:flex">
                  <span className="h-px w-full bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800" />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Speed", value: "Fewer calls. Faster gates." },
            { label: "Security", value: "Snapshot + approval logs." },
            { label: "Accountability", value: "Searchable visitor history." },
          ].map((row) => (
            <div key={row.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{row.label}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
