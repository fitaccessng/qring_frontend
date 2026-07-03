import { apiRequest } from "./apiClient";

export async function requestOfficeCall(payload) {
  const response = await apiRequest("/office/calls/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function acceptOfficeCall(callSessionId) {
  const response = await apiRequest(`/office/calls/${encodeURIComponent(callSessionId)}/accept`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function rejectOfficeCall(callSessionId) {
  const response = await apiRequest(`/office/calls/${encodeURIComponent(callSessionId)}/reject`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function endOfficeCall(callSessionId) {
  const response = await apiRequest(`/office/calls/${encodeURIComponent(callSessionId)}/end`, {
    method: "POST"
  });
  return response?.data ?? null;
}
