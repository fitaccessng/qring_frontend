import { apiRequest } from "./apiClient";

const ESTATE_SERVICE_CACHE_TTL_MS = 2 * 60 * 1000;

const estateServiceCache = {
  overview: createCacheSlot(),
  mappings: createCacheSlot(),
  accessLogs: createCacheSlot(),
  planRestrictions: createCacheSlot(),
  statsSummary: createCacheSlot(),
  settingsByEstateId: new Map(),
  sharedQrByEstateId: new Map(),
  alertPaymentsByEstateId: new Map()
};

function createCacheSlot() {
  return { value: null, at: 0, promise: null };
}

function isFresh(slot, ttlMs = ESTATE_SERVICE_CACHE_TTL_MS) {
  return Boolean(slot) && slot.at > 0 && Date.now() - slot.at < ttlMs;
}

async function resolveCached(slot, loader, { force = false } = {}) {
  if (!force && isFresh(slot)) {
    return slot.value;
  }
  if (!force && slot.promise) {
    return slot.promise;
  }
  slot.promise = (async () => {
    try {
      const value = await loader();
      slot.value = value;
      slot.at = Date.now();
      return value;
    } finally {
      slot.promise = null;
    }
  })();
  return slot.promise;
}

function getOrCreateMapSlot(map, key) {
  if (!map.has(key)) {
    map.set(key, createCacheSlot());
  }
  return map.get(key);
}

function clearSlot(slot) {
  if (!slot) return;
  slot.value = null;
  slot.at = 0;
  slot.promise = null;
}

export function invalidateEstateServiceCache() {
  clearSlot(estateServiceCache.overview);
  clearSlot(estateServiceCache.mappings);
  clearSlot(estateServiceCache.accessLogs);
  clearSlot(estateServiceCache.planRestrictions);
  clearSlot(estateServiceCache.statsSummary);
  estateServiceCache.settingsByEstateId.clear();
  estateServiceCache.sharedQrByEstateId.clear();
  estateServiceCache.alertPaymentsByEstateId.clear();
}

export function getEstateOverviewSnapshot() {
  return estateServiceCache.overview.value;
}

export function getEstateMappingsSnapshot() {
  return estateServiceCache.mappings.value;
}

export function getEstateAccessLogsSnapshot() {
  return estateServiceCache.accessLogs.value;
}

export function getEstatePlanRestrictionsSnapshot() {
  return estateServiceCache.planRestrictions.value;
}

export function getEstateStatsSummarySnapshot() {
  return estateServiceCache.statsSummary.value;
}

export function getEstateSettingsSnapshot(estateId) {
  if (!estateId) return null;
  return estateServiceCache.settingsByEstateId.get(String(estateId))?.value ?? null;
}

export async function getEstateOverview() {
  return resolveCached(estateServiceCache.overview, async () => {
    const response = await apiRequest("/estate/overview");
    return response?.data ?? {};
  });
}

