import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, BellRing, Building2, ClipboardList, DoorClosed, Home, Megaphone, Plus, Users, Vote } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview, listEstateAlerts } from "../../services/estateService";
import { showError } from "../../utils/flash";
import { useAuth } from "../../state/AuthContext";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";

const guidedSetup = [
  {
    step: "Step 1",
    title: "Create Estate",
    detail: "Start by creating your estate profile.",
    to: "/dashboard/estate/create"
  },
  {
    step: "Step 2",
    title: "Create Homeowner",
    detail: "Go to Create / Invite Homeowners to add resident accounts.",
    to: "/dashboard/estate/invites"
  },
  {
    step: "Step 3",
    title: "Add Home + Doors",
    detail: "Create home units, then add doors for access.",
    to: "/dashboard/estate/homes"
  },
  {
    step: "Step 4",
    title: "Assign Doors",
    detail: "Link each door to the right homeowner.",
    to: "/dashboard/estate/assign"
  }
];

export default function EstateDashboardPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [meetingSnapshot, setMeetingSnapshot] = useState(null);
  const [error, setError] = useState("");
  const managerName = user?.fullName?.trim() || "Estate Manager";
  const estateName = overview?.estates?.[0]?.name || "Estate";
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

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    let mounted = true;
    async function loadMeetings() {
      const estateId = overview?.estates?.[0]?.id;
      if (!estateId) return;
      try {
        const rows = await listEstateAlerts(estateId, "meeting");
        if (!mounted) return;
        setMeetingSnapshot(rows?.[0] ?? null);
      } catch {
        if (mounted) setMeetingSnapshot(null);
      }
    }
    loadMeetings();
    return () => {
      mounted = false;
    };
  }, [overview?.estates]);

  useEffect(() => {
    const estateId = overview?.estates?.[0]?.id;
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [overview?.estates]);

  useSocketEvents(
    useMemo(
      () => ({
        ALERT_CREATED: () => {
          getEstateOverview().then(setOverview).catch(() => {});
        },
        ALERT_UPDATED: () => {
          getEstateOverview().then(setOverview).catch(() => {});
        },
        ALERT_DELETED: () => {
          getEstateOverview().then(setOverview).catch(() => {});
        },
        PAYMENT_STATUS_UPDATED: () => {
          getEstateOverview().then(setOverview).catch(() => {});
        }
      }),
      []
    )
  );

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
      subtitle: `${counts.residents} owners onboarded`,
      bar: counts.homes > 0 ? Math.min(100, Math.round((counts.residents / counts.homes) * 100)) : 0,
      tone: "bg-orange-400"
    }
  ];

  return (
    <AppShell title="Estate Hub" showTopBar={false}>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-2 py-3 sm:px-3 sm:py-4">
        <section className="rounded-[1.6rem] border border-slate-200/70 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              {initials}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Hello!</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{managerName}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-7">
          <article className="rounded-[1.4rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-500/20 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl text-violet-100">{estateName} Overview</p>
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
              <Link
                to="/dashboard/estate/invites"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-white/30 active:scale-95"
              >
                <Users size={14} />
                Create Homeowner
              </Link>
            </div>
          </article>
        </section>

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
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Start Here</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {guidedSetup.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-indigo-700/60"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{item.step}</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        {meetingSnapshot ? (
          <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest meeting</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{meetingSnapshot.title}</p>
                <p className="text-xs text-slate-500">{meetingSnapshot.dueDate ? new Date(meetingSnapshot.dueDate).toLocaleString() : "Schedule TBD"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                  Attending {meetingSnapshot.meetingResponses?.attending ?? 0}
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                  Not attending {meetingSnapshot.meetingResponses?.not_attending ?? 0}
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  Maybe {meetingSnapshot.meetingResponses?.maybe ?? 0}
                </span>
              </div>
            </div>
          </section>
        ) : null}

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

        <QuickActionGrid />
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

function QuickActionGrid() {
  const [showMore, setShowMore] = useState(false);
  const primaryActions = [
    { label: "Broadcast", to: "/dashboard/estate/broadcasts", icon: <Megaphone size={18} /> },
    { label: "Meetings", to: "/dashboard/estate/meetings", icon: <BellRing size={18} /> },
    { label: "Polls", to: "/dashboard/estate/polls", icon: <Vote size={18} /> },
    { label: "Dues", to: "/dashboard/estate/dues", icon: <ClipboardList size={18} /> },
    { label: "Maintenance", to: "/dashboard/estate/maintenance", icon: <DoorClosed size={18} /> },
    { label: "Visitor Stats", to: "/dashboard/estate/stats", icon: <BarChart3 size={18} /> }
  ];
  const moreActions = [
    { label: "Access Logs", to: "/dashboard/estate/logs" },
    { label: "Assign Doors", to: "/dashboard/estate/assign" },
    { label: "Invite Homeowners", to: "/dashboard/estate/invites" },
    { label: "Mappings", to: "/dashboard/estate/mappings" },
    { label: "Plan Rules", to: "/dashboard/estate/plan" },
    { label: "Community", to: "/dashboard/estate/community" },
    { label: "Settings", to: "/dashboard/estate/settings" }
  ];

  return (
    <section className="space-y-3 pb-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
        >
          More
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {primaryActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 transition hover:border-indigo-200 hover:shadow-sm active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              {action.icon}
            </span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>

      {showMore ? (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/50 px-4 pb-6 pt-10 backdrop-blur-sm">
          <div className="h-[50vh] w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">More Actions</p>
              <button
                type="button"
                onClick={() => setShowMore(false)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="grid gap-2 overflow-y-auto pr-1">
              {moreActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  onClick={() => setShowMore(false)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                >
                  <span>{action.label}</span>
                  <span className="text-xs text-slate-400">Open</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
