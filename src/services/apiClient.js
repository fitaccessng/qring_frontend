import { env } from "../config/env";

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let refreshPromise = null;

function emitFlash(message, type = "error") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("qring:toast", {
      detail: { message, type }
    })
  );
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem("qring_refresh_token");
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    const response = await fetch(`${env.apiBaseUrl}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ refreshToken })
    });

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = { raw };
      }
    }
    if (!response.ok) return null;
    const data = payload?.data ?? payload;
    if (!data?.accessToken) return null;
    localStorage.setItem("qring_access_token", data.accessToken);
    if (data?.refreshToken) {
      localStorage.setItem("qring_refresh_token", data.refreshToken);
    }
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearAuthStorage() {
  localStorage.removeItem("qring_access_token");
  localStorage.removeItem("qring_refresh_token");
  localStorage.removeItem("qring_user");
}

export async function apiRequest(path, options = {}, attempt = 0) {
  const token = localStorage.getItem("qring_access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }

  if (response.ok && !payload) {
    const message = `API returned an empty/non-JSON success response. Check VITE_API_BASE_URL (${env.apiBaseUrl}) and backend routing.`;
    emitFlash(message, "error");
    throw new ApiError(
      message,
      response.status,
      { raw }
    );
  }

  if (!response.ok) {
    if (response.status === 401 && attempt === 0) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest(path, options, 1);
      }
      clearAuthStorage();
    }
    const message = payload?.message ?? payload?.detail ?? `Request failed (${response.status})`;
    emitFlash(message, "error");
    throw new ApiError(
      message,
      response.status,
      payload
    );
  }

  return payload;
}
