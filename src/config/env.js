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

export const env = {
  apiBaseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL),
  socketUrl: resolveSocketUrl(import.meta.env.VITE_SOCKET_URL),
  publicAppUrl: resolvePublicAppUrl(import.meta.env.VITE_PUBLIC_APP_URL),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling"
};
