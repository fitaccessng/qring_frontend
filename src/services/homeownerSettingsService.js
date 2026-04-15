import { apiRequest } from "./apiClient";

export async function getResidentSettings() {
  const response = await apiRequest("/resident/settings");
  return response?.data ?? null;
}

export async function updateResidentSettings(payload) {
  const response = await apiRequest("/resident/settings", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function updateResidentProfile(payload) {
  const response = await apiRequest("/resident/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
