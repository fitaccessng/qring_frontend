import { ApiError, apiRequest } from "./apiClient";
import { isNativeApp } from "../utils/nativeRuntime";

const NOTIFICATION_CACHE_TTL_MS = 10000;
const NOTIFICATION_RATE_LIMIT_TTL_MS = 45000;

let notificationCache = { rows: [], at: 0 };
let notificationInFlight = null;
let notificationRateLimitedUntil = 0;

function invalidateNotificationCache() {
  notificationCache = { rows: [], at: 0 };
}

export async function getNotifications() {
  const now = Date.now();
  if (notificationCache.at && now - notificationCache.at < NOTIFICATION_CACHE_TTL_MS) {
    return notificationCache.rows;
  }
  if (now < notificationRateLimitedUntil) {
    return notificationCache.rows;
  }
  if (notificationInFlight) return notificationInFlight;

  notificationInFlight = apiRequest("/notifications/", { silent: true, retryCount: 0 })
    .then((response) => {
      const rows = Array.isArray(response?.data) ? response.data : [];
      notificationCache = { rows, at: Date.now() };
      notificationRateLimitedUntil = 0;
      return rows;
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 429) {
        notificationRateLimitedUntil = Date.now() + NOTIFICATION_RATE_LIMIT_TTL_MS;
        return notificationCache.rows;
      }
      throw error;
    })
    .finally(() => {
      notificationInFlight = null;
    });

  return notificationInFlight;
}

export async function registerPushSubscription(payload) {
  const response = await apiRequest("/notifications/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function getPushSubscriptionStatus() {
  const response = await apiRequest("/notifications/push-subscriptions/status", { noCache: true });
  return response?.data ?? { enabled: false, activeCount: 0, providers: [] };
}

export async function disablePushSubscription(payload = {}) {
  const response = await apiRequest("/notifications/push-subscriptions/disable", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function markNotificationRead(notificationId) {
  try {
    const response = await apiRequest(`/notifications/${notificationId}/read`, {
      method: "POST",
      silent: true
    });
    invalidateNotificationCache();
    return response?.data ?? null;
  } catch (error) {
    if (Number(error?.status) === 404) {
      return null;
    }
    throw error;
  }
}

export async function markAllNotificationsRead() {
  const response = await apiRequest("/notifications/read-all", {
    method: "POST",
    silent: true
  });
  invalidateNotificationCache();
  return response?.data ?? null;
}

export async function clearNotifications() {
  const response = await apiRequest("/notifications/clear-all", {
    method: "DELETE",
    silent: true
  });
  invalidateNotificationCache();
  return response?.data ?? null;
}

export async function requestBrowserNotificationPermission() {
  if (isNativeApp()) {
    return "unsupported";
  }
  if (typeof window === "undefined" || typeof window.Notification === "undefined") {
    return "unsupported";
  }
  if (window.Notification.permission === "granted") return "granted";
  return window.Notification.requestPermission();
}

function parsePayload(payload) {
  if (payload && typeof payload === "object") return payload;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return {};
}

export async function markVisitRequestNotificationsRead(sessionId) {
  if (!sessionId) return;
  const items = await getNotifications();
  const targetIds = items
    .filter((item) => !item?.readAt && item?.kind === "visitor.request")
    .filter((item) => parsePayload(item?.payload)?.sessionId === sessionId)
    .map((item) => item.id)
    .filter(Boolean);

  await Promise.all(targetIds.map((id) => markNotificationRead(id)));
}
