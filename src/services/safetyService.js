import { ApiError, apiRequest, apiRequestBinary, apiUpload } from "./apiClient";

const ACTIVE_PANIC_CACHE_TTL_MS = 12000;
const ACTIVE_PANIC_RATE_LIMIT_TTL_MS = 45000;

let activePanicCache = { rows: [], at: 0 };
let activePanicInFlight = null;
let activePanicRateLimitedUntil = 0;

export async function getSafetyDashboard() {
  const response = await apiRequest("/safety/dashboard", { noCache: true });
  return response?.data ?? { context: null, metrics: {}, alerts: [], reports: [], watchlist: [] };
}

export async function getActivePanicAlerts(options = {}) {
  const force = Boolean(options?.force);
  const now = Date.now();

  if (!force && activePanicCache.at && now - activePanicCache.at < ACTIVE_PANIC_CACHE_TTL_MS) {
    return activePanicCache.rows;
  }

  if (!force && now < activePanicRateLimitedUntil) {
    return activePanicCache.rows;
  }

  if (activePanicInFlight) {
    return activePanicInFlight;
  }

  activePanicInFlight = apiRequest("/panic/active", {
    noCache: force,
    retryCount: 0,
    silent: true
  })
    .then((response) => {
      const rows = Array.isArray(response?.data) ? response.data : [];
      activePanicCache = { rows, at: Date.now() };
      activePanicRateLimitedUntil = 0;
      return rows;
    })
    .catch((error) => {
      if (error instanceof ApiError && error.status === 429) {
        activePanicRateLimitedUntil = Date.now() + ACTIVE_PANIC_RATE_LIMIT_TTL_MS;
        return activePanicCache.rows;
      }
      throw error;
    })
    .finally(() => {
      activePanicInFlight = null;
    });

  return activePanicInFlight;
}

export async function triggerPanicAlert(payload) {
  const response = await apiRequest("/panic/trigger", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function acknowledgePanicAlert(panicId) {
  const response = await apiRequest("/panic/acknowledge", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function resolvePanicAlert(panicId) {
  const response = await apiRequest("/panic/resolve", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function uploadPanicAudioSegment({ panicId, segmentIndex, file, filenameHint }) {
  const formData = new FormData();
  formData.append("panicId", panicId);
  formData.append("segmentIndex", String(segmentIndex || 0));
  if (filenameHint) {
    formData.append("filenameHint", filenameHint);
  }
  formData.append("media", file);
  const response = await apiUpload("/panic/audio/segment", formData);
  return response?.data ?? null;
}

export async function listPanicAudioSegments(panicId) {
  const response = await apiRequest(`/panic/${panicId}/audio/segments`, { method: "GET" });
  return response?.data ?? [];
}

export async function getPanicAudioSegmentFile(segmentId) {
  return `${import.meta.env.VITE_API_BASE_URL || ""}/panic/audio/segment/${segmentId}/file`;
}

export async function joinPanicAudio(panicId) {
  const response = await apiRequest("/panic/audio/join", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function respondToPanicAlert(panicId) {
  const response = await apiRequest("/panic/respond", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function endPanicAudio(panicId) {
  const response = await apiRequest("/panic/audio/end", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function ignorePanicAlert(panicId) {
  const response = await apiRequest("/panic/ignore", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function reportFalsePanicAlert(panicId) {
  const response = await apiRequest("/panic/report-false", {
    method: "POST",
    body: JSON.stringify({ panicId })
  });
  return response?.data ?? null;
}

export async function updatePanicAlertNotes(panicId, notes) {
  const response = await apiRequest("/panic/notes", {
    method: "POST",
    body: JSON.stringify({ panicId, notes })
  });
  return response?.data ?? null;
}

export async function getSafetyAlerts(limit = 40) {
  const response = await apiRequest(`/safety/alerts?limit=${encodeURIComponent(limit)}`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function downloadPanicAudioSegment(segmentId) {
  const response = await apiRequestBinary(`/panic/audio/segment/${segmentId}/file`, {
    method: "GET"
  });
  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new ApiError(raw || "Unable to download panic audio.", response.status, null);
  }
  return await response.blob();
}

export async function triggerSafetyAlert(payload) {
  const response = await apiRequest("/safety/alerts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}

export async function cancelSafetyAlert(alertId, reason) {
  const response = await apiRequest(`/safety/alerts/${encodeURIComponent(alertId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  return response?.data ?? null;
}

export async function actOnSafetyAlert(alertId, action, notes) {
  const response = await apiRequest(`/safety/alerts/${encodeURIComponent(alertId)}/action`, {
    method: "POST",
    body: JSON.stringify({ action, notes })
  });
  return response?.data ?? null;
}

export async function getWatchlist(limit = 30) {
  const response = await apiRequest(`/safety/watchlist?limit=${encodeURIComponent(limit)}`, { noCache: true });
  return Array.isArray(response?.data) ? response.data : [];
}

export async function submitVisitorReport(payload) {
  const response = await apiRequest("/safety/visitor-reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return response?.data ?? null;
}
