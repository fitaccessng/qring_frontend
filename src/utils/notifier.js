import { showFlash } from "./flash";
import { navigateToAppPath } from "./authRouting";

function canUseSystemNotifications() {
  if (typeof window === "undefined") return false;
  if (typeof window.Notification === "undefined") return false;
  return window.Notification.permission === "granted";
}

function isDocumentHidden() {
  try {
    return typeof document !== "undefined" && document.visibilityState === "hidden";
  } catch {
    return false;
  }
}

function safeBody(value) {
  return String(value || "").trim();
}

function navigateToRoute(route) {
  if (typeof window === "undefined") return;
  const target = String(route || "").trim();
  if (!target || !target.startsWith("/")) return;
  try {
    navigateToAppPath(target);
  } catch {
    // Ignore navigation failures.
  }
}

export function notify({
  title = "Qring Alert",
  message,
  body,
  type = "info",
  duration = 3600,
  kind = "",
  route = "",
  actionLabel = "",
  dedupeKey = "",
  systemWhenHidden = true,
  onSystemClick
} = {}) {
  const text = safeBody(message ?? body);
  if (!text) return;

  showFlash(text, {
    type,
    title,
    duration,
    kind,
    route,
    actionLabel,
    dedupeKey
  });

  if (!systemWhenHidden) return;
  if (!isDocumentHidden()) return;
  if (!canUseSystemNotifications()) return;

  try {
    const notification = new window.Notification(String(title || "Qring Alert"), { body: text });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // Ignore focus errors.
      }
      if (typeof onSystemClick === "function") {
        try {
          onSystemClick();
          return;
        } catch {
          // Fall back to route navigation.
        }
      }
      navigateToRoute(route);
    };
  } catch {
    // Keep notifications non-blocking.
  }
}
