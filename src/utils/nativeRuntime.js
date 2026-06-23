import { Capacitor } from "@capacitor/core";

const importMetaEnv = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
const MOBILE_BUILD_TARGET = String(importMetaEnv.VITE_APP_BUILD_TARGET ?? "").trim().toLowerCase() === "mobile";

export function getCapacitorPlatform() {
  try {
    return String(Capacitor.getPlatform?.() || "").toLowerCase();
  } catch {
    return "";
  }
}

export function isNativeApp() {
  try {
    return Boolean(Capacitor.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isNativeIosApp() {
  return isNativeApp() && getCapacitorPlatform() === "ios";
}

export function isMobileAppRuntime() {
  return isNativeApp() || MOBILE_BUILD_TARGET;
}

export function shouldUseGoogleAuth() {
  return !isMobileAppRuntime();
}
