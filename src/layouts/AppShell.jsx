import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { getHomeownerContext } from "../services/homeownerService";
import BrandMark from "../components/BrandMark";
import {
  clearNotifications,
  getNotifications,
  markNotificationRead,
  registerPushSubscription,
  requestBrowserNotificationPermission
} from "../services/notificationService";
import { registerFcmPushSubscription, setupForegroundMessageListener } from "../services/pushMessagingService";
import { resolveNotificationRoute } from "../utils/notificationRouting";

const navByRole = {
  homeowner: [
    { to: "/dashboard/homeowner/overview", label: "Overview", icon: "overview" },
    { to: "/dashboard/homeowner/appointments", label: "Appointments", icon: "appointments" },
    { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
    { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
    { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" },
    { to: "/dashboard/homeowner/live-queue", label: "Live Queue", icon: "queue" },
    { to: "/dashboard/homeowner/receipts", label: "Receipts", icon: "receipt" },
    { to: "/billing/paywall", label: "Billing", icon: "billing" },
    { to: "/dashboard/homeowner/settings", label: "Settings", icon: "settings" }
  ],
  estate: [
    { to: "/dashboard/estate", label: "Overview", icon: "estate" },
    { to: "/dashboard/estate/create", label: "Create Estate", icon: "estate_create" },
    { to: "/dashboard/estate/doors", label: "Add Doors", icon: "doors" },
    { to: "/dashboard/estate/assign", label: "Assign Doors", icon: "assign" },
    { to: "/dashboard/estate/invites", label: "Invite Owners", icon: "invite" },
    { to: "/dashboard/estate/mappings", label: "Mappings", icon: "mappings" },
    { to: "/dashboard/estate/logs", label: "Access Logs", icon: "logs" },
    { to: "/dashboard/estate/plan", label: "Plan Rules", icon: "plans" },
    { to: "/dashboard/estate/community", label: "Community", icon: "community" },
    { to: "/billing/paywall", label: "Billing", icon: "billing" },
    { to: "/dashboard/estate/homes", label: "Multi-Home", icon: "homes" },
    { to: "/dashboard/estate/settings", label: "Settings", icon: "settings" }
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

const HOMEOWNER_CONTEXT_CACHE_TTL_MS = 2 * 60 * 1000;
const NOTIFICATIONS_CACHE_TTL_MS = 20 * 1000;

let homeownerContextCache = null;
let homeownerContextCacheAt = 0;
let notificationsCache = null;
let notificationsCacheAt = 0;

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
  }
  if (user?.email) {
    const email = String(user.email).trim().toLowerCase();
    keys.push(`qring_dashboard_welcome_seen_${role}_email:${email}`);
    keys.push(`qring_dashboard_welcome_seen_${role}_${email}`);
  }
  keys.push(`qring_dashboard_welcome_seen_${role}_anonymous`);
  return keys.some((key) => localStorage.getItem(key) === "true");
}

export default function AppShell({ title, children, showTopBar = true }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showProfileHeader = useMemo(() => {
    const path = location?.pathname || "";
    return path === "/dashboard/homeowner/overview" || path === "/dashboard/estate";
  }, [location?.pathname]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [homeownerContext, setHomeownerContext] = useState(null);
  const [homeownerContextLoading, setHomeownerContextLoading] = useState(false);
  const [webAlertsPermission, setWebAlertsPermission] = useState(
    () => (typeof window !== "undefined" && window.Notification ? window.Notification.permission : "unsupported")
  );
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(
    () => localStorage.getItem("qring_sound_alerts") !== "false"
  );
  const [muteVisitRing, setMuteVisitRing] = useState(true);
  const notificationsPanelRef = useRef(null);
  const notificationsButtonRef = useRef(null);
  const audioContextRef = useRef(null);
  const ringTimerRef = useRef(null);
  const prevVisitUnreadIdsRef = useRef([]);
  const visitUnreadInitializedRef = useRef(false);
  const browserAlertedIdsRef = useRef(new Set());
  const isEstateManagedHomeowner = useMemo(
    () =>
      user?.role === "homeowner" &&
      (Boolean(homeownerContext?.managedByEstate) ||
        (typeof user?.email === "string" && user.email.toLowerCase().endsWith("@estate.useqring.online"))),
    [user?.role, user?.email, homeownerContext]
  );

  const navItems = useMemo(() => {
    const base = navByRole[user?.role] ?? [];
    if (user?.role === "homeowner" && (homeownerContextLoading || isEstateManagedHomeowner)) {
      return base.filter((item) => item.to !== "/billing/paywall");
    }
    return base;
  }, [user?.role, isEstateManagedHomeowner, homeownerContextLoading]);
  const settingsNavItem = useMemo(
    () => navItems.find((item) => item.to.endsWith("/settings")) ?? null,
    [navItems]
  );
  const profileRoute = useMemo(() => {
    if (settingsNavItem?.to) return settingsNavItem.to;
    if (user?.role === "estate") return "/dashboard/estate/settings";
    if (user?.role === "homeowner") return "/dashboard/homeowner/settings";
    if (user?.role === "admin") return "/dashboard/admin/config";
    return null;
  }, [settingsNavItem, user?.role]);
  const profileName = useMemo(() => user?.fullName?.trim() || user?.email || "User", [user?.fullName, user?.email]);
  const initials = useMemo(() => String(profileName).slice(0, 1).toUpperCase(), [profileName]);
  const mobileNavItems = useMemo(
    () => {
      if (user?.role === "homeowner") {
        return [
          { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
          { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
          { to: "/dashboard/homeowner/appointments", label: "Appointments", icon: "appointments" },
          { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
          { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" }
        ];
      }
      if (user?.role === "estate") {
        return [
          { to: "/dashboard/estate", label: "Overview", icon: "estate" },
          { to: "/dashboard/estate/invites", label: "Owners", icon: "invite" },
          { to: "/dashboard/estate/homes", label: "Homes", icon: "homes" },
          { to: "/dashboard/estate/doors", label: "Doors", icon: "doors" },
          { to: "/dashboard/estate/assign", label: "Assign", icon: "assign" }
        ];
      }
      return navItems.filter((item) => !item.to.endsWith("/settings")).slice(0, 4);
    },
    [navItems, user?.role]
  );
  const isEstateMobileNav = user?.role === "estate";
  const showHelpButton = user?.role === "estate";
  const mobileContentBottomPaddingClass = isEstateMobileNav
    ? "pb-[calc(10.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(9.5rem+env(safe-area-inset-bottom))]"
    : "pb-[calc(9.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(9rem+env(safe-area-inset-bottom))]";
  const mobileBottomSpacerClass = isEstateMobileNav ? "h-28 lg:hidden" : "h-20 lg:hidden";
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
    notificationsCache = null;
    notificationsCacheAt = 0;
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
    let active = true;
    let unauthorized = false;

    async function loadNotifications() {
      if (unauthorized) return;
      const token = localStorage.getItem("qring_access_token");
      if (!token) {
        notificationsCache = [];
        notificationsCacheAt = Date.now();
        setNotifications([]);
        return;
      }
      if (notificationsCache && isCacheFresh(notificationsCacheAt, NOTIFICATIONS_CACHE_TTL_MS)) {
        setNotifications(notificationsCache);
        return;
      }
      try {
        const items = await getNotifications();
        if (!active) return;
        notificationsCache = items;
        notificationsCacheAt = Date.now();
        setNotifications(items);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.status === 401) {
          unauthorized = true;
        }
        notificationsCache = [];
        notificationsCacheAt = Date.now();
        setNotifications([]);
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    const handleNotificationsUpdated = () => loadNotifications();
    window.addEventListener("qring:notifications-updated", handleNotificationsUpdated);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("qring:notifications-updated", handleNotificationsUpdated);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleOutside = (event) => {
      const target = event.target;
      if (notificationsPanelRef.current?.contains(target)) return;
      if (notificationsButtonRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
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
    const handleStorage = (event) => {
      if (event.key === "qring_sound_alerts") {
        setSoundAlertsEnabled(event.newValue !== "false");
      }
    };
    const handleSoundUpdated = () => {
      setSoundAlertsEnabled(localStorage.getItem("qring_sound_alerts") !== "false");
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("qring:sound-alerts-updated", handleSoundUpdated);
    const handleMuteVisitRing = () => setMuteVisitRing(true);
    window.addEventListener("qring:mute-visit-ring", handleMuteVisitRing);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("qring:sound-alerts-updated", handleSoundUpdated);
      window.removeEventListener("qring:mute-visit-ring", handleMuteVisitRing);
    };
  }, []);

  const parsedNotifications = useMemo(
    () =>
      notifications.map((item) => {
        let payload = item.payload;
        if (typeof payload === "string") {
          try {
            payload = JSON.parse(payload);
          } catch {
            payload = { message: item.payload };
          }
        }
        return {
          ...item,
          payload: payload && typeof payload === "object" ? payload : {}
        };
      }),
    [notifications]
  );

  const unreadCount = useMemo(
    () => parsedNotifications.filter((item) => !item.readAt).length,
    [parsedNotifications]
  );

  const unreadVisitRequestIds = useMemo(
    () =>
      parsedNotifications
        .filter((item) => !item.readAt && item.kind === "visitor.request")
        .map((item) => item.id),
    [parsedNotifications]
  );

  useEffect(() => {
    if (!visitUnreadInitializedRef.current) {
      prevVisitUnreadIdsRef.current = unreadVisitRequestIds;
      visitUnreadInitializedRef.current = true;
      return;
    }
    const previous = prevVisitUnreadIdsRef.current;
    const hasNewVisitRequest = unreadVisitRequestIds.some((id) => !previous.includes(id));
    if (hasNewVisitRequest) {
      setMuteVisitRing(false);
      try {
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate([120, 80, 120]);
        }
      } catch {
        // No-op on unsupported platforms.
      }
      try {
        window.dispatchEvent(
          new CustomEvent("qring:flash", {
            detail: {
              type: "info",
              title: "New Visitor Request",
              message: "A visitor is requesting access.",
              duration: 3200
            }
          })
        );
      } catch {
        // Keep notifications non-blocking.
      }
    }
    prevVisitUnreadIdsRef.current = unreadVisitRequestIds;
  }, [unreadVisitRequestIds]);

  useEffect(() => {
    function stopRinging() {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
        ringTimerRef.current = null;
      }
    }

    function playRing() {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.connect(ctx.destination);

      const tones = [880, 660];
      tones.forEach((frequency, index) => {
        const startAt = ctx.currentTime + index * 0.2;
        const endAt = startAt + 0.16;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, startAt);
        osc.connect(gain);
        gain.gain.exponentialRampToValueAtTime(0.07, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
        osc.start(startAt);
        osc.stop(endAt);
      });
    }

    if (soundAlertsEnabled && unreadVisitRequestIds.length > 0 && !muteVisitRing) {
      playRing();
      if (!ringTimerRef.current) {
        ringTimerRef.current = setInterval(playRing, 1800);
      }
      return;
    }

    stopRinging();
    return stopRinging;
  }, [soundAlertsEnabled, unreadVisitRequestIds, muteVisitRing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const notificationSupported = typeof window.Notification !== "undefined";
    const canNotify = notificationSupported && window.Notification.permission === "granted";

    parsedNotifications.forEach((item) => {
      if (item.readAt) return;
      if (item.kind === "system") return;
      if (browserAlertedIdsRef.current.has(item.id)) return;
      browserAlertedIdsRef.current.add(item.id);
      const body = item.payload?.message ?? "You have a new alert";
      if (canNotify) {
        const notification = new window.Notification("Qring Alert", { body });
        notification.onclick = () => {
          window.focus();
          openNotification(item);
        };
        return;
      }
      window.dispatchEvent(
        new CustomEvent("qring:flash", {
          detail: {
            type: "info",
            title: "Qring Alert",
            message: body,
            duration: 3600
          }
        })
      );
    });
  }, [parsedNotifications]);

  useEffect(() => {
    let unsub = () => {};
    setupForegroundMessageListener((payload) => {
      const title = payload?.notification?.title || payload?.data?.title || "Qring Alert";
      const message = payload?.notification?.body || payload?.data?.body || "You have a new notification.";
      try {
        window.dispatchEvent(
          new CustomEvent("qring:flash", {
            detail: {
              type: "info",
              title,
              message,
              duration: 3600
            }
          })
        );
      } catch {
        // Keep foreground push non-blocking.
      }
    }).then((dispose) => {
      unsub = typeof dispose === "function" ? dispose : () => {};
    });
    return () => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, []);

  useEffect(() => {
    if (webAlertsPermission !== "granted") return;
    registerFcmPushSubscription().catch(() => {});
  }, [webAlertsPermission]);

  useEffect(() => {
    return () => {
      if (ringTimerRef.current) {
        clearInterval(ringTimerRef.current);
      }
      audioContextRef.current?.close?.().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  async function openNotification(item) {
    setMuteVisitRing(true);
    if (item?.id && !item?.readAt) {
      try {
        await markNotificationRead(item.id);
        setNotifications((prev) => {
          const next = prev.map((row) =>
            row.id === item.id
              ? { ...row, readAt: row.readAt || new Date().toISOString() }
              : row
          );
          notificationsCache = next;
          notificationsCacheAt = Date.now();
          return next;
        });
      } catch {
        // Keep UX responsive even if read API fails.
      }
    }

    navigate(
      resolveNotificationRoute({
        role: user?.role,
        kind: item?.kind,
        payload: item?.payload
      })
    );
    setNotificationsOpen(false);
  }

  async function handleClearNotifications() {
    setMuteVisitRing(true);
    try {
      await clearNotifications();
      setNotifications(() => {
        const next = [];
        notificationsCache = next;
        notificationsCacheAt = Date.now();
        return next;
      });
      browserAlertedIdsRef.current.clear();
    } catch {
      // No-op, keep existing list.
    }
  }

  async function handleEnableWebAlerts() {
    const permission = await requestBrowserNotificationPermission();
    setWebAlertsPermission(permission);
    if (permission === "granted") {
      try {
        const registration = await registerFcmPushSubscription();
        if (registration?.status !== "registered") {
          await registerPushSubscription({
            endpoint: "browser-notification",
            keys: { ua: navigator.userAgent }
          });
        }
      } catch {
        // Keep running even if registration fails.
      }
    }
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
          : "/dashboard/homeowner/overview";
    navigate(fallback);
  }

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(36,86,245,0.16),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.12),_transparent_35%)]" />
      <div className="flex h-[100dvh]">
        <aside
          className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-slate-200/70 bg-white/90 p-6 backdrop-blur [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden dark:border-slate-800 dark:bg-slate-900/95 lg:block"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-16 place-items-center rounded-xl  text-xs font-bold text-white shadow-soft">
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
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
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
          <div className="mt-8 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">Live Status</p>
            <p className="mt-2 text-sm font-semibold">Realtime services operational</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-success/15 px-2 py-1 text-xs font-semibold text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Connected
            </div>
          </div>
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
              <div className="flex items-center justify-between">
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
                <div className="relative flex items-center gap-2">
                  <button
                    ref={notificationsButtonRef}
                    type="button"
                    onClick={() => {
                      setMuteVisitRing(true);
                      setNotificationsOpen((prev) => !prev);
                    }}
                    className="relative grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    <BellIcon />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationsOpen ? (
                    <div
                      ref={notificationsPanelRef}
                      className="absolute right-0 top-11 z-40 w-[min(22rem,90vw)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Notifications</p>
                        <button
                          type="button"
                          onClick={handleClearNotifications}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {parsedNotifications.length === 0 ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            No notifications yet.
                          </p>
                        ) : (
                          parsedNotifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => openNotification(item)}
                              className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                                item.readAt
                                  ? "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                  : "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800/50 dark:bg-indigo-900/30 dark:text-indigo-100"
                              }`}
                            >
                              <p className="font-semibold">{item.kind?.replace(".", " ") || "Alert"}</p>
                              <p className="mt-1">{item.payload?.message || "You have a new alert."}</p>
                              <p className="mt-1 text-[10px] opacity-70">{formatTime(item.createdAt)}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                  {/* {profileRoute ? (
                    <Link
                      to={profileRoute}
                      className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-300"
                      aria-label="Profile"
                      title="Profile"
                    >
                      <ProfileIcon />
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={logout}
                    className="grid h-9 w-9 place-items-center rounded-full bg-rose-100 text-rose-600 transition-all active:scale-95 dark:bg-rose-900/30 dark:text-rose-300"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <LogoutIcon />
                  </button> */}
                </div>
              </div>
            </div>
          </header>
          ) : null}
          <div className={`dashboard-canvas ${showTopBar ? "pt-20 sm:pt-12 lg:pt-1" : "pt-0"}`}>
            {user?.role === "estate" ? <EstateQuickNav currentPath={location.pathname} /> : null}
            {children}
            <div className={mobileBottomSpacerClass} aria-hidden="true" />
          </div>
        </main>
      </div>
      {mobileNavItems.length > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[9998] h-[calc(6.8rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-100/95 via-slate-100/75 to-transparent backdrop-blur-md dark:from-slate-950/95 dark:via-slate-950/75 lg:hidden"
        />
      ) : null}
      {mobileNavItems.length > 0 ? (
        <nav className="fixed inset-x-0 bottom-3 z-[9999] px-3 pb-[max(0.2rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="relative mx-auto max-w-md rounded-[1.35rem] border border-slate-200/60 bg-[#ebe8f8]/95 px-3 py-2 shadow-[0_12px_32px_rgba(76,29,149,0.16)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90">
            <div className={`flex items-stretch gap-1 ${isEstateMobileNav ? "h-14 sm:h-14" : "h-12 sm:h-12"}`}>
            {mobileNavItems.map((item) => (
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

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9.93 3.1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
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
    plans: <path d="M4 20V8l8-4 8 4v12M4 12h16" />
    ,
    queue: <path d="M4 7h14M4 12h10M4 17h8M18 7v10M15 14l3 3 3-3" />,
    receipt: <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1zM9 8h6M9 12h6M9 16h4" />,
    community: <path d="M4 5h16v10H8l-4 4zM9 9h6M9 12h4" />,
    bell_ring: <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5M9 17a3 3 0 0 0 6 0M18 3l2 2M6 3L4 5" />,
    user_admin: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0v-2m0 0V7m0 2h-2m2 0h2" />,
    sessions: <path d="M8 7h13M8 12h13M8 17h13M3 7h.01M3 12h.01M3 17h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
    help: <path d="M12 17h.01M9.1 9a3 3 0 1 1 4.9 2.3c-.8.7-2 1.5-2 2.7v.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z" />,
    settings: <path d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0-6 1.2 2.4 2.7.4.4 2.7L18.8 9l-1.5 2.3 1.5 2.3-2.5 1.2-.4 2.7-2.7.4L12 21.5l-1.2-2.4-2.7-.4-.4-2.7L5.2 13.6 6.7 11.3 5.2 9l2.5-1.2.4-2.7 2.7-.4z" />
  };

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? <circle cx="12" cy="12" r="9" />}
    </svg>
  );
}

function EstateQuickNav({ currentPath }) {
  const items = [
    { to: "/dashboard/estate", label: "Overview" },
    { to: "/dashboard/estate/invites", label: "Homeowners" },
    { to: "/dashboard/estate/homes", label: "Homes" },
    { to: "/dashboard/estate/doors", label: "Doors" },
    { to: "/dashboard/estate/assign", label: "Assign" },
    { to: "/dashboard/estate/logs", label: "Logs" },
    { to: "/dashboard/estate/settings", label: "Settings" }
  ];

  const isActive = (path) => {
    if (path === "/dashboard/estate") return currentPath === path;
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  return (
    <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mb-5 lg:mb-6">
      {items.map((item) => (
        <Link
          key={`estate-quick-nav-${item.to}`}
          to={item.to}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
            isActive(item.to)
              ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
