import { env } from "../config/env";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getBackendOrigin() {
  try {
    return trimTrailingSlash(new URL(env.apiBaseUrl).origin);
  } catch {
    return "";
  }
}

export function resolveBackendAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = getBackendOrigin();
  if (!origin) return raw;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}
