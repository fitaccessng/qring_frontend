import { apiRequest } from "./apiClient";

export async function getEstateOverview() {
  const response = await apiRequest("/estate/overview");
  return response?.data ?? {};
}

export async function createEstate(payload) {
  const response = await apiRequest("/estate/", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function addEstateHome(payload) {
  const response = await apiRequest("/estate/homes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createEstateHomeowner(payload) {
  const response = await apiRequest("/estate/homeowners", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function addEstateDoor(payload) {
  const response = await apiRequest("/estate/doors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function provisionEstateDoor(payload) {
  const response = await apiRequest("/estate/doors/provision", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function assignDoorToHomeowner(doorId, homeownerId) {
  const response = await apiRequest(`/estate/doors/${doorId}/assign-homeowner`, {
    method: "POST",
    body: JSON.stringify({ homeownerId })
  });
  return response?.data ?? null;
}

export async function inviteHomeowner(homeownerId) {
  const response = await apiRequest(`/estate/homeowners/${homeownerId}/invite`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getEstateMappings() {
  const response = await apiRequest("/estate/mappings");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getEstateAccessLogs() {
  const response = await apiRequest("/estate/access-logs");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getEstatePlanRestrictions() {
  const response = await apiRequest("/estate/plan-restrictions");
  return response?.data ?? null;
}

export async function updateEstateDoorAdminProfile(doorId, payload) {
  const response = await apiRequest(`/estate/doors/${doorId}/admin-profile`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createEstateSharedQr(estateId) {
  const response = await apiRequest("/estate/shared-qr", {
    method: "POST",
    body: JSON.stringify({ estateId })
  });
  return response?.data ?? null;
}

export async function listEstateSharedQrs(estateId) {
  const response = await apiRequest(`/estate/shared-qr?estateId=${encodeURIComponent(estateId)}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createEstateAlert(payload) {
  const response = await apiRequest("/estate/alerts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/settings`);
  return response?.data ?? null;
}

export async function updateEstateSettings(estateId, payload) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/settings`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function listMyEstateAlerts() {
  const response = await apiRequest("/estate/alerts/me", { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function respondEstateMeeting(alertId, response) {
  const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/meeting-response`, {
    method: "POST",
    body: JSON.stringify({ response })
  });
  return res?.data ?? null;
}

export async function voteEstatePoll(alertId, optionIndex) {
  const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/poll-vote`, {
    method: "POST",
    body: JSON.stringify({ optionIndex })
  });
  return res?.data ?? null;
}

export async function sendEstateAlertReminder(alertId) {
  const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/remind`, {
    method: "POST"
  });
  return res?.data ?? null;
}

export async function verifyEstateAlertPayment(alertId, payload) {
  const res = await apiRequest(`/estate/alerts/${encodeURIComponent(alertId)}/payments/verify`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res?.data ?? null;
}

export async function payEstateAlert(alertId, payload = { paymentMethod: "paystack" }) {
  const response = await apiRequest(`/alert/${encodeURIComponent(alertId)}/pay`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function listEstateAlertPayments(estateId) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/alerts/payments`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listMaintenanceAudits(estateId) {
  const response = await apiRequest(`/estate/${encodeURIComponent(estateId)}/maintenance/audits`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}
