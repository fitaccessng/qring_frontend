import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { decideVisit } from "../services/homeownerService";
import {
  clearNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushSubscription,
  requestBrowserNotificationPermission
} from "../services/notificationService";
import { getDashboardSocket } from "../services/socketClient";
import { useAuth } from "./AuthContext";
import { normalizeNotification, parseNotificationPayload } from "../utils/notificationMeta";
import { resolveNotificationRoute } from "../utils/notificationRouting";
import { notify } from "../utils/notifier";
import { registerFcmPushSubscription, setupForegroundMessageListener } from "../services/pushMessagingService";
import { isNativeApp } from "../utils/nativeRuntime";
import { isFirebaseConfigured } from "../config/firebase";
import { playPanicAlertSound } from "../utils/notificationSound";

const NotificationsContext = createContext(null);
const POLL_INTERVAL_MS = 45000;
const NOTIFICATION_POPUP_STORAGE_PREFIX = "qring_notification_popup_seen";
const MAX_POPUP_TRACKED_IDS = 500;
const SOCKET_EVENTS = new Set([
  "notification.created",
  "notification.updated",
  "notifications.updated",
  "NOTIFICATION_CREATED",
  "NOTIFICATION_UPDATED",
  "ALERT_CREATED",
  "ALERT_UPDATED",
  "PAYMENT_STATUS_UPDATED",
  "VISITOR_REQUESTED"
]);

function getNotificationSeenKey(item) {
  const notificationId = String(item?.id || "").trim();
  const payload = parseNotificationPayload(item?.payload);
  const sessionId = String(item?.sessionId || payload?.sessionId || payload?.session_id || "").trim();
  const appointmentId = String(payload?.appointmentId || payload?.appointment_id || "").trim();
  const createdAt = String(item?.createdAt || item?.created_at || payload?.createdAt || "").trim();
  const kind = String(item?.kind || item?.type || payload?.kind || payload?.type || "").trim().toLowerCase();
  const message = String(item?.message || item?.body || payload?.message || payload?.body || "").trim();

  if (notificationId) {
    return `id:${notificationId}`;
  }

  return `meta:${kind}|${sessionId}|${appointmentId}|${createdAt}|${message}`;
}

function toNotification(raw, role) {
  const payload = parseNotificationPayload(raw?.payload);
  return normalizeNotification(
    raw,
    resolveNotificationRoute({
      role,
      kind: raw?.kind,
      payload
    })
  );
}

function buildPopupStorageKey(user) {
  const userId = String(user?.id || "").trim();
  const role = String(user?.role || "").trim().toLowerCase();
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!role) return "";
  if (userId) return `${NOTIFICATION_POPUP_STORAGE_PREFIX}:${role}:id:${userId}`;
  if (email) return `${NOTIFICATION_POPUP_STORAGE_PREFIX}:${role}:email:${email}`;
  return "";
}


