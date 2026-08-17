import { apiRequest } from "./apiClient";

function summarizeSecurityThreads(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: row?.id || "",
    sessionId: row?.sessionId || row?.session_id || "",
    estateId: row?.estateId || row?.estate_id || "",
    gateId: row?.gateId || row?.gate_id || "",
    sessionStatus: row?.sessionStatus || row?.status || "",
    gateStatus: row?.gateStatus || "",
    unread: Number(row?.unread || 0),
    hasPreview: Boolean(String(row?.last || row?.lastMessage || "").trim()),
  }));
}

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
  const response = await apiRequest("/security/messages", { noCache: true });
  const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  console.log("SECURITY_MESSAGES_RAW_RESPONSE", {
    responseShape: Array.isArray(response) ? "array" : typeof response,
    dataIsArray: Array.isArray(response?.data),
    count: rows.length,
    threads: summarizeSecurityThreads(rows),
  });
  return rows;
}

export async function getSecuritySessionMessages(sessionId) {
  const response = await apiRequest(`/security/messages/${encodeURIComponent(sessionId)}`, { noCache: true });
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
