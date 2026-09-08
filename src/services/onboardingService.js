import { apiRequest } from "./apiClient";

export async function getOnboardingState() {
  const response = await apiRequest("/auth/onboarding", { noCache: true, retryCount: 1 });
  return response?.data ?? {};
}

export async function updateOnboardingState(patch) {
  const response = await apiRequest("/auth/onboarding", {
    method: "PUT",
    body: JSON.stringify(patch),
    retryCount: 1,
  });
  return response?.data ?? {};
}
