import { apiRequest } from "./apiClient";

export async function getNotifications() {
  const response = await apiRequest("/notifications/");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function registerPushSubscription(payload) {
  const response = await apiRequest("/notifications/push-subscriptions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function markNotificationRead(notificationId) {
  const response = await apiRequest(`/notifications/${notificationId}/read`, {
    method: "POST"
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("qring:notifications-updated"));
  }
  return response?.data ?? null;
}

export async function clearNotifications() {
  const response = await apiRequest("/notifications/read-all", {
    method: "POST"
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("qring:notifications-updated"));
  }
  return response?.data ?? null;
}

export async function requestBrowserNotificationPermission() {
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("qring:notifications-updated"));
  }
}
