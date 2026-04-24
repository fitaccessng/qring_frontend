import { registerPushSubscription } from "./notificationService";
import { isNativeApp } from "../utils/nativeRuntime";

let listenersAttached = false;
let listenersPromise = null;

async function loadPlugin() {
  if (!isNativeApp()) return null;
  const mod = await import("@capacitor/push-notifications");
  return mod?.PushNotifications || null;
}

export async function registerNativePushSubscription({ onNotification, onAction } = {}) {
  const PushNotifications = await loadPlugin();
  if (!PushNotifications) {
    return { status: "unsupported" };
  }

  if (!listenersAttached) {
    listenersPromise = (async () => {
      await PushNotifications.addListener("registration", async (token) => {
        const value = String(token?.value || "").trim();
        if (!value) return;
        await registerPushSubscription({
          provider: "fcm",
          endpoint: `native-fcm:${value}`,
          token: value,
          keys: {
            token: value,
            platform: globalThis?.Capacitor?.getPlatform?.() || "native",
            runtime: "capacitor",
          },
        });
      });
      await PushNotifications.addListener("registrationError", (error) => {
        console.error("Native push registration failed", error);
      });
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        onNotification?.(notification);
      });
      await PushNotifications.addListener("pushNotificationActionPerformed", (notification) => {
        onAction?.(notification);
      });
      listenersAttached = true;
    })();
    await listenersPromise;
  }

  const permission = await PushNotifications.requestPermissions();
  if (permission?.receive !== "granted") {
    return { status: "permission_denied", permission: permission?.receive || "denied" };
  }
  await PushNotifications.register();
  return { status: "registered", permission: "granted" };
}
