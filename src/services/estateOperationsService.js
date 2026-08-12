import { apiRequest, apiUpload } from "./apiClient";

function unwrapList(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listResidentVehicles(query = "") {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  return unwrapList(await apiRequest(`/estate-ops/vehicles${qs}`, { noCache: true }));
}

export async function createResidentVehicle(payload) {
  const response = await apiRequest("/estate-ops/vehicles", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function recordVehicleGateAction(vehicleId, action) {
  const response = await apiRequest(`/estate-ops/vehicles/${encodeURIComponent(vehicleId)}/gate`, {
    method: "POST",
    body: JSON.stringify({ action })
  });
  return response?.data ?? null;
}

export async function listBlockedVisitors(query = "") {
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";
  return unwrapList(await apiRequest(`/estate-ops/blocklist${qs}`, { noCache: true }));
}

export async function createBlockedVisitor(payload) {
  const response = await apiRequest("/estate-ops/blocklist", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function deactivateBlockedVisitor(entryId) {
  const response = await apiRequest(`/estate-ops/blocklist/${encodeURIComponent(entryId)}/deactivate`, {
    method: "POST",
    body: JSON.stringify({})
  });
  return response?.data ?? null;
}

export async function listEstatePackages(status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return unwrapList(await apiRequest(`/estate-ops/packages${qs}`, { noCache: true }));
}

export async function createEstatePackage(payload) {
  const response = await apiRequest("/estate-ops/packages", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function updateEstatePackageStatus(packageId, status) {
  const response = await apiRequest(`/estate-ops/packages/${encodeURIComponent(packageId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status })
  });
  return response?.data ?? null;
}

export async function listGuardAttendance() {
  return unwrapList(await apiRequest("/estate-ops/guard-attendance", { noCache: true }));
}

export async function clockGuardAttendance(action) {
  const response = await apiRequest("/estate-ops/guard-attendance", {
    method: "POST",
    body: JSON.stringify({ action })
  });
  return response?.data ?? null;
}

export async function listSecurityIncidents(status = "") {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return unwrapList(await apiRequest(`/estate-ops/incidents${qs}`, { noCache: true }));
}

export async function getSecurityIncident(incidentId) {
  const response = await apiRequest(`/estate-ops/incidents/${encodeURIComponent(incidentId)}`, { noCache: true });
  return response?.data ?? null;
}

export async function uploadSecurityIncidentPhoto(file) {
  const formData = new FormData();
  formData.append("media", file);
  const response = await apiUpload("/estate-ops/incidents/photo", formData);
  return response?.data ?? null;
}

export async function createSecurityIncident(payload) {
  const response = await apiRequest("/estate-ops/incidents", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
