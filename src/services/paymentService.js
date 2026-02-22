import { apiRequest } from "./apiClient";

export async function getMySubscription() {
  const response = await apiRequest("/payment/subscription/me");
  return response?.data ?? null;
}

export async function getBillingPlans() {
  const response = await apiRequest("/payment/plans");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function listPaymentPurposes() {
  const response = await apiRequest("/payment/purposes");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getReferralSummary() {
  const response = await apiRequest("/payment/referral/me");
  return response?.data ?? null;
}

export async function requestSubscription(plan) {
  const response = await apiRequest("/payment/subscription/request", {
    method: "POST",
    body: JSON.stringify({ plan })
  });
  return response?.data ?? null;
}

export async function initializePaystackPayment(plan, callbackUrl) {
  const response = await apiRequest("/payment/paystack/initialize", {
    method: "POST",
    body: JSON.stringify({ plan, callbackUrl })
  });
  return response?.data ?? null;
}

export async function verifyPaystackPayment(reference) {
  const response = await apiRequest(`/payment/paystack/verify/${encodeURIComponent(reference)}`);
  return response?.data ?? null;
}
