import { apiRequest } from "./apiClient";

export async function getAdminOverview() {
  const response = await apiRequest("/admin/overview");
  return response?.data ?? null;
}
