import axios from "axios";
import { env } from "../config/env";

function getAccessToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("qring_access_token") ?? "";
}

function clearStoredSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("qring_access_token");
  localStorage.removeItem("qring_refresh_token");
  localStorage.removeItem("qring_user");
  window.dispatchEvent(new Event("qring:session-timeout"));
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const pathname = window.location.pathname || "";
  const hash = window.location.hash || "";
  const hashPath = hash.startsWith("#/") ? hash.slice(1).split("?")[0] : "";
  const current = hashPath || pathname || "";
  if (current === "/login") return;
  const redirect = encodeURIComponent(`${current}${window.location.search || ""}`);
  if (hashPath) {
    window.location.hash = `/login?redirect=${redirect}`;
    return;
  }
  window.location.assign(`/login?redirect=${redirect}`);
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.headers = {
    "X-DB-Access-Mode": (config.method ?? "get").toLowerCase() === "get" ? "read" : "write",
    ...(config.headers ?? {})
  };

  const token = getAccessToken();
  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status ?? 0);
    if (status === 401) {
      clearStoredSession();
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export function extractResponseData(response) {
  const payload = response?.data;
  return payload?.data ?? payload;
}
