import axios from "axios";
import { env } from "../config/env";
import { clearAuthSession, getAccessToken } from "./authStorage";
import { redirectToLogin } from "../utils/authRouting";

function clearStoredSession() {
  if (typeof window === "undefined") return;
  clearAuthSession();
  window.dispatchEvent(new Event("qring:session-timeout"));
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
