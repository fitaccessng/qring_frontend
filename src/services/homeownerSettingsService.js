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

