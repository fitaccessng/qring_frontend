const trimTrailingSlash = (value) => value?.replace(/\/+$/, "") ?? "";

const defaultApiBase =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : "http://localhost:8000/api/v1";
const defaultSocketUrl =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://localhost:8000";

export const env = {
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? defaultApiBase),
  socketUrl: trimTrailingSlash(import.meta.env.VITE_SOCKET_URL ?? defaultSocketUrl),
  socketPath: import.meta.env.VITE_SOCKET_PATH ?? "/socket.io",
  dashboardNamespace:
    import.meta.env.VITE_DASHBOARD_NAMESPACE ?? "/realtime/dashboard",
  signalingNamespace:
    import.meta.env.VITE_SIGNALING_NAMESPACE ?? "/realtime/signaling"
};
