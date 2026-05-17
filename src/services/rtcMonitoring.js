import { env } from "../config/env";

function toSafePayload(value) {
  try {
    return JSON.parse(JSON.stringify(value ?? {}));
  } catch {
    return { value: String(value ?? "") };
  }
}

function emitBrowserEvent(type, detail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("qring:rtc-monitor", {
        detail: { type, ...detail }
      })
    );
  } catch {
    // Non-blocking telemetry path.
  }
}

function emitSentry(level, message, extra) {
  const sentry = globalThis?.Sentry;
  if (!sentry) return;
  try {
    if (level === "error" && typeof sentry.captureException === "function") {
      sentry.captureException(new Error(message), { extra });
      return;
    }
    if (typeof sentry.captureMessage === "function") {
      sentry.captureMessage(message, {
        level,
        extra
      });
    }
  } catch {
    // Non-blocking telemetry path.
  }
}

function emitBeacon(payload) {
  const endpoint = String(env.rtcMonitoringUrl || "").trim();
  if (!endpoint || typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return;
  }
  try {
    const body = JSON.stringify(payload);
    navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
  } catch {
    // Non-blocking telemetry path.
  }
}

export function reportRtcEvent({
  level = "info",
  message,
  sessionId = "",
  callSessionId = "",
  participantType = "",
  extra = {}
} = {}) {
  const payload = {
    category: "rtc",
    level,
    message: String(message || "").trim(),
    sessionId: String(sessionId || ""),
    callSessionId: String(callSessionId || ""),
    participantType: String(participantType || ""),
    extra: toSafePayload(extra),
    at: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
  };
  emitBrowserEvent("event", payload);
  emitSentry(level, payload.message, payload);
  if (level === "warn" || level === "error") {
    emitBeacon(payload);
  }
}
