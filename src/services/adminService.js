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

export async function listAdminHomeowners(limit = 200, q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}&limit=${limit}` : `?limit=${limit}`;
  const response = await apiRequest(`/admin/homeowners${query}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listAdminStaff(limit = 200, q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}&limit=${limit}` : `?limit=${limit}`;
  const response = await apiRequest(`/admin/staff${query}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listAdminSecurity(limit = 200, q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}&limit=${limit}` : `?limit=${limit}`;
  const response = await apiRequest(`/admin/security${query}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listAdminVisitors(limit = 200, q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}&limit=${limit}` : `?limit=${limit}`;
  const response = await apiRequest(`/admin/visitors${query}`);
  return Array.isArray(response?.data) ? response.data : [];
}
