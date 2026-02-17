import AppShell from "../../layouts/AppShell";
import { Link } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useEffect, useState } from "react";
import { getHomeownerContext } from "../../services/homeownerService";

export default function HomeownerDashboardPage() {
  const [managedByEstate, setManagedByEstate] = useState(false);
  const {
    metrics,
    activity,
    waitingRoom,
    session,
    messages,
    loading,
    error,
    connected
  } = useDashboardData();

  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const data = await getHomeownerContext();
        if (!active) return;
        setManagedByEstate(Boolean(data?.managedByEstate));
      } catch {
        if (!active) return;
        setManagedByEstate(false);
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell className="text-sm" title="Homeowner Workspace">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Active Visitors" value={metrics.activeVisitors} tone="success" loading={loading} sub="Live now" />
        <Metric title="Pending Approvals" value={metrics.pendingApprovals} tone="warning" loading={loading} sub="Needs action" />
        <Metric title="Calls Today" value={metrics.callsToday} tone="brand" loading={loading} sub="Audio + video" />
        <Metric title="Unread Messages" value={metrics.unreadMessages} tone="danger" loading={loading} sub="Recent threads" />
      </section>

      <section className="mt-4">
        <Link
          to="/dashboard/homeowner/doors"
          className="inline-flex items-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Create a Door
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold">Recent Visitor Activity</h2>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${connected ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
              {connected ? "LIVE" : "RECONNECTING"}
            </span>
          </div>
          <div className="mb-4 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>Weekly Traffic</span>
              <span>Last 7 Days</span>
            </div>
            <MiniChart />
          </div>
          <div className="space-y-3">
            {activity.length === 0 ? (
              <Empty text="No activity yet." />
            ) : (
              activity.map((item) => (
                <div key={item.id ?? `${item.event}-${item.time}`} className="rounded-xl border border-slate-200 bg-white p-4 text-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.event}</p>
                    <span className="text-xs text-slate-500">{item.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="mb-4 font-heading text-lg font-bold">Realtime Interaction</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Panel title="Waiting Room" value={`${waitingRoom.length} Visitors`} tone="warning" />
            <Panel title="Active Session" value={session?.id ?? "No session"} tone="success" />
            <Panel title="Latest Message" value={messages[0]?.text ?? "No unread messages"} tone="brand" />
            <Panel title="Call Status" value={session?.state ?? "Idle"} tone="danger" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Control label="Audio" tone="success" />
            <Control label="Video" tone="brand" />
            <Control label="Mute" tone="warning" />
            <Control label="End" tone="danger" />
          </div>
        </article>
      </section>

      {!managedByEstate ? (
        <section className="mt-6">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 sm:p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-bold">Billing & Subscription</h2>
                <p className="mt-1 text-sm text-slate-500">Upgrade your homeowner plan and pay securely with Paystack.</p>
              </div>
              <Link
                to="/billing/paywall"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Open Billing
              </Link>
            </div>
          </article>
        </section>
      ) : null}
    </AppShell>
  );
}

function Metric({ title, value, tone, loading, sub }) {
  const badge = {
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
    danger: "bg-danger/20 text-danger",
    brand: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100"
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-soft transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge[tone]}`}>Live</span>
      </div>
      <p className="mt-3 font-heading text-2xl font-extrabold sm:text-3xl">{loading ? "..." : value}</p>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
    </article>
  );
}

function Panel({ title, value, tone }) {
  const marker = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    brand: "bg-brand-500"
  };

  return (
    <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${marker[tone]}`} />
        <p className="text-xs text-slate-500">{title}</p>
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Control({ label, tone }) {
  const styles = {
    success: "bg-success hover:bg-success/90",
    warning: "bg-warning hover:bg-warning/90",
    danger: "bg-danger hover:bg-danger/90",
    brand: "bg-brand-500 hover:bg-brand-600"
  };

  return (
    <button type="button" className={`rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${styles[tone]}`}>
      {label}
    </button>
  );
}

function MiniChart() {
  return (
    <svg viewBox="0 0 320 88" className="h-16 w-full" role="img" aria-label="Traffic trend">
      <path d="M0 65 L40 58 L80 60 L120 42 L160 47 L200 35 L240 30 L280 38 L320 20" fill="none" stroke="#2456f5" strokeWidth="3" strokeLinecap="round" />
      <path d="M0 88 L0 65 L40 58 L80 60 L120 42 L160 47 L200 35 L240 30 L280 38 L320 20 L320 88 Z" fill="rgba(36,86,245,0.15)" />
    </svg>
  );
}

function Empty({ text }) {
  return <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500 dark:bg-slate-800">{text}</p>;
}
