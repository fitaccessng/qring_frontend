import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const CHUNK_RELOAD_KEY = "qring:chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    const now = Date.now();
    let lastReloadAt = 0;
    try {
      lastReloadAt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    } catch {
      // Continue with a page-local guard when session storage is unavailable.
    }

    if (now - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) return;

    try {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    } catch {
      // The cooldown still applies through the current page lifecycle.
    }
    event.preventDefault();
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
