import { apiRequest } from "./apiClient";

const HOMEOWNER_SETTINGS_CACHE_TTL_MS = 2 * 60 * 1000;

const homeownerSettingsCache = {
  value: null,
  at: 0,
  promise: null
};

function isFresh() {
  return homeownerSettingsCache.at > 0 && Date.now() - homeownerSettingsCache.at < HOMEOWNER_SETTINGS_CACHE_TTL_MS;
}

function setCache(value) {
  homeownerSettingsCache.value = value;
  homeownerSettingsCache.at = Date.now();
  return value;
}

export function getHomeownerSettingsSnapshot() {
  return homeownerSettingsCache.value;
}

export function invalidateHomeownerSettingsCache() {
  homeownerSettingsCache.value = null;
  homeownerSettingsCache.at = 0;
  homeownerSettingsCache.promise = null;
}

export async function getHomeownerSettings() {
  if (isFresh()) {
    return homeownerSettingsCache.value;
  }
  if (homeownerSettingsCache.promise) {
    return homeownerSettingsCache.promise;
  }
  homeownerSettingsCache.promise = (async () => {
    try {
      const response = await apiRequest("/homeowner/settings");
      return setCache(response?.data ?? null);
    } finally {
      homeownerSettingsCache.promise = null;
    }
  })();
  return homeownerSettingsCache.promise;
}

export async function updateHomeownerSettings(payload) {
  const response = await apiRequest("/homeowner/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return setCache({
    ...(homeownerSettingsCache.value || {}),
    ...(response?.data || {})
  });
}

export async function updateHomeownerProfile(payload) {
  const response = await apiRequest("/homeowner/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  const profile = response?.data ?? null;
  setCache({
    ...(homeownerSettingsCache.value || {}),
    profile: {
      ...(homeownerSettingsCache.value?.profile || {}),
      ...(profile || {})
    }
  });
  return profile;
}

export async function searchHomeownerEmergencyContactByEmail(email) {
  const response = await apiRequest(`/homeowner/contact-users/search?email=${encodeURIComponent(String(email || "").trim().toLowerCase())}`, {
    silent: true,
    noCache: true
  });
  return response?.data ?? null;
}
