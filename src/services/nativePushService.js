import { registerPushSubscription } from "./notificationService";
import { ignorePanicAlert, reportFalsePanicAlert, respondToPanicAlert } from "./safetyService";
import { isNativeApp } from "../utils/nativeRuntime";
import { navigateToAppPath } from "../utils/authRouting";

const PANIC_ACTION_TYPE_ID = "panic_response";
const PANIC_ACTION_IDS = new Set(["respond", "ignore", "report_false"]);

let initialized = false;
let pluginsPromise = null;
const notificationListeners = new Set();
const actionListeners = new Set();

function getNativePlatform() {
  try {
    return String(globalThis?.Capacitor?.getPlatform?.() || "").toLowerCase();
  } catch {
    return "";
  }
}

async function loadPlugins() {
  if (!isNativeApp()) return null;
  if (!pluginsPromise) {
    pluginsPromise = Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
      import("@capacitor/app")
    ]).then(([pushMod, localMod, appMod]) => ({
      PushNotifications: pushMod?.PushNotifications,
      LocalNotifications: localMod?.LocalNotifications,
      App: appMod?.App
    }));
  }
  return pluginsPromise;
}

function emitNotification(notification) {
  notificationListeners.forEach((listener) => {
    try {
      listener(notification);
    } catch {
      // Keep push listeners isolated.
    }
  });
}

function emitAction(notification) {
  actionListeners.forEach((listener) => {
    try {
      listener(notification);
    } catch {
      // Keep push listeners isolated.
    }
  });
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
    const data =
      safe.data && typeof safe.data === "object"
        ? safe.data
        : safe.notification?.extra && typeof safe.notification.extra === "object"
          ? safe.notification.extra
          : safe.notification?.data && typeof safe.notification.data === "object"
            ? safe.notification.data
            : {};

    return {
      actionId,
      panicId: String(data.panicId || data.panic_id || "").trim(),
      route: String(data.route || "").trim()
    };
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
    navigateToAppPath(route);
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

  return executeNotificationAction({
    actionId: String(parsed.searchParams.get("action") || "").trim().toLowerCase(),
    panicId: String(parsed.searchParams.get("panicId") || "").trim(),
    route: String(parsed.searchParams.get("route") || "").trim()
  });
}

function buildLocalNotification(notification) {
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
  const notificationId = Number(notification?.id || Date.now() % 2147483000);
  const route = String(data.route || "/dashboard/notifications").trim();
  const panicId = String(data.panicId || "").trim();
  const wantsPanicActions = String(data.actionSet || "") === PANIC_ACTION_TYPE_ID;

  return {
    notifications: [
      {
        id: notificationId,
        title: String(notification?.title || data.title || "Qring Alert"),
        body: String(notification?.body || notification?.message || data.body || "You have a new notification."),
        actionTypeId: wantsPanicActions ? PANIC_ACTION_TYPE_ID : "",
        extra: {
          ...data,
          panicId,
          route
        }
      }
    ]
  };
}

async function ensureNativePushInitialized() {
  const plugins = await loadPlugins();
  if (!plugins?.PushNotifications || !plugins?.LocalNotifications || !plugins?.App) {
    return null;
  }

  if (!initialized) {
    initialized = true;
    const { PushNotifications, LocalNotifications, App } = plugins;

    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: PANIC_ACTION_TYPE_ID,
          actions: [
            { id: "respond", title: "I'm Responding", foreground: true },
            { id: "ignore", title: "Ignore", foreground: true },
            { id: "report_false", title: "Report False", foreground: true, destructive: true, url: buildActionUrl({ action: "report_false" }) }
          ]
        }
      ]
    });

    await PushNotifications.addListener("registration", async (token) => {
      const value = String(token?.value || "").trim();
      if (!value) return;
      await registerPushSubscription({
        provider: "fcm",
        endpoint: `native-fcm:${value}`,
        token: value,
        keys: {
          token: value,
          platform: getNativePlatform() || "native",
          runtime: "capacitor",
          native: true
        }
      });
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.error("Native push registration failed", error);
    });

    await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      emitNotification(notification);

      const data = notification?.data && typeof notification.data === "object" ? notification.data : {};
      if (getNativePlatform() !== "ios") return;
      if (String(data.actionSet || "") !== PANIC_ACTION_TYPE_ID) return;

      try {
        await LocalNotifications.schedule(buildLocalNotification(notification));
      } catch {
        // Keep notification delivery resilient.
      }
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", async (event) => {
      emitAction(event);
      try {
        await executeNotificationAction(parseNotificationActionPayload(event));
      } catch {
        // Non-blocking action handling.
      }
    });

    await LocalNotifications.addListener("localNotificationActionPerformed", async (event) => {
      emitAction(event);
      try {
        await executeNotificationAction(parseNotificationActionPayload(event));
      } catch {
        // Non-blocking action handling.
      }
    });

    await App.addListener("appUrlOpen", async ({ url }) => {
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

  return plugins;
}

export async function registerNativePushSubscription({ onNotification, onAction } = {}) {
  const plugins = await ensureNativePushInitialized();
  if (!plugins?.PushNotifications || !plugins?.LocalNotifications) {
    return { status: "unsupported", permission: "unsupported" };
  }

  if (typeof onNotification === "function") {
    notificationListeners.add(onNotification);
  }
  if (typeof onAction === "function") {
    actionListeners.add(onAction);
  }

  const { PushNotifications, LocalNotifications } = plugins;
  const pushPermission = await PushNotifications.requestPermissions();
  const localPermission = await LocalNotifications.requestPermissions();
  const pushReceive = String(pushPermission?.receive || "").toLowerCase();
  const localDisplay = String(localPermission?.display || "").toLowerCase();
  const pushGranted = pushReceive === "granted" || pushReceive === "prompt-with-rationale";
  const localGranted = localDisplay === "granted";

  if (!pushGranted || !localGranted) {
    return {
      status: "permission_denied",
      permission: pushGranted ? localDisplay || "denied" : pushReceive || "denied"
    };
  }

  await PushNotifications.register();
  return { status: "registered", permission: "granted" };
}

export async function registerNativePushNotifications() {
  const result = await registerNativePushSubscription();
  return {
    ok: result?.status === "registered",
    status: result?.status || "unsupported",
    message:
      result?.status === "registered"
        ? "Native push notifications are enabled on this device."
        : "Native notification registration failed on this device."
  };
}
