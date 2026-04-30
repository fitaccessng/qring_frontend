import { Capacitor } from "@capacitor/core";

const MOBILE_BUILD_TARGET = String(import.meta.env.VITE_APP_BUILD_TARGET ?? "").trim().toLowerCase() === "mobile";

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
