import { isMobileAppRuntime, isNativeApp } from "../utils/nativeRuntime";

export const AUTH_STORAGE_KEYS = {
  accessToken: "qring_access_token",
  refreshToken: "qring_refresh_token",
  user: "qring_user",
  migrated: "qring_auth_storage_migrated",
};

const authCache = {
  hydrated: false,
  values: {
    [AUTH_STORAGE_KEYS.accessToken]: "",
    [AUTH_STORAGE_KEYS.refreshToken]: "",
    [AUTH_STORAGE_KEYS.user]: "",
  },
};

let preferencesPromise = null;

function getLocalStorageSafe() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorageSafe() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getPrimaryStorage() {
  return isMobileAppRuntime() ? getLocalStorageSafe() : getSessionStorageSafe();
}

function getFallbackStorage() {
  return isMobileAppRuntime() ? getSessionStorageSafe() : getLocalStorageSafe();
}

function getLegacyWebStorage() {
  return isMobileAppRuntime() ? null : getLocalStorageSafe();
}

async function getNativePreferences() {
  if (!isNativeApp()) return null;
  if (!preferencesPromise) {
    const moduleName = "@capacitor/preferences";
    preferencesPromise = import(/* @vite-ignore */ moduleName)
      .then((mod) => mod?.Preferences ?? null)
      .catch(() => null);
  }
  return preferencesPromise;
}

function migrateLegacyWebAuthStorage() {
  const primary = getPrimaryStorage();
  const legacy = getLegacyWebStorage();
  if (!primary || !legacy) return;
  if (primary.getItem(AUTH_STORAGE_KEYS.migrated) === "1") return;

  for (const key of [AUTH_STORAGE_KEYS.accessToken, AUTH_STORAGE_KEYS.refreshToken, AUTH_STORAGE_KEYS.user]) {
    if (!primary.getItem(key) && legacy.getItem(key)) {
      primary.setItem(key, legacy.getItem(key));
    }
    legacy.removeItem(key);
  }

  primary.setItem(AUTH_STORAGE_KEYS.migrated, "1");
}

function readFromStores(key) {
  if (authCache.hydrated && Object.prototype.hasOwnProperty.call(authCache.values, key)) {
    return authCache.values[key] ?? "";
  }
  migrateLegacyWebAuthStorage();
  const primary = getPrimaryStorage();
  const fallback = getFallbackStorage();
  return primary?.getItem(key) ?? fallback?.getItem(key) ?? "";
}

function writeToStores(key, value) {
  const normalized = value == null ? "" : String(value);
  if (Object.prototype.hasOwnProperty.call(authCache.values, key)) {
    authCache.values[key] = normalized;
  }
  const primary = getPrimaryStorage();
  const fallback = getFallbackStorage();

  if (normalized) {
    primary?.setItem(key, normalized);
  } else {
    primary?.removeItem(key);
  }

  if (!isMobileAppRuntime()) {
    fallback?.removeItem(key);
  }
}

async function syncNativePreference(key, value) {
  const Preferences = await getNativePreferences();
  if (!Preferences) return;
  if (value) {
    await Preferences.set({ key, value });
  } else {
    await Preferences.remove({ key });
  }
}

function hydrateCacheFromObject(values) {
  authCache.values = {
    [AUTH_STORAGE_KEYS.accessToken]: String(values?.[AUTH_STORAGE_KEYS.accessToken] || ""),
    [AUTH_STORAGE_KEYS.refreshToken]: String(values?.[AUTH_STORAGE_KEYS.refreshToken] || ""),
    [AUTH_STORAGE_KEYS.user]: String(values?.[AUTH_STORAGE_KEYS.user] || ""),
  };
  authCache.hydrated = true;
}

export function getAccessToken() {
  return readFromStores(AUTH_STORAGE_KEYS.accessToken);
}

export function getRefreshToken() {
  return readFromStores(AUTH_STORAGE_KEYS.refreshToken);
}

