/* global importScripts, firebase */
importScripts("/firebase-app-compat.js");
importScripts("/firebase-messaging-compat.js");

(function setupFirebaseMessagingSW() {
  try {
    const params = new URLSearchParams(self.location.search || "");
    const firebaseConfig = {
      apiKey: params.get("apiKey") || "",
      authDomain: params.get("authDomain") || "",
      projectId: params.get("projectId") || "",
      storageBucket: params.get("storageBucket") || "",
      messagingSenderId: params.get("messagingSenderId") || "",
      appId: params.get("appId") || "",
      measurementId: params.get("measurementId") || "",
    };
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
      return;
    }
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const show = async () => {
        try {
          const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
          const hasVisibleClient = windows.some((client) => {
            try {
              return client?.visibilityState === "visible" || client?.focused === true;
            } catch {
              return false;
            }
          });
          if (hasVisibleClient) {
            // App is open/visible; let the in-app UI handle foreground messaging.
            return;
          }
        } catch {
          // If we can't determine visibility, continue showing the notification.
        }

        const title = payload?.notification?.title || payload?.data?.title || "Qring Alert";
        const body = payload?.notification?.body || payload?.data?.body || "You have a new notification.";
        const data = payload?.data || {};
        self.registration.showNotification(title, {
          body,
          data,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        });
      };
      show();
    });
  } catch {
    // Keep worker resilient if firebase init fails.
  }
})();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event?.notification?.data || {};
  const route = typeof data.route === "string" ? data.route : "";
  const url = route && route.startsWith("/") ? route : "/";
  event.waitUntil(clients.openWindow(url));
});
