import { env } from "../config/env";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  persistAuthSession,
} from "./authStorage";
import { getCurrentAppPath, redirectToLogin } from "../utils/authRouting";

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
const inFlightGetRequests = new Map();
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

function isJsonContentType(contentType) {
  return String(contentType || "").toLowerCase().includes("application/json");
}

function isHtmlContentType(contentType) {
  return String(contentType || "").toLowerCase().includes("text/html");
}

function looksLikeHtmlDocument(value) {
  const text = String(value || "").trim().toLowerCase();
  return text.startsWith("<!doctype html") || text.startsWith("<html");
}

function buildResponseHeadersObject(headers) {
  if (!headers || typeof headers.entries !== "function") return {};
  return Object.fromEntries(headers.entries());
}

function shouldRetryResponseStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function shouldEmitNetworkToast() {
  const now = Date.now();
  if (now - lastNetworkErrorAt < 2500) return false;
  lastNetworkErrorAt = now;
  return true;
}

function buildTransportErrorMessage(networkError) {
  if (networkError?.name === "AbortError") {
    return "This request timed out. Please try again.";
  }
  return "We couldn't connect right now. Please check your internet and try again in a moment.";
}

export function buildApiUrl(path = "") {
  if (!path) return env.apiBaseUrl;
  if (/^https?:\/\//i.test(path)) return path;
  return `${env.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildAuthHeaders(extraHeaders = {}, tokenOverride) {
  const token = tokenOverride ?? getAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders
  };
}

function buildFormatErrorDetails({ path, status, contentType, raw, apiBaseUrl }) {
  if (isHtmlContentType(contentType) || looksLikeHtmlDocument(raw)) {
    return {
      message:
        "The app reached a web page instead of the API. The connection is fine, but API routing or VITE_API_BASE_URL is misconfigured.",
      code: "API_HTML_RESPONSE"
    };
  }

  return {
    message:
      "The server responded successfully, but not in JSON format. Please verify the backend route and response headers for this API request.",
    code: "API_NON_JSON_SUCCESS"
  };
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
  const timeoutMs = Number(options?.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const runtime = await getCapacitorRuntime();
  if (runtime.isNative && runtime.http) {
    const response = await runtime.http.request({
      url,
      method: options.method ?? "GET",
      headers: options.headers ?? {},
      data: normalizeRequestData(options.body, options.headers),
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs
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

    return {
      ok,
      status,
      payload,
      raw,
      headers: response?.headers ?? {},
      contentType: getHeader(response?.headers, "content-type")
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }
  const headers = buildResponseHeadersObject(response.headers);
  return {
    ok: response.ok,
    status: response.status,
    payload,
    raw,
    headers,
    contentType: getHeader(headers, "content-type")
  };
}

export async function apiPing(path = "/health") {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  try {
    const response = await performHttpRequest(buildApiUrl(path), {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
      timeoutMs: 8000
    });
    return Boolean(response.ok);
  } catch {
    return false;
  }
}

export async function apiRequestBinary(path, options = {}) {
  const method = String(options.method ?? "GET").toUpperCase();
  const timeoutMs = Number(options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const retryCount = Math.max(0, Number(options.retryCount ?? 1));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      method,
      headers: buildAuthHeaders(options.headers ?? {}, options.token),
      body: options.body,
      cache: options.cache ?? "default",
      signal: controller.signal
    });
    if (!response.ok) {
      if (retryCount > 0 && shouldRetryResponseStatus(response.status)) {
        return apiRequestBinary(path, { ...options, retryCount: retryCount - 1 });
      }
      const raw = await response.text().catch(() => "");
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = raw ? { raw } : null;
      }
      throw new ApiError(
        payload?.message ?? payload?.detail ?? `Request failed (${response.status})`,
        response.status,
        payload
      );
    }
    return response;
  } catch (error) {
    if ((error?.name === "AbortError" || error?.status === 0) && retryCount > 0) {
      return apiRequestBinary(path, { ...options, retryCount: retryCount - 1 });
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(buildTransportErrorMessage(error), 0, {
      reason: error?.message ?? "fetch failed",
      path,
      apiBaseUrl: env.apiBaseUrl
    });
  } finally {
    clearTimeout(timeoutId);
  }
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

function emitBlockingSubscription(detail = {}) {
  if (typeof window === "undefined") return;
  const message = String(detail.message ?? "").trim();
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent("qring:blocking", {
      detail
    })
  );
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshPromise = (async () => {
    let response;
    try {
      response = await performHttpRequest(buildApiUrl("/auth/refresh-token"), {
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
    persistAuthSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: getStoredUserSnapshot() });
    return data.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function getStoredUserSnapshot() {
  try {
    const user = getStoredUser();
    return user ? JSON.parse(JSON.stringify(user)) : null;
  } catch {
    return null;
  }
}

function clearAuthStorage() {
  clearAuthSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("qring:session-timeout"));
  }
}

export async function apiRequest(path, options = {}, attempt = 0) {
  const silent = Boolean(options?.silent);
  const noCache = Boolean(options?.noCache);
  const retryCount = Math.max(0, Number(options?.retryCount ?? 1));
  const token = getAccessToken();
  if (requiresAuthenticatedUser(path) && !token) {
    clearAuthStorage();
    redirectToLogin(getCurrentAppPath());
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
    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
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

  const requestRunner = async () => {
    let response;
    try {
      response = await performHttpRequest(buildApiUrl(path), {
        method: options.method ?? "GET",
        headers,
        body: options.body,
        timeoutMs: options.timeoutMs
      });
    } catch (networkError) {
      if (isGet) {
        const cached = readGetCache(cacheKey);
        if (cached && cached.ageMs < GET_CACHE_STALE_TTL_MS) {
          emitFlash("Connection unstable. Showing recent cached data.", "warning");
          return cached.row.payload;
        }
      }
      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return apiRequest(path, options, attempt + 1);
      }
      const message = buildTransportErrorMessage(networkError);
      if (!silent && shouldEmitNetworkToast()) {
        emitFlash(message, "error");
      }
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
    const contentType = response.contentType;

    if (response.ok && !payload && !raw) {
      return {
        data: null,
        meta: {
          empty: true,
          statusCode: response.status
        }
      };
    }

    const isNonJsonSuccess =
      response.ok &&
      payload?.raw &&
      !isJsonContentType(contentType);

    if (isNonJsonSuccess) {
      const detail = buildFormatErrorDetails({
        path,
        status: response.status,
        contentType,
        raw: payload.raw,
        apiBaseUrl: env.apiBaseUrl
      });
      if (!silent) emitFlash(detail.message, "error");
      throw new ApiError(detail.message, response.status, {
        code: detail.code,
        path,
        raw: payload.raw,
        contentType,
        apiBaseUrl: env.apiBaseUrl
      });
    }

    if (!response.ok) {
      if (attempt < retryCount && shouldRetryResponseStatus(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
        return apiRequest(path, options, attempt + 1);
      }
      const shouldHandleSessionTimeout = response.status === 401 && (Boolean(token) || requiresAuthenticatedUser(path));
      if (shouldHandleSessionTimeout && attempt === 0) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          return apiRequest(path, options, 1);
        }
        clearAuthStorage();
        emitFlash("Session timeout. Please login again.", "warning");
        redirectToLogin(getCurrentAppPath());
      }
      const isSubscriptionBlocked = response.status === 403 && payload?.code === "SUBSCRIPTION_ACTION_BLOCKED";
      const baseMessage = shouldHandleSessionTimeout
        ? "Session timeout. Please login again."
        : payload?.message ?? payload?.detail ?? `Request failed (${response.status})`;
      const requestId = payload?.requestId ? String(payload.requestId) : "";
      const isServerError = response.status >= 500 && !shouldHandleSessionTimeout;
      if (isServerError) {
        // Keep the UI friendly; log details for debugging/support.
        // eslint-disable-next-line no-console
        console.error("API 5xx", { path, status: response.status, requestId, payload });
      }

      const message = isServerError
        ? path === "/homeowner/settings"
          ? "We couldn't load your settings right now. Please try again."
          : "The server responded with an error even though the connection worked. Please try again."
        : baseMessage;
      if (isSubscriptionBlocked) {
        emitBlockingSubscription({
          title: payload?.subscription?.status === "suspended" ? "Service paused" : "Subscription restriction",
          message,
          actionLabel: payload?.subscription?.is_bill_payer ?? payload?.subscription?.isBillPayer ? "Renew Now" : "",
          actionRoute: payload?.renew_url ?? payload?.subscription?.renew_url ?? payload?.subscription?.renewUrl ?? "/billing/paywall"
        });
      } else if (!silent) {
        emitFlash(message, "error");
      }
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
  };

  if (isGet && !noCache) {
    const pendingRequest = requestRunner().finally(() => {
      inFlightGetRequests.delete(cacheKey);
    });
    inFlightGetRequests.set(cacheKey, pendingRequest);
    return pendingRequest;
  }

  return requestRunner();
}

export async function apiUpload(path, formData) {
  const token = getAccessToken();
  if (requiresAuthenticatedUser(path) && !token) {
    clearAuthStorage();
    redirectToLogin(getCurrentAppPath());
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
    response = await performHttpRequest(buildApiUrl(path), {
      method: "POST",
      headers,
      body: formData,
      timeoutMs: REQUEST_TIMEOUT_MS
    });
  } catch (networkError) {
    const message = buildTransportErrorMessage(networkError);
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
  if (response.ok && !payload && !raw) {
    return { data: null, meta: { empty: true, statusCode: response.status } };
  }
  if (response.ok && payload?.raw && !isJsonContentType(response.contentType)) {
    const detail = buildFormatErrorDetails({
      path,
      status: response.status,
      contentType: response.contentType,
      raw: payload.raw,
      apiBaseUrl: env.apiBaseUrl
    });
    emitFlash(detail.message, "error");
    throw new ApiError(detail.message, response.status, {
      code: detail.code,
      raw: payload.raw,
      contentType: response.contentType
    });
  }
  if (!response.ok) {
    const message = payload?.message ?? payload?.detail ?? `Upload failed (${response.status})`;
    emitFlash(message, "error");
    throw new ApiError(message, response.status, payload);
  }
  return payload;
}
