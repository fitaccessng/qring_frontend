import { apiRequest } from "./apiClient";
import { env } from "../config/env";

export async function getLiveVisitorQueue(limit = 50) {
  const response = await apiRequest(`/advanced/visitor/queue?limit=${encodeURIComponent(limit)}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function fetchVisitorSnapshotFileUrl(snapshotId) {
  if (!snapshotId) return "";
  const token = localStorage.getItem("qring_access_token");
  const response = await fetch(
    `${env.apiBaseUrl}/advanced/visitor/snapshots/${encodeURIComponent(snapshotId)}/file`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  );
  if (!response.ok) {
    throw new Error(`Unable to load snapshot (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function listDigitalReceipts(limit = 50) {
  const response = await apiRequest(`/advanced/receipts?limit=${encodeURIComponent(limit)}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function downloadDigitalReceiptPdf(receiptId) {
  const token = localStorage.getItem("qring_access_token");
  const response = await fetch(`${env.apiBaseUrl}/advanced/receipts/${encodeURIComponent(receiptId)}/pdf`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    throw new Error(`Unable to download receipt PDF (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `qring-receipt-${receiptId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function listCommunityPosts(scope = "estate", limit = 50) {
  const params = new URLSearchParams({ scope, limit: String(limit) });
  const response = await apiRequest(`/advanced/community/posts?${params.toString()}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createCommunityPost(payload) {
  const response = await apiRequest("/advanced/community/posts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function markCommunityPostRead(postId) {
  const response = await apiRequest(`/advanced/community/posts/${encodeURIComponent(postId)}/read`, {
    method: "POST"
  });
  return response?.data ?? null;
}
