import { registerPushSubscription } from "./notificationService";
import {
  ignorePanicAlert,
  reportFalsePanicAlert,
  respondToPanicAlert,
} from "./safetyService";

const PANIC_ACTION_TYPE_ID = "panic_response";
const PANIC_ACTION_IDS = new Set(["respond", "ignore", "report_false"]);
let initialized = false;
let pluginsPromise = null;

function getNativePlatform() {
  try {
    return String(globalThis?.Capacitor?.getPlatform?.() || "").toLowerCase();
  } catch {
    return "";
  }
}

async function loadPlugins() {
  if (!pluginsPromise) {
    pluginsPromise = Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
      import("@capacitor/app"),
    ]).then(([pushMod, localMod, appMod]) => ({
      PushNotifications: pushMod?.PushNotifications,
      LocalNotifications: localMod?.LocalNotifications,
      App: appMod?.App,
    }));
  }
  return pluginsPromise;
}

function buildActionUrl({ action, panicId = "", route = "" }) {
  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (panicId) params.set("panicId", panicId);
  if (route) params.set("route", route);
  return `qring://notification-action?${params.toString()}`;
}

function parseNotificationActionPayload(input) {
  try {
    const safe = input && typeof input === "object" ? input : {};
    const actionId = String(
      safe.actionId ||
      safe.actionIdentifier ||
      safe?.notification?.actionTypeId ||
      safe?.notification?.actionId ||
      ""
    ).trim().toLowerCase();
    const data = safe.data && typeof safe.data === "object"
      ? safe.data
      : safe.notification?.extra && typeof safe.notification.extra === "object"
        ? safe.notification.extra
        : safe.notification?.data && typeof safe.notification.data === "object"
          ? safe.notification.data
          : {};
    const panicId = String(data.panicId || data.panic_id || "").trim();
    const route = String(data.route || "").trim();
    return { actionId, panicId, route };
  } catch {
    return { actionId: "", panicId: "", route: "" };
  }
}

async function executeNotificationAction({ actionId, panicId, route }) {
  if (!panicId || !PANIC_ACTION_IDS.has(actionId)) return false;

  if (actionId === "respond") {
    await respondToPanicAlert(panicId);
  } else if (actionId === "ignore") {
    await ignorePanicAlert(panicId);
  } else if (actionId === "report_false") {
    await reportFalsePanicAlert(panicId);
  }

  if (typeof window !== "undefined" && route.startsWith("/")) {
    window.location.assign(route);
  }
  return true;
}

async function handleLaunchUrl(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) return false;
  let parsed;
  try {
    parsed = new URL(safeUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "qring:" || parsed.hostname !== "notification-action") {
    return false;
  }
  const actionId = String(parsed.searchParams.get("action") || "").trim().toLowerCase();
  const panicId = String(parsed.searchParams.get("panicId") || "").trim();
  const route = String(parsed.searchParams.get("route") || "").trim();
  return executeNotificationAction({ actionId, panicId, route });
}

function buildLocalNotification(notification) {
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  const notificationId = Number(notification?.id || Date.now() % 2147483000);
  const title = String(notification?.title || data.title || "Qring Alert");
  const body = String(notification?.body || notification?.message || data.body || "You have a new notification.");
  const panicId = String(data.panicId || "").trim();
  const route = String(data.route || "/dashboard/notifications").trim();
  const actionTypeId = String(data.actionSet || "") === PANIC_ACTION_TYPE_ID ? PANIC_ACTION_TYPE_ID : "";

  return {
    notifications: [
      {
        id: notificationId,
        title,
        body,
        actionTypeId,
        extra: {
          ...data,
          panicId,
          route,
        },
      },
    ],
  };
}

export async function registerNativePushNotifications() {
  const { PushNotifications, LocalNotifications, App } = await loadPlugins();
  if (!PushNotifications || !LocalNotifications || !App) {
    return { ok: false, status: "unsupported", message: "Native notification plugins are unavailable." };
  }

  if (!initialized) {
    initialized = true;

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: PANIC_ACTION_TYPE_ID,
          actions: [
            { id: "respond", title: "I'm Responding", foreground: true },
            { id: "ignore", title: "Ignore", foreground: true },
            { id: "report_false", title: "Report False", foreground: true, destructive: true },
          ],
        },
      ],
    });

    PushNotifications.addListener("registration", async (token) => {
      const value = String(token?.value || "").trim();
      if (!value) return;
      const platform = getNativePlatform() || "native";
      await registerPushSubscription({
        provider: "fcm",
        endpoint: `fcm:${value}`,
        token: value,
        keys: {
          token: value,
          platform,
          native: true,
        },
      });
    });

    PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
      if (getNativePlatform() !== "ios") return;
      if (String(data.actionSet || "") !== PANIC_ACTION_TYPE_ID) return;
      try {
        await LocalNotifications.schedule(buildLocalNotification(notification));
      } catch {
        // Keep push handling resilient if local notification mirroring fails.
      }
    });

    PushNotifications.addListener("pushNotificationActionPerformed", async (event) => {
      try {
        await executeNotificationAction(parseNotificationActionPayload(event));
      } catch {
        // Non-blocking action handling.
      }
    });

    LocalNotifications.addListener("localNotificationActionPerformed", async (event) => {
      try {
        await executeNotificationAction(parseNotificationActionPayload(event));
      } catch {
        // Non-blocking action handling.
      }
    });

    App.addListener("appUrlOpen", async ({ url }) => {
      try {
        await handleLaunchUrl(url);
      } catch {
        // Ignore malformed deep links.
      }
    });

    try {
      const launched = await App.getLaunchUrl();
      if (launched?.url) {
        await handleLaunchUrl(launched.url);
      }
    } catch {
      // Ignore launch URL failures.
    }
  }

  const pushPermission = await PushNotifications.requestPermissions();
  const localPermission = await LocalNotifications.requestPermissions();
  const pushGranted = ["granted", "prompt-with-rationale"].includes(String(pushPermission?.receive || "").toLowerCase());
  const localGranted = String(localPermission?.display || "").toLowerCase() === "granted";
  if (!pushGranted || !localGranted) {
    return {
      ok: false,
      status: "permission_denied",
      message: "Native notification permission was not granted.",
    };
  }

  await PushNotifications.register();
  return {
    ok: true,
    status: "registered",
    message: "Native push notifications are enabled on this device.",
  };
}
