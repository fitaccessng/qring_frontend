import { apiRequest } from "./apiClient";

export async function getAdminOverview() {
  const response = await apiRequest("/admin/overview");
  return response?.data ?? null;
}

export async function listWallets() {
  const response = await apiRequest("/admin/wallets");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function fundWallet(payload) {
  const response = await apiRequest("/admin/wallets/fund", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function listWalletTransactions(limit = 200) {
  const response = await apiRequest(`/admin/wallets/transactions?limit=${limit}`);
  return Array.isArray(response?.data) ? response.data : [];
}
