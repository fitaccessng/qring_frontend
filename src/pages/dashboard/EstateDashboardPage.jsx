import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Building2, ChevronRight, DoorClosed, Home, LogOut, Plus, UserCircle2, Users } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview } from "../../services/estateService";
import { useAuth } from "../../state/AuthContext";

const modules = [
  { title: "Assign Doors", to: "/dashboard/estate/assign", subtitle: "Link entries to owners" },
  { title: "Invite Owners", to: "/dashboard/estate/invites", subtitle: "Send resident access links" },
  { title: "Mappings", to: "/dashboard/estate/mappings", subtitle: "Review home-to-door map" },
  { title: "Plan Rules", to: "/dashboard/estate/plan", subtitle: "Monitor usage limits" }
];

export default function EstateDashboardPage() {
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const managerName = user?.fullName?.trim() || "Estate Manager";
  const initials = managerName.slice(0, 1).toUpperCase();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getEstateOverview();
        if (mounted) setOverview(data);
      } catch (err) {
        if (mounted) setError(err.message ?? "Failed to load estate data");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      estates: overview?.estates?.length ?? 0,
      homes: overview?.homes?.length ?? 0,
      doors: overview?.doors?.length ?? 0,
      residents: overview?.homeowners?.length ?? 0
    }),
    [overview]
  );

  const setupPercent = useMemo(() => {
    const score =
      Number(counts.estates > 0) * 25 +
      Number(counts.homes > 0) * 25 +
      Number(counts.doors > 0) * 25 +
      Number(counts.residents > 0) * 25;
    return Math.max(8, score);
  }, [counts]);
  const totalAssets = useMemo(
    () => counts.estates + counts.homes + counts.doors + counts.residents,
    [counts]
  );

  const inProgress = [
    {
      title: "Door Coverage",
      subtitle: `${counts.doors} configured`,
      bar: counts.homes > 0 ? Math.min(100, Math.round((counts.doors / counts.homes) * 100)) : 0,
      tone: "bg-sky-500"
    },
    {
      title: "Resident Onboarding",
      subtitle: `${counts.residents} owners active`,
      bar: counts.homes > 0 ? Math.min(100, Math.round((counts.residents / counts.homes) * 100)) : 0,
      tone: "bg-orange-400"
    }
  ];

  return (
    <AppShell title="Estate Hub" showTopBar={false}>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-2 py-3 sm:px-3 sm:py-4">
        <section className="rounded-[1.6rem] border border-slate-200/70 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Hello!</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{managerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/notifications"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
              </Link>
              <Link
                to="/dashboard/estate/settings"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Profile"
                title="Profile"
              >
                <UserCircle2 size={16} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="grid h-9 w-9 place-items-center rounded-full bg-rose-100 text-rose-600 transition-all active:scale-95 dark:bg-rose-900/30 dark:text-rose-300"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-7">
          <article className="rounded-[1.4rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-500/20 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-violet-100">Estate operations overview</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-violet-200">Access control status</p>
              </div>
              <ProgressRing value={setupPercent} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link
                to="/dashboard/estate/create"
                className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-white active:scale-95"
              >
                <Plus size={14} />
                Create Estate
              </Link>
            </div>
          </article>
        </section>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">In Progress</h3>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {inProgress.map((item) => (
              <div key={item.title} className="min-w-[17rem] snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-200">{item.title}</p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">{item.subtitle}</p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className={`h-1.5 rounded-full ${item.tone}`} style={{ width: `${item.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Assets Overview</h3>
          <div className="space-y-4">
            <ActionRow
              icon={<Building2 size={14} />}
              title="Estates"
              subtitle={`${counts.estates} total estates`}
              to="/dashboard/estate/create"
              percent={totalAssets > 0 ? Math.round((counts.estates / totalAssets) * 100) : 0}
            />
            <ActionRow
              icon={<Home size={14} />}
              title="Homes"
              subtitle={`${counts.homes} configured homes`}
              to="/dashboard/estate/homes"
              percent={totalAssets > 0 ? Math.round((counts.homes / totalAssets) * 100) : 0}
            />
            <ActionRow
              icon={<DoorClosed size={14} />}
              title="Doors"
              subtitle={`${counts.doors} linked entries`}
              to="/dashboard/estate/doors"
              percent={totalAssets > 0 ? Math.round((counts.doors / totalAssets) * 100) : 0}
            />
            <ActionRow
              icon={<Users size={14} />}
              title="Residents"
              subtitle={`${counts.residents} onboarded`}
              to="/dashboard/estate/invites"
              percent={totalAssets > 0 ? Math.round((counts.residents / totalAssets) * 100) : 0}
            />
          </div>
        </section>

        <section className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
            <Link to="/dashboard/estate/logs" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              View logs
            </Link>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/80 sm:p-5">
            {modules.map((module) => (
              <Link
                key={module.title}
                to={module.to}
                className="flex items-center justify-between rounded-xl px-2 py-2 transition-all hover:bg-slate-50 active:scale-[0.99] dark:hover:bg-slate-800/60"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{module.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-300">{module.subtitle}</p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActionRow({ icon, title, subtitle, to, percent }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 transition-all active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/80"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          {icon}
        </span>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{subtitle}</p>
        </div>
      </div>
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-bold text-violet-700"
        style={{ background: `conic-gradient(#8b5cf6 ${safePercent * 3.6}deg, #e5e7eb 0deg)` }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white dark:bg-slate-900">{safePercent}%</span>
      </span>
    </Link>
  );
}

function ProgressRing({ value }) {
  return (
    <div
      className="grid h-14 w-14 place-items-center rounded-full bg-white/20 text-xs font-bold text-white"
      style={{ background: `conic-gradient(#ffffff ${value * 3.6}deg, rgba(255,255,255,0.25) 0deg)` }}
      aria-label={`${value}%`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-indigo-700/90">{value}%</span>
    </div>
  );
}
