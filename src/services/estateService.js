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
