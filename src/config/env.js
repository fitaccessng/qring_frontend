const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";
const hasHttpProtocol = (value) => /^https?:\/\//i.test(value ?? "");
const looksLikeDomain = (value) => /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value ?? "");

const productionBackendOrigin = "https://qring-backend.onrender.com";

const defaultApiBase =
  typeof window !== "undefined"
    ? `${productionBackendOrigin}/api/v1`
    : `${productionBackendOrigin}/api/v1`;
const defaultSocketUrl =
  typeof window !== "undefined"
    ? productionBackendOrigin
    : productionBackendOrigin;

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

export const env = {
  apiBaseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL),
  socketUrl: resolveSocketUrl(import.meta.env.VITE_SOCKET_URL),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling"
};
