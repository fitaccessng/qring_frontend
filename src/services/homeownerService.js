import { apiRequest } from "./apiClient";

export async function getHomeownerVisits() {
  const response = await apiRequest("/homeowner/visits");
  return Array.isArray(response?.data) ? response.data : [];
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
