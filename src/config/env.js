const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";
const hasHttpProtocol = (value) => /^https?:\/\//i.test(value ?? "");
const looksLikeDomain = (value) => /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value ?? "");

const productionBackendOrigin = "https://qring-backend-1.onrender.com";
const isDev = Boolean(import.meta.env.DEV);

const defaultApiBase =
  typeof window !== "undefined" && isDev
    ? `${window.location.origin}/api/v1`
    : `${productionBackendOrigin}/api/v1`;
const defaultSocketUrl =
  typeof window !== "undefined" && isDev
    ? window.location.origin
    : productionBackendOrigin;
const defaultLivekitUrl = "";
const defaultPublicAppUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://www.useqring.online";

function resolveApiBaseUrl(rawValue) {
  const value = (rawValue ?? "").trim();
  if (!value) return defaultApiBase;
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return defaultApiBase;
}

function resolveSocketUrl(rawValue) {
  const value = (rawValue ?? "").trim();
  if (!value) return defaultSocketUrl;
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return defaultSocketUrl;
}

function resolvePublicAppUrl(rawValue) {
  const value = (rawValue ?? "").trim();
  if (!value) return trimTrailingSlash(defaultPublicAppUrl);
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && typeof window !== "undefined") {
    return trimTrailingSlash(`${window.location.origin}${value}`);
  }
  return trimTrailingSlash(defaultPublicAppUrl);
}

function resolveLivekitUrl(rawValue) {
  const value = (rawValue ?? "").trim();
  if (!value) return defaultLivekitUrl;
  if (/^wss?:\/\//i.test(value) || /^https?:\/\//i.test(value)) return trimTrailingSlash(value);
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

export const env = {
  apiBaseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL),
  socketUrl: resolveSocketUrl(import.meta.env.VITE_SOCKET_URL),
  publicAppUrl: resolvePublicAppUrl(import.meta.env.VITE_PUBLIC_APP_URL),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling",
  webRtcIceServers: parseIceServers(import.meta.env.VITE_WEBRTC_ICE_SERVERS),
  livekitUrl: resolveLivekitUrl(import.meta.env.VITE_LIVEKIT_URL)
};
