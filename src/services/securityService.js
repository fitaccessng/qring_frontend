import { apiRequest } from "./apiClient";

export async function getSecurityDashboard() {
  const response = await apiRequest("/security/dashboard", { noCache: true });
  return response?.data ?? { profile: null, queues: {}, rules: null };
}

export async function getSecurityDoorOptions() {
  const response = await apiRequest("/security/door-options", { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function registerSecurityVisitor(payload) {
  const response = await apiRequest("/security/requests/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function actOnSecurityRequest(sessionId, action) {
  const response = await apiRequest(`/security/requests/${encodeURIComponent(sessionId)}/action`, {
    method: "POST",
    body: JSON.stringify({ action })
  });
  return response?.data ?? null;
}

export async function getSecurityMessages() {
  const response = await apiRequest("/security/messages");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getSecuritySessionMessages(sessionId) {
  const response = await apiRequest(`/security/messages/${encodeURIComponent(sessionId)}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function sendSecuritySessionMessage(sessionId, text) {
  const response = await apiRequest(`/security/messages/${encodeURIComponent(sessionId)}`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
  return response?.data ?? null;
}

export async function deleteSecuritySessionMessage(sessionId, messageId) {
  const response = await apiRequest(`/security/messages/${encodeURIComponent(sessionId)}/${encodeURIComponent(messageId)}`, {
    method: "DELETE"
  });
  return response?.data ?? null;
}

export async function validateSecurityAccessPass(codeValue) {
  const response = await apiRequest("/security/access-passes/validate", {
    method: "POST",
    body: JSON.stringify({ codeValue })
  });
  return response?.data ?? null;
}
