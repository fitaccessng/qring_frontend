import { BarChart3, Bell, DoorOpen, LayoutDashboard, UsersRound } from "lucide-react";
import FeatureCard from "../FeatureCard";

const managerFeatures = [
  { icon: UsersRound, title: "Manage residents", description: "Invite residents, assign units, and keep records up to date." },
  { icon: Bell, title: "Send announcements", description: "Broadcast updates to residents and security in seconds." },
  { icon: BarChart3, title: "Visitor logs and analytics", description: "Track visitor volume, approvals, and peak gate times." },
  { icon: LayoutDashboard, title: "Security guard dashboard", description: "Realtime queue, approvals, and clear decision visibility." },
  { icon: DoorOpen, title: "Manage access points", description: "Configure multiple gates and access rules across the estate." },
];

function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Estate Dashboard</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Security, residents, and visitor activity in one place.</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-200 dark:ring-emerald-900">
          Live
        </span>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {[
          { label: "Approved today", value: "128", tone: "text-emerald-700 bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900" },
          { label: "Pending", value: "9", tone: "text-brand-700 bg-brand-50 ring-brand-100 dark:bg-slate-900/40 dark:text-brand-100 dark:ring-slate-800" },
          { label: "Peak time", value: "6:10pm", tone: "text-slate-700 bg-slate-100 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800" },
          { label: "Guards online", value: "4/4", tone: "text-slate-700 bg-slate-100 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-800" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{kpi.value}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${kpi.tone}`}>Updated</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/70 p-5 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Recent Requests</p>
        <div className="mt-3 space-y-2">
          {[
            { name: "Visitor: Mr. Ade", status: "Approved", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-900" },
            { name: "Delivery: Parcel", status: "Waiting", tone: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-900" },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <span className="font-semibold text-slate-950 dark:text-white">{row.name}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${row.tone}`}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EstateManagersSection() {
  return (
    <section id="for-estates" className="bg-slate-50 py-16 dark:bg-slate-900/20 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">For Property Managers</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Built for Estate Managers</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              Manage residents, security teams, access points, and visitor records without spreadsheets or WhatsApp threads.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {managerFeatures.map((f) => (
                <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
              ))}
            </div>
          </div>

          <div className="lg:pt-10">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

