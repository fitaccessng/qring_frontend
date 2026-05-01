import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { getHomeownerContext } from "../services/homeownerService";
import BrandMark from "../components/BrandMark";
import NotificationBell from "../components/notifications/NotificationBell";
import NotificationPanel from "../components/notifications/NotificationPanel";
import { useNotifications } from "../state/NotificationsContext";
import { getUserInitials } from "../utils/profile";
import useSubscription from "../hooks/useSubscription";

const navByRole = {
  homeowner: [
    { to: "/dashboard/homeowner/overview", label: "Overview", icon: "overview" },
    { to: "/dashboard/homeowner/safety", label: "Safety", icon: "shield" },
    { to: "/dashboard/homeowner/appointments", label: "Appointments", icon: "appointments" },
    { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
    { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
    { to: "/dashboard/homeowner/alerts", label: "Alerts", icon: "bell_ring" },
    { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" },
    { to: "/dashboard/homeowner/live-queue", label: "Live Queue", icon: "queue" },
    { to: "/dashboard/homeowner/receipts", label: "Receipts", icon: "receipt" },
    { to: "/dashboard/homeowner/maintenance", label: "Maintenance", icon: "maintenance" },
    { to: "/billing/paywall", label: "Billing", icon: "billing" },
    { to: "/dashboard/homeowner/settings", label: "Settings", icon: "settings" }
  ],
  estate: [
    { to: "/dashboard/estate", label: "Overview", icon: "estate" },
    { to: "/dashboard/estate/create", label: "Create Estate", icon: "estate_create" },
    { to: "/dashboard/estate/doors", label: "Add Doors", icon: "doors" },
    { to: "/dashboard/estate/assign", label: "Assign Doors", icon: "assign" },
    { to: "/dashboard/estate/invites", label: "Invite Owners", icon: "invite" },
    { to: "/dashboard/estate/broadcasts", label: "Broadcasts", icon: "broadcast" },
    { to: "/dashboard/estate/meetings", label: "Meetings", icon: "meeting" },
    { to: "/dashboard/estate/polls", label: "Polls", icon: "polls" },
    { to: "/dashboard/estate/dues", label: "Dues", icon: "dues" },
    { to: "/dashboard/estate/maintenance", label: "Maintenance", icon: "maintenance" },
    { to: "/dashboard/estate/stats", label: "Visitor Stats", icon: "stats" },
    { to: "/dashboard/estate/mappings", label: "Mappings", icon: "mappings" },
    { to: "/dashboard/estate/logs", label: "Access Logs", icon: "logs" },
    { to: "/dashboard/estate/security", label: "Security Team", icon: "shield" },
    { to: "/dashboard/estate/emergency", label: "Emergency", icon: "bell_ring" },
    { to: "/dashboard/estate/plan", label: "Plan Rules", icon: "plans" },
    { to: "/dashboard/estate/community", label: "Community", icon: "community" },
    { to: "/billing/paywall", label: "Billing", icon: "billing" },
    { to: "/dashboard/estate/homes", label: "Multi-Home", icon: "homes" },
    { to: "/dashboard/estate/settings", label: "Settings", icon: "settings" }
  ],
  security: [
    { to: "/dashboard/security", label: "Gate Hub", icon: "shield" },
    { to: "/dashboard/security/emergency", label: "Emergency", icon: "bell_ring" },
    { to: "/dashboard/security/messages", label: "Messages", icon: "messages" },
    { to: "/dashboard/notifications", label: "Notifications", icon: "bell_ring" }
  ],
  admin: [
    { to: "/dashboard/admin", label: "System", icon: "system" },
    { to: "/dashboard/admin/users", label: "Users", icon: "user_admin" },
    { to: "/dashboard/admin/sessions", label: "Sessions", icon: "sessions" },
    { to: "/dashboard/admin/payments", label: "Payments", icon: "billing" },
    { to: "/dashboard/admin/config", label: "Config", icon: "settings" },
    { to: "/dashboard/admin/audit", label: "Audit", icon: "logs" }
  ]
};

const estateManagedHomeownerNav = [
  { to: "/dashboard/homeowner/overview", label: "Overview", icon: "overview" },
  { to: "/dashboard/homeowner/estate-broadcasts", label: "Broadcasts", icon: "broadcast" },
  { to: "/dashboard/homeowner/estate-meetings", label: "Meetings", icon: "meeting" },
  { to: "/dashboard/homeowner/estate-polls", label: "Polls", icon: "polls" },
  { to: "/dashboard/homeowner/estate-dues", label: "Dues", icon: "dues" },
  { to: "/dashboard/homeowner/estate-maintenance", label: "Maintenance", icon: "maintenance" },
  { to: "/dashboard/homeowner/estate-doors", label: "Doors", icon: "doors" },
  { to: "/dashboard/homeowner/estate-approvals", label: "Approvals", icon: "messages" },
  { to: "/dashboard/homeowner/estate-messages", label: "Messages", icon: "messages" },
  { to: "/dashboard/homeowner/estate-video-calls", label: "Video Calls", icon: "messages" },
  { to: "/dashboard/homeowner/estate-audio-calls", label: "Audio Calls", icon: "messages" },
  { to: "/dashboard/homeowner/estate-alerts", label: "Alerts", icon: "bell_ring" },
  { to: "/dashboard/homeowner/estate-panic", label: "Panic", icon: "shield" },
  { to: "/dashboard/homeowner/settings", label: "Settings", icon: "settings" }
];

const featureRequirementByRoute = {
  "/dashboard/homeowner/appointments": "visitor_scheduling",
  "/dashboard/homeowner/access-passes": "visitor_scheduling",
  "/dashboard/homeowner/messages": "chat_call_verification",
  "/dashboard/homeowner/estate-messages": "chat_call_verification",
  "/dashboard/homeowner/estate-video-calls": "chat_call_verification",
  "/dashboard/homeowner/estate-audio-calls": "chat_call_verification",
  "/dashboard/estate/stats": "analytics",
  "/dashboard/estate/logs": "visitor_logs",
  "/dashboard/estate/security": "multi_admin_roles"
};

const HOMEOWNER_CONTEXT_CACHE_TTL_MS = 2 * 60 * 1000;

let homeownerContextCache = null;
let homeownerContextCacheAt = 0;

function isCacheFresh(cachedAt, ttlMs) {
  return Number(cachedAt) > 0 && Date.now() - cachedAt < ttlMs;
}

function onboardingSeenForUser(user) {
  const role = user?.role;
  if (role !== "homeowner" && role !== "estate") return true;
  const keys = [];
  if (user?.id) {
    keys.push(`qring_dashboard_welcome_seen_${role}_id:${user.id}`);
    keys.push(`qring_dashboard_welcome_seen_${role}_${user.id}`);
    keys.push(`qring_onboarding_seen_${role}_id:${user.id}`);
    keys.push(`qring_onboarding_seen_${role}_${user.id}`);
  }
  if (user?.email) {
    const email = String(user.email).trim().toLowerCase();
    keys.push(`qring_dashboard_welcome_seen_${role}_email:${email}`);
    keys.push(`qring_dashboard_welcome_seen_${role}_${email}`);
    keys.push(`qring_onboarding_seen_${role}_email:${email}`);
    keys.push(`qring_onboarding_seen_${role}_${email}`);
  }
  keys.push(`qring_dashboard_welcome_seen_${role}_anonymous`);
  keys.push(`qring_onboarding_seen_${role}_anonymous`);
  return keys.some((key) => localStorage.getItem(key) === "true");
}

export default function AppShell({ title, children, showTopBar = true, showMobileNav = false }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { hasFeature } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [homeownerContext, setHomeownerContext] = useState(null);
  const [homeownerContextLoading, setHomeownerContextLoading] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const notificationsPanelRef = useRef(null);
  const notificationsButtonRef = useRef(null);
  const pathname = location?.pathname || "";
  const normalizedPathname = useMemo(() => pathname.replace(/\/+$/, "") || "/", [pathname]);
  const routeRole = useMemo(() => {
    if (pathname.startsWith("/dashboard/estate")) return "estate";
    if (pathname.startsWith("/dashboard/homeowner")) return "homeowner";
    if (pathname.startsWith("/dashboard/security")) return "security";
    if (pathname.startsWith("/dashboard/admin")) return "admin";
    return user?.role ?? null;
  }, [pathname, user?.role]);

  const showProfileHeader = useMemo(() => {
    return pathname === "/dashboard/homeowner/overview" || pathname === "/dashboard/estate";
  }, [pathname]);
  const showBackHeader = useMemo(() => {
    if (!showTopBar) return false;
    if (showProfileHeader) return false;
    return routeRole === "estate" || routeRole === "homeowner" || routeRole === "security";
  }, [showTopBar, showProfileHeader, routeRole]);
  const isEstateManagedHomeowner = useMemo(
    () =>
      user?.role === "homeowner" &&
      (Boolean(homeownerContext?.managedByEstate) ||
        (typeof user?.email === "string" && user.email.toLowerCase().endsWith("@estate.useqring.online"))),
    [user?.role, user?.email, homeownerContext]
  );
  const isEstateUser = routeRole === "estate";

  const navItems = useMemo(() => {
    const base = navByRole[routeRole] ?? [];
    if (routeRole !== "homeowner") return base;

    if (homeownerContextLoading) {
      return base.filter((item) => item.to !== "/billing/paywall");
    }

    if (isEstateManagedHomeowner) {
      return estateManagedHomeownerNav;
    }

    const estateOnly = new Set([
      "/dashboard/homeowner/live-queue",
      "/dashboard/homeowner/alerts",
      "/dashboard/homeowner/receipts",
      "/dashboard/homeowner/maintenance"
    ]);
    return base.filter((item) => !estateOnly.has(item.to));
  }, [routeRole, isEstateManagedHomeowner, homeownerContextLoading]);
  const profileName = useMemo(() => user?.fullName?.trim() || user?.email || "User", [user?.fullName, user?.email]);
  const initials = useMemo(() => getUserInitials(profileName), [profileName]);
  const mobileNavItems = useMemo(() => {
    if (routeRole === "homeowner") {
      if (isEstateManagedHomeowner) {
        return [
          { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
          { to: "/dashboard/homeowner/estate-alerts", label: "Estate", icon: "broadcast" },
          { to: "/dashboard/homeowner/estate-dues", label: "Dues", icon: "dues" },
          { to: "/dashboard/homeowner/estate-messages", label: "Messages", icon: "messages" },
          { to: "/dashboard/homeowner/estate-panic", label: "Panic", icon: "shield" }
        ];
      }
      return [
        { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
        { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
        { to: "/dashboard/homeowner/appointments", label: "Appointments", icon: "appointments" },
        { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
        { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" }
      ];
    }
    if (routeRole === "estate") {
      return [
        { to: "/dashboard/estate", label: "Overview", icon: "estate" },
        { to: "/dashboard/estate/invites", label: "Owners", icon: "invite" },
        { to: "/dashboard/estate/homes", label: "Homes", icon: "homes" },
        { to: "/dashboard/estate/doors", label: "Doors", icon: "doors" },
        { to: "/dashboard/estate/assign", label: "Assign", icon: "assign" }
      ];
    }
    if (routeRole === "security") {
      return [
        { to: "/dashboard/security", label: "Gate", icon: "shield" },
        { to: "/dashboard/security/messages", label: "Messages", icon: "messages" },
        { to: "/dashboard/notifications", label: "Alerts", icon: "bell_ring" }
      ];
    }
    return navItems.filter((item) => !item.to.endsWith("/settings")).slice(0, 4);
  }, [isEstateManagedHomeowner, navItems, routeRole]);
  const filteredNavItems = useMemo(() => {
    if (routeRole === "homeowner") return [];
    return navItems.filter((item) => {
      if (isEstateManagedHomeowner && item.to === "/billing/paywall") return false;
      const requiredFeature = featureRequirementByRoute[item.to];
      if (!requiredFeature) return true;
      return hasFeature(requiredFeature);
    });
  }, [hasFeature, isEstateManagedHomeowner, navItems, routeRole]);
  const filteredMobileNavItems = useMemo(() => {
    if (routeRole === "homeowner") return [];
    return mobileNavItems.filter((item) => {
      if (isEstateManagedHomeowner && item.to === "/billing/paywall") return false;
      const requiredFeature = featureRequirementByRoute[item.to];
      if (!requiredFeature) return true;
      return hasFeature(requiredFeature);
    });
  }, [hasFeature, isEstateManagedHomeowner, mobileNavItems, routeRole]);
  const isEstateMobileNav = routeRole === "estate";
  const showHelpButton = routeRole === "estate" || routeRole === "security";
  const mobileContentBottomPaddingClass = !showMobileNav
    ? "pb-8 sm:pb-8"
    : isEstateMobileNav
      ? "pb-[calc(11.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(10rem+env(safe-area-inset-bottom))]"
      : "pb-[calc(9.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))]";
  const mobileBottomSpacerClass = !showMobileNav ? "hidden" : isEstateMobileNav ? "h-28 lg:hidden" : "h-20 lg:hidden";
  const showEstateCreateDoorFab = showMobileNav && isEstateMobileNav && normalizedPathname === "/dashboard/estate";
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  const isNativeApp = useMemo(() => {
    try {
      return Boolean(window?.Capacitor?.isNativePlatform?.());
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    homeownerContextCache = null;
    homeownerContextCacheAt = 0;
  }, [user?.id, user?.role]);

  useEffect(() => {
    let active = true;
    async function loadHomeownerContext() {
      if (user?.role !== "homeowner") {
        setHomeownerContext(null);
        setHomeownerContextLoading(false);
        return;
      }
      if (homeownerContextCache && isCacheFresh(homeownerContextCacheAt, HOMEOWNER_CONTEXT_CACHE_TTL_MS)) {
        setHomeownerContext(homeownerContextCache);
        setHomeownerContextLoading(false);
        return;
      }
      setHomeownerContextLoading(true);
      try {
        const data = await getHomeownerContext();
        if (!active) return;
        homeownerContextCache = data;
        homeownerContextCacheAt = Date.now();
        setHomeownerContext(data);
      } catch {
        if (!active) return;
        setHomeownerContext(null);
      } finally {
        if (active) setHomeownerContextLoading(false);
      }
    }
    loadHomeownerContext();
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    if (isNativeApp) return;
    if (user?.role !== "homeowner" && user?.role !== "estate") return;
    const atDashboardHome =
      location.pathname === "/dashboard/homeowner/overview" ||
      location.pathname === "/dashboard/estate";
    if (!atDashboardHome) return;
    if (!onboardingSeenForUser(user)) {
      navigate("/onboarding", { replace: true });
    }
  }, [isNativeApp, user?.role, user?.email, user?.id, location.pathname, navigate]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutside = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-notification-panel-root="true"]')) return;
      if (notificationsPanelRef.current?.contains(target)) return;
      if (notificationsButtonRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  function handleNotificationsToggle(event) {
    event?.stopPropagation?.();
    setNotificationsOpen((prev) => !prev);
  }

  function handleBack() {
    if (canGoBack) {
      navigate(-1);
      return;
    }
    const fallback =
      user?.role === "estate"
        ? "/dashboard/estate"
        : user?.role === "admin"
          ? "/dashboard/admin"
          : user?.role === "security"
            ? "/dashboard/security"
            : "/dashboard/homeowner/overview";
    navigate(fallback);
  }

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
    <div className="min-h-[100dvh] overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(36,86,245,0.16),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.12),_transparent_35%)]" />
      <div className="flex h-[100dvh]">
        <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-slate-200/70 bg-white/90 p-6 backdrop-blur [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-slate-800 dark:bg-slate-900/95 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-16 place-items-center rounded-xl text-xs font-bold text-white shadow-soft">
              <BrandMark tone="dark" className="h-18 w-46" />
            </div>
            <div>
              <Link to="/" className="block font-heading text-2xl font-bold text-brand-500">
                Qring
              </Link>
              <p className="text-xs text-slate-500">Smart Access Communication</p>
            </div>
          </div>
          <nav className="space-y-2">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={
                  item.to === "/dashboard/estate" ||
                  item.to === "/dashboard/homeowner/overview" ||
                  item.to === "/dashboard/admin"
                }
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? "border-brand-500 bg-brand-500 text-white shadow-soft"
                      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  }`
                }
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/25 bg-white/20">
                  <NavIcon name={item.icon} />
                </span>
                <span className="flex-1">{item.label}</span>
              </NavLink>
            ))}
            {showHelpButton ? (
              <button
                type="button"
                onClick={() => navigate("/onboarding")}
                className="group relative flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-200 hover:bg-slate-100 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              >
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/25 bg-white/20">
                  <NavIcon name="help" />
                </span>
                <span className="flex-1 text-left">Help</span>
              </button>
            ) : null}
          </nav>
        </aside>

        <main className={`safe-content relative flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-5 lg:ml-72 lg:px-10 lg:pb-8 ${mobileContentBottomPaddingClass} ${showTopBar ? "pt-[calc(12.75rem+env(safe-area-inset-top))] sm:pt-[calc(7rem+env(safe-area-inset-top))] lg:pt-[7.35rem]" : "pt-[calc(1.1rem+env(safe-area-inset-top))] sm:pt-[calc(1.2rem+env(safe-area-inset-top))] lg:pt-6"}`}>
          {showTopBar ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[calc(6.2rem+env(safe-area-inset-top))] bg-gradient-to-b from-slate-100/92 via-slate-100/72 to-transparent backdrop-blur-md dark:from-slate-950/92 dark:via-slate-950/72 lg:left-72"
            />
          ) : null}
          {showTopBar ? (
            <header className="fixed inset-x-0 top-0 z-30 px-3 pt-[calc(0.95rem+env(safe-area-inset-top))] sm:px-4 lg:left-72 lg:px-8">
              <div className="rounded-[1.4rem] border border-slate-200/70 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-4">
                <div className="flex items-center gap-3">
                  {showProfileHeader ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                        aria-label="Go back"
                        title="Back"
                      >
                        <BackIcon />
                      </button>
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-slate-500">Hello!</p>
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">{title || profileName}</p>
                      </div>
                    </div>
                  ) : null}
                  {showBackHeader ? (
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                        aria-label="Go back"
                        title="Back"
                      >
                        <BackIcon />
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white sm:text-base">{title || profileName}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="relative ml-auto flex items-center gap-2">
                    <div ref={notificationsButtonRef}>
                      <NotificationBell
                        unreadCount={unreadCount}
                        isOpen={notificationsOpen}
                        onClick={handleNotificationsToggle}
                      />
                    </div>
                   
                    {notificationsOpen ? (
                      <div ref={notificationsPanelRef}>
                        <NotificationPanel onClose={() => setNotificationsOpen(false)} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>
          ) : null}
          <div className={`dashboard-canvas ${showTopBar ? "pt-20 sm:pt-12 lg:pt-1" : "pt-0"}`}>
            {children}
            <div className={mobileBottomSpacerClass} aria-hidden="true" />
          </div>
        </main>
      </div>
      {showMobileNav && filteredMobileNavItems.length > 0 ? (
        <Link
          to="/dashboard/estate/doors"
          className={`fixed right-4 z-[10000] flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] text-white shadow-[0_18px_40px_rgba(0,52,111,0.28)] transition active:scale-95 sm:right-6 lg:hidden ${
            isEstateMobileNav
              ? "bottom-[calc(6.6rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(5.7rem+env(safe-area-inset-bottom))]"
          } ${
            showEstateCreateDoorFab ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="Create door"
          title="Create door"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h10v18H7z" />
            <path d="M10 12h.01" />
            <path d="M20 6v6" />
            <path d="M17 9h6" />
          </svg>
        </Link>
      ) : null}
      {showMobileNav && filteredMobileNavItems.length > 0 ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-x-0 bottom-0 z-[9998] bg-gradient-to-t from-slate-100/95 via-slate-100/75 to-transparent backdrop-blur-md dark:from-slate-950/95 dark:via-slate-950/75 lg:hidden ${
            isEstateMobileNav
              ? "h-[calc(6rem+env(safe-area-inset-bottom))]"
              : "h-[calc(6.8rem+env(safe-area-inset-bottom))]"
          }`}
        />
      ) : null}
      {showMobileNav && filteredMobileNavItems.length > 0 ? (
        <nav className={`fixed inset-x-0 bottom-0 z-[9999] lg:hidden ${isEstateMobileNav ? "px-0 pb-0" : "px-3 pb-[max(0.2rem,env(safe-area-inset-bottom))]"}`}>
          <div
            className={`relative mx-auto border border-slate-200/60 bg-[#ebe8f8]/95 px-3 py-2 shadow-[0_12px_32px_rgba(76,29,149,0.16)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90 ${
              isEstateMobileNav
                ? "max-w-none rounded-none rounded-t-[1.35rem] pb-[max(0.65rem,env(safe-area-inset-bottom))]"
                : "max-w-md rounded-[1.35rem]"
            }`}
          >
            <div className={`flex items-stretch gap-1 ${isEstateMobileNav ? "h-14 sm:h-14" : "h-12 sm:h-12"}`}>
              {filteredMobileNavItems.map((item) => (
                <NavLink
                  key={`mobile-${item.to}`}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `flex min-w-0 flex-1 items-center justify-center rounded-xl px-1 py-1 text-[10px] font-semibold transition-all duration-200 active:scale-95 sm:text-[11px] ${
                      isActive ? "text-white" : "text-violet-700 dark:text-slate-300"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <div className="group relative flex items-center justify-center">
                      <span
                        className={`grid place-items-center rounded-full transition-all duration-200 ${
                          isActive
                            ? "h-10 w-10 bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,0.45)]"
                            : "h-8 w-8 text-violet-700 opacity-90 dark:text-slate-300"
                        }`}
                      >
                        <NavIcon name={item.icon} />
                      </span>
                      <span
                        className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white transition-all ${
                          isActive ? "opacity-100" : "opacity-0"
                        } group-hover:opacity-100`}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                </NavLink>
              ))}
              {showHelpButton && !isEstateMobileNav ? (
                <button
                  type="button"
                  onClick={() => navigate("/onboarding")}
                  className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-[11px]"
                >
                  <span className="mb-1">
                    <NavIcon name="help" />
                  </span>
                  <span className="leading-none">Help</span>
                </button>
              ) : null}
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function NavIcon({ name }) {
  const paths = {
    overview: <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />,
    appointments: <path d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1zM9 12h6M9 16h4" />,
    visits: <path d="M4 5h16M4 12h16M4 19h10" />,
    messages: <path d="M4 5h16v10H7l-3 3z" />,
    doors: <path d="M7 3h10v18H7zM10 12h.01" />,
    billing: <path d="M3 7h18v10H3zM3 11h18" />,
    estate: <path d="M3 21h18M5 21V9l7-5 7 5v12" />,
    estate_create: <path d="M12 5v14M5 12h14" />,
    homes: <path d="M3 11l9-7 9 7M5 10v11h14V10" />,
    invite: <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3h5v5M21 3l-7 7" />,
    assign: <path d="M4 12h10M10 6l6 6-6 6M19 5v14" />,
    mappings: <path d="M3 5h6v6H3zM15 5h6v6h-6zM9 8h6M3 17h6v6H3zM15 17h6v6h-6zM9 20h6" />,
    logs: <path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" />,
    system: <path d="M12 1v4M12 19v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M1 12h4M19 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
    plans: <path d="M4 20V8l8-4 8 4v12M4 12h16" />,
    queue: <path d="M4 7h14M4 12h10M4 17h8M18 7v10M15 14l3 3 3-3" />,
    receipt: <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1zM9 8h6M9 12h6M9 16h4" />,
    community: <path d="M4 5h16v10H8l-4 4zM9 9h6M9 12h4" />,
    broadcast: <path d="M4 12h16M4 7h10M4 17h10M18 7v10" />,
    meeting: <path d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1zM8 12h8M8 15h5" />,
    polls: <path d="M4 19h4V9H4zM10 19h4V5h-4zM16 19h4v-7h-4z" />,
    dues: <path d="M3 7h18v10H3zM3 11h18M7 15h2" />,
    maintenance: <path d="M12 2l2 2-2 2-2-2 2-2zm-6 8l2 2-2 2-2-2 2-2zm12 0l2 2-2 2-2-2 2-2zM5 19h14" />,
    stats: <path d="M4 19h16M6 16V8M12 16V5M18 16v-6" />,
    shield: <path d="M12 3l7 3v6c0 4.5-2.8 7.9-7 9-4.2-1.1-7-4.5-7-9V6l7-3zm-2.5 9 1.8 1.8L15 10.2" />,
    bell_ring: <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5M9 17a3 3 0 0 0 6 0M18 3l2 2M6 3L4 5" />,
    user_admin: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0v-2m0 0V7m0 2h-2m2 0h2" />,
    sessions: <path d="M8 7h13M8 12h13M8 17h13M3 7h.01M3 12h.01M3 17h.01" />,
    help: <path d="M12 17h.01M9.1 9a3 3 0 1 1 4.9 2.3c-.8.7-2 1.5-2 2.7v.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
    settings: <path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0-6 1.2 2.4 2.7.4.4 2.7L18.8 9l-1.5 2.3 1.5 2.3-2.5 1.2-.4 2.7-2.7.4L12 21.5l-1.2-2.4-2.7-.4-.4-2.7L5.2 13.6 6.7 11.3 5.2 9l2.5-1.2.4-2.7 2.7-.4z" />
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}
