import { apiRequest } from "./apiClient";

export async function getSafetyDashboard() {
  const response = await apiRequest("/safety/dashboard", { noCache: true });
  return response?.data ?? { context: null, metrics: {}, alerts: [], reports: [], watchlist: [] };
}

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
