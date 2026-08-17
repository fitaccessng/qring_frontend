import { normalizeNotification, parseNotificationPayload } from "../utils/notificationMeta";

const MAX_SEEN_ENTRIES = 500;

function normalizeKey(value) {
  return String(value || "").trim();
}

function readAny(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

export function normalizeIncomingCallPayload(raw) {
  const payload = raw?.data ?? raw ?? {};
  const callSessionId = normalizeKey(readAny(payload, ["callSessionId", "call_id", "callId", "call_session_id", "eventId", "event_id"]));
  const sessionId = normalizeKey(readAny(payload, ["sessionId", "session_id", "visitorSessionId", "visitor_session_id"]));
  const callerUserId = normalizeKey(readAny(payload, ["callerUserId", "caller_user_id", "userId", "user_id"]));
  const callType = normalizeKey(readAny(payload, ["callType", "call_type", "type"])).toLowerCase() || (payload?.hasVideo ? "video" : "audio");
  const hasVideo = payload?.hasVideo !== undefined ? Boolean(payload.hasVideo) : callType === "video";

  return {
    ...payload,
    notificationId: readAny(payload, ["notificationId", "notification_id", "id"]) || callSessionId || sessionId,
    eventId: readAny(payload, ["eventId", "event_id"]) || callSessionId,
    sessionId,
    callSessionId,
    callId: normalizeKey(readAny(payload, ["callId", "call_id"])) || callSessionId,
    callerUserId,
    callerName: readAny(payload, ["callerName", "caller_name"]) || "Caller",
    callerRole: readAny(payload, ["callerRole", "caller_role", "role"]),
    callerOrigin: readAny(payload, ["callerOrigin", "caller_origin"]),
    visitorId: readAny(payload, ["visitorId", "visitor_id"]) || sessionId,
    roomName: readAny(payload, ["roomName", "room_name"]),
    callType,
    type: callType,
    hasVideo,
    payload: parseNotificationPayload(payload.payload),
  };
}

function createState() {
  return {
    seenNotificationIds: new Set(),
    seenEventIds: new Set(),
    dismissedKeys: new Set(),
    notificationPhaseById: new Map(),
    activeIncomingCall: null,
    syncing: false
  };
}

function trimSet(setRef) {
  if (setRef.size <= MAX_SEEN_ENTRIES) return;
  const values = Array.from(setRef);
  setRef.clear();
  values.slice(-MAX_SEEN_ENTRIES).forEach((value) => setRef.add(value));
}

export function createNotificationManager() {
  const state = createState();

  function reset() {
    const next = createState();
    Object.assign(state, next);
  }

  function beginSync() {
    state.syncing = true;
  }

  function endSync() {
    state.syncing = false;
  }

  function markDismissed(notification) {
    const notificationId = normalizeKey(notification?.notificationId || notification?.id);
    const eventId = normalizeKey(notification?.eventId);
    const sessionId = normalizeKey(notification?.sessionId || notification?.payload?.sessionId);
    const callSessionId = normalizeKey(notification?.callSessionId || notification?.payload?.callSessionId);
    if (notificationId) {
      state.dismissedKeys.add(`notification:${notificationId}`);
      state.notificationPhaseById.set(notificationId, "DISMISSED");
    }
    if (eventId) state.dismissedKeys.add(`event:${eventId}`);
    if (sessionId) state.dismissedKeys.add(`session:${sessionId}`);
    if (callSessionId) state.dismissedKeys.add(`call:${callSessionId}`);
    trimSet(state.dismissedKeys);
  }

  function hasBeenDismissed(notification) {
    const notificationId = normalizeKey(notification?.notificationId || notification?.id);
    const eventId = normalizeKey(notification?.eventId);
    const sessionId = normalizeKey(notification?.sessionId || notification?.payload?.sessionId);
    const callSessionId = normalizeKey(notification?.callSessionId || notification?.payload?.callSessionId);
    return [
      notificationId ? `notification:${notificationId}` : "",
      eventId ? `event:${eventId}` : "",
      sessionId ? `session:${sessionId}` : "",
      callSessionId ? `call:${callSessionId}` : "",
    ].some((key) => key && state.dismissedKeys.has(key));
  }

  function registerEnvelope(envelope) {
    const notificationId = normalizeKey(envelope?.notificationId || envelope?.id);
    const eventId = normalizeKey(envelope?.eventId);
    if (notificationId) {
      if (state.seenNotificationIds.has(notificationId)) return false;
      state.seenNotificationIds.add(notificationId);
      state.notificationPhaseById.set(notificationId, "NEW");
      trimSet(state.seenNotificationIds);
    }
    if (eventId) {
      if (state.seenEventIds.has(eventId)) return false;
      state.seenEventIds.add(eventId);
      trimSet(state.seenEventIds);
    }
    return true;
  }

  function ingestNotificationList(rows, role) {
    const normalized = (Array.isArray(rows) ? rows : [])
      .map((item) => normalizeNotification(item, item?.route))
      .filter((item) => !hasBeenDismissed(item))
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

    normalized.forEach((item) => {
      const notificationId = normalizeKey(item.notificationId || item.id);
      if (!notificationId) return;
      if (!state.notificationPhaseById.has(notificationId)) {
        state.notificationPhaseById.set(notificationId, item.unread ? "NEW" : "DISPLAYED");
      }
      if (!item.unread) {
        state.notificationPhaseById.set(notificationId, "DISMISSED");
      }
    });

    return normalized.map((item) => ({
      ...item,
      phase: state.notificationPhaseById.get(normalizeKey(item.notificationId || item.id)) || "NEW",
      role,
    }));
  }

  function getUndisplayedNotifications(items) {
    return (items || []).filter((item) => {
      const notificationId = normalizeKey(item.notificationId || item.id);
      const phase = state.notificationPhaseById.get(notificationId) || "NEW";
      if (!item.unread || phase !== "NEW") return false;
      state.notificationPhaseById.set(notificationId, "DISPLAYED");
      return true;
    });
  }

  function ingestIncomingCall(raw) {
    if (state.syncing) return null;
    const envelope = normalizeIncomingCallPayload(raw);
    if (!envelope.callSessionId || !envelope.sessionId) return null;
    if (hasBeenDismissed(envelope)) return null;
    if (!registerEnvelope(envelope)) return null;

    if (state.activeIncomingCall) {
      const currentCallId = normalizeKey(state.activeIncomingCall.callSessionId || state.activeIncomingCall.eventId);
      const nextCallId = normalizeKey(envelope.callSessionId || envelope.eventId);
      if (currentCallId && currentCallId !== nextCallId) {
        return null;
      }
    }

    state.activeIncomingCall = envelope;
    return envelope;
  }

  function dismissIncomingCall(notification) {
    if (notification) {
      markDismissed(notification);
    }
    state.activeIncomingCall = null;
  }

  function invalidateSession(sessionId) {
    const normalized = normalizeKey(sessionId);
    if (!normalized) return;
    state.dismissedKeys.add(`session:${normalized}`);
    if (normalizeKey(state.activeIncomingCall?.sessionId) === normalized) {
      state.activeIncomingCall = null;
    }
  }

  return {
    state,
    reset,
    beginSync,
    endSync,
    ingestNotificationList,
    getUndisplayedNotifications,
    ingestIncomingCall,
    dismissIncomingCall,
    invalidateSession,
    markDismissed,
  };
}
