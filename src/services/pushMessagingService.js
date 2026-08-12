import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import app, { isFirebaseConfigured } from "../config/firebase";
import { registerPushSubscription } from "./notificationService";
import { isNativeApp } from "../utils/nativeRuntime";

function getMessagingServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

const LAST_FCM_TOKEN_KEY = "qring.lastFcmToken";

async function ensureMessagingReady() {
  if (!isFirebaseConfigured || !app) return null;
  if (!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) return null;
  if (isNativeApp()) return null;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!(await isSupported())) return null;
  const registration = await navigator.serviceWorker.register(getMessagingServiceWorkerUrl(), { scope: "/" });
  const messaging = getMessaging(app);
  return { messaging, registration };
}

export async function registerFcmPushSubscription() {
  const ready = await ensureMessagingReady();
  if (!ready) return { status: "unsupported" };

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
  if (!vapidKey) {
    return { status: "missing_vapid_key" };
  }

  if (typeof window !== "undefined" && window.Notification?.permission && window.Notification.permission !== "granted") {
    return { status: window.Notification.permission === "denied" ? "permission_denied" : "permission_required" };
  }

  const token = await getToken(ready.messaging, {
    vapidKey,
    serviceWorkerRegistration: ready.registration,
  });
  if (!token) return { status: "no_token" };

  try {
    await registerPushSubscription({
      provider: "fcm",
      endpoint: `fcm:${token}`,
      token,
      keys: { token, ua: navigator.userAgent },
    });
  } catch (error) {
    console.error("Web push registration failed", error);
    return { status: "registration_failed", token };
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LAST_FCM_TOKEN_KEY, token);
  }
  return { status: "registered", token };
}

export function getLastFcmPushToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_FCM_TOKEN_KEY) || "";
}

export function clearLastFcmPushToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_FCM_TOKEN_KEY);
}

export async function setupForegroundMessageListener(onPayload) {
  const ready = await ensureMessagingReady();
  if (!ready) return () => {};
  return onMessage(ready.messaging, (payload) => {
    try {
      onPayload?.(payload);
    } catch {
      // Ignore listener errors.
    }
  });
}