export async function createEstate(payload) {
  const response = await apiRequest("/estate/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function addEstateHome(payload) {
  const response = await apiRequest("/estate/homes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function createEstateHomeowner(payload) {
  const response = await apiRequest("/estate/homeowners", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function addEstateDoor(payload) {
  const response = await apiRequest("/estate/doors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function provisionEstateDoor(payload) {
  const response = await apiRequest("/estate/doors/provision", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function assignDoorToHomeowner(doorId, homeownerId) {
  const response = await apiRequest(`/estate/doors/${doorId}/assign-homeowner`, {
    method: "POST",
    body: JSON.stringify({ homeownerId })
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function inviteHomeowner(homeownerId, payload = {}) {
  const response = await apiRequest(`/estate/homeowners/${homeownerId}/invite`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function getEstateMappings() {
  return resolveCached(estateServiceCache.mappings, async () => {
    const response = await apiRequest("/estate/mappings");
    return Array.isArray(response?.data) ? response.data : [];
  });
}

export async function getEstateAccessLogs() {
  return resolveCached(estateServiceCache.accessLogs, async () => {
    const response = await apiRequest("/estate/access-logs");
    return Array.isArray(response?.data) ? response.data : [];
  });
}

export async function getEstatePlanRestrictions() {
  return resolveCached(estateServiceCache.planRestrictions, async () => {
    const response = await apiRequest("/estate/plan-restrictions");
    return response?.data ?? null;
  });
}

export async function getEstateStatsSummary() {
  return resolveCached(estateServiceCache.statsSummary, async () => {
    const response = await apiRequest("/estate/stats-summary");
    return response?.data ?? null;
  });
}

export async function updateEstateDoorAdminProfile(doorId, payload) {
  const response = await apiRequest(`/estate/doors/${doorId}/admin-profile`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function createEstateSharedQr(estateId) {
  const response = await apiRequest("/estate/shared-qr", {
    method: "POST",
    body: JSON.stringify({ estateId })
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function listEstateSharedQrs(estateId) {
  const slot = getOrCreateMapSlot(estateServiceCache.sharedQrByEstateId, String(estateId));
  return resolveCached(slot, async () => {
    const response = await apiRequest(`/estate/shared-qr?estateId=${encodeURIComponent(estateId)}`);
    return Array.isArray(response?.data) ? response.data : [];
  });
}

export async function createEstateAlert(payload) {
  const response = await apiRequest("/estate/alerts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function listEstateAlerts(estateId, alertType = "") {
  const params = new URLSearchParams();
  if (alertType) params.set("alertType", alertType);
  const query = params.toString();
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/alerts${query ? `?${query}` : ""}`, {
    noCache: true
  });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function updateEstateAlert(alertId, payload) {
  try {
    const response = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    invalidateEstateServiceCache();
    return response?.data ?? null;
  } catch (error) {
    if (error?.status === 404) {
      return { stale: true, id: alertId };
    }
    throw error;
  }
}

export async function deleteEstateAlert(alertId) {
  try {
    const response = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}`, {
      method: "DELETE"
    });
    invalidateEstateServiceCache();
    return response?.data ?? null;
  } catch (error) {
    if (error?.status === 404) {
      try {
        const fallback = await apiRequest(`/alert/${encodeURIComponent(alertId)}`, {
          method: "DELETE"
        });
        return fallback?.data ?? null;
      } catch (fallbackError) {
        if (fallbackError?.status === 404) {
          return { deleted: true, alertId, stale: true };
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function getEstateSettings(estateId) {
  const slot = getOrCreateMapSlot(estateServiceCache.settingsByEstateId, String(estateId));
  return resolveCached(slot, async () => {
    const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/settings`);
    return response?.data ?? null;
  });
}

export async function updateEstateSettings(estateId, payload) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/settings`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function listEstateSecurityUsers(estateId) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/security-users`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createEstateSecurityUser(payload) {
  const response = await apiRequest("/estate/security-users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function updateEstateSecurityUser(estateId, securityUserId, payload) {
  const response = await apiRequest(
    `/estate/${encodeURIComponent(estateId)}/security-users/${encodeURIComponent(securityUserId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function suspendEstateSecurityUser(estateId, securityUserId) {
  const response = await apiRequest(
    `/estate/${encodeURIComponent(estateId)}/security-users/${encodeURIComponent(securityUserId)}/suspend`,
    {
      method: "POST"
    }
  );
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function unsuspendEstateSecurityUser(estateId, securityUserId) {
  const response = await apiRequest(
    `/estate/${encodeURIComponent(estateId)}/security-users/${encodeURIComponent(securityUserId)}/unsuspend`,
    {
      method: "POST"
    }
  );
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function deleteEstateSecurityUser(estateId, securityUserId) {
  const response = await apiRequest(
    `/estate/${encodeURIComponent(estateId)}/security-users/${encodeURIComponent(securityUserId)}`,
    {
      method: "DELETE"
    }
  );
  invalidateEstateServiceCache();
  return response?.data ?? null;
}

export async function listMyEstateAlerts() {
  const response = await apiRequest("/estate/alerts/me", { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function respondEstateMeeting(alertId, response) {
  try {
    const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/meeting-response`, {
      method: "POST",
      body: JSON.stringify({ response })
    });
    return res?.data ?? null;
  } catch (error) {
    if (error?.status === 404) return { stale: true, alertId };
    throw error;
  }
}

export async function voteEstatePoll(alertId, optionIndex) {
  try {
    const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/poll-vote`, {
      method: "POST",
      body: JSON.stringify({ optionIndex })
    });
    return res?.data ?? null;
  } catch (error) {
    if (error?.status === 404) return { stale: true, alertId };
    throw error;
  }
}

export async function sendEstateAlertReminder(alertId) {
  try {
    const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/remind`, {
      method: "POST"
    });
    invalidateEstateServiceCache();
    return res?.data ?? null;
  } catch (error) {
    if (error?.status === 404) return { stale: true, alertId };
    throw error;
  }
}

export async function verifyEstateAlertPayment(alertId, payload) {
  try {
    const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/payments/verify`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    invalidateEstateServiceCache();
    return res?.data ?? null;
  } catch (error) {
    if (error?.status === 404) return { stale: true, alertId };
    throw error;
  }
}

export async function payEstateAlert(alertId, payload = { paymentMethod: "paystack" }) {
  try {
    const response = await apiRequest(`/alert/${encodeURIComponent(alertId)}/pay`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    invalidateEstateServiceCache();
    return response?.data ?? null;
  } catch (error) {
    if (error?.status === 404) return { stale: true, alertId };
    throw error;
  }
}

export async function listEstateAlertPayments(estateId, { force = false } = {}) {
  const slot = getOrCreateMapSlot(estateServiceCache.alertPaymentsByEstateId, String(estateId));
  return resolveCached(slot, async () => {
    const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/alerts/payments`);
    return Array.isArray(response?.data) ? response.data : [];
  }, { force });
}

export async function listMaintenanceAudits(estateId) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/maintenance/audits`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}
