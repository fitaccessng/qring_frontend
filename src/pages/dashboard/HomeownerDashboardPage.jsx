import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Clock3, DoorOpen, FileText, Info, MessageSquare, Phone, Settings2 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { useDashboardData } from "../../hooks/useDashboardData";
import { getHomeownerContext } from "../../services/homeownerService";
import { useAuth } from "../../state/AuthContext";
import { useSocketEvents } from "../../hooks/useSocketEvents";

export default function HomeownerDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [managedByEstate, setManagedByEstate] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const {
    metrics,
    activity,
    waitingRoom,
    session,
    messages,
    loading,
    error,
    connected,
    incomingCall,
    clearIncomingCall,
    realtimeEnabled,
    refresh
  } =
    useDashboardData();
  const homeownerName = user?.fullName?.trim() || "Homeowner";
  const initials = homeownerName.slice(0, 1).toUpperCase();
  const systemLabel = realtimeEnabled ? (connected ? "System Live" : loading ? "Connecting" : "Realtime Offline") : "Online";
  const setupPercent = useMemo(() => {
    if (loading) return 0;
    const score =
      Number(metrics.activeVisitors > 0) * 35 +
      Number(metrics.pendingApprovals === 0) * 25 +
      Number(metrics.unreadMessages === 0) * 20 +
      Number(connected || !realtimeEnabled) * 20;
    return Math.max(5, Math.min(95, score));
  }, [metrics.activeVisitors, metrics.pendingApprovals, metrics.unreadMessages, connected, realtimeEnabled, loading]);
  const totalSignals = useMemo(
    () =>
      (Number(metrics.activeVisitors) || 0) +
      (Number(metrics.pendingApprovals) || 0) +
      (Number(metrics.callsToday) || 0) +
      (Number(metrics.unreadMessages) || 0),
    [metrics.activeVisitors, metrics.pendingApprovals, metrics.callsToday, metrics.unreadMessages]
  );
  const queueLoadPercent = useMemo(() => {
    const queue = Number(waitingRoom.length) || 0;
    const active = Number(metrics.activeVisitors) || 0;
    const denom = queue + active;
    if (denom <= 0) return 0;
    return Math.round((queue / denom) * 100);
  }, [waitingRoom.length, metrics.activeVisitors]);
  const conversationPercent = useMemo(() => {
    const unread = Number(metrics.unreadMessages) || 0;
    const total = unread + (messages.length > 0 ? 1 : 0);
    if (total <= 0) return 0;
    return Math.round((unread / total) * 100);
  }, [metrics.unreadMessages, messages.length]);

  useEffect(() => {
    let active = true;
    async function loadContext() {
      try {
        const data = await getHomeownerContext();
        if (active) setManagedByEstate(Boolean(data?.managedByEstate));
      } catch {
        if (active) setManagedByEstate(false);
      }
    }
    loadContext();
    return () => {
      active = false;
    };
  }, []);

  useSocketEvents(
    useMemo(
      () => ({
        ALERT_CREATED: () => refresh(),
        ALERT_UPDATED: () => refresh(),
        ALERT_DELETED: () => refresh(),
        PAYMENT_STATUS_UPDATED: () => refresh()
      }),
      [refresh]
    )
  );

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await logout();
    } catch {
      // Continue with redirect even if logout request fails.
    } finally {
      setLogoutBusy(false);
      navigate("/login");
    }
  }

  const taskGroups = [
    {
      label: "Approvals",
      subtitle: `${metrics.pendingApprovals} pending`,
      to: "/dashboard/homeowner/visits",
      icon: <Activity size={14} />,
      percent: totalSignals > 0 ? Math.round(((Number(metrics.pendingApprovals) || 0) / totalSignals) * 100) : 0
    },
    {
      label: "Visits",
      subtitle: `${metrics.activeVisitors} active`,
      to: "/dashboard/homeowner/visits",
      icon: <Activity size={14} />,
      percent: totalSignals > 0 ? Math.round(((Number(metrics.activeVisitors) || 0) / totalSignals) * 100) : 0
    },
    {
      label: "Messages",
      subtitle: `${metrics.unreadMessages} unread`,
      to: "/dashboard/homeowner/messages",
      icon: <MessageSquare size={14} />,
      percent: totalSignals > 0 ? Math.round(((Number(metrics.unreadMessages) || 0) / totalSignals) * 100) : 0
    },
    {
      label: "Doors",
      subtitle: "Manage access",
      to: "/dashboard/homeowner/doors",
      icon: <DoorOpen size={14} />,
      percent: connected || !realtimeEnabled ? 100 : loading ? 40 : 0
    },
    {
      label: "Calls",
      subtitle: `${metrics.callsToday} today`,
      to: "/dashboard/homeowner/messages",
      icon: <Phone size={14} />,
      percent: totalSignals > 0 ? Math.round(((Number(metrics.callsToday) || 0) / totalSignals) * 100) : 0
    }
  ];
  const actionCards = useMemo(() => {
    const base = [];

    if (managedByEstate) {
      base.push(
        {
          label: "Live Queue",
          to: "/dashboard/homeowner/live-queue",
          icon: <Activity size={18} />,
          eyebrow: "Real-time",
          description: "Track visitor arrivals and approvals as they happen.",
          badge: "Live",
          accent: "from-emerald-100/80 via-white/10 to-transparent",
          glow: "bg-emerald-300/50"
        },
        {
          label: "Receipts",
          to: "/dashboard/homeowner/receipts",
          icon: <FileText size={18} />,
          eyebrow: "Payments",
          description: "Keep your payment history and receipts organized.",
          badge: "Records",
          accent: "from-amber-100/80 via-white/10 to-transparent",
          glow: "bg-amber-300/50"
        }
      );
    } else {
      base.push({
        label: "Billing",
        to: "/billing/paywall",
        icon: <MessageSquare size={18} />,
        eyebrow: "Subscription",
        description: "Manage your plan and payment methods.",
        badge: "Plan",
        accent: "from-violet-100/80 via-white/10 to-transparent",
        glow: "bg-violet-300/50"
      });
    }

    base.push({
      label: "Settings",
      to: "/dashboard/homeowner/settings",
      icon: <Settings2 size={18} />,
      eyebrow: "Profile",
      description: "Update profile details, alerts, and preferences.",
      badge: "Manage",
      accent: "from-slate-100/80 via-white/10 to-transparent",
      glow: "bg-slate-300/50"
    });

    return base;
  }, [managedByEstate]);

  return (
    <AppShell title="Homeowner Overview" showTopBar={false}>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-2 py-3 sm:px-3 sm:py-4">
        <section className="rounded-[1.6rem] border border-slate-200/70 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-sky-100 text-sm font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Hello!</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{homeownerName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutBusy}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-7">
          <article className="rounded-[1.4rem] bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white shadow-lg shadow-violet-500/20 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-violet-100">Welcome {homeownerName}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-violet-200">{systemLabel}</p>
              </div>
              <ProgressRing value={loading ? 0 : setupPercent} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link
                to="/dashboard/homeowner/visits"
                className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-indigo-700 transition-all hover:bg-white active:scale-95"
              >
                View Visit
              </Link>
              {managedByEstate ? (
                <span className="rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold text-white/90">Managed by estate</span>
              ) : null}
            </div>
          </article>
        </section>

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            <Info size={18} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}
        {incomingCall?.sessionId ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-900/20">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                  Incoming Call
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {incomingCall?.visitorName || "Visitor"} is at your door.
                </p>
                <p className="mt-1 text-xs text-emerald-700/90 dark:text-emerald-200/90">
                  Session ID: {incomingCall.sessionId}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/session/${incomingCall.sessionId}/audio`}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Open Call
                </Link>
                <button
                  type="button"
                  onClick={clearIncomingCall}
                  className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:text-emerald-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">In Progress</h3>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-[17rem] snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <p className="text-[11px] font-semibold text-slate-500">Visitor Queue</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {waitingRoom.length > 0 ? `${waitingRoom.length} waiting` : "No visitors waiting"}
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${queueLoadPercent}%` }} />
              </div>
            </div>
            <div className="min-w-[17rem] snap-start rounded-2xl border border-slate-200 bg-[#fff6ef] p-4 dark:border-slate-700 dark:bg-[#422b23]">
              <p className="text-[11px] font-semibold text-slate-500">Conversation</p>
              <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                {messages[0]?.text ? "Message received" : "No active chat"}
              </p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-orange-100 dark:bg-orange-900/40">
                <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${conversationPercent}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Action Items</h3>
          <div className="space-y-4">
            {taskGroups.map((group) => (
              <Link
                key={group.label}
                to={group.to}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/80"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                    {group.icon}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{group.label}</p>
                    <p className="text-xs text-slate-500">{group.subtitle}</p>
                  </div>
                </div>
                <PercentPill value={loading ? 0 : group.percent} />
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
            <span className="text-xs font-semibold text-slate-500">Homeowner tools</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {actionCards.map((action) => (
              <ActionCard key={action.label} {...action} />
            ))}
          </div>
        </section>

        <section className="space-y-3 pb-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">Recent Activity</h3>
            <Link to="/dashboard/homeowner/visits" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              See all
            </Link>
          </div>
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/80 sm:p-4">
            {activity.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">No recent visitor logs.</p>
            ) : (
              activity.slice(0, 4).map((item, idx) => (
                <article
                  key={`${item?.id ?? "activity"}-${idx}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item?.event || "Activity"}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item?.details || item?.visitor || "Visitor activity update"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${activityTone(item?.event)}`}>
                      {activityLabel(item?.event)}
                    </span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock3 size={12} />
                    {item?.time || "Just now"}
                  </div>
                </article>
              ))
            )}
          </div>
          {/* <p className="text-xs text-slate-500">Session: {session?.state || "Idle"}</p> */}
        </section>
      </div>
    </AppShell>
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

function activityLabel(event) {
  const text = String(event || "").toLowerCase();
  if (text.includes("approved") || text.includes("allowed")) return "Approved";
  if (text.includes("denied") || text.includes("rejected")) return "Denied";
  if (text.includes("message")) return "Message";
  if (text.includes("call")) return "Call";
  return "Update";
}

function activityTone(event) {
  const text = String(event || "").toLowerCase();
  if (text.includes("approved") || text.includes("allowed")) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (text.includes("denied") || text.includes("rejected")) {
    return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
  }
  if (text.includes("message")) {
    return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300";
  }
  return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
}

function PercentPill({ value }) {
  return (
    <span
      className="grid h-10 w-10 place-items-center rounded-full text-[11px] font-bold text-violet-700"
      style={{ background: `conic-gradient(#8b5cf6 ${value * 3.6}deg, #e5e7eb 0deg)` }}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white dark:bg-slate-900">{value}%</span>
    </span>
  );
}

function ActionCard({ label, to, icon, accent, glow }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-4 text-sm text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-70`} />
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${glow} blur-2xl opacity-70`} />
      <div className="relative flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/92 text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition group-hover:-rotate-3 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700">
          {icon}
        </span>
        <p className="text-base font-black tracking-tight">{label}</p>
      </div>
    </Link>
  );
}
