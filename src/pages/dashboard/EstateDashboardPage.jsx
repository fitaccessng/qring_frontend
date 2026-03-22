import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, BellRing, Building2, ClipboardList, DoorClosed, FileText, Home, LogOut, MapPinned, Megaphone, Plus, Settings2, Shield, Users, Vote } from "lucide-react";
import NotificationBell from "../../components/notifications/NotificationBell";
import NotificationPanel from "../../components/notifications/NotificationPanel";
import RenewNowModal from "../../components/subscription/RenewNowModal";
import SubscriptionStatusBanner from "../../components/subscription/SubscriptionStatusBanner";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview, listEstateAlerts } from "../../services/estateService";
import { showError } from "../../utils/flash";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useSubscription from "../../hooks/useSubscription";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";

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
  const { subscription } = useSubscription();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [meetingSnapshot, setMeetingSnapshot] = useState(null);
  const [error, setError] = useState("");
  const managerName = user?.fullName?.trim() || "Estate Manager";
  const estateName = overview?.estates?.[0]?.name || "Estate";
  const initials = managerName.slice(0, 1).toUpperCase();
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(true);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const notificationsPanelRef = useRef(null);
  const notificationsButtonRef = useRef(null);

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
    if (!notificationsOpen) return undefined;

    function handleOutside(event) {
      const target = event.target;
      if (notificationsPanelRef.current?.contains(target)) return;
      if (notificationsButtonRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("click", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("click", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

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
      residents: overview?.homeowners?.length ?? 0,
      assignedDoors:
        (overview?.doors ?? []).filter((door) => door?.homeownerId || door?.assignedHomeownerId || door?.homeownerName).length,
      unassignedDoors:
        (overview?.doors ?? []).filter((door) => !(door?.homeownerId || door?.assignedHomeownerId || door?.homeownerName)).length
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

  return (
    <AppShell title="Estate Hub" showTopBar={false}>
      <div className="mx-auto w-full max-w-4xl space-y-8 px-2 py-3 sm:px-3 sm:py-4">
        <SubscriptionStatusBanner subscription={subscription} onPrimaryAction={() => setRenewModalOpen(true)} />
        <section className="rounded-[1.6rem] border border-slate-200/70 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">Hello!</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{managerName}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2">
              <div ref={notificationsButtonRef}>
                <NotificationBell
                  unreadCount={unreadCount}
                  isOpen={notificationsOpen}
                  onClick={() => setNotificationsOpen((prev) => !prev)}
                />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutBusy}
                aria-label={logoutBusy ? "Signing out" : "Sign out"}
                title={logoutBusy ? "Signing out" : "Sign out"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut size={16} className={logoutBusy ? "animate-pulse" : ""} />
              </button>
              {notificationsOpen ? (
                <div ref={notificationsPanelRef}>
                  <NotificationPanel onClose={() => setNotificationsOpen(false)} />
                </div>
              ) : null}
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
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/90 px-4 py-3 text-sm font-bold text-indigo-700 transition-all hover:bg-white active:scale-95 sm:flex-none"
              >
                <Plus size={14} />
                Create Estate
              </Link>
              <Link
                to="/dashboard/estate/invites"
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/30 active:scale-95 sm:flex-none"
              >
                <Users size={14} />
                Create Homeowner
              </Link>
              <Link
                to="/billing/paywall"
                className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-center text-sm font-bold text-white transition-all hover:bg-white/30 active:scale-95 sm:flex-none"
              >
                {subscription?.planName || "Upgrade"}
              </Link>
            </div>
            {subscription ? (
              <div className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-xs text-white/90">
                <p className="font-semibold">{subscription.planName}</p>
                <p>
                  Doors: {overview?.planRestrictions?.usedDoors ?? 0}/{overview?.planRestrictions?.maxDoors ?? subscription?.limits?.maxDoors ?? 0}
                  {" · "}
                  Status: {subscription.status}
                  {subscription.expiresAt ? ` · Expires ${new Date(subscription.expiresAt).toLocaleDateString()}` : ""}
                </p>
              </div>
            ) : null}
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

        <QuickActionGrid />

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
              meta={`${counts.assignedDoors} assigned${counts.unassignedDoors > 0 ? ` · ${counts.unassignedDoors} unassigned` : ""}`}
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
      </div>

      <MobileBottomSheet open={setupModalOpen} title="Start Here" onClose={() => setSetupModalOpen(false)} width="620px" height="78dvh" zIndex={65}>
        <div className="space-y-4">
          <div className="rounded-[1.6rem] bg-slate-50 p-4 dark:bg-slate-800/70">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Complete your estate setup in order.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Use these quick steps to get doors, homeowners, and assignments ready without hunting through the dashboard.</p>
          </div>
          <div className="grid gap-3">
            {guidedSetup.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                onClick={() => setSetupModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-indigo-700/60"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{item.step}</p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{item.detail}</p>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSetupModalOpen(false)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </MobileBottomSheet>
      <RenewNowModal open={renewModalOpen} subscription={subscription} onClose={() => setRenewModalOpen(false)} />
    </AppShell>
  );
}

function ActionRow({ icon, title, subtitle, to, percent, meta }) {
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
          {meta ? <p className="mt-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300">{meta}</p> : null}
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
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const mobileActionSheets = {
    meetings: {
      title: "Meetings",
      eyebrow: "Calendar",
      description: "Plan estate meetings with a mobile-friendly flow for agenda, venue, date, and attendance tracking.",
      to: "/dashboard/estate/meetings",
      primaryLabel: "Open Meetings",
      bullets: [
        "Schedule residents meetings without leaving the dashboard flow.",
        "Track attendance responses quickly on smaller screens.",
        "Keep upcoming discussions easy to review before publishing."
      ]
    },
    polls: {
      title: "Polls",
      eyebrow: "Decisions",
      description: "Create and review estate votes with a cleaner mobile entry point before you jump into the full page.",
      to: "/dashboard/estate/polls",
      primaryLabel: "Open Polls",
      bullets: [
        "Launch quick votes for decisions that need homeowner feedback.",
        "See poll management as a focused sheet first on mobile.",
        "Move into the full poll screen only when you are ready."
      ]
    },
    dues: {
      title: "Dues",
      eyebrow: "Collections",
      description: "Manage levies, reminders, and homeowner payment reviews from a mobile-first flow.",
      to: "/dashboard/estate/dues",
      primaryLabel: "Open Dues",
      bullets: [
        "Create payment requests and monitor collections cleanly.",
        "Review homeowner payment status without digging through pages.",
        "Keep dues actions reachable with one thumb on mobile."
      ]
    },
    maintenance: {
      title: "Maintenance",
      eyebrow: "Operations",
      description: "Track maintenance requests, updates, and audit activity with a compact management sheet.",
      to: "/dashboard/estate/maintenance",
      primaryLabel: "Open Maintenance",
      bullets: [
        "Review incoming homeowner maintenance issues quickly.",
        "Move straight into request handling and audit history.",
        "Keep operational actions close to the estate dashboard."
      ]
    },
    community: {
      title: "Community",
      eyebrow: "Board",
      description: "Open the community board to post updates, keep conversations visible, and strengthen estate engagement.",
      to: "/dashboard/estate/community",
      primaryLabel: "Open Community",
      bullets: [
        "Share estate-wide context without burying it in other tools.",
        "Give residents a clear place for ongoing community updates.",
        "Keep the community board reachable from the dashboard."
      ]
    }
  };
  const actionCards = [
    {
      label: "Broadcast",
      to: "/dashboard/estate/broadcasts",
      icon: <Megaphone size={18} />,
      eyebrow: "Community",
      description: "Push urgent updates to every homeowner in seconds.",
      badge: "Instant",
      accent: "from-amber-100/80 via-white/10 to-transparent",
      glow: "bg-amber-300/50"
    },
    {
      label: "Meetings",
      icon: <BellRing size={18} />,
      eyebrow: "Calendar",
      description: "Schedule meetings and capture attendance in one place.",
      badge: "Plan",
      accent: "from-violet-100/80 via-white/10 to-transparent",
      glow: "bg-violet-300/50",
      modalKey: "meetings"
    },
    {
      label: "Polls",
      icon: <Vote size={18} />,
      eyebrow: "Decisions",
      description: "Run estate votes and get clean participation stats.",
      badge: "Live",
      accent: "from-rose-100/80 via-white/10 to-transparent",
      glow: "bg-rose-300/50",
      modalKey: "polls"
    },
    {
      label: "Dues",
      icon: <ClipboardList size={18} />,
      eyebrow: "Collections",
      description: "Track levies, send reminders, and watch payments land.",
      badge: "Revenue",
      accent: "from-emerald-100/80 via-white/10 to-transparent",
      glow: "bg-emerald-300/50",
      modalKey: "dues"
    },
    {
      label: "Maintenance",
      icon: <DoorClosed size={18} />,
      eyebrow: "Operations",
      description: "Log issues, assign vendors, and close the loop fast.",
      badge: "Active",
      accent: "from-cyan-100/80 via-white/10 to-transparent",
      glow: "bg-cyan-300/50",
      modalKey: "maintenance"
    },
    {
      label: "Visitor Stats",
      to: "/dashboard/estate/stats",
      icon: <BarChart3 size={18} />,
      eyebrow: "Analytics",
      description: "Monitor visitor traffic and peak gate activity.",
      badge: "Trends",
      accent: "from-slate-100/80 via-white/10 to-transparent",
      glow: "bg-slate-300/50"
    }
  ];
  const moreActions = [
    { label: "Access Logs", to: "/dashboard/estate/logs", icon: <FileText size={18} /> },
    { label: "Assign Doors", to: "/dashboard/estate/assign", icon: <DoorClosed size={18} /> },
    { label: "Invite Homeowners", to: "/dashboard/estate/invites", icon: <Users size={18} /> },
    { label: "Mappings", to: "/dashboard/estate/mappings", icon: <MapPinned size={18} /> },
    { label: "Security Team", to: "/dashboard/estate/security", icon: <Shield size={18} /> },
    { label: "Plan Rules", to: "/dashboard/estate/plan", icon: <ClipboardList size={18} /> },
    { label: "Community", to: "/dashboard/estate/community", modalKey: "community", icon: <Megaphone size={18} /> },
    { label: "Settings", to: "/dashboard/estate/settings", icon: <Settings2 size={18} /> }
  ];
  const activeSheet = activeModal ? mobileActionSheets[activeModal] : null;

  return (
    <section className="space-y-3 pb-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Quick Actions</h3>
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
        >
          More
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {actionCards.map((action) => (
          <ActionCard
            key={action.label}
            {...action}
            onClick={action.modalKey ? () => setActiveModal(action.modalKey) : undefined}
          />
        ))}
      </div>

      {showMore ? (
        <MobileBottomSheet open={showMore} title="More Actions" onClose={() => setShowMore(false)} width="560px" height="82dvh" zIndex={55}>
          <div className="h-full rounded-[2rem] bg-white p-1 dark:bg-slate-900/60">
            
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
              {moreActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    setShowMore(false);
                    if (action.modalKey) {
                      setActiveModal(action.modalKey);
                    } else {
                      navigate(action.to);
                    }
                  }}
                  className="group relative flex min-h-[118px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white px-3 py-4 text-center text-sm text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-200 transition group-hover:-rotate-3 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700">
                    {action.icon}
                  </div>
                  <span className="mt-3 text-center text-sm font-black leading-tight tracking-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </MobileBottomSheet>
      ) : null}

      <MobileBottomSheet
        open={!!activeSheet}
        title={activeSheet?.title || "Quick Action"}
        onClose={() => setActiveModal(null)}
        width="620px"
        height="70dvh"
        zIndex={60}
      >
        {activeSheet ? (
          <div className="space-y-4">
            <div className="rounded-[1.6rem] bg-slate-50 p-4 dark:bg-slate-800/70">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{activeSheet.eyebrow}</p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{activeSheet.description}</p>
            </div>
            <div className="space-y-2">
              {activeSheet.bullets.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                  {item}
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  navigate(activeSheet.to);
                }}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
              >
                {activeSheet.primaryLabel}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </MobileBottomSheet>
    </section>
  );
}

function ActionCard({ label, to, icon, accent, glow, eyebrow, description, badge, onClick }) {
  const content = (
    <>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-70`} />
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${glow} blur-2xl opacity-70`} />
      <div className="relative flex flex-col items-center justify-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/92 text-slate-900 shadow-sm ring-1 ring-slate-200/80 transition group-hover:-rotate-3 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-700">
          {icon}
        </span>
        <p className="text-center text-sm font-black leading-tight tracking-tight">{label}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative flex min-h-[110px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white px-2 py-4 text-center text-sm text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to}
      className="group relative flex min-h-[110px] flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white px-2 py-4 text-center text-sm text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100"
    >
      {content}
    </Link>
  );
}
