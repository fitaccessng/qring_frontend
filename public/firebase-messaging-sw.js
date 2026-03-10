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
      const title = payload?.notification?.title || payload?.data?.title || "Qring Alert";
      const body = payload?.notification?.body || payload?.data?.body || "You have a new notification.";
      const data = payload?.data || {};
      self.registration.showNotification(title, {
        body,
        data,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    });
  } catch {
    // Keep worker resilient if firebase init fails.
  }
})();

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = "/";
  event.waitUntil(clients.openWindow(url));
});
