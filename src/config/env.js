const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";
const hasHttpProtocol = (value) => /^https?:\/\//i.test(value ?? "");
const looksLikeDomain = (value) => /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value ?? "");
const normalizeLocalBackendHost = (value) => (value ?? "").replace(/:\/\/0\.0\.0\.0(?=[:/]|$)/i, "://localhost");
const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};
const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const productionBackendOrigin = "https://qring-backend-1.onrender.com";
const isDev = Boolean(import.meta.env.DEV);

const defaultApiBase =
  typeof window !== "undefined" && isDev
    ? `http://localhost:8000/api/v1`
    : `${productionBackendOrigin}/api/v1`;
const defaultSocketUrl =
  typeof window !== "undefined" && isDev
    ? `http://localhost:8000`
    : productionBackendOrigin;
const defaultLivekitUrl = "";
const defaultPublicAppUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://www.useqring.online";

function resolveApiBaseUrl(rawValue) {
  const value = normalizeLocalBackendHost((rawValue ?? "").trim());
  if (!value) return defaultApiBase;
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return defaultApiBase;
}

function resolveSocketUrl(rawValue) {
  const value = normalizeLocalBackendHost((rawValue ?? "").trim());
  if (!value) return defaultSocketUrl;
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return defaultSocketUrl;
}

function originFromUrl(value) {
  try {
    const parsed = new URL(value);
    return trimTrailingSlash(parsed.origin);
  } catch {
    return "";
  }
}

function resolvePublicAppUrl(rawValue) {
  const value = normalizeLocalBackendHost((rawValue ?? "").trim());
  if (!value) return trimTrailingSlash(defaultPublicAppUrl);
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return trimTrailingSlash(defaultPublicAppUrl);
}

function resolveLivekitUrl(rawValue) {
  const value = normalizeLocalBackendHost((rawValue ?? "").trim());
  if (!value) return defaultLivekitUrl;
  if (/^wss?:\/\//i.test(value)) return trimTrailingSlash(value);
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      parsed.protocol = parsed.protocol === "http:" ? "ws:" : "wss:";
      return trimTrailingSlash(parsed.toString());
    } catch {
      return defaultLivekitUrl;
    }
  }
  if (looksLikeDomain(value)) return trimTrailingSlash(`wss://${value}`);
  return defaultLivekitUrl;
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

const resolvedApiBaseUrl = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL);
const resolvedSocketUrl = (() => {
  if (isDev && typeof window !== "undefined" && !(import.meta.env.VITE_SOCKET_URL ?? "").trim()) {
    // Keep Socket.IO same-origin in local dev so Vite proxy handles upstream CORS safely.
    return trimTrailingSlash(window.location.origin);
  }
  const explicit = resolveSocketUrl(import.meta.env.VITE_SOCKET_URL);
  if ((import.meta.env.VITE_SOCKET_URL ?? "").trim()) return explicit;
  const apiOrigin = originFromUrl(resolvedApiBaseUrl);
  if (apiOrigin && typeof window !== "undefined" && apiOrigin !== trimTrailingSlash(window.location.origin)) {
    return apiOrigin;
  }
  return explicit;
})();

export const env = {
  apiBaseUrl: resolvedApiBaseUrl,
  socketUrl: resolvedSocketUrl,
  publicAppUrl: resolvePublicAppUrl(import.meta.env.VITE_PUBLIC_APP_URL),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling",
  webRtcIceServers: parseIceServers(import.meta.env.VITE_WEBRTC_ICE_SERVERS),
  livekitUrl: resolveLivekitUrl(import.meta.env.VITE_LIVEKIT_URL),
  livekitForceRelayOnFailure: toBoolean(import.meta.env.VITE_LIVEKIT_FORCE_RELAY_ON_FAILURE, true),
  callConnectTimeoutMs: toInteger(import.meta.env.VITE_CALL_CONNECT_TIMEOUT_MS, 8000),
  callRingTimeoutMs: toInteger(import.meta.env.VITE_CALL_RING_TIMEOUT_MS, 30000),
  preferVoiceNoteFallback: toBoolean(import.meta.env.VITE_PREFER_VOICE_NOTE_FALLBACK, true),
  enableRealtimeInDev: String(import.meta.env.VITE_ENABLE_REALTIME_IN_DEV ?? "true").toLowerCase() !== "false",
  enableLegacyWebrtc: String(import.meta.env.VITE_ENABLE_LEGACY_WEBRTC ?? "false").toLowerCase() === "true",
  routerMode: String(import.meta.env.VITE_ROUTER_MODE ?? "auto").trim().toLowerCase()
};
