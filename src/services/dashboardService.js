import { apiRequest } from "./apiClient";

const metricTemplate = {
  activeVisitors: 0,
  pendingApprovals: 0,
  callsToday: 0,
  unreadMessages: 0
};

const emptyState = {
  metrics: metricTemplate,
  activity: [],
  waitingRoom: [],
  session: null,
  messages: [],
  profile: null,
  traffic: [],
  callControls: {
    canAudio: false,
    canVideo: false,
    canMute: false,
    canEnd: false
  }
};

export function normalizeDashboard(payload) {
  if (!payload || typeof payload !== "object") return emptyState;
  const normalizedActivity = Array.isArray(payload.activity)
    ? [...payload.activity]
        .sort((a, b) => Date.parse(b?.time || "") - Date.parse(a?.time || ""))
        .slice(0, 4)
    : [];

  return {
    metrics: { ...metricTemplate, ...(payload.metrics ?? {}) },
    activity: normalizedActivity,
    waitingRoom: Array.isArray(payload.waitingRoom) ? payload.waitingRoom : [],
    session: payload.session ?? null,
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    profile: payload.profile ?? null,
    traffic: Array.isArray(payload.traffic) ? payload.traffic : [],
    callControls: {
      ...emptyState.callControls,
      ...(payload.callControls ?? {})
    }
  };
}

export async function getDashboardOverview() {
  const response = await apiRequest("/dashboard/overview");
  return normalizeDashboard(response?.data ?? response);
}
