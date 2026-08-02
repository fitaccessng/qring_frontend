import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

async function enableAppUpdates() {
  if (import.meta.env.DEV) return;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (window?.Capacitor?.isNativePlatform?.()) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await registration.update();
  } catch (error) {
    console.warn("App update registration failed", error);
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

void enableAppUpdates();
