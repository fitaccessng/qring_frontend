import { apiRequest, apiUpload } from "./apiClient";

function getStoredHomeownerIdentity() {
  if (typeof localStorage === "undefined") return {};
  try {
    const user = JSON.parse(localStorage.getItem("qring_user") || "null");
    return {
      id: user?.id != null ? String(user.id) : "",
      email: typeof user?.email === "string" ? user.email.trim().toLowerCase() : "",
      fullName: typeof user?.fullName === "string" ? user.fullName.trim().toLowerCase() : "",
      username: typeof user?.username === "string" ? user.username.trim().toLowerCase() : ""
    };
  } catch {
    return {};
  }
}

function getDoorOwnershipCandidates(door) {
  return {
    homeownerIds: [
      door?.homeownerId,
      door?.ownerId,
      door?.userId,
      door?.assignedHomeownerId,
      door?.homeowner?.id,
      door?.owner?.id,
      door?.user?.id
    ]
      .filter((value) => value != null && value !== "")
      .map((value) => String(value)),
    homeownerEmails: [
      door?.homeownerEmail,
      door?.ownerEmail,
      door?.userEmail,
      door?.homeowner?.email,
      door?.owner?.email,
      door?.user?.email
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim().toLowerCase()),
    homeownerNames: [
      door?.homeownerName,
      door?.ownerName,
      door?.userName,
      door?.homeowner?.fullName,
      door?.owner?.fullName,
      door?.user?.fullName,
      door?.homeowner?.name,
      door?.owner?.name,
      door?.user?.name
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim().toLowerCase())
  };
}

function filterAssignedHomeownerDoors(doors, options = {}) {
  const rows = Array.isArray(doors) ? doors : [];
  if (!rows.length) return [];
  const failClosed = Boolean(options?.failClosed);

  const {
    id: currentUserId = "",
    email: currentUserEmail = "",
    fullName: currentUserFullName = "",
    username: currentUsername = ""
  } = getStoredHomeownerIdentity();
  const hasAnyOwnershipMetadata = rows.some((door) => {
    const candidates = getDoorOwnershipCandidates(door);
    return (
      candidates.homeownerIds.length > 0 ||
      candidates.homeownerEmails.length > 0 ||
      candidates.homeownerNames.length > 0
    );
  });

  if (!hasAnyOwnershipMetadata) return failClosed ? [] : rows;

  return rows.filter((door) => {
    const candidates = getDoorOwnershipCandidates(door);
    if (currentUserId && candidates.homeownerIds.includes(currentUserId)) return true;
    if (currentUserEmail && candidates.homeownerEmails.includes(currentUserEmail)) return true;
    if (currentUserFullName && candidates.homeownerNames.includes(currentUserFullName)) return true;
    if (currentUsername && candidates.homeownerNames.includes(currentUsername)) return true;
    return false;
  });
}

export async function getHomeownerVisits() {
  const response = await apiRequest("/homeowner/visits");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getHomeownerAppointments() {
  const response = await apiRequest("/homeowner/appointments");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createHomeownerAppointment(payload) {
  const response = await apiRequest("/homeowner/appointments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function shareHomeownerAppointment(appointmentId) {
  const response = await apiRequest(`/homeowner/appointments/${appointmentId}/share`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getHomeownerContext() {
  const response = await apiRequest("/homeowner/settings");
  const data = response?.data ?? null;
  return {
    managedByEstate: Boolean(data?.managedByEstate),
    estateId: data?.estateId ?? null,
    estateName: data?.estateName ?? null,
    estateOwnerId: data?.subscription?.subscriptionOwnerId ?? null
  };
}

export async function getHomeownerMessages() {
  const response = await apiRequest("/homeowner/messages");
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getHomeownerSessionMessages(sessionId) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function sendHomeownerSessionMessage(sessionId, text) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
  return response?.data ?? null;
}

export async function deleteHomeownerSessionMessage(sessionId, messageId) {
  const response = await apiRequest(`/homeowner/messages/${sessionId}/${messageId}`, {
    method: "DELETE"
  });
  return response?.data ?? null;
}

export async function endHomeownerSession(sessionId) {
  const response = await apiRequest(`/homeowner/visits/${sessionId}/end`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function getHomeownerDoors() {
  const response = await apiRequest("/homeowner/doors");
  const data = response?.data;
  const managedByEstate = Boolean(data?.subscription?.managedByEstate);
  if (Array.isArray(data)) {
    return {
      doors: filterAssignedHomeownerDoors(data, { failClosed: managedByEstate }),
      subscription: null
    };
  }
  return {
    doors: filterAssignedHomeownerDoors(Array.isArray(data?.doors) ? data.doors : [], {
      failClosed: managedByEstate
    }),
    subscription: data?.subscription ?? null
  };
}

export async function generateDoorQr(doorId, payload = {}) {
  const response = await apiRequest(`/homeowner/doors/${doorId}/qr`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function getHomeownerAccessPasses() {
  const response = await apiRequest("/homeowner/access-passes", { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function createHomeownerAccessPass(payload) {
  const response = await apiRequest("/homeowner/access-passes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function deactivateHomeownerAccessPass(accessPassId) {
  const response = await apiRequest(`/homeowner/access-passes/${encodeURIComponent(accessPassId)}/deactivate`, {
    method: "POST"
  });
  return response?.data ?? null;
}

export async function createHomeownerDoor(payload) {
  const response = await apiRequest("/homeowner/doors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function createMaintenanceRequest(payload) {
  const response = await apiRequest("/homeowner/maintenance-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function uploadPaymentProof(alertId, file) {
  const formData = new FormData();
  formData.append("media", file);
  const response = await apiUpload(`/homeowner/alerts/${encodeURIComponent(alertId)}/payment-proof`, formData);
  return response?.data ?? null;
}

export async function decideVisit(sessionId, action, options = {}) {
  const response = await apiRequest(`/homeowner/visits/${sessionId}/decision`, {
    method: "POST",
    body: JSON.stringify({
      action,
      communicationChannel: options.communicationChannel || undefined,
      communicationTarget: options.communicationTarget || undefined
    })
  });
  return response?.data ?? null;
}

export async function getVisitorSessionStatus(sessionId) {
  const response = await apiRequest(`/visitor/sessions/${sessionId}`);
  return response?.data ?? null;
}

export async function getVisitorSessionMessages(sessionId) {
  const response = await apiRequest(`/visitor/sessions/${sessionId}/messages`);
  return Array.isArray(response?.data) ? response.data : [];
}

export async function resolveVisitorAppointment(shareToken) {
  const response = await apiRequest(`/visitor/appointments/resolve/${encodeURIComponent(shareToken)}`);
  return response?.data ?? null;
}

export async function acceptVisitorAppointment(appointmentId, payload) {
  const response = await apiRequest(`/visitor/appointments/${appointmentId}/accept`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function signalVisitorAppointmentArrival(appointmentId, payload) {
  const response = await apiRequest(`/visitor/appointments/${appointmentId}/arrival`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