// Use sessionStorage to prevent repeated popups per session (login/refresh)
function readSeenPopupIds(storageKey) {
  if (typeof window === "undefined" || !storageKey) return new Set();
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((value) => String(value || "").trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeSeenPopupIds(storageKey, ids) {
  if (typeof window === "undefined" || !storageKey) return;
  try {
    const next = Array.from(ids).filter(Boolean).slice(-MAX_POPUP_TRACKED_IDS);
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Ignore storage failures and keep notifications functional.
  }
}

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const nativeApp = isNativeApp();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [permission, setPermission] = useState(
    () => (typeof window !== "undefined" && window.Notification ? window.Notification.permission : "unsupported")
  );
  const [pushStatus, setPushStatus] = useState("idle");
  const isMountedRef = useRef(false);
  const popupStorageKey = useMemo(() => buildPopupStorageKey(user), [user]);
  const seenPopupIdsRef = useRef(new Set());
  const hasHydratedPopupStateRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setItems([]);
    seenPopupIdsRef.current = readSeenPopupIds(popupStorageKey);
    hasHydratedPopupStateRef.current = false;
    writeSeenPopupIds(popupStorageKey, seenPopupIdsRef.current);
  }, [popupStorageKey]);

  async function refresh({ silent = false } = {}) {
    if (!user?.role) return [];
    if (!silent) setLoading(true);
    try {
      const rows = await getNotifications();
      if (!isMountedRef.current) return [];
      const next = (Array.isArray(rows) ? rows : [])
        .map((item) => toNotification(item, user?.role))
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
      setItems(next);
      return next;
    } catch {
      if (!isMountedRef.current) return [];
      if (!silent) {
        setItems([]);
      }
      return [];
    } finally {
      if (isMountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!user?.role) return () => {};
    let active = true;

    refresh();
    const intervalId = window.setInterval(() => {
      if (!active) return;
      refresh({ silent: true });
    }, POLL_INTERVAL_MS);
    const onlineHandler = () => {
      if (!active) return;
      refresh({ silent: true });
    };
    window.addEventListener("online", onlineHandler);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("online", onlineHandler);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id || !user?.role) return () => {};

    const socket = getDashboardSocket();

    const subscribe = () => {
      const rooms = [
        "notifications",
        `user:${user.id}:notifications`,
        `${user.role}:${user.id}:notifications`,
        `user:${user.id}`
      ];
      rooms.forEach((room) => socket.emit("dashboard.subscribe", { room }));
    };

    const triggerRefresh = () => {
      refresh({ silent: true });
    };

    const onConnect = () => {
      setConnected(true);
      subscribe();
      triggerRefresh();
    };
    const onDisconnect = () => setConnected(false);
    const onNotificationUpdate = () => {
      triggerRefresh();
    };
    const onAny = (eventName) => {
      if (SOCKET_EVENTS.has(eventName) || String(eventName || "").toLowerCase().includes("notification")) {
        triggerRefresh();
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("notification.created", onNotificationUpdate);
    socket.on("notification.updated", onNotificationUpdate);
    socket.on("notifications.updated", onNotificationUpdate);
    socket.onAny(onAny);
    if (socket.connected) {
      setConnected(true);
      subscribe();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("notification.created", onNotificationUpdate);
      socket.off("notification.updated", onNotificationUpdate);
      socket.off("notifications.updated", onNotificationUpdate);
      socket.offAny(onAny);
      setConnected(false);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (nativeApp) return () => {};
    let dispose = () => {};
    setupForegroundMessageListener(() => {
      refresh({ silent: true });
    }).then((cleanup) => {
      dispose = typeof cleanup === "function" ? cleanup : () => {};
    });
    return () => {
      dispose();
    };
  }, [nativeApp]);

  useEffect(() => {
    if (nativeApp) return;
    if (permission !== "granted") return;
    registerFcmPushSubscription()
      .then((result) => {
        if (!isMountedRef.current) return;
        setPushStatus(result?.status || "local_only");
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setPushStatus("local_only");
      });
  }, [nativeApp, permission]);

  useEffect(() => {
    const currentSeenKeys = items.map((item) => getNotificationSeenKey(item)).filter(Boolean);
    if (currentSeenKeys.length === 0) {
      if (!hasHydratedPopupStateRef.current) {
        hasHydratedPopupStateRef.current = true;
      }
      return;
    }

    if (!hasHydratedPopupStateRef.current) {
      currentSeenKeys.forEach((seenKey) => {
        seenPopupIdsRef.current.add(seenKey);
      });
      hasHydratedPopupStateRef.current = true;
      writeSeenPopupIds(popupStorageKey, seenPopupIdsRef.current);
      return;
    }

    let didChange = false;
    items
      .filter((item) => item.unread)
      .forEach((item) => {
        const seenKey = getNotificationSeenKey(item);
        if (!seenKey) return;
        if (seenPopupIdsRef.current.has(seenKey)) return;

        seenPopupIdsRef.current.add(seenKey);
        didChange = true;
        if (item.kind === "safety.panic") {
          playPanicAlertSound();
        }
        notify({
          type: item.priority === "critical" ? "warning" : "info",
          title: item.title,
          message: item.message,
          kind: item.kind,
          route: item.route,
          dedupeKey: `notification:${seenKey}`,
          duration: item.priority === "critical" ? 5200 : 3600
        });
      });

    currentSeenKeys.forEach((seenKey) => {
      if (seenPopupIdsRef.current.has(seenKey)) return;
      seenPopupIdsRef.current.add(seenKey);
      didChange = true;
    });

    if (didChange) {
      writeSeenPopupIds(popupStorageKey, seenPopupIdsRef.current);
    }
  }, [items, popupStorageKey]);

  async function handleMarkRead(notificationId) {
    if (!notificationId) return;
    setItems((current) =>
      current.map((item) =>
        item.id === notificationId && item.unread
          ? { ...item, unread: false, readAt: new Date().toISOString() }
          : item
      )
    );
    try {
      await markNotificationRead(notificationId);
    } catch {
      await refresh({ silent: true });
    }
  }

  async function handleMarkAllRead() {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, unread: false, readAt: item.readAt || readAt })));
    try {
      await markAllNotificationsRead();
    } catch {
      await refresh({ silent: true });
    }
  }

  async function handleClearAll() {
    const previous = items;
    setItems([]);
    try {
      await clearNotifications();
    } catch {
      setItems(previous);
    }
  }

  async function handleVisitorAction(notification, action) {
    const sessionId = notification?.sessionId || notification?.payload?.sessionId;
    if (!sessionId) return { ok: false, error: "Missing session reference." };

    try {
      await decideVisit(sessionId, action);
      await handleMarkRead(notification.id);
      await refresh({ silent: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || "Unable to update visitor request." };
    }
  }

  async function syncVisitRequestNotifications(sessionId) {
    if (!sessionId) return;
    const current = items.length > 0 ? items : await refresh({ silent: true });
    const targetIds = current
      .filter((item) => item.unread && item.kind === "visitor.request")
      .filter((item) => {
        const payload = parseNotificationPayload(item.payload);
        return String(payload?.sessionId || item.sessionId || "").trim() === String(sessionId).trim();
      })
      .map((item) => item.id)
      .filter(Boolean);

    if (targetIds.length === 0) return;

    const readAt = new Date().toISOString();
    setItems((rows) =>
      rows.map((item) => (targetIds.includes(item.id) ? { ...item, unread: false, readAt: item.readAt || readAt } : item))
    );

    await Promise.all(
      targetIds.map(async (id) => {
        try {
          await markNotificationRead(id);
        } catch {
          // Best-effort sync for related request notifications.
        }
      })
    );
  }

  async function enableBrowserAlerts() {
    if (nativeApp) {
      setPermission("unsupported");
      setPushStatus("native_not_implemented");
      return {
        ok: false,
        permission: "unsupported",
        pushStatus: "native_not_implemented",
        message: "Native mobile push notifications are not wired up yet in this build."
      };
    }

    const nextPermission = await requestBrowserNotificationPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") {
      const deniedStatus = nextPermission === "denied" ? "permission_denied" : "permission_required";
      setPushStatus(deniedStatus);
      return {
        ok: false,
        permission: nextPermission,
        pushStatus: deniedStatus,
        message:
          nextPermission === "denied"
            ? "Browser alerts are blocked. Allow notifications in your browser settings."
            : "Notification permission was not granted."
      };
    }

    if (!isFirebaseConfigured) {
      setPushStatus("local_only");
      return {
        ok: true,
        permission: nextPermission,
        pushStatus: "local_only",
        message: "Browser alerts are enabled for this tab, but background web push is not configured yet."
      };
    }

    try {
      const registration = await registerFcmPushSubscription();
      const nextPushStatus = registration?.status || "local_only";
      setPushStatus(nextPushStatus);
      if (registration?.status !== "registered") {
        await registerPushSubscription({
          endpoint: "browser-notification",
          keys: { ua: navigator.userAgent }
        });
      }
      return {
        ok: true,
        permission: nextPermission,
        pushStatus: nextPushStatus,
        message:
          registration?.status === "registered"
            ? "Browser alerts and web push notifications are enabled."
            : "Browser alerts are enabled, but background push is limited on this device."
      };
    } catch {
      setPushStatus("local_only");
      return {
        ok: true,
        permission: nextPermission,
        pushStatus: "local_only",
        message: "Browser alerts are enabled for this tab, but background push registration failed."
      };
    }
  }

  const value = useMemo(() => {
    const unreadCount = items.filter((item) => item.unread).length;
    return {
      items,
      loading,
      connected,
      unreadCount,
      permission,
      pushStatus,
      nativeApp,
      firebaseConfigured: isFirebaseConfigured,
      refresh: () => refresh({ silent: true }),
      markRead: handleMarkRead,
      markAllRead: handleMarkAllRead,
      clearAll: handleClearAll,
      runVisitorAction: handleVisitorAction,
      syncVisitRequestNotifications,
      enableBrowserAlerts
    };
  }, [items, loading, connected, permission, pushStatus, nativeApp]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
