import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../state/ThemeContext";
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
import OnboardingGuideModal from "../components/OnboardingGuideModal";

const navByRole = {
  homeowner: [
    { to: "/dashboard/homeowner/overview", label: "Overview", icon: "overview" },
    { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
    { to: "/dashboard/homeowner/messages", label: "Messages", icon: "messages" },
    { to: "/dashboard/homeowner/doors", label: "Doors", icon: "doors" },
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
    { to: "/billing/paywall", label: "Billing", icon: "billing" },
    { to: "/dashboard/estate/homes", label: "Multi-Home", icon: "homes" }
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

export default function AppShell({ title, children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [muteVisitRing, setMuteVisitRing] = useState(true);
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
  const mobileNavItems = useMemo(
    () => {
      if (user?.role === "homeowner") {
        return [
          { to: "/dashboard/homeowner/overview", label: "Home", icon: "overview" },
          { to: "/dashboard/homeowner/doors", label: "Door", icon: "doors" },
          { to: "/dashboard/homeowner/visits", label: "Visits", icon: "visits" },
          { to: "/dashboard/homeowner/messages", label: "Message", icon: "messages" },
          { to: "/dashboard/homeowner/settings", label: "Profile", icon: "settings" }
        ];
      }
      return navItems.filter((item) => !item.to.endsWith("/settings")).slice(0, 4);
    },
    [navItems, user?.role]
  );
  const showHelpButton = user?.role === "estate";
  const onboardingSteps = useMemo(() => getOnboardingSteps(user?.role), [user?.role]);
  const canGoBack = typeof window !== "undefined" && window.history.length > 1;

  useEffect(() => {
    let active = true;
    async function loadHomeownerContext() {
      if (user?.role !== "homeowner") {
        setHomeownerContext(null);
        setHomeownerContextLoading(false);
        return;
      }
      setHomeownerContextLoading(true);
      try {
        const data = await getHomeownerContext();
        if (!active) return;
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
    if (!showHelpButton || onboardingDismissed) return;
    const identity = user?.email ?? user?.id ?? "anonymous";
    const key = `qring_onboarding_seen_${user?.role}_${identity}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      setOnboardingOpen(true);
      localStorage.setItem(key, "true");
    }
  }, [showHelpButton, onboardingDismissed, user?.role, user?.email, user?.id]);

  useEffect(() => {
    let active = true;
    let unauthorized = false;

    async function loadNotifications() {
      if (unauthorized) return;
      const token = localStorage.getItem("qring_access_token");
      if (!token) {
        setNotifications([]);
        return;
      }
      try {
        const items = await getNotifications();
        if (!active) return;
        setNotifications(items);
      } catch (requestError) {
        if (!active) return;
        if (requestError?.status === 401) {
          unauthorized = true;
        }
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
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("qring:sound-alerts-updated", handleSoundUpdated);
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
        setNotifications((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? { ...row, readAt: row.readAt || new Date().toISOString() }
              : row
          )
        );
      } catch {
        // Keep UX responsive even if read API fails.
      }
    }

    const kind = item?.kind ?? "";
    if (kind.startsWith("visitor.")) {
      navigate("/dashboard/homeowner/visits");
    } else {
      navigate(user?.role === "estate" ? "/dashboard/estate" : "/dashboard/homeowner/overview");
    }
    setNotificationsOpen(false);
  }

  async function handleClearNotifications() {
    setMuteVisitRing(true);
    try {
      await clearNotifications();
      setNotifications((prev) =>
        prev.map((row) => ({
          ...row,
          readAt: row.readAt || new Date().toISOString()
        }))
      );
    } catch {
      // No-op, keep existing list.
    }
  }

  async function handleEnableWebAlerts() {
    const permission = await requestBrowserNotificationPermission();
    setWebAlertsPermission(permission);
    if (permission === "granted") {
      try {
        await registerPushSubscription({
          endpoint: "browser-notification",
          keys: { ua: navigator.userAgent }
        });
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
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(36,86,245,0.16),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.12),_transparent_35%)]" />
      <div className="flex min-h-screen">
        <aside
          className="hidden w-72 border-r border-slate-200/70 bg-white/90 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:block"
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
                onClick={() => {
                  setOnboardingDismissed(false);
                  setOnboardingOpen(true);
                }}
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

        <main className="flex-1 p-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-16 sm:p-4 sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pt-16 lg:p-8 lg:pb-8 lg:pt-8">
          <header className="fixed inset-x-0 top-0 z-30 px-3 pt-2 sm:px-4 lg:static lg:px-0 lg:pt-0 lg:mb-6">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-lg border border-slate-300 bg-white/60 p-1.5 text-xs font-semibold backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 sm:p-2"
                aria-label="Go back"
                title="Back"
              >
                <BackIcon />
              </button>
              <h1 className="font-heading text-sm font-bold sm:text-base lg:text-2xl">{title}</h1>
            </div>
            <div className="relative flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative rounded-lg border border-slate-300 bg-white/60 p-1.5 text-xs font-semibold backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 sm:p-2"
                aria-label="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</p>
                    <div className="flex items-center gap-2">
                      {webAlertsPermission !== "granted" && webAlertsPermission !== "unsupported" ? (
                        <button
                          type="button"
                          onClick={handleEnableWebAlerts}
                          className="rounded-md border border-brand-300 px-2 py-1 text-[10px] font-semibold text-brand-700 dark:border-brand-500/50 dark:text-brand-200"
                        >
                          Enable Alerts
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold dark:border-slate-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    {parsedNotifications.length === 0 ? (
                      <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800">No notifications yet.</div>
                    ) : (
                      parsedNotifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openNotification(item)}
                          className={`block w-full rounded-xl border p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            item.readAt
                              ? "border-slate-200 dark:border-slate-700"
                              : "border-brand-300 bg-brand-50/60 dark:border-brand-500/50 dark:bg-brand-500/10"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.kind}</p>
                          <p className="mt-1 text-sm font-medium">{item.payload?.message ?? "New activity"}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatTime(item.createdAt)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold dark:border-slate-700 sm:inline-flex">{isDark ? "LIGHT" : "DARK"}
              </button>
              {settingsNavItem ? (
                <Link
                  to={settingsNavItem.to}
                  className="rounded-lg border border-slate-300 bg-white/60 p-1.5 text-xs font-semibold backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 sm:p-2"
                  aria-label="Settings"
                  title="Settings"
                >
                  <SettingsIcon />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-slate-300 bg-white/60 p-1.5 text-xs font-semibold backdrop-blur dark:border-slate-700 dark:bg-slate-900/60 sm:p-2"
                aria-label="Logout"
                title="Logout"
              >
                <LogoutIcon />
              </button>
            </div>
            </div>
          </header>
          {children}
        </main>
      </div>
      {mobileNavItems.length > 0 ? (
        <nav className="fixed inset-x-0 bottom-0 z-[9999] border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/85 lg:hidden">
          <div className="flex h-12 items-stretch gap-1 sm:h-14">
            {mobileNavItems.map((item) => (
              <NavLink
                key={`mobile-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-transform duration-200 sm:text-[11px] ${
                    isActive
                      ? "scale-105 bg-brand-500 text-white shadow-sm"
                      : "scale-95 bg-slate-100/70 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"
                  }`
                }
              >
                <span className="mb-1">
                  <NavIcon name={item.icon} />
                </span>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            ))}
            {showHelpButton ? (
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingDismissed(false);
                    setOnboardingOpen(true);
                  }}
                  className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:text-[11px]"
                >
                  <span className="mb-1">
                    <NavIcon name="help" />
                </span>
                <span className="leading-none">Help</span>
              </button>
            ) : null}
          </div>
        </nav>
      ) : null}
      <OnboardingGuideModal
        open={onboardingOpen}
        role={user?.role}
        steps={onboardingSteps}
        onClose={() => {
          setOnboardingDismissed(true);
          setOnboardingOpen(false);
        }}
        onComplete={() => {
          setOnboardingDismissed(true);
          setOnboardingOpen(false);
        }}
        onNavigate={(route) => {
          navigate(route);
          setOnboardingDismissed(true);
          setOnboardingOpen(false);
        }}
      />
    </div>
  );
}

function getOnboardingSteps(role) {
  const isEstate = role === "estate";
  const dashboardRoute = isEstate ? "/dashboard/estate" : "/dashboard/homeowner/overview";
  const visitRoute = isEstate ? "/dashboard/estate/logs" : "/dashboard/homeowner/visits";
  const doorRoute = isEstate ? "/dashboard/estate/doors" : "/dashboard/homeowner/doors";
  const actionRoute = isEstate ? "/dashboard/estate/assign" : "/dashboard/homeowner/messages";

  return [
    {
      title: "What QRing Is",
      description:
        "QRing transforms physical doors into smart access points, giving homeowners and estate teams real-time visibility, control, and security over visits.",
      points: [
        "No expensive cameras or IoT hardware needed.",
        "QR code + software creates a digital access layer.",
        "Works for homes, estates, rentals, offices, and gated communities."
      ],
      route: dashboardRoute,
      routeLabel: "Open Dashboard"
    },
    {
      title: "How Visits Work",
      description:
        "When a visitor arrives, they scan your QR code, share identity and visit reason, and QRing instantly notifies you so you can approve or deny access.",
      points: [
        "Visitor scans QR at the door or gate.",
        "Identity and intent are captured digitally.",
        "You get instant alert and control access."
      ],
      route: visitRoute,
      routeLabel: isEstate ? "View Access Logs" : "View Visits"
    },
    {
      title: "Why It Matters",
      description:
        "QRing solves missed deliveries, unknown visitors, and manual logbooks by replacing reactive security with proactive, trackable, real-time access control.",
      points: [
        "Homeowners know who is at the door in real time.",
        "Estates get centralized tracking instead of manual records.",
        "Every visit is securely logged for follow-up and accountability."
      ],
      route: doorRoute,
      routeLabel: isEstate ? "Set Up Doors" : "Manage Doors"
    },
    {
      title: "Your Next Steps",
      description:
        "Start by setting up your access points, then monitor incoming requests and manage approvals through your dashboard. Use Help anytime from the sidebar.",
      points: isEstate
        ? [
            "Create or review your estate setup.",
            "Assign doors to homes and owners.",
            "Track logs and enforce plan rules."
          ]
        : [
            "Keep your door QR active.",
            "Review visits and messages daily.",
            "Control who enters even when away."
          ],
      route: actionRoute,
      routeLabel: isEstate ? "Assign Doors" : "Open Messages"
    }
  ];
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
