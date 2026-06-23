const trimTrailingSlash = (value) => String(value ?? "").replace(/\/+$/, "");
const hasHttpProtocol = (value) => /^https?:\/\//i.test(String(value ?? ""));
const looksLikeDomain = (value) => /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(String(value ?? ""));
const isRelativePath = (value) => typeof value === "string" && value.trim().startsWith("/");

export function normalizeLocalBackendHost(value) {
  return String(value ?? "").replace(/:\/\/0\.0\.0\.0(?=[:/]|$)/i, "://localhost");
}

export function resolveHttpUrl(rawValue, fallbackValue, { windowOrigin = "" } = {}) {
  const value = normalizeLocalBackendHost(String(rawValue ?? "").trim());
  if (!value) return trimTrailingSlash(fallbackValue);
  if (hasHttpProtocol(value)) return trimTrailingSlash(value);
  if (looksLikeDomain(value)) return trimTrailingSlash(`https://${value}`);
  if (value.startsWith("/") && windowOrigin) {
    return trimTrailingSlash(`${windowOrigin}${value}`);
  }
  return trimTrailingSlash(fallbackValue);
}

export function resolveApiBaseUrl(rawValue, fallbackValue, { windowOrigin = "" } = {}) {
  return resolveHttpUrl(rawValue, fallbackValue, { windowOrigin });
}

export function resolveSocketUrl(rawValue, fallbackValue, { windowOrigin = "" } = {}) {
  return resolveHttpUrl(rawValue, fallbackValue, { windowOrigin });
}

export function resolvePublicAppUrl(rawValue, fallbackValue, { windowOrigin = "" } = {}) {
  return resolveHttpUrl(rawValue, fallbackValue, { windowOrigin });
}

export function isProductionRuntimeBaseSafe({ apiBaseUrl = "", socketUrl = "", productionBackendOrigin = "", productionFrontendOrigin = "" } = {}) {
  const values = [apiBaseUrl, socketUrl, productionBackendOrigin, productionFrontendOrigin]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);
  return values.every((value) => !value.includes("localhost") && !value.includes("127.0.0.1") && !value.includes("0.0.0.0"));
}

export function isRelativeProductionUrl(rawValue) {
  return isRelativePath(rawValue);
}
