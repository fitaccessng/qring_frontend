import { apiRequest, apiRequestBinary } from "./apiClient";

export async function requestOfficeCall(payload) {
  const response = await apiRequest("/office/calls/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createOfficeEmployee(payload) {
  const response = await apiRequest("/office/employees", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createOfficeDepartment(payload) {
  const response = await apiRequest("/office/departments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function sendOfficeEmployeeDetails(employeeId) {
  const response = await apiRequest(`/office/employees/${encodeURIComponent(employeeId)}/send-details`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function generateOfficeQr() {
  const response = await apiRequest("/office/qr/generate", {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getOfficeOverview() {
  const response = await apiRequest("/office/overview");
  return response?.data ?? null;
}

export async function getOfficeAttendance(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.action) query.set("action", params.action);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  const url = query.toString() ? `/office/attendance?${query.toString()}` : "/office/attendance";
  const response = await apiRequest(url);
  return response?.data ?? null;
}

export async function downloadOfficeAttendanceCsv(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.action) query.set("action", params.action);
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  const url = query.toString() ? `/office/attendance/export?${query.toString()}` : "/office/attendance/export";
  const response = await apiRequestBinary(url, { method: "GET" });
  const contentType = String(response.headers?.get?.("content-type") ?? response.headers?.["content-type"] ?? "").toLowerCase();
  const blob = typeof response.blob === "function"
    ? await response.blob()
    : new Blob([response.raw || response.payload?.raw || ""], { type: contentType || "text/csv" });
  const downloadName = (() => {
    const disposition = response.headers?.get?.("content-disposition") || response.headers?.["content-disposition"] || "";
    const match = /filename="([^"]+)"/i.exec(disposition);
    return match?.[1] || "attendance-export.csv";
  })();
  if (typeof window !== "undefined") {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
  return true;
}

export async function requestOfficeVisitorCall(payload) {
  const response = await apiRequest("/visitor/office/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function getOfficeVisitorCallStatus(callSessionId) {
  const response = await apiRequest(`/visitor/office/calls/${encodeURIComponent(callSessionId)}`);
  return response?.data ?? null;
}

export async function getOfficeConversationMessages(sessionId) {
  const response = await apiRequest(`/office/conversations/${encodeURIComponent(sessionId)}/messages`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function sendOfficeConversationMessage(sessionId, text) {
  const response = await apiRequest(`/office/conversations/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ text })
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
