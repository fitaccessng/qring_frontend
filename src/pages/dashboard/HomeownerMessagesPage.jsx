import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal, MessageSquare,
  Video, Phone, ShieldCheck, ShieldAlert, CheckCircle2, XCircle,
  MoreVertical, Clock, User, PhoneCall, ArrowLeft, Loader2
} from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { env } from "../../config/env";
import { getAccessToken } from "../../services/authStorage";
import { apiRequest } from "../../services/apiClient";
import { RealtimeEvent } from "../../services/realtimeEvents";
import { grantSessionCallAccess } from "../../services/sessionCallAccess";
import { createRealtimeSocket, releaseRealtimeSocket } from "../../services/socketClient";
import { playMessageNotificationSound } from "../../utils/notificationSound";
import { parseNotificationPayload } from "../../utils/notificationMeta";
import {
  decideVisit,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  requestHomeownerCall,
  sendHomeownerSessionMessage
} from "../../services/homeownerService";
import {
  getConversationMessageText,
  getConversationPreviewText
} from "../../utils/messageDisplay";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";

// --- Helper Functions to support internal component execution ---
function normalizeInboxThread(thread) {
  return {
    id: String(thread?.id || thread?.sessionId || "").trim(),
    name: String(thread?.visitorName || thread?.name || "Visitor").trim(),
    last: String(thread?.lastMessage?.text || thread?.last || "").trim(),
    time: String(thread?.updatedAt || thread?.time || new Date().toISOString()),
    unread: Number(thread?.unreadCount || thread?.unread || 0),
    sessionStatus: String(thread?.status || thread?.sessionStatus || "pending").trim(),
    snapshotUrl: String(thread?.snapshotUrl || "").trim(),
    photoUrl: String(thread?.photoUrl || "").trim(),
    purpose: String(thread?.purpose || "").trim(),
    visitorPhone: String(thread?.visitorPhone || "").trim(),
    ...thread
  };
}
function sortThreadsForInbox(list) {
  return [...list].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
function mergeThreadCollections(prev, next) {
  const map = new Map(prev.map(t => [t.id, t]));
  next.forEach(t => map.set(t.id, { ...map.get(t.id), ...t }));
  return Array.from(map.values());
}
function getThreadSnapshotSrc(t) { return t?.snapshotUrl || t?.photoUrl || ""; }
function eventLooksLikeSnapshot(p) { return Boolean(p?.snapshotUrl || p?.photoUrl || p?.snapshotAuditId); }
function extractSnapshotUrl(p) { return p?.snapshotUrl || p?.photoUrl || p?.data?.snapshotUrl || p?.data?.photoUrl || ""; }
function mergeMessageCollections(prev, next) {
  const map = new Map(prev.map(m => [m.id, m]));
  next.forEach(m => map.set(m.id, { ...map.get(m.id), ...m }));
  return Array.from(map.values()).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
function upsertThreadPreview(msg, setThreads, selectedId, extra = {}) {
  setThreads(prev => prev.map(t => t.id === msg.sessionId ? {
    ...t,
    last: msg.text || "Sent an attachment",
    time: msg.at,
    unread: t.id === selectedId ? 0 : t.unread + 1,
    ...extra
  } : t));
}
function getSnapshotUrlFromAuditId(id) { return id ? `/api/snapshots/${id}/view` : ""; }
function buildSnapshotMessage(p, sId) {
  if (!p?.snapshotUrl && !p?.snapshotAuditId) return null;
  return {
    id: p?.id || `snap-${Date.now()}`,
    sessionId: sId,
    text: p?.purpose ? `Visitor purpose: ${p.purpose}` : "Visitor Snapshot Captured",
    messageType: "visitor_snapshot",
    snapshotUrl: p.snapshotUrl || getSnapshotUrlFromAuditId(p.snapshotAuditId),
    senderType: "visitor",
    at: p?.at || new Date().toISOString()
  };
}
function ensureSnapshotConversationRows(rows, sId, thread) {
  const arr = rows.map(r => ({
    id: r.id || r.messageId || `${Date.now()}-${Math.random()}`,
    sessionId: sId,
    text: r.text || r.body || "",
    messageType: r.messageType || "text",
    snapshotUrl: r.snapshotUrl || r.photoUrl || "",
    senderType: r.senderRole || r.senderType || "visitor",
    at: r.at || new Date().toISOString(),
    ...r
  }));
  if (thread?.snapshotUrl && !arr.some(r => r.messageType === "visitor_snapshot")) {
    arr.unshift({
      id: `initial-snap-${sId}`,
      sessionId: sId,
      text: thread.purpose ? `Purpose: ${thread.purpose}` : "Initial visitor image captured",
      messageType: "visitor_snapshot",
      snapshotUrl: thread.snapshotUrl,
      senderType: "visitor",
      at: thread.time
    });
  }
  return arr;
}
function getConversationSnapshotUrl(arr) { return arr.find(r => r.snapshotUrl)?.snapshotUrl || ""; }
function getConversationSnapshotAuditId(arr) { return arr.find(r => r.snapshotAuditId)?.snapshotAuditId || ""; }
function safeParsePayload(str) { try { return JSON.parse(str); } catch { return {}; } }
function roleLabel(r) { return r === "homeowner" ? "Homeowner" : r === "visitor" ? "Visitor" : r; }

export default function HomeownerMessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    items: notifications,
    unreadCount: globalUnreadCount,
    activeIncomingCall: managedIncomingCall,
    dismissIncomingCall,
    lastRealtimeEvent
  } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const preferredSessionId = (searchParams.get("sessionId") || "").trim();

  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messagesByThread, setMessagesByThread] = useState({});
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [decisionAction, setDecisionAction] = useState("");
  const [callBusy, setCallBusy] = useState("");
  const [incomingCallBusy, setIncomingCallBusy] = useState(false);
  const [snapshotUrls, setSnapshotUrls] = useState({});
  const [typingByThread, setTypingByThread] = useState({});
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [incomingCall, setIncomingCall] = useState({
    pending: false,
    hasVideo: false,
    callSessionId: "",
    visitorId: "",
    sessionId: ""
  });

  const messagesRef = useRef(null);
  const selectedIdRef = useRef("");
  const threadsRef = useRef([]);
  const socketRef = useRef(null);
  const joinedSessionIdsRef = useRef(new Set());
  const callBusyRef = useRef("");
  const incomingCallRef = useRef(null);
  const seenCallInviteIdsRef = useRef(new Set());
  const seenRequestNotificationIdsRef = useRef(new Set());
  const token = getAccessToken();
  const notificationBackTarget = String(location.state?.backTo || "").trim();
  const openedFromNotification = Boolean(location.state?.fromNotification) || notificationBackTarget === "/dashboard/notifications";

  async function refreshThreads(options = {}) {
    const { focusSessionId = "" } = options;
    const data = await getHomeownerMessages();
    const normalized = (data || []).map((thread) => normalizeInboxThread(thread));
    const sorted = sortThreadsForInbox(normalized);
    setThreads((prev) => mergeThreadCollections(prev, sorted));
    const nextSelectedId = String(focusSessionId || selectedIdRef.current || "").trim();
    if (nextSelectedId) {
      setSelectedId(nextSelectedId);
    }
    return sorted;
  }

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);
  useEffect(() => { callBusyRef.current = callBusy; }, [callBusy]);
  useEffect(() => {
    if (!incomingCall.pending) {
      setIncomingCallBusy(false);
    }
  }, [incomingCall.pending]);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);
  useEffect(() => {
    setSnapshotUrls(() => {
      const next = {};
      threads.forEach((thread) => {
        const snapshotSrc = getThreadSnapshotSrc(thread);
        if (snapshotSrc) next[thread.id] = snapshotSrc;
      });
      return next;
    });
  }, [threads]);

  useEffect(() => {
    const currentNotifications = Array.isArray(notifications) ? notifications : [];
    const nextSessionIds = new Set();
    let hasVisitorRequest = false;
    let hasSnapshotUpdate = false;
    let sawNewRelevantNotification = false;

    currentNotifications.forEach((item) => {
      const kind = String(item?.kind || item?.type || "").trim().toLowerCase();
      const payload = parseNotificationPayload(item?.payload);
      const sessionId = String(payload?.sessionId || item?.sessionId || "").trim();
      const notificationId = String(item?.notificationId || item?.id || "").trim();
      if (
        notificationId &&
        (kind === "visitor.request" || kind === "visitor.snapshot") &&
        !seenRequestNotificationIdsRef.current.has(notificationId)
      ) {
        seenRequestNotificationIdsRef.current.add(notificationId);
        sawNewRelevantNotification = true;
      }
      if (kind === "visitor.request" && sessionId) {
        hasVisitorRequest = true;
        nextSessionIds.add(sessionId);
      }
      if ((kind === "visitor.snapshot" || eventLooksLikeSnapshot(payload)) && sessionId) {
        hasSnapshotUpdate = true;
        nextSessionIds.add(sessionId);
      }
    });

    if (!sawNewRelevantNotification || (!hasVisitorRequest && !hasSnapshotUpdate)) return;
    const focusSessionId = nextSessionIds.values().next().value || "";
    void refreshThreads({ focusSessionId }).catch(() => {});
  }, [notifications]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messagesByThread, selectedId, mobileView]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await refreshThreads({ focusSessionId: preferredSessionId });
        if (!active) return;
        const targetId = preferredSessionId || data[0]?.id || "";
        if (targetId) {
          setSelectedId(targetId);
          if (preferredSessionId) {
            setMobileView("chat");
          }
        }
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load messages");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [preferredSessionId]);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        await refreshThreads();
      } catch {
        // Poll background data silently
      }
    }, 10000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = createRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
      authBuilder: () => {
        const latestToken = getAccessToken();
        return latestToken ? { token: latestToken } : {};
      }
    });
    socketRef.current = socket;
    joinedSessionIdsRef.current = new Set();

    const joinKnownSessions = () => {
      const ids = new Set(threadsRef.current.map((thread) => String(thread?.id || "").trim()).filter(Boolean));
      if (selectedIdRef.current) ids.add(String(selectedIdRef.current).trim());
      joinedSessionIdsRef.current = new Set();
      ids.forEach((sessionId) => {
        if (!sessionId) return;
        socket.emit(RealtimeEvent.SESSION_JOIN, {
          sessionId,
          displayName: user?.fullName || "Homeowner"
        });
        joinedSessionIdsRef.current.add(sessionId);
      });
    };

    const handleChatMessage = (payload) => {
      const incomingSessionId = payload?.sessionId;
      if (!incomingSessionId) return;
      const snapshotUrl = extractSnapshotUrl(payload);
      const normalized = {
        id: payload?.messageId || payload?.id || `${payload?.at || Date.now()}-${Math.random()}`,
        messageId: payload?.messageId || payload?.id || "",
        sessionId: incomingSessionId,
        text: payload?.text || payload?.body || payload?.message || "",
        messageType: payload?.messageType || "text",
        snapshotUrl,
        senderRole: payload?.senderRole || payload?.senderType || "visitor",
        senderType: payload?.senderRole || payload?.senderType || "visitor",
        displayName: payload?.displayName || "Participant",
        visitorName: payload?.visitorName || "",
        visitorPhone: payload?.visitorPhone || "",
        purpose: payload?.purpose || "",
        at: payload?.at || new Date().toISOString()
      };
      setMessagesByThread((prev) => {
        const current = prev[incomingSessionId] ?? [];
        return { ...prev, [incomingSessionId]: mergeMessageCollections(current, [normalized]) };
      });
      if (normalized.senderType !== "homeowner") playMessageNotificationSound();
      upsertThreadPreview(normalized, setThreads, selectedIdRef.current);
      if (!threadsRef.current.some((thread) => thread.id === incomingSessionId)) {
        void refreshThreads({ focusSessionId: incomingSessionId }).catch(() => {});
      }
    };

    const handleSessionStatus = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      const nextStatus = String(payload?.status || "").trim();
      if (!incomingSessionId || !nextStatus) return;
      const snapshotUrl = extractSnapshotUrl(payload);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === incomingSessionId
            ? {
                ...thread,
                sessionStatus: nextStatus,
                photoUrl: snapshotUrl || thread.photoUrl,
                snapshotUrl: snapshotUrl || thread.snapshotUrl,
                snapshotAuditId: payload?.snapshotAuditId || thread.snapshotAuditId,
                last: payload?.sessionActivated ? "Access approved. Visitor can now enter the session." : thread.last,
                time: new Date().toISOString()
              }
            : thread
        )
      );
    };

    const handleSessionSnapshot = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (!incomingSessionId) return;
      const snapshotAuditId = String(
        payload?.snapshotAuditId || payload?.snapshot_audit_id || payload?.id || ""
      ).trim();
      const snapshotUrl = extractSnapshotUrl(payload) || getSnapshotUrlFromAuditId(snapshotAuditId);
      const snapshotMessage = buildSnapshotMessage({ ...payload, snapshotUrl, snapshotAuditId }, incomingSessionId);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === incomingSessionId
            ? {
                ...thread,
                photoUrl: snapshotUrl || thread.photoUrl,
                snapshotUrl: snapshotUrl || thread.snapshotUrl,
                snapshotAuditId: payload?.snapshotAuditId || thread.snapshotAuditId,
                purpose: payload?.purpose || thread.purpose,
                visitorPhone: payload?.visitorPhone || thread.visitorPhone,
                name: payload?.visitorName || thread.name
              }
            : thread
        )
      );
      if (snapshotMessage) {
        setMessagesByThread((prev) => {
          const current = prev[incomingSessionId] ?? [];
          return { ...prev, [incomingSessionId]: mergeMessageCollections(current, [snapshotMessage]) };
        });
      }
    };

    const handleSessionActivated = (payload) => {
      const incomingSessionId = String(payload?.sessionId || payload?.data?.id || "").trim();
      if (!incomingSessionId) return;
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === incomingSessionId
            ? {
                ...thread,
                sessionStatus: payload?.status || "approved",
                last: "Access approved. Session is now active.",
                time: new Date().toISOString()
              }
            : thread
        )
      );
    };

    const handleChatTyping = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (!incomingSessionId) return;
      setTypingByThread((prev) => ({
        ...prev,
        [incomingSessionId]: {
          isTyping: Boolean(payload?.isTyping),
          displayName: payload?.displayName || "Visitor"
        }
      }));
    };

    const handleIncomingCallNotice = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (!incomingSessionId) return;
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === incomingSessionId
            ? { ...thread, last: payload?.message || thread.last, time: payload?.at || new Date().toISOString() }
            : thread
        )
      );
    };

    const handleCallInvite = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      const callSessionId = String(payload?.callSessionId || "").trim();
      if (!incomingSessionId || !callSessionId) return;
      if (callBusyRef.current.startsWith(`${incomingSessionId}:`)) return;
      if (seenCallInviteIdsRef.current.has(callSessionId)) return;
      seenCallInviteIdsRef.current.add(callSessionId);
      
      setIncomingCall({
        pending: true,
        hasVideo: Boolean(payload?.hasVideo),
        callSessionId,
        visitorId: String(payload?.visitorId || incomingSessionId),
        sessionId: incomingSessionId,
        callerName: String(payload?.callerName || roleLabel(payload?.callerRole) || payload?.visitorName || "Caller"),
        callerOrigin: String(payload?.callerOrigin || "").trim(),
        callerRole: String(payload?.callerRole || "").trim()
      });
      setIncomingCallBusy(false);
    };

    const handleCallTerminal = (payload) => {
      const nextPayload = payload?.data ?? payload ?? {};
      const nextCallId = String(nextPayload?.callSessionId || nextPayload?.eventId || "").trim();
      const nextSessionId = String(nextPayload?.sessionId || "").trim();
      const activeIncoming = incomingCallRef.current;
      const currentCallId = String(activeIncoming?.callSessionId || "").trim();
      const currentSessionId = String(activeIncoming?.sessionId || "").trim();
      if (
        Boolean(activeIncoming?.pending) &&
        ((currentCallId && nextCallId && currentCallId === nextCallId) ||
         (currentSessionId && nextSessionId && currentSessionId === nextSessionId))
      ) {
        setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
        setIncomingCallBusy(false);
      }
    };

    socket.on("connect", joinKnownSessions);
    socket.on("chat.message", handleChatMessage);
    socket.on("session.status", handleSessionStatus);
    socket.on("session.snapshot", handleSessionSnapshot);
    socket.on("session.activated", handleSessionActivated);
    socket.on("chat.typing", handleChatTyping);
    socket.on("incoming-call", handleIncomingCallNotice);
    socket.on("call.invite", handleCallInvite);
    socket.on("call.accepted", handleCallTerminal);
    socket.on("call.rejected", handleCallTerminal);
    socket.on("call.ended", handleCallTerminal);

    return () => {
      socket.off("connect", joinKnownSessions);
      socket.off("chat.message", handleChatMessage);
      socket.off("session.status", handleSessionStatus);
      socket.off("session.snapshot", handleSessionSnapshot);
      socket.off("session.activated", handleSessionActivated);
      socket.off("chat.typing", handleChatTyping);
      socket.off("incoming-call", handleIncomingCallNotice);
      socket.off("call.invite", handleCallInvite);
      socket.off("call.accepted", handleCallTerminal);
      socket.off("call.rejected", handleCallTerminal);
      socket.off("call.ended", handleCallTerminal);
      socketRef.current = null;
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling");
    };
  }, [token, user?.fullName]);

  useEffect(() => {
    const eventName = String(lastRealtimeEvent?.eventName || "").trim();
    if (!eventName) return;

    if (eventName === "visitor.snapshot") {
      const data = lastRealtimeEvent?.payload || {};
      const visitorSessionId = String(data?.visitorSessionId || data?.sessionId || "").trim();
      const snapshotAuditId = String(data?.snapshotAuditId || data?.id || "").trim();
      const nextUrl = extractSnapshotUrl(data) || getSnapshotUrlFromAuditId(snapshotAuditId);
      if (visitorSessionId && (nextUrl || snapshotAuditId)) {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === visitorSessionId
              ? { ...thread, photoUrl: nextUrl || thread.photoUrl, snapshotUrl: nextUrl || thread.snapshotUrl, snapshotAuditId: snapshotAuditId || thread.snapshotAuditId }
              : thread
          )
        );
        const snapshotMessage = buildSnapshotMessage({ ...data, sessionId: visitorSessionId, photoUrl: nextUrl, snapshotUrl: nextUrl, snapshotAuditId }, visitorSessionId);
        if (snapshotMessage) {
          setMessagesByThread((prev) => {
            const current = prev[visitorSessionId] ?? [];
            return { ...prev, [visitorSessionId]: mergeMessageCollections(current, [snapshotMessage]) };
          });
        }
      }
      void refreshThreads({ focusSessionId: visitorSessionId }).catch(() => {});
      return;
    }

    if (eventName === "visitor.request") {
      const payload = lastRealtimeEvent?.payload || {};
      const visitorSessionId = String(payload?.visitorSessionId || payload?.sessionId || "").trim();
      void refreshThreads({ focusSessionId: visitorSessionId }).catch(() => {});
      return;
    }

    if (eventName === "notifications.updated" || eventName === "incoming-call") {
      const payload = lastRealtimeEvent?.payload || {};
      const parsedPayload = typeof payload?.payload === "string" ? safeParsePayload(payload.payload) : payload?.data || payload || {};
      const focusSessionId = String(parsedPayload?.sessionId || payload?.sessionId || "").trim();
      void refreshThreads({ focusSessionId }).catch(() => {});
    }
  }, [lastRealtimeEvent]);

  useEffect(() => {
    if (!managedIncomingCall?.sessionId || !managedIncomingCall?.callSessionId) return;
    setIncomingCall({
      pending: true,
      hasVideo: Boolean(managedIncomingCall?.hasVideo),
      callSessionId: String(managedIncomingCall?.callSessionId || ""),
      visitorId: String(managedIncomingCall?.visitorId || managedIncomingCall?.sessionId || ""),
      sessionId: String(managedIncomingCall?.sessionId || ""),
      callerName: String(managedIncomingCall?.callerName || roleLabel(managedIncomingCall?.callerRole) || "Caller"),
      callerOrigin: String(managedIncomingCall?.callerOrigin || "").trim(),
      callerRole: String(managedIncomingCall?.callerRole || "").trim()
    });
  }, [managedIncomingCall]);

  const selectedThreadSnapshot = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);
  const selectedThreadSnapshotKey = useMemo(
    () => [selectedThreadSnapshot?.snapshotUrl || "", selectedThreadSnapshot?.photoUrl || "", selectedThreadSnapshot?.snapshotAuditId || ""].join("|"),
    [selectedThreadSnapshot?.snapshotUrl, selectedThreadSnapshot?.photoUrl, selectedThreadSnapshot?.snapshotAuditId]
  );

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    async function loadConv() {
      setConversationLoading(true);
      try {
        const rows = await getHomeownerSessionMessages(selectedId);
        if (!active) return;
        const threadSnapshot = threadsRef.current.find((thread) => thread.id === selectedId);
        const mergedRows = ensureSnapshotConversationRows(rows, selectedId, threadSnapshot);
        const conversationSnapshotUrl = getConversationSnapshotUrl(mergedRows);
        if (conversationSnapshotUrl) {
          setThreads((prev) =>
            prev.map((thread) =>
              thread.id === selectedId
                ? {
                    ...thread,
                    photoUrl: conversationSnapshotUrl,
                    snapshotUrl: conversationSnapshotUrl,
                    snapshotAuditId: thread.snapshotAuditId || getConversationSnapshotAuditId(mergedRows)
                  }
                : thread
            )
          );
        }
        setMessagesByThread(prev => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], mergedRows) }));
        setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, unread: 0 } : t));
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setConversationLoading(false);
      }
    }
    loadConv();
    return () => { active = false; };
  }, [selectedId, selectedThreadSnapshotKey]);

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = sortThreadsForInbox(threads);
    if (!term) return sorted;
    return sorted.filter((t) => [t.name, t.last].join(" ").toLowerCase().includes(term));
  }, [threads, query]);

  const heroThread = useMemo(() => {
    if (selectedId) return threads.find((t) => t.id === selectedId) || null;
    return filteredThreads[0] || null;
  }, [threads, selectedId, filteredThreads]);

  const selectedMessages = useMemo(() => messagesByThread[selectedId] || [], [messagesByThread, selectedId]);
  
  const heroSnapshotUrl = useMemo(() => {
    if (!heroThread) return "";
    return String(snapshotUrls[heroThread.id] || heroThread.snapshotUrl || heroThread.photoUrl || getConversationSnapshotUrl(selectedMessages) || "").trim();
  }, [heroThread, snapshotUrls, selectedMessages]);
  
  const heroThreadState = String(heroThread?.sessionStatus || "").trim().toLowerCase();
  
  const accessAlreadyGranted = useMemo(() => {
    if (["approved", "accepted", "gate_confirmed", "completed", "closed"].includes(heroThreadState)) return true;
    return selectedMessages.some((msg) => String(msg?.text || "").trim().toLowerCase() === "access granted.");
  }, [heroThreadState, selectedMessages]);

  const decisionBusy = Boolean(decisionAction);

  const handleSelectThread = (id) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  const handleMobileBack = () => {
    if (mobileView === "chat") {
      if (openedFromNotification && notificationBackTarget) {
        navigate(notificationBackTarget, { replace: true });
        return;
      }
      setMobileView("list");
      return;
    }
    navigate("/dashboard");
  };

  async function handleSend(e) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, text);
      if (saved) {
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], [saved]) }));
        upsertThreadPreview(saved, setThreads, selectedId);
      }
      setDraft("");
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function handleQuickReply(text) {
    if (sending) return;
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, text);
      if (saved) {
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], [saved]) }));
        upsertThreadPreview(saved, setThreads, selectedId);
      }
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function handleGrantAccess() {
    if (!selectedId || decisionBusy || accessAlreadyGranted) return;
    setDecisionAction("approve");
    try {
      await decideVisit(selectedId, "approve");
      const saved = await sendHomeownerSessionMessage(selectedId, "Access granted.");
      if (saved) {
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], [saved]) }));
        upsertThreadPreview(saved, setThreads, selectedId, { sessionStatus: "approved" });
      }
    } catch (err) { setError(err?.message || "Error processing request"); }
    finally { setDecisionAction(""); }
  }

  async function handleRejectAccess() {
    if (!selectedId || decisionBusy) return;
    setDecisionAction("reject");
    try {
      await decideVisit(selectedId, "reject");
      const saved = await sendHomeownerSessionMessage(selectedId, "Access declined.");
      if (saved) {
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], [saved]) }));
        upsertThreadPreview(saved, setThreads, selectedId, { sessionStatus: "rejected" });
      }
    } catch (err) { setError(err?.message || "Error processing request"); }
    finally { setDecisionAction(""); }
  }

  async function handleStartCall(type) {
    if (!selectedId || callBusy) return;
    const mode = type === "video" ? "video" : "audio";
    const selectedThread = threadsRef.current.find((thread) => String(thread?.id || "").trim() === selectedId) || null;
    const visitorRequestId = String(selectedThread?.visitorRequestId || selectedThread?.requestId || "").trim();
    const communicationTarget = String(selectedThread?.preferredCommunicationTarget || selectedThread?.communicationTarget || "").trim();
    setCallBusy(`${selectedId}:${mode}`);
    try {
      const response = await requestHomeownerCall({
        visitorSessionId: selectedId,
        visitorRequestId,
        communicationTarget: communicationTarget || undefined,
        type: mode,
        hasVideo: mode === "video"
      });
      const data = response?.data ?? response ?? {};
      window.sessionStorage.setItem("qring_call_start_intent", JSON.stringify({
        pending: true, sessionId: selectedId, mode, callSessionId: data?.callSessionId, visitorId: data?.visitorId || selectedId
      }));
      navigate(`/session/${selectedId}/${mode}`);
    } catch (err) { setError(err?.message || "Failed to route call"); }
    finally { setCallBusy(""); }
  }

  function handleAcceptIncomingCall() {
    if (!incomingCall.sessionId || !incomingCall.callSessionId || incomingCallBusy) return;
    const mode = incomingCall.hasVideo ? "video" : "audio";
    setIncomingCallBusy(true);
    const acceptIntent = {
      sessionId: incomingCall.sessionId,
      hasVideo: incomingCall.hasVideo,
      callSessionId: incomingCall.callSessionId,
      visitorId: incomingCall.visitorId
    };
    window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify(acceptIntent));
    grantSessionCallAccess(incomingCall.sessionId, incomingCall.callSessionId)
      .then(() => {
        setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
        navigate(`/session/${incomingCall.sessionId}/${mode}`);
      })
      .catch((err) => {
        setError(err?.message || "Failed to accept incoming call");
        setIncomingCallBusy(false);
      });
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 font-sans text-slate-100 overflow-hidden">
      
      {/* LEFT SIDEBAR: Threads List */}
      <aside className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/40 backdrop-blur-md transition-all duration-300 ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleMobileBack} className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Gate Activity
            </h1>
          </div>
          {globalUnreadCount > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              {globalUnreadCount} new
            </span>
          )}
        </div>

        {/* Search Control */}
        <div className="p-3 border-b border-slate-800/60">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search visitors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Threads List Wrapper */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-sm">Loading activity logs...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 p-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-600" />
              <p className="text-sm">No visitor interactions found.</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = thread.id === selectedId;
              const hasSnapshot = Boolean(thread.snapshotUrl || thread.photoUrl);
              const isTyping = typingByThread[thread.id]?.isTyping;

              return (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full text-left p-4 flex gap-3 items-start hover:bg-slate-800/40 transition relative ${isSelected ? "bg-slate-800/60 border-l-4 border-emerald-500" : ""}`}
                >
                  <div className="relative flex-shrink-0 w-12 h-12 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                    {hasSnapshot ? (
                      <SecureSnapshotImage
                        snapshotUrl={thread.snapshotUrl || thread.photoUrl}
                        auditId={thread.snapshotAuditId}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    {thread.unread > 0 && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 border-2 border-slate-900 rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold text-slate-200 truncate">{thread.name}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(thread.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {thread.purpose && (
                      <span className="inline-block text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded mb-1 border border-slate-700/50">
                        {thread.purpose}
                      </span>
                    )}
                    <p className={`text-xs truncate ${isTyping ? "text-emerald-400 font-medium" : isSelected ? "text-slate-300" : "text-slate-400"}`}>
                      {isTyping ? "Typing..." : thread.last || "No messages yet"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT CHAT WINDOW CONTAINER */}
      <main className={`flex-1 flex flex-col bg-slate-950 relative ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
        {heroThread ? (
          <>
            {/* Chat Top Header Workspace */}
            <header className="p-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={handleMobileBack} className="p-2 hover:bg-slate-800 rounded-xl transition md:hidden text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="relative w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex-shrink-0">
                  {heroSnapshotUrl ? (
                    <SecureSnapshotImage
                      snapshotUrl={heroSnapshotUrl}
                      auditId={heroThread.snapshotAuditId}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-100 truncate">{heroThread.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center w-2 h-2 rounded-full ${
                      heroThreadState === "approved" ? "bg-emerald-500" : heroThreadState === "rejected" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                    }`} />
                    <p className="text-xs text-slate-400 capitalize truncate">
                      {heroThreadState === "approved" ? "Access Approved" : heroThreadState === "rejected" ? "Access Declined" : "Awaiting Decision"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Call Controls & Action Row */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={Boolean(callBusy)}
                  onClick={() => handleStartCall("audio")}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-xl text-slate-300 transition"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  disabled={Boolean(callBusy)}
                  onClick={() => handleStartCall("video")}
                  className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 rounded-xl transition"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* ERROR TOAST BAR */}
            {error && (
              <div className="bg-rose-900/40 border-b border-rose-800/50 text-rose-200 px-4 py-2.5 text-xs flex justify-between items-center backdrop-blur-sm animate-fade-in">
                <span>{error}</span>
                <button onClick={() => setError("")} className="text-rose-400 hover:text-white underline font-medium">Dismiss</button>
              </div>
            )}

            {/* MAIN MESSAGES DISPLAY PORTAL */}
            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-slate-950 to-slate-900/50"
            >
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-xs font-medium">Syncing timeline records...</span>
                </div>
              ) : selectedMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Timeline initialized. Send a message to get started.
                </div>
              ) : (
                selectedMessages.map((msg) => {
                  const isMe = msg.senderType === "homeowner";
                  const isSnapshotType = msg.messageType === "visitor_snapshot";

                  if (isSnapshotType) {
                    return (
                      <div key={msg.id} className="flex flex-col items-center justify-center my-6 max-w-sm mx-auto animate-fade-in">
                        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 shadow-xl w-full">
                          <p className="text-xs text-slate-400 font-medium mb-2.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-emerald-400" /> Snapshot Event Triggered
                          </p>
                          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                            <SecureSnapshotImage
                              snapshotUrl={msg.snapshotUrl}
                              auditId={msg.snapshotAuditId || heroThread.snapshotAuditId}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              alt="Visitor verification capture"
                            />
                          </div>
                          {msg.text && (
                            <p className="text-xs text-slate-300 mt-2.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800/40 italic">
                              {msg.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all ${
                        isMe
                          ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-none"
                          : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                      }`}>
                        <p className="leading-relaxed break-words">{msg.text}</p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <span className={`text-[10px] ${isMe ? "text-emerald-200" : "text-slate-500"}`}>
                            {new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Dynamic Interactivity Realtime Status Alert Indicator */}
              {typingByThread[selectedId]?.isTyping && (
                <div className="flex items-center gap-2 text-slate-500 text-xs px-2 animate-pulse">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{typingByThread[selectedId]?.displayName || "Visitor"} is preparing standard reply...</span>
                </div>
              )}
            </div>

            {/* CRITICAL GATE KEEPER CALL TO ACTIONS DECISION ROW */}
            {!accessAlreadyGranted && heroThreadState !== "rejected" && (
              <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl z-10">
                <div className="text-center sm:text-left">
                  <h4 className="text-xs font-bold text-slate-300 tracking-wide uppercase">Gate Access Protocol Required</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Please confirm identity metrics before approving property clearance.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    disabled={decisionBusy}
                    onClick={handleRejectAccess}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/20 disabled:opacity-40 transition text-xs font-semibold"
                  >
                    {decisionAction === "reject" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    Decline
                  </button>
                  <button
                    disabled={decisionBusy}
                    onClick={handleGrantAccess}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 transition text-xs shadow-lg shadow-emerald-500/10"
                  >
                    {decisionAction === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />}
                    Grant Access
                  </button>
                </div>
              </div>
            )}

            {/* Quick Smart Suggestion Replies Row */}
            <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-900 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {["Give me a moment.", "Please wait there.", "I will be right down.", "Leave it at the door."].map((reply) => (
                <button
                  key={reply}
                  disabled={sending}
                  onClick={() => handleQuickReply(reply)}
                  className="whitespace-nowrap bg-slate-900 hover:bg-slate-800 border border-slate-800/80 text-slate-300 px-3 py-1.5 rounded-xl text-xs transition disabled:opacity-40"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* LOWER FORM CONTROL SUBMISSION INPUT DECK */}
            <footer className="p-4 bg-slate-950 border-t border-slate-900">
              <form onSubmit={handleSend} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Type a response message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 disabled:opacity-30 rounded-xl transition shadow-lg shadow-emerald-500/5 flex items-center justify-center"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin text-slate-950" /> : <SendHorizontal className="w-5 h-5 text-slate-950" />}
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-xl">
              <MessageSquare className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-300">No Active Channel Selected</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Select a session track from the left terminal monitor matrix pane to handle communications.
            </p>
          </div>
        )}
      </main>

      {/* VISITOR TELEPHONY STANDBY MODAL CALL ROUTER */}
      {incomingCall.pending && (
        <VisitorIncomingCallModal
          isOpen={incomingCall.pending}
          hasVideo={incomingCall.hasVideo}
          callerName={incomingCall.callerName}
          callerOrigin={incomingCall.callerOrigin}
          callerRole={incomingCall.callerRole}
          onAccept={handleAcceptIncomingCall}
          onReject={() => {
            setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
            dismissIncomingCall();
          }}
          busy={incomingCallBusy}
        />
      )}
    </div>
  );
}