const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";

const productionBackendOrigin = "https://qring-backend.onrender.com";

const defaultApiBase =
  typeof window !== "undefined"
    ? `${productionBackendOrigin}/api/v1`
    : `${productionBackendOrigin}/api/v1`;
const defaultSocketUrl =
  typeof window !== "undefined"
    ? productionBackendOrigin
    : productionBackendOrigin;

export const env = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? defaultApiBase),
  socketUrl: trimTrailingSlash(import.meta.env.VITE_SOCKET_URL ?? defaultSocketUrl),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling"
};