export function getStoredUser() {
  const raw = readFromStores(AUTH_STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasStoredSession() {
  return Boolean(getAccessToken());
}

export async function restoreAuthSession() {
  migrateLegacyWebAuthStorage();
  const primary = getPrimaryStorage();
  const fallback = getFallbackStorage();
  const values = {
    [AUTH_STORAGE_KEYS.accessToken]: primary?.getItem(AUTH_STORAGE_KEYS.accessToken) ?? fallback?.getItem(AUTH_STORAGE_KEYS.accessToken) ?? "",
    [AUTH_STORAGE_KEYS.refreshToken]: primary?.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? fallback?.getItem(AUTH_STORAGE_KEYS.refreshToken) ?? "",
    [AUTH_STORAGE_KEYS.user]: primary?.getItem(AUTH_STORAGE_KEYS.user) ?? fallback?.getItem(AUTH_STORAGE_KEYS.user) ?? "",
  };

  if (isNativeApp()) {
    const Preferences = await getNativePreferences();
    if (Preferences) {
      const [accessToken, refreshToken, user] = await Promise.all([
        Preferences.get({ key: AUTH_STORAGE_KEYS.accessToken }),
        Preferences.get({ key: AUTH_STORAGE_KEYS.refreshToken }),
        Preferences.get({ key: AUTH_STORAGE_KEYS.user }),
      ]);
      values[AUTH_STORAGE_KEYS.accessToken] = String(accessToken?.value || values[AUTH_STORAGE_KEYS.accessToken] || "");
      values[AUTH_STORAGE_KEYS.refreshToken] = String(refreshToken?.value || values[AUTH_STORAGE_KEYS.refreshToken] || "");
      values[AUTH_STORAGE_KEYS.user] = String(user?.value || values[AUTH_STORAGE_KEYS.user] || "");
    }
  }

  hydrateCacheFromObject(values);
  return {
    accessToken: values[AUTH_STORAGE_KEYS.accessToken],
    refreshToken: values[AUTH_STORAGE_KEYS.refreshToken],
    user: values[AUTH_STORAGE_KEYS.user],
  };
}

export function persistAuthSession(data) {
  if (!data?.accessToken) {
    throw new Error("Authentication succeeded but no access token was returned.");
  }

  writeToStores(AUTH_STORAGE_KEYS.accessToken, data.accessToken);
  writeToStores(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken ?? "");

  if (data?.user) {
    writeToStores(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));
  } else {
    writeToStores(AUTH_STORAGE_KEYS.user, "");
  }

  if (isNativeApp()) {
    void Promise.all([
      syncNativePreference(AUTH_STORAGE_KEYS.accessToken, data.accessToken),
      syncNativePreference(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken ?? ""),
      syncNativePreference(AUTH_STORAGE_KEYS.user, data?.user ? JSON.stringify(data.user) : ""),
    ]).catch(() => {});
  }
}

export function storeUser(user) {
  if (!user) {
    writeToStores(AUTH_STORAGE_KEYS.user, "");
    return null;
  }
  writeToStores(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  return user;
}

export function clearAuthSession() {
  const primary = getPrimaryStorage();
  const fallback = getFallbackStorage();
  hydrateCacheFromObject({});
  for (const key of [AUTH_STORAGE_KEYS.accessToken, AUTH_STORAGE_KEYS.refreshToken, AUTH_STORAGE_KEYS.user]) {
    primary?.removeItem(key);
    fallback?.removeItem(key);
  }
  if (isNativeApp()) {
    void Promise.all([
      syncNativePreference(AUTH_STORAGE_KEYS.accessToken, ""),
      syncNativePreference(AUTH_STORAGE_KEYS.refreshToken, ""),
      syncNativePreference(AUTH_STORAGE_KEYS.user, ""),
    ]).catch(() => {});
  }
}
