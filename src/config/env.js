import {
  isRelativeProductionUrl,
  resolveApiBaseUrl as resolveApiBaseUrlValue,
  resolvePublicAppUrl as resolvePublicAppUrlValue,
  resolveSocketUrl as resolveSocketUrlValue
} from "../services/runtimeEndpointResolver.js";

const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";
const importMetaEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
const readGlobalEnvValue = (key) => {
  if (typeof globalThis === "undefined") return "";
  try {
    return String(globalThis?.process?.env?.[key] ?? "").trim();
  } catch {
    return "";
  }
};
const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};
const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const productionBackendOrigin = "https://qring-backend-production.up.railway.app";
const productionFrontendOrigin = "https://www.useqring.online";
const buildId = String(
  importMetaEnv.VITE_BUILD_ID ??
  importMetaEnv.VERCEL_GIT_COMMIT_SHA ??
  importMetaEnv.RENDER_GIT_COMMIT ??
  ""
).trim();
const isDev = Boolean(importMetaEnv.DEV);
const isMobileAppBuild = String(importMetaEnv.VITE_APP_BUILD_TARGET ?? "").trim().toLowerCase() === "mobile";
const isNativeRuntime = (() => {
  try {
    return Boolean(globalThis?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
})();

const defaultApiBase =
  typeof window !== "undefined" && isDev
    ? `http://localhost:8000/api/v1`
    : `${productionBackendOrigin}/api/v1`;
const defaultSocketUrl =
  typeof window !== "undefined" && isDev
    ? `http://localhost:8000`
    : productionBackendOrigin;
const windowOrigin = typeof window !== "undefined" && window.location ? window.location.origin : "";
const defaultPublicAppUrl =
  windowOrigin && !isNativeRuntime && !isMobileAppBuild
    ? windowOrigin
    : productionFrontendOrigin;

function resolveApiBaseUrl(rawValue) {
  return resolveApiBaseUrlValue(rawValue, defaultApiBase, { windowOrigin });
}

function resolveSocketUrl(rawValue) {
  return resolveSocketUrlValue(rawValue, defaultSocketUrl, { windowOrigin });
}

function originFromUrl(value) {
  try {
    const parsed = new URL(value);
    return trimTrailingSlash(parsed.origin);
  } catch {
    return "";
  }
}

function resolveRuntimeApiBaseSource() {
  const nativeCandidate =
    importMetaEnv.VITE_NATIVE_API_BASE_URL ||
    readGlobalEnvValue("VITE_NATIVE_API_BASE_URL") ||
    readGlobalEnvValue("NEXT_PUBLIC_NATIVE_API_BASE_URL");
  const standardCandidate =
    importMetaEnv.VITE_API_BASE_URL ||
    readGlobalEnvValue("VITE_API_BASE_URL") ||
    readGlobalEnvValue("NEXT_PUBLIC_API_BASE_URL") ||
    importMetaEnv.VITE_API_URL;

  if (isNativeRuntime || isMobileAppBuild) {
    return nativeCandidate ?? standardCandidate;
  }

  if (typeof window !== "undefined" && !isDev) {
    const explicit = String(standardCandidate ?? "").trim();
    if (!explicit) return `${productionBackendOrigin}/api/v1`;
    if (isRelativeProductionUrl(explicit)) {
      console.warn("qring.env.invalid_api_base_url", {
        reason: "relative-path-not-allowed-in-production",
        value: explicit
      });
      return `${productionBackendOrigin}/api/v1`;
    }
    return explicit;
  }

  return standardCandidate;
}

function resolvePublicAppUrl(rawValue) {
  return resolvePublicAppUrlValue(rawValue, defaultPublicAppUrl, { windowOrigin });
}

function parseIceServers(rawValue) {
  const value = (rawValue ?? "").trim();
  if (!value) {
    return [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const normalized = parsed
        .map((entry) => {
          if (!entry) return null;
          if (typeof entry === "string") return { urls: entry };
          if (typeof entry === "object" && entry.urls) return entry;
          return null;
        })
        .filter(Boolean);
      if (normalized.length > 0) return normalized;
    }
  } catch {
    // Fall through to CSV parser.
  }

  const list = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((url) => ({ urls: url }));

  if (list.length > 0) return list;

  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];
}

const runtimeApiBaseSource = resolveRuntimeApiBaseSource();

const resolvedApiBaseUrl = resolveApiBaseUrl(runtimeApiBaseSource);
const resolvedSocketUrl = (() => {
  if (isDev && typeof window !== "undefined" && !(importMetaEnv.VITE_SOCKET_URL ?? "").trim()) {
    // Keep Socket.IO same-origin in local dev so Vite proxy handles upstream CORS safely.
    return trimTrailingSlash(window.location.origin);
  }
  const explicit = resolveSocketUrl(importMetaEnv.VITE_SOCKET_URL);
  if ((importMetaEnv.VITE_SOCKET_URL ?? "").trim()) return explicit;
  const apiOrigin = originFromUrl(resolvedApiBaseUrl);
  if (apiOrigin && windowOrigin && apiOrigin !== trimTrailingSlash(windowOrigin)) {
    return apiOrigin;
  }
  return explicit;
})();

export const env = {
  apiBaseUrl: resolvedApiBaseUrl,
  socketUrl: resolvedSocketUrl,
  publicAppUrl: resolvePublicAppUrl(importMetaEnv.VITE_PUBLIC_APP_URL),
  buildId,
  socketPath: importMetaEnv.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    importMetaEnv.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    importMetaEnv.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling",
  webRtcIceServers: parseIceServers(importMetaEnv.VITE_WEBRTC_ICE_SERVERS),
  rtcMonitoringUrl: String(importMetaEnv.VITE_RTC_MONITORING_URL ?? "").trim(),
  callConnectTimeoutMs: toInteger(importMetaEnv.VITE_CALL_CONNECT_TIMEOUT_MS, 8000),
  callRingTimeoutMs: toInteger(importMetaEnv.VITE_CALL_RING_TIMEOUT_MS, 30000),
  enableRealtimeInDev: String(importMetaEnv.VITE_ENABLE_REALTIME_IN_DEV ?? "true").toLowerCase() !== "false",
  routerMode: String(importMetaEnv.VITE_ROUTER_MODE ?? "auto").trim().toLowerCase()
};

if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.info("qring.env", {
    mode: isDev ? "development" : "production",
    buildId: buildId || "unknown",
    apiBaseSource: runtimeApiBaseSource || "(default)",
    apiBaseUrl: env.apiBaseUrl,
    socketUrl: env.socketUrl,
    socketPath: env.socketPath
  });
}
