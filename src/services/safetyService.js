import { apiRequest } from "./apiClient";

export async function getSafetyDashboard() {
  const response = await apiRequest("/safety/dashboard", { noCache: true });
  return response?.data ?? { context: null, metrics: {}, alerts: [], reports: [], watchlist: [] };
}

export async function getActivePanicAlerts() {
  const response = await apiRequest("/panic/active", { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function triggerPanicAlert(payload) {
  const response = await apiRequest("/panic/trigger", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function acknowledgePanicAlert(panicId) {
  const response = await apiRequest("/panic/acknowledge", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function resolvePanicAlert(panicId) {
  const response = await apiRequest("/panic/resolve", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

<<<<<<< HEAD
export async function joinPanicAudio(panicId) {
  const response = await apiRequest("/panic/audio/join", {
=======
export async function respondToPanicAlert(panicId) {
  const response = await apiRequest("/panic/respond", {
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

<<<<<<< HEAD
export async function endPanicAudio(panicId) {
  const response = await apiRequest("/panic/audio/end", {
=======
export async function ignorePanicAlert(panicId) {
  const response = await apiRequest("/panic/ignore", {
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

<<<<<<< HEAD
=======
export async function reportFalsePanicAlert(panicId) {
  const response = await apiRequest("/panic/report-false", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function updatePanicAlertNotes(panicId, notes) {
  const response = await apiRequest("/panic/notes", {
    method: "POST",
    body: JSON.stringify({ panicId, notes })
  });
  return response?.data ?? null;
}

>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
export async function getSafetyAlerts(limit = 40) {
  const response = await apiRequest(`/safety/alerts?limit=${encodeURIComponent(limit)}`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function triggerSafetyAlert(payload) {
  const response = await apiRequest("/safety/alerts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function cancelSafetyAlert(alertId, reason) {
  const response = await apiRequest(`/safety/alerts/${encodeURIComponent(alertId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  return response?.data ?? null;
}

export async function actOnSafetyAlert(alertId, action, notes) {
  const response = await apiRequest(`/safety/alerts/${encodeURIComponent(alertId)}/action`, {
    method: "POST",
    body: JSON.stringify({ action, notes })
  });
  return response?.data ?? null;
}

export async function getWatchlist(limit = 30) {
  const response = await apiRequest(`/safety/watchlist?limit=${encodeURIComponent(limit)}`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function submitVisitorReport(payload) {
  const response = await apiRequest("/safety/visitor-reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
