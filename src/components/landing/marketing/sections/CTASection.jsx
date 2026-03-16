import { Link } from "react-router-dom";
import { ArrowRight, Download } from "lucide-react";

export default function CTASection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-10">
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-10 text-white shadow-soft sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(36,86,245,0.45),transparent_45%),radial-gradient(circle_at_70%_10%,rgba(31,157,98,0.28),transparent_55%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Upgrade Today</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Upgrade Your Estate Security Today</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">
              Stop depending on notebooks at the gate. Move approvals, snapshots, and visitor history into a system built for secure communities.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-soft transition hover:bg-slate-100"
              >
                Request a Demo <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Download the App <Download className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-6">
            {[
              { label: "Visitor scan to request entry", value: "Instant" },
              { label: "Homeowner approval decision", value: "One tap" },
              { label: "Guard visibility at the gate", value: "Realtime" },
              { label: "Visitor history and audit trail", value: "Always on" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
                <p className="text-sm text-white/70">{row.label}</p>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/25">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

