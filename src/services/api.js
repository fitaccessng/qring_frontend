import axios from "axios";
import { env } from "../config/env";
import { buildApiUrl } from "./apiClient";
import { clearAuthSession, getAccessToken, getRefreshToken, getStoredUser, persistAuthSession } from "./authStorage";
import { redirectToLogin } from "../utils/authRouting";

function clearStoredSession() {
  if (typeof window === "undefined") return;
  clearAuthSession();
  window.dispatchEvent(
    new CustomEvent("qring:session-timeout", {
      detail: {
        title: "Session expired",
        message: "Your session expired. Please sign in again to continue.",
        actionLabel: "Sign in",
        actionRoute: "/login"
      }
    })
  );
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 30000
});

let axiosRefreshPromise = null;

async function refreshAccessTokenForAxios() {
  if (axiosRefreshPromise) return axiosRefreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  axiosRefreshPromise = (async () => {
    const response = await fetch(buildApiUrl("/auth/refresh-token", env.apiBaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DB-Access-Mode": "write"
      },
      credentials: "include",
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const data = payload?.data ?? payload;
    if (!data?.accessToken) return null;
    persistAuthSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken,
      user: data.user ?? getStoredUser()
    });
    return data.accessToken;
  })();

  try {
    return await axiosRefreshPromise;
  } finally {
    axiosRefreshPromise = null;
  }
}

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

  const finalUrl = String(nextConfig.url ?? "");
  // eslint-disable-next-line no-console
  console.debug("qring.api.axios_request", {
    mode: import.meta.env.DEV ? "development" : "production",
    baseURL: nextConfig.baseURL,
    url: finalUrl,
    finalUrl: /^https?:\/\//i.test(finalUrl) ? finalUrl : `${nextConfig.baseURL || ""}${finalUrl}`,
    method: nextConfig.method ?? "get"
  });

  return nextConfig;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = Number(error?.response?.status ?? 0);
    const originalRequest = error?.config ?? {};
    if (status === 401 && !originalRequest._retry) {
      const newToken = await refreshAccessTokenForAxios();
      if (newToken) {
        originalRequest._retry = true;
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${newToken}`
        };
        return api.request(originalRequest);
      }
    }
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
