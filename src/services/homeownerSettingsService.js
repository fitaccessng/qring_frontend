import { apiRequest } from "./apiClient";

export async function getHomeownerSettings() {
  const response = await apiRequest("/homeowner/settings");
  return response?.data ?? null;
}

export async function updateHomeownerSettings(payload) {
  const response = await apiRequest("/homeowner/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function updateHomeownerProfile(payload) {
  const response = await apiRequest("/homeowner/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function searchHomeownerEmergencyContactByEmail(email) {
  const response = await apiRequest(`/homeowner/contact-users/search?email=${encodeURIComponent(String(email || "").trim().toLowerCase())}`, {
    silent: true,
    noCache: true
  });
  return response?.data ?? null;
}
