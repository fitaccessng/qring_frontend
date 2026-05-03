import { Link } from "react-router-dom";
import { PlayCircle, QrCode, ShieldCheck, Smartphone, UsersRound } from "lucide-react";

function HeroMock() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
          qring.app/estate/gate-1
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-12 lg:gap-5">
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Gate Scan</p>
            <div className="mt-4 grid place-items-center rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-950">
              <div className="grid h-28 w-28 place-items-center rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
                <QrCode className="h-12 w-12 text-brand-700 dark:text-brand-100" aria-hidden="true" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Visitor requests entry</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Scan QR to notify homeowner instantly.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Approval</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-900">
                  <div className="grid h-full w-full place-items-center">
                    <Smartphone className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Visitor at Gate 1</p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">Snapshot + name, sent to homeowner.</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="rounded-2xl bg-emerald-600 px-3 py-2 text-center text-white shadow-sm">Approve</div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  Reject
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Guard Queue</p>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Chinedu O.", status: "Approved", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900" },
                  { name: "Delivery", status: "Waiting", tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900" },
                  { name: "Cleaner", status: "Rejected", tone: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-900" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/40">
                    <span className="font-semibold text-slate-900 dark:text-white">{row.name}</span>
                    <span className={`rounded-full px-2 py-1 font-semibold ring-1 ${row.tone}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-slate-950 dark:text-brand-100 dark:ring-slate-800">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Digital visitor records</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Audit-ready logs for estates and managers.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <UsersRound className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Avg approval speed: under 5s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(36,86,245,0.22),transparent_44%),radial-gradient(circle_at_70%_55%,rgba(31,157,98,0.18),transparent_48%),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.08),transparent_40%)]" />
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-10 lg:pb-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Secure approvals. Fast check-ins. Clear audit trails.
            </p>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
              Smart Visitor Management for Modern Estates.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
              Replace gate logbooks with QR-based visitor approvals. Visitors scan. Homeowners approve. Security stays in control.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup" className="inline-flex items-center justify-center rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700">
                Get Started
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
              >
                <PlayCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                Watch Demo
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {[
                { label: "No hardware required", tone: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" },
                { label: "Photo verification", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200" },
                { label: "Audit-ready logs", tone: "border-brand-100 bg-brand-50 text-brand-700 dark:border-slate-800 dark:bg-slate-950 dark:text-brand-100" },
              ].map((pill) => (
                <span key={pill.label} className={`rounded-full border px-3 py-1 ${pill.tone}`}>
                  {pill.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:pl-2">
            <HeroMock />
          </div>
        </div>
      </div>
    </section>
  );
}

