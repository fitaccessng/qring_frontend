import { getAccessToken, getStoredUser } from "../services/authStorage";
import { isNativeApp } from "./nativeRuntime";

const ROLE_HOME = {
  homeowner: "/dashboard/homeowner/overview",
  estate: "/dashboard/estate",
  admin: "/dashboard/admin",
  security: "/dashboard/security",
};

export function getRoleHomePath(role) {
  return ROLE_HOME[String(role || "").trim().toLowerCase()] ?? "/dashboard/homeowner/overview";
}

export function resolvePostLoginPath(user, redirectPath = "") {
  const safeRedirect = String(redirectPath || "").trim();
  if (safeRedirect.startsWith("/") && !safeRedirect.startsWith("//")) {
    return safeRedirect;
  }
  return getRoleHomePath(user?.role);
}

export function getCurrentAppPath() {
  if (typeof window === "undefined") return "/";
  const hash = String(window.location.hash || "");
  if (hash.startsWith("#/")) {
    return hash.slice(1) || "/";
  }
  return window.location.pathname || "/";
}

export function navigateToAppPath(path, { replace = false } = {}) {
  if (typeof window === "undefined") return;
  const safePath = String(path || "").trim();
  if (!safePath.startsWith("/") || safePath.startsWith("//")) return;

  if (isNativeApp()) {
    const target = `#${safePath}`;
    if (replace) {
      window.history.replaceState(window.history.state, "", target);
    } else {
      window.location.hash = safePath;
    }
    window.dispatchEvent(new Event("popstate"));
    return;
  }

  if (replace) {
    window.history.replaceState(window.history.state, "", safePath);
    window.dispatchEvent(new Event("popstate"));
    return;
  }

  window.location.assign(safePath);
}

export function redirectToLogin(redirectPath = "") {
  const current = String(redirectPath || getCurrentAppPath() || "").trim();
  if (current.startsWith("/login")) return;
  const query = current ? `?redirect=${encodeURIComponent(current)}` : "";
  navigateToAppPath(`/login${query}`, { replace: true });
}

export function getNativeEntryRoute() {
  const token = getAccessToken();
  const user = getStoredUser();
  if (!token || !user?.role) return "/login";
  return getRoleHomePath(user.role);
}
