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
let capacitorRuntime = null;

async function getCapacitorRuntime() {
  if (capacitorRuntime !== null) return capacitorRuntime;
  try {
    const capacitorModule = "@capacitor/core";
    const mod = await import(/* @vite-ignore */ capacitorModule);
    const Capacitor = mod?.Capacitor;
    const CapacitorHttp = mod?.CapacitorHttp;
    capacitorRuntime = {
      isNative: Boolean(Capacitor?.isNativePlatform?.()),
      http: CapacitorHttp
    };
  } catch {
    capacitorRuntime = { isNative: false, http: null };
  }
  return capacitorRuntime;
}

function getHeader(headers, key) {
  const direct = headers?.[key];
  if (direct) return direct;
  const lowerKey = key.toLowerCase();
  for (const [headerKey, headerValue] of Object.entries(headers ?? {})) {
    if (headerKey.toLowerCase() === lowerKey) return headerValue;
  }
  return "";
}

function normalizeRequestData(body, headers) {
  if (body == null) return undefined;
  const contentType = String(getHeader(headers, "Content-Type") ?? "");
  if (typeof body === "string" && contentType.includes("application/json")) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

async function performHttpRequest(url, options) {
  const runtime = await getCapacitorRuntime();
  if (runtime.isNative && runtime.http) {
    const response = await runtime.http.request({
      url,
      method: options.method ?? "GET",
      headers: options.headers ?? {},
      data: normalizeRequestData(options.body, options.headers),
      connectTimeout: 30000,
      readTimeout: 30000
    });

    const status = Number(response?.status ?? 0);
    const ok = status >= 200 && status < 300;
    const data = response?.data;
    let payload = null;
    let raw = "";

    if (data !== undefined && data !== null) {
      if (typeof data === "string") {
        raw = data;
        try {
          payload = JSON.parse(data);
        } catch {
          payload = { raw: data };
        }
      } else {
        payload = data;
        try {
          raw = JSON.stringify(data);
        } catch {
          raw = String(data);
        }
      }
    }

    return { ok, status, payload, raw };
  }

  const response = await fetch(url, options);
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }
  return { ok: response.ok, status: response.status, payload, raw };
}

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
    let response;
    try {
      response = await performHttpRequest(`${env.apiBaseUrl}/auth/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });
    } catch {
      return null;
    }

    if (!response.ok) return null;
    const payload = response.payload;
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

  let response;
  try {
    response = await performHttpRequest(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body
    });
  } catch (networkError) {
    const message = `Network request failed. Verify backend availability and CORS for this app origin. API: ${env.apiBaseUrl}`;
    emitFlash(message, "error");
    throw new ApiError(
      message,
      0,
      {
        reason: networkError?.message ?? "fetch failed",
        apiBaseUrl: env.apiBaseUrl,
        path
      }
    );
  }

  const raw = response.raw;
  const payload = response.payload;

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
