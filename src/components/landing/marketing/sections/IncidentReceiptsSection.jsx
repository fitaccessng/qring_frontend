import { Link } from "react-router-dom";
import { ArrowRight, Download, ShieldCheck } from "lucide-react";

function ReceiptRow({ label, value, tone = "text-slate-900 dark:text-white" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`truncate font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default function IncidentReceiptsSection() {
  return (
    <section id="receipts" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Incident-proof receipts</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
            When something happens, you have proof
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            QRing creates a consistent, searchable record for every visitor request. You can see who approved, what was captured at the gate, and the final
            outcome.
          </p>

          <div className="mt-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">Accountability by default</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  Every record includes timestamps, gate, resident context, and decision outcome.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                See exports <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
              >
                Download sample <Download className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-soft dark:border-slate-800 dark:bg-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(31,157,98,0.14),transparent_48%),radial-gradient(circle_at_80%_30%,rgba(36,86,245,0.16),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Visitor record</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Gate Entry Receipt</p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-200 dark:ring-emerald-900">
                Approved
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <ReceiptRow label="Timestamp" value="2026-03-13 18:42" />
              <ReceiptRow label="Gate" value="Gate 1" />
              <ReceiptRow label="Visitor" value="Chinedu Okeke" />
              <ReceiptRow label="Resident" value="Unit 14B (Homeowner)" />
              <ReceiptRow label="Decision" value="Approved by homeowner" tone="text-emerald-700 dark:text-emerald-200" />
              <ReceiptRow label="Audit" value="Recorded + exportable" />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">What gets logged</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {["Request created", "Snapshot captured", "Homeowner decision", "Guard visibility", "Entry outcome", "Search + export"].map((x) => (
                  <div key={x} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-slate-950 dark:text-white">{x}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

