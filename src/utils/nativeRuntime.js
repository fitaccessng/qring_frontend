export function isNativeApp() {
  try {
    return Boolean(globalThis?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isNativeIosApp() {
  try {
    return isNativeApp() && String(globalThis?.Capacitor?.getPlatform?.() || "").toLowerCase() === "ios";
  } catch {
    return false;
  }
}
