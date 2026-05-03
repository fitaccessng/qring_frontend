import { apiRequest } from "./apiClient";

const HOMEOWNER_SETTINGS_CACHE_TTL_MS = 2 * 60 * 1000;
export const DEFAULT_HOMEOWNER_SETTINGS = {
  pushAlerts: true,
  soundAlerts: true,
  autoRejectUnknownVisitors: false,
  autoApproveTrustedVisitors: false,
  autoApproveKnownContacts: false,
  knownContacts: [],
  allowDeliveryDropAtGate: true,
  smsFallbackEnabled: false,
  nearbyPanicAlertsEnabled: true,
  nearbyPanicAlertRadiusMeters: 500,
  nearbyPanicAvailability: "always",
  nearbyPanicCustomSchedule: [],
  nearbyPanicReceiveFrom: "everyone",
  nearbyPanicMutedUntil: null,
  nearbyPanicSameAreaLabel: "",
  panicIdentityVisibility: "masked",
  safetyHomeLocation: { lat: null, lng: null },
  managedByEstate: false,
  estateId: null,
  estateName: null,
  subscription: null,
  profile: null,
  home: null
};

const homeownerSettingsCache = {
  value: null,
  at: 0,
  promise: null
};

function isFresh() {
  return homeownerSettingsCache.at > 0 && Date.now() - homeownerSettingsCache.at < HOMEOWNER_SETTINGS_CACHE_TTL_MS;
}

function setCache(value) {
  homeownerSettingsCache.value = normalizeHomeownerSettings(value);
  homeownerSettingsCache.at = Date.now();
  return homeownerSettingsCache.value;
}

export function normalizeHomeownerSettings(settings) {
  return {
    ...DEFAULT_HOMEOWNER_SETTINGS,
    ...(settings || {}),
    knownContacts: Array.isArray(settings?.knownContacts) ? settings.knownContacts : [],
    nearbyPanicCustomSchedule: Array.isArray(settings?.nearbyPanicCustomSchedule) ? settings.nearbyPanicCustomSchedule : [],
    safetyHomeLocation: {
      lat: Number(settings?.safetyHomeLocation?.lat ?? 0) || null,
      lng: Number(settings?.safetyHomeLocation?.lng ?? 0) || null
    },
    profile: {
      ...(DEFAULT_HOMEOWNER_SETTINGS.profile || {}),
      ...(settings?.profile || {})
    },
    home: {
      ...(DEFAULT_HOMEOWNER_SETTINGS.home || {}),
      ...(settings?.home || {})
    }
  };
}

export function buildHomeownerSettingsPayload(settings) {
  const normalized = normalizeHomeownerSettings(settings);
  return {
    pushAlerts: Boolean(normalized.pushAlerts),
    soundAlerts: Boolean(normalized.soundAlerts),
    autoRejectUnknownVisitors: Boolean(normalized.autoRejectUnknownVisitors),
    autoApproveTrustedVisitors: Boolean(normalized.autoApproveTrustedVisitors),
    autoApproveKnownContacts: Boolean(normalized.autoApproveKnownContacts),
    knownContacts: Array.isArray(normalized.knownContacts) ? normalized.knownContacts : [],
    allowDeliveryDropAtGate: Boolean(normalized.allowDeliveryDropAtGate),
    smsFallbackEnabled: Boolean(normalized.smsFallbackEnabled),
    nearbyPanicAlertsEnabled: Boolean(normalized.nearbyPanicAlertsEnabled),
    nearbyPanicAlertRadiusMeters: Number(normalized.nearbyPanicAlertRadiusMeters || 500),
    nearbyPanicAvailability: String(normalized.nearbyPanicAvailability || "always"),
    nearbyPanicCustomSchedule: Array.isArray(normalized.nearbyPanicCustomSchedule) ? normalized.nearbyPanicCustomSchedule : [],
    nearbyPanicReceiveFrom: String(normalized.nearbyPanicReceiveFrom || "everyone"),
    nearbyPanicMutedUntil: normalized.nearbyPanicMutedUntil || null,
    nearbyPanicSameAreaLabel: String(normalized.nearbyPanicSameAreaLabel || ""),
    panicIdentityVisibility: String(normalized.panicIdentityVisibility || "masked"),
    safetyHomeLocation: {
      lat: Number(normalized?.safetyHomeLocation?.lat ?? 0) || null,
      lng: Number(normalized?.safetyHomeLocation?.lng ?? 0) || null
    }
  };
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

export async function updateHomeownerSettings(payload, options = {}) {
  const response = await apiRequest("/homeowner/settings", {
    method: "PUT",
    body: JSON.stringify(buildHomeownerSettingsPayload(payload)),
    retryCount: Math.max(0, Number(options?.retryCount ?? 1)),
    timeoutMs: Number(options?.timeoutMs ?? 15000)
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
    noCache: true,
    retryCount: 2,
    timeoutMs: 12000
  });
  return response?.data ?? null;
}
