import { apiRequest, apiUpload } from "./apiClient";

export async function getHomeownerVisits() {
  const response = await apiRequest("/homeowner/visits");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getHomeownerAppointments() {
  const response = await apiRequest("/homeowner/appointments");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createHomeownerAppointment(payload) {
  const response = await apiRequest("/homeowner/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function shareHomeownerAppointment(appointmentId) {
  const response = await apiRequest(`/homeowner/appointments/${appointmentId}/share`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getHomeownerContext() {
  const response = await apiRequest("/homeowner/settings");
  const data = response?.data ?? null;
  return {
    managedByEstate: Boolean(data?.managedByEstate),
    estateId: data?.estateId ?? null,
    estateName: data?.estateName ?? null,
    estateOwnerId: data?.subscription?.subscriptionOwnerId ?? null
  };
}

export async function getHomeownerMessages() {
  const response = await apiRequest("/homeowner/messages");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getHomeownerSessionMessages(sessionId) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function sendHomeownerSessionMessage(sessionId, text) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
  return response?.data ?? null;
}

export async function deleteHomeownerSessionMessage(sessionId, messageId) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}/${messageId}`, {
    method: "DELETE"
  });
  return response?.data ?? null;
}

export async function endHomeownerSession(sessionId) {
  const response = await apiRequest(`/homeowner/visits/${sessionId}/end`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getHomeownerDoors() {
  const response = await apiRequest("/homeowner/doors");
  const data = response?.data;
  if (Array.isArray(data)) {
    return {
      doors: data,
      subscription: null
    };
  }
  return {
    doors: Array.isArray(data?.doors) ? data.doors : [],
    subscription: data?.subscription ?? null
  };
}

export async function generateDoorQr(doorId, payload = {}) {
  const response = await apiRequest(`/homeowner/doors/${doorId}/qr`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createHomeownerDoor(payload) {
  const response = await apiRequest("/homeowner/doors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createMaintenanceRequest(payload) {
  const response = await apiRequest("/homeowner/maintenance-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function uploadPaymentProof(alertId, file) {
  const formData = new FormData();
  formData.append("media", file);
  const response = await apiUpload(`/homeowner/alerts/${encodeURIComponent(alertId)}/payment-proof`, formData);
  return response?.data ?? null;
}

export async function decideVisit(sessionId, action) {
  const response = await apiRequest(`/homeowner/visits/${sessionId}/decision`, {
    method: "POST",
    body: JSON.stringify({ action })
  });
  return response?.data ?? null;
}

export async function getVisitorSessionStatus(sessionId) {
  const response = await apiRequest(`/visitor/sessions/${sessionId}`);
  return response?.data ?? null;
}

export async function getVisitorSessionMessages(sessionId) {
  const response = await apiRequest(`/visitor/sessions/${sessionId}/messages`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function resolveVisitorAppointment(shareToken) {
  const response = await apiRequest(`/visitor/appointments/resolve/${encodeURIComponent(shareToken)}`);
  return response?.data ?? null;
}

export async function acceptVisitorAppointment(appointmentId, payload) {
  const response = await apiRequest(`/visitor/appointments/${appointmentId}/accept`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function signalVisitorAppointmentArrival(appointmentId, payload) {
  const response = await apiRequest(`/visitor/appointments/${appointmentId}/arrival`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
