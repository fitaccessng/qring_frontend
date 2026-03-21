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
let lastNetworkErrorAt = 0;
const GET_CACHE_TTL_MS = 20 * 1000;
const GET_CACHE_STALE_TTL_MS = 2 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30000;
const getResponseCache = new Map();
const protectedPathPrefixes = [
  "/dashboard",
  "/homeowner",
  "/estate",
  "/admin",
  "/notifications",
  "/security",
  "/calls"
];

function requiresAuthenticatedUser(path) {
  return protectedPathPrefixes.some((prefix) => path.startsWith(prefix));
}

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
      connectTimeout: REQUEST_TIMEOUT_MS,
      readTimeout: REQUEST_TIMEOUT_MS
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(timeoutId);
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

function buildCacheKey(path, token) {
  const scope = token ? token.slice(-8) : "anon";
  return `${scope}:${path}`;
}

function readGetCache(cacheKey) {
  const row = getResponseCache.get(cacheKey);
  if (!row) return null;
  const ageMs = Date.now() - row.at;
  return { row, ageMs };
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("qring:session-timeout"));
  }
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

export async function apiRequest(path, options = {}, attempt = 0) {
  const silent = Boolean(options?.silent);
  const noCache = Boolean(options?.noCache);
  const token = localStorage.getItem("qring_access_token");
  if (requiresAuthenticatedUser(path) && !token) {
    clearAuthStorage();
    redirectToLogin();
    throw new ApiError("Session timeout. Please login again.", 401, { path });
  }
  const method = String(options.method ?? "GET").toUpperCase();
  const isGet = method === "GET" && !options.body;
  const cacheKey = isGet ? buildCacheKey(path, token) : "";

  if (!isGet) {
    getResponseCache.clear();
  }

  if (isGet && !noCache) {
    const cached = readGetCache(cacheKey);
    if (cached && cached.ageMs < GET_CACHE_TTL_MS) {
      return cached.row.payload;
    }
  }

  const headers = {
    "Content-Type": "application/json",
    "X-DB-Access-Mode": method === "GET" || method === "HEAD" ? "read" : "write",
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
    if (isGet) {
      const cached = readGetCache(cacheKey);
      if (cached && cached.ageMs < GET_CACHE_STALE_TTL_MS) {
        emitFlash("Connection unstable. Showing recent cached data.", "warning");
        return cached.row.payload;
      }
    }
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return apiRequest(path, options, attempt + 1);
    }
    const message =
      "We couldn't connect right now. Please check your internet and try again in a moment.";
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
    if (!silent) emitFlash(message, "error");
    throw new ApiError(
      message,
      response.status,
      { raw }
    );
  }

  if (!response.ok) {
    const shouldHandleSessionTimeout = response.status === 401 && (Boolean(token) || requiresAuthenticatedUser(path));
    if (shouldHandleSessionTimeout && attempt === 0) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest(path, options, 1);
      }
      clearAuthStorage();
      emitFlash("Session timeout. Please login again.", "warning");
      redirectToLogin();
    }
    const message = shouldHandleSessionTimeout
      ? "Session timeout. Please login again."
      : payload?.message ?? payload?.detail ?? `Request failed (${response.status})`;
    if (!silent) emitFlash(message, "error");
    throw new ApiError(
      message,
      response.status,
      payload
    );
  }

  if (isGet && !noCache) {
    getResponseCache.set(cacheKey, { payload, at: Date.now() });
  }

  return payload;
}

export async function apiUpload(path, formData) {
  const token = localStorage.getItem("qring_access_token");
  if (requiresAuthenticatedUser(path) && !token) {
    clearAuthStorage();
    redirectToLogin();
    throw new ApiError("Session timeout. Please login again.", 401, { path });
  }

  const headers = {
    "X-DB-Access-Mode": "write",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await performHttpRequest(`${env.apiBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData
    });
  } catch (networkError) {
    const message =
      "We couldn't connect right now. Please check your internet and try again in a moment.";
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
    const message = "API returned an empty/non-JSON success response for upload.";
    emitFlash(message, "error");
    throw new ApiError(message, response.status, { raw });
  }
  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? `Upload failed (${response.status})`;
    emitFlash(message, "error");
    throw new ApiError(message, response.status, payload);
  }
  return payload;
}
