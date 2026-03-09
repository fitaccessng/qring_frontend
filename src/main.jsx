import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

if (typeof window !== "undefined") {
  const hash = window.location.hash || "";
  if (hash.startsWith("#/")) {
    const normalized = hash.slice(1);
    if (normalized.startsWith("/")) {
      window.history.replaceState(null, "", normalized);
    }
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Keep service workers enabled in production for Firebase Cloud Messaging push notifications.
