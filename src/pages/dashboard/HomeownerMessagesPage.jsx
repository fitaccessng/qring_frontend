import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal, MessageSquare,
  Phone, Video, Check, X, Clock, User, DoorOpen, Image,
  MoreVertical, ArrowLeft, Shield, Sparkles
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
  const [mobileView, setMobileView] = useState("list");
  const [incomingCall, setIncomingCall] = useState({
    pending: false,
    hasVideo: false,
    callSessionId: "",
    visitorId: "",
    sessionId: ""
  });
  const [isTyping, setIsTyping] = useState(false);

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
        const preferredExists = preferredSessionId && data.some((item) => item.id === preferredSessionId);
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
        // Keep polling background data silently
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
        payload?.snapshotAuditId ||
        payload?.snapshot_audit_id ||
        payload?.id ||
        payload?.data?.snapshotAuditId ||
        payload?.data?.snapshot_audit_id ||
        payload?.data?.snapshot?.id ||
        payload?.data?.payload?.snapshotAuditId ||
        payload?.data?.payload?.snapshot_audit_id ||
        payload?.data?.payload?.snapshot?.id ||
        ""
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
          return {
            ...prev,
            [incomingSessionId]: mergeMessageCollections(current, [snapshotMessage])
          };
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
            ? {
                ...thread,
                last: payload?.message || thread.last,
                time: payload?.at || new Date().toISOString()
              }
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
        callerName: String(payload?.callerName || roleLabel(payload?.callerRole) || payload?.homeownerName || payload?.visitorName || "Caller"),
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
      const currentCallId = String(activeIncoming?.callSessionId || activeIncoming?.eventId || "").trim();
      const currentSessionId = String(activeIncoming?.sessionId || "").trim();
      const matchesIncoming =
        Boolean(activeIncoming?.pending) &&
        (
          (currentCallId && nextCallId && currentCallId === nextCallId) ||
          (currentSessionId && nextSessionId && currentSessionId === nextSessionId)
        );
      if (!matchesIncoming) return;
      setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
      setIncomingCallBusy(false);
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
      const snapshotAuditId = String(
        data?.snapshotAuditId ||
        data?.snapshot_audit_id ||
        data?.id ||
        data?.data?.snapshotAuditId ||
        data?.data?.snapshot_audit_id ||
        data?.data?.snapshot?.id ||
        data?.data?.payload?.snapshotAuditId ||
        data?.data?.payload?.snapshot_audit_id ||
        data?.data?.payload?.snapshot?.id ||
        ""
      ).trim();
      const nextUrl = extractSnapshotUrl(data) || getSnapshotUrlFromAuditId(snapshotAuditId);
      if (visitorSessionId && (nextUrl || snapshotAuditId)) {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === visitorSessionId
              ? { ...thread, photoUrl: nextUrl || thread.photoUrl, snapshotUrl: nextUrl || thread.snapshotUrl, snapshotAuditId: snapshotAuditId || thread.snapshotAuditId }
              : thread
          )
        );
        const snapshotMessage = buildSnapshotMessage(
          {
            ...data,
            sessionId: visitorSessionId,
            photoUrl: nextUrl,
            snapshotUrl: nextUrl,
            snapshotAuditId
          },
          visitorSessionId
        );
        if (snapshotMessage) {
          setMessagesByThread((prev) => {
            const current = prev[visitorSessionId] ?? [];
            return {
              ...prev,
              [visitorSessionId]: mergeMessageCollections(current, [snapshotMessage])
            };
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
      const parsedPayload =
        typeof payload?.payload === "string" ? safeParsePayload(payload.payload) : payload?.data || payload || {};
      const focusSessionId = String(parsedPayload?.sessionId || payload?.sessionId || payload?.visitorSessionId || "").trim();
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
        callerName: String(managedIncomingCall?.callerName || roleLabel(managedIncomingCall?.callerRole) || managedIncomingCall?.homeownerName || managedIncomingCall?.visitorName || "Caller"),
        callerOrigin: String(managedIncomingCall?.callerOrigin || "").trim(),
        callerRole: String(managedIncomingCall?.callerRole || "").trim()
      });
  }, [managedIncomingCall]);

  const selectedThreadSnapshot = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);
  const selectedThreadSnapshotKey = useMemo(
    () => [
      selectedThreadSnapshot?.snapshotUrl || "",
      selectedThreadSnapshot?.photoUrl || "",
      selectedThreadSnapshot?.snapshotAuditId || ""
    ].join("|"),
    [selectedThreadSnapshot?.snapshotUrl, selectedThreadSnapshot?.photoUrl, selectedThreadSnapshot?.snapshotAuditId]
  );

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const joinSession = (sessionId) => {
      const normalizedId = String(sessionId || "").trim();
      if (!normalizedId || joinedSessionIdsRef.current.has(normalizedId)) return;
      socket.emit(RealtimeEvent.SESSION_JOIN, {
        sessionId: normalizedId,
        displayName: user?.fullName || "Homeowner"
      });
      joinedSessionIdsRef.current.add(normalizedId);
    };

    threads.forEach((thread) => joinSession(thread.id));
    if (selectedId) joinSession(selectedId);
  }, [selectedId, threads, user?.fullName]);

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
    return () => {
      active = false;
    };
  }, [selectedId, selectedThreadSnapshotKey]);

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = sortThreadsForInbox(threads);
    if (!term) return sorted;
    return sorted.filter((t) => [t.name, t.last, t.doorName, t.purpose].join(" ").toLowerCase().includes(term));
  }, [threads, query]);

  const heroThread = useMemo(() => {
    if (selectedId) {
      return threads.find((t) => t.id === selectedId) || null;
    }
    return filteredThreads[0] || null;
  }, [threads, selectedId, filteredThreads]);
  const selectedMessages = useMemo(() => messagesByThread[selectedId] || [], [messagesByThread, selectedId]);
  const heroSnapshotUrl = useMemo(() => {
    if (!heroThread) return "";
    return String(
      snapshotUrls[heroThread.id] ||
      heroThread.snapshotUrl ||
      heroThread.photoUrl ||
      getConversationSnapshotUrl(selectedMessages) ||
      ""
    ).trim();
  }, [heroThread, snapshotUrls, selectedMessages]);
  const heroThreadState = String(heroThread?.sessionStatus || "").trim().toLowerCase();
  
  const accessAlreadyGranted = useMemo(() => {
    if (["approved", "accepted", "gate_confirmed", "completed", "closed"].includes(heroThreadState)) {
      return true;
    }
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
      setIsTyping(false);
      socketRef.current?.emit("chat.typing", {
        sessionId: selectedId,
        senderType: "homeowner",
        displayName: user?.fullName || "Homeowner",
        isTyping: false
      });
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
    const visitorRequestId = String(
      selectedThread?.visitorRequestId ||
      selectedThread?.requestId ||
      selectedThread?.request_id ||
      ""
    ).trim();
    const communicationTarget = String(
      selectedThread?.preferredCommunicationTarget ||
      selectedThread?.communicationTarget ||
      ""
    ).trim();
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
    grantSessionCallAccess(incomingCall.sessionId, "incoming");
    window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify(acceptIntent));
    setSelectedId(incomingCall.sessionId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("sessionId", incomingCall.sessionId);
      return next;
    });
    setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
    dismissIncomingCall(acceptIntent);
    navigate(`/session/${incomingCall.sessionId}/${mode}`);
  }

  async function handleRejectIncomingCall() {
    if (!incomingCall.sessionId || !incomingCall.callSessionId || incomingCallBusy) return;
    setIncomingCallBusy(true);
    const rejectPayload = {
      sessionId: incomingCall.sessionId,
      callSessionId: incomingCall.callSessionId,
      hasVideo: incomingCall.hasVideo,
      visitorId: incomingCall.visitorId
    };
    try {
      socketRef.current?.emit(RealtimeEvent.CALL_REJECTED, {
        sessionId: incomingCall.sessionId,
        callSessionId: incomingCall.callSessionId,
        hasVideo: incomingCall.hasVideo,
        idempotencyKey: incomingCall.callSessionId
      });
      await apiRequest("/calls/end", {
        method: "POST",
        body: JSON.stringify({
          callSessionId: incomingCall.callSessionId,
          participantType: "homeowner"
        })
      });
    } catch (err) {
      setError(err?.message || "Unable to reject call");
    } finally {
      dismissIncomingCall(rejectPayload);
      setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
      setIncomingCallBusy(false);
    }
  }

  return (
    <div className="bg-slate-50 min-h-[100dvh] w-screen flex flex-col overflow-hidden font-sans antialiased text-slate-800">
      
      {/* Header */}
      <header className="w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-6 py-4 flex-shrink-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleMobileBack}
              className="md:hidden inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              <ChevronLeft size={16} />
              <span>{mobileView === "chat" && openedFromNotification ? "Alerts" : "Back"}</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden md:inline-flex p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="font-bold text-lg md:text-xl text-slate-900 leading-none tracking-tight truncate flex items-center gap-2">
                <Shield size={20} className="text-indigo-600" />
                Access Control
              </h1>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 truncate">
                {mobileView === "chat" ? "Active Conversation" : `${filteredThreads.length} Active Portals`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/dashboard/notifications"
              className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Bell size={18} />
              {globalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {globalUnreadCount > 9 ? '9+' : globalUnreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className={`w-full bg-white/80 backdrop-blur-sm border-b border-slate-200/60 px-4 py-3 flex-shrink-0 ${mobileView === "chat" ? "hidden md:block" : "block"}`}>
        <div className="max-w-7xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by visitor, purpose, or door..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-rose-50 text-rose-700 p-4 rounded-xl text-sm font-medium border border-rose-200 flex items-center gap-2 flex-shrink-0">
          <X size={16} className="text-rose-500" />
          {error}
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto flex overflow-hidden px-4 pb-4 gap-4">
        
        {/* Thread List */}
        <section className={`w-full md:w-80 lg:w-96 flex flex-col flex-shrink-0 bg-white md:bg-transparent rounded-2xl md:rounded-none border-0 md:border-none min-w-0 ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto space-y-2 pr-0 md:pr-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600">No Active Portals</p>
                <p className="text-xs text-slate-400 mt-1">Waiting for visitor requests</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = selectedId === thread.id;
                const threadSnapshot = snapshotUrls[thread.id] || thread.snapshotUrl || thread.photoUrl;
                const hasUnread = thread.unread > 0;
                
                return (
                  <button
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full flex items-start gap-3.5 p-4 rounded-xl transition-all text-left border ${
                      isActive 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                        : "bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold overflow-hidden ${
                        isActive ? 'bg-white/20' : 'bg-slate-100'
                      }`}>
                        {threadSnapshot ? (
                          <img src={threadSnapshot} alt="" className="w-full h-full object-cover" />
                        ) : (
                          (thread.name || "V")[0].toUpperCase()
                        )}
                      </div>
                      {hasUnread && !isActive && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                          {thread.name || "Visitor"}
                        </p>
                        <span className={`text-[9px] font-semibold tracking-wide flex-shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatClockTime(thread.time)}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                        {thread.last || "Awaiting verification..."}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isActive ? 'bg-white/10 text-indigo-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {thread.doorName || thread.gateLabel || "Entry"}
                        </span>
                        {thread.sessionStatus === "approved" && (
                          <span className="text-[9px] font-bold uppercase text-emerald-500 flex items-center gap-1">
                            <Check size={10} /> Access Granted
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Chat View */}
        <section className={`flex-1 bg-white md:rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col min-w-0 h-full ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
          {heroThread ? (
            <>
              {/* Chat Header */}
              <div className="px-4 md:px-6 py-4 border-b border-slate-200/60 bg-white flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={handleMobileBack}
                    className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100">
                      {heroSnapshotUrl ? (
                        <SecureSnapshotImage
                          src={heroSnapshotUrl}
                          alt="Visitor"
                          className="w-full h-full object-cover"
                          fallback={<div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><Image size={20} /></div>}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 text-lg font-bold">
                          {(heroThread.name || "V")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {heroThread.sessionStatus === "approved" && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 truncate flex items-center gap-2">
                      {heroThread.name || "Visitor"}
                      {heroThread.sessionStatus === "approved" && (
                        <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Verified</span>
                      )}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <DoorOpen size={12} />
                        {heroThread.doorName || heroThread.gateLabel || "Entry"}
                      </span>
                      {heroThread.purpose && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="truncate max-w-[120px]">{heroThread.purpose}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {typingByThread[selectedId]?.isTyping && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wide">Typing...</span>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {conversationLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : selectedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <MessageSquare size={32} className="text-slate-300 mb-3" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs">Start the conversation</p>
                  </div>
                ) : (
                  selectedMessages.map((msg, i) => {
                    const isOwn = msg.senderType === 'homeowner';
                    const isSnapshot = isSnapshotThreadMessage(msg);
                    
                    return (
                      <div key={msg.messageId || msg.id || i} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                        <div className={`max-w-[85%] md:max-w-[70%] ${!isOwn && !isSnapshot ? 'pl-3' : ''}`}>
                          {isSnapshot ? (
                            <div className="bg-white rounded-2xl rounded-tl-none border border-slate-200/90 shadow-md overflow-hidden">
                              <div className="p-3 bg-slate-50/80 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">Snapshot</span>
                                  <span className="text-[9px] font-semibold text-slate-400">{formatClockTime(msg.at)}</span>
                                </div>
                              </div>
                              <div className="p-3 space-y-3">
                                {getMessageSnapshotSrc(msg) ? (
                                  <SecureSnapshotImage
                                    src={getMessageSnapshotSrc(msg)}
                                    alt="Visitor snapshot"
                                    className="w-full max-h-64 object-cover rounded-lg"
                                    fallback={<div className="w-full h-48 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg">Failed to load</div>}
                                  />
                                ) : (
                                  <div className="w-full h-48 flex items-center justify-center bg-slate-100 text-slate-400 rounded-lg">No image available</div>
                                )}
                                <div className="grid gap-1.5 text-xs">
                                  {msg.visitorName && (
                                    <p><span className="font-semibold text-slate-500">Name:</span> {msg.visitorName}</p>
                                  )}
                                  {msg.visitorPhone && (
                                    <p><span className="font-semibold text-slate-500">Phone:</span> {msg.visitorPhone}</p>
                                  )}
                                  {msg.purpose && (
                                    <p><span className="font-semibold text-slate-500">Purpose:</span> {msg.purpose}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className={`rounded-2xl px-4 py-3 text-sm break-words ${
                              isOwn 
                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20' 
                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/70 shadow-sm'
                            }`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{getConversationMessageText(msg)}</p>
                              <p className={`text-[8px] mt-1.5 font-semibold tracking-wide text-right ${
                                isOwn ? 'text-indigo-200' : 'text-slate-400'
                              }`}>
                                {formatClockTime(msg.at)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons + Input */}
              <div className="p-4 border-t border-slate-200/60 bg-white flex-shrink-0 space-y-3">
                {!accessAlreadyGranted && heroThread.sessionStatus !== "rejected" && (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickReply("Please stand by.")}
                      disabled={sending || decisionBusy}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold uppercase tracking-wide text-slate-600 transition-all disabled:opacity-50"
                    >
                      Standby
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectAccess}
                      disabled={sending || decisionBusy}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold uppercase tracking-wide text-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <X size={14} />
                      {decisionAction === "reject" ? "Declining..." : "Deny"}
                    </button>
                    <button
                      type="button"
                      onClick={handleGrantAccess}
                      disabled={sending || decisionBusy}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      <Check size={14} />
                      {decisionAction === "approve" ? "Opening..." : "Approve"}
                    </button>
                  </div>
                )}

                {accessAlreadyGranted && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartCall("audio")}
                      disabled={Boolean(callBusy)}
                      className="py-3 bg-slate-100 hover:bg-indigo-50 rounded-xl text-xs font-bold uppercase text-indigo-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Phone size={16} />
                      Audio
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCall("video")}
                      disabled={Boolean(callBusy)}
                      className="py-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-bold uppercase text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Video size={16} />
                      Video
                    </button>
                  </div>
                )}

                {heroThread.sessionStatus === "rejected" && (
                  <div className="text-center py-2 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200">
                    Access declined — this visitor cannot enter
                  </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDraft(value);
                      setIsTyping(Boolean(value.trim()));
                      socketRef.current?.emit("chat.typing", {
                        sessionId: selectedId,
                        senderType: "homeowner",
                        displayName: user?.fullName || "Homeowner",
                        isTyping: Boolean(value.trim())
                      });
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 pr-14 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 transition-all"
                  >
                    <SendHorizontal size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No Conversation Selected</p>
              <p className="text-xs text-slate-400 mt-1">Choose a visitor request from the list</p>
            </div>
          )}
        </section>
      </main>

      <VisitorIncomingCallModal
        open={incomingCall.pending}
        hasVideo={incomingCall.hasVideo}
        busy={incomingCallBusy}
        callerLabel={incomingCall.callerName || roleLabel(incomingCall.callerRole) || incomingCall.homeownerName || incomingCall.visitorName || "Caller"}
        sourceLabel={incomingCall.callerOrigin || ""}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </div>
  );
}

// --- Helper Functions ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageBody(text) {
  return <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{text}</p>;
}

function renderThreadMessageBody(message) {
  const snapshotUrl = getMessageSnapshotSrc(message);
  const messageType = String(message?.messageType || "text");
  if (messageType === "visitor_snapshot" || Boolean(snapshotUrl)) {
    const footerLabel = getSnapshotFooterLabel(message);
    const missingSnapshotBox = (
      <div className="grid h-52 w-full place-items-center rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 p-4 text-center text-xs font-semibold text-rose-700">
        Snapshot image is missing for this visitor request.
      </div>
    );
    const failedSnapshotBox = (
      <div className="grid h-52 w-full place-items-center rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 p-4 text-center text-xs font-semibold text-rose-700">
        Snapshot image could not be loaded. Please check image storage or URL access.
      </div>
    );
    if (!snapshotUrl) {
      // eslint-disable-next-line no-console
      console.warn("qring.snapshot.missing", {
        sessionId: message?.sessionId || "",
        messageId: message?.messageId || message?.id || "",
        snapshotAuditId: message?.snapshotAuditId || message?.snapshot_audit_id || message?.snapshot?.id || "",
        snapshotUrl: ""
      });
    }
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-900">
            Visitor snapshot
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Photo + details
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
          {snapshotUrl ? (
            <SecureSnapshotImage
              src={snapshotUrl}
              alt="Visitor snapshot"
              className="h-52 w-full object-cover"
              onError={({ src }) => {
                // eslint-disable-next-line no-console
                console.warn("qring.snapshot.render_failed", {
                  sessionId: message?.sessionId || "",
                  snapshotUrl: src || snapshotUrl
                });
              }}
              fallback={failedSnapshotBox}
            />
          ) : (
            missingSnapshotBox
          )}
        </div>
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600">
          <div className="flex flex-wrap gap-2">
            {message?.visitorName ? <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">Name: {message.visitorName}</span> : null}
            {message?.visitorPhone ? <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">Phone: {message.visitorPhone}</span> : null}
            {message?.doorName ? <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">Door: {message.doorName}</span> : null}
          </div>
          {message?.purpose ? (
            <p className="leading-relaxed">
              <span className="font-black uppercase tracking-[0.16em] text-slate-400">Purpose</span>
              <span className="ml-2 font-semibold text-slate-700">{message.purpose}</span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
          <span>{footerLabel}</span>
          <span>{formatClockTime(message?.at) || "Just now"}</span>
        </div>
      </div>
    );
  }
  return renderMessageBody(getConversationMessageText(message));
}

function roleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "homeowner") return "Homeowner";
  if (normalized === "security") return "Security";
  if (normalized === "visitor") return "Visitor";
  return "";
}

function eventLooksLikeSnapshot(payload) {
  return Boolean(
    extractSnapshotUrl(payload) ||
    extractSnapshotUrl(payload?.payload) ||
    extractSnapshotUrl(payload?.requestPayload) ||
    extractSnapshotUrl(payload?.metadata)
  );
}

function normalizeInboxThread(thread) {
  const normalized = { ...(thread || {}) };
  const snapshotAuditId = String(
    normalized.snapshotAuditId ||
    normalized.snapshot_audit_id ||
    normalized.snapshot?.id ||
    normalized.requestPayload?.snapshotAuditId ||
    normalized.data?.snapshotAuditId ||
    normalized.data?.snapshot_audit_id ||
    normalized.data?.snapshot?.id ||
    normalized.data?.payload?.snapshotAuditId ||
    normalized.data?.payload?.snapshot_audit_id ||
    normalized.data?.payload?.snapshot?.id ||
    ""
  ).trim();
  const snapshotUrl = extractSnapshotUrl(normalized) || getSnapshotUrlFromAuditId(snapshotAuditId) || String(
    normalized.snapshotUrl ||
    normalized.photoUrl ||
    normalized.imageUrl ||
    normalized.fileUrl ||
    normalized.url ||
    ""
  ).trim();
  normalized.id =
    normalized.id ||
    normalized.sessionId ||
    normalized.visitorSessionId ||
    "";
  normalized.name =
    normalized.name ||
    normalized.visitorFullName ||
    normalized.visitorName ||
    normalized.visitor ||
    "Visitor";
  normalized.visitorPhone =
    normalized.visitorPhone ||
    normalized.phoneNumber ||
    normalized.phone ||
    "";
  normalized.doorName =
    normalized.doorName ||
    normalized.door ||
    normalized.gateLabel ||
    normalized.requestPayload?.doorName ||
    normalized.metadata?.doorName ||
    "";
  normalized.purpose =
    normalized.purpose ||
    normalized.visitPurpose ||
    normalized.reason ||
    "";
  normalized.last = getConversationPreviewText(normalized);
  normalized.snapshotUrl = snapshotUrl || normalized.snapshotUrl || "";
  normalized.photoUrl = snapshotUrl || normalized.photoUrl || "";
  normalized.snapshotAuditId = snapshotAuditId;
  return normalized;
}

function isLikelyDuplicateMessage(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.clientId && b.clientId && a.clientId === b.clientId) return true;
  if ((a.sessionId || "") !== (b.sessionId || "")) return false;
  if (String(a.senderType || "").toLowerCase() !== String(b.senderType || "").toLowerCase()) return false;
  if (String(a.text || "").trim() !== String(b.text || "").trim()) return false;
  const left = new Date(a.at).getTime();
  const right = new Date(b.at).getTime();
  return Math.abs(left - right) < 8000;
}

function mergeMessageCollections(current, incoming) {
  const merged = [...(current || [])];
  for (const candidate of incoming || []) {
    if (!candidate) continue;
    const normalized = { ...candidate, sessionId: candidate.sessionId || candidate.session_id || "" };
    const idx = merged.findIndex((item) => isLikelyDuplicateMessage(item, normalized));
    if (idx === -1) { merged.push(normalized); }
    else { merged[idx] = { ...merged[idx], ...normalized }; }
  }
  return merged.sort((l, r) => new Date(l.at || 0) - new Date(r.at || 0));
}

function sortThreadsForInbox(arr) {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function mergeThreadCollections(old, next) {
  const map = new Map(old.map(t => [t.id, t]));
  next.forEach(t => {
    const prev = map.get(t.id);
    map.set(t.id, prev ? { ...prev, ...t } : t);
  });
  return Array.from(map.values());
}

function upsertThreadPreview(msg, setThreads, selectedId, extra = {}) {
  setThreads((prev) => {
    const found = prev.find(t => t.id === msg.sessionId);
    const previewText = getConversationPreviewText(msg);
    if (found) {
      return prev.map(t => t.id === msg.sessionId ? {
        ...t, last: previewText || t.last, time: msg.at, unread: t.id === selectedId ? 0 : (t.unread || 0) + 1, ...extra
      } : t);
    }
    return [{ id: msg.sessionId, last: previewText, time: msg.at, unread: 1, ...extra }, ...prev];
  });
}

function getThreadSnapshotSrc(thread) {
  if (!thread) return "";
  const photoUrl = extractSnapshotUrl(thread);
  if (photoUrl) return photoUrl;
  return getSnapshotUrlFromAuditId(thread.snapshotAuditId || thread.snapshot_audit_id || thread.snapshot?.id || "");
}

function buildSnapshotMessage(payload, fallbackSessionId = "") {
  const sessionId = String(payload?.sessionId || fallbackSessionId || "").trim();
  if (!sessionId) return null;
  const snapshotAuditId = String(
    payload?.snapshotAuditId ||
    payload?.snapshot_audit_id ||
    payload?.snapshot?.id ||
    payload?.requestPayload?.snapshotAuditId ||
    payload?.data?.snapshotAuditId ||
    payload?.data?.snapshot_audit_id ||
    payload?.data?.snapshot?.id ||
    payload?.data?.payload?.snapshotAuditId ||
    payload?.data?.payload?.snapshot_audit_id ||
    payload?.data?.payload?.snapshot?.id ||
    ""
  ).trim();
  const snapshotUrl = extractSnapshotUrl(payload) || getSnapshotUrlFromAuditId(snapshotAuditId);
  return {
    id: `snapshot:${sessionId}`,
    messageId: `snapshot:${sessionId}`,
    sessionId,
    text: payload?.message || "Visitor snapshot submitted.",
    messageType: "visitor_snapshot",
    snapshotUrl,
    photoUrl: snapshotUrl,
    senderRole: "visitor",
    senderType: "visitor",
    displayName: payload?.visitorName || "Visitor",
    visitorName: payload?.visitorName || "Visitor",
    visitorPhone: payload?.visitorPhone || "",
    purpose: payload?.purpose || "",
    requestSource: String(payload?.requestSource || payload?.source || payload?.requestPayload?.requestSource || "").trim(),
    creatorRole: String(payload?.creatorRole || payload?.requestPayload?.creatorRole || "").trim(),
    snapshotAuditId,
    at: payload?.at || payload?.timestamp || new Date().toISOString()
  };
}

function ensureSnapshotConversationRows(rows, sessionId, threadSnapshot) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const hasSnapshotMessage = list.some((item) => isSnapshotThreadMessage(item));
  if (hasSnapshotMessage) return list;
  const source = threadSnapshot && (extractSnapshotUrl(threadSnapshot) || getSnapshotUrlFromAuditId(threadSnapshot?.snapshotAuditId || threadSnapshot?.snapshot_audit_id || threadSnapshot?.snapshot?.id || ""))
    ? {
        sessionId,
        snapshotUrl: extractSnapshotUrl(threadSnapshot) || getSnapshotUrlFromAuditId(threadSnapshot?.snapshotAuditId || threadSnapshot?.snapshot_audit_id || threadSnapshot?.snapshot?.id || ""),
        photoUrl: extractSnapshotUrl(threadSnapshot) || getSnapshotUrlFromAuditId(threadSnapshot?.snapshotAuditId || threadSnapshot?.snapshot_audit_id || threadSnapshot?.snapshot?.id || ""),
        snapshotAuditId: threadSnapshot?.snapshotAuditId || threadSnapshot?.snapshot_audit_id || threadSnapshot?.snapshot?.id || "",
        visitorName: threadSnapshot?.name || threadSnapshot?.visitorName || "Visitor",
        visitorPhone: threadSnapshot?.visitorPhone || "",
        purpose: threadSnapshot?.purpose || "",
        requestSource: threadSnapshot?.requestSource || threadSnapshot?.request_source || "",
        creatorRole: threadSnapshot?.creatorRole || threadSnapshot?.creator_role || "",
        at: threadSnapshot?.timestamp || threadSnapshot?.time || new Date().toISOString()
    }
    : null;
  if (!source) return list;
  const snapshotMessage = buildSnapshotMessage(source, sessionId);
  return snapshotMessage ? [snapshotMessage, ...list] : list;
}

function extractSnapshotUrl(source) {
  return String(
    source?.snapshotUrl ||
    source?.imageUrl ||
    source?.photoUrl ||
    source?.image_url ||
    source?.fileUrl ||
    source?.file_url ||
    source?.url ||
    source?.snapshot_url ||
    source?.photo_url ||
    source?.snapshot?.snapshotUrl ||
    source?.snapshot?.imageUrl ||
    source?.snapshot?.photoUrl ||
    source?.snapshot?.image_url ||
    source?.snapshot?.fileUrl ||
    source?.snapshot?.url ||
    source?.requestPayload?.snapshotUrl ||
    source?.requestPayload?.imageUrl ||
    source?.requestPayload?.photoUrl ||
    source?.requestPayload?.image_url ||
    source?.requestPayload?.fileUrl ||
    source?.requestPayload?.snapshot_url ||
    source?.requestPayload?.url ||
    source?.metadata?.snapshotUrl ||
    source?.metadata?.imageUrl ||
    source?.metadata?.photoUrl ||
    source?.metadata?.fileUrl ||
    source?.metadata?.url ||
    source?.metadata?.snapshot_url ||
    source?.metadata?.image_url ||
    source?.metadata?.photo_url ||
    source?.data?.snapshotUrl ||
    source?.data?.imageUrl ||
    source?.data?.photoUrl ||
    source?.data?.fileUrl ||
    source?.data?.url ||
    source?.data?.snapshot_url ||
    source?.data?.image_url ||
    source?.data?.photo_url ||
    source?.data?.file_url ||
    source?.data?.payload?.snapshotUrl ||
    source?.data?.payload?.imageUrl ||
    source?.data?.payload?.photoUrl ||
    source?.data?.payload?.fileUrl ||
    source?.data?.payload?.url ||
    source?.data?.payload?.snapshot_url ||
    source?.data?.payload?.image_url ||
    source?.data?.payload?.photo_url ||
    source?.data?.payload?.file_url ||
    ""
  ).trim();
}

function isSnapshotThreadMessage(message) {
  return (
    String(message?.messageType || "").trim() === "visitor_snapshot" ||
    Boolean(extractSnapshotUrl(message)) ||
    Boolean(getSnapshotUrlFromAuditId(message?.snapshotAuditId || message?.snapshot_audit_id || message?.snapshot?.id || ""))
  );
}

function getSnapshotFooterLabel(message) {
  const requestSource = String(message?.requestSource || message?.source || "").trim().toLowerCase();
  const creatorRole = String(message?.creatorRole || message?.senderRole || message?.senderType || "").trim().toLowerCase();
  if (requestSource.includes("visitor_form") || (requestSource.includes("visitor") && requestSource.includes("form"))) return "Uploaded from visitor form";
  if (requestSource.includes("visitor_qr")) return "Captured from visitor scan";
  if (requestSource.includes("security")) return "Registered by security";
  if (creatorRole === "security") return "Registered by security";
  return "Captured snapshot";
}

function safeParsePayload(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function getConversationSnapshotUrl(rows) {
  const list = Array.isArray(rows) ? rows : [];
  for (const row of list) {
    const snapshotUrl = extractSnapshotUrl(row);
    if (snapshotUrl) return snapshotUrl;
    const snapshotAuditUrl = getSnapshotUrlFromAuditId(row?.snapshotAuditId || row?.snapshot_audit_id || row?.snapshot?.id || "");
    if (snapshotAuditUrl) return snapshotAuditUrl;
  }
  return "";
}

function getConversationSnapshotAuditId(rows) {
  const list = Array.isArray(rows) ? rows : [];
  for (const row of list) {
    const auditId = String(row?.snapshotAuditId || row?.snapshot_audit_id || "").trim();
    if (auditId) return auditId;
  }
  return "";
}

function getSnapshotUrlFromAuditId(snapshotAuditId) {
  const auditId = String(snapshotAuditId || "").trim();
  if (!auditId) return "";
  return `/api/v1/advanced/visitor/snapshots/${encodeURIComponent(auditId)}/file`;
}

function getMessageSnapshotSrc(message) {
  const snapshotUrl = extractSnapshotUrl(message);
  if (snapshotUrl) return snapshotUrl;
  return getSnapshotUrlFromAuditId(message?.snapshotAuditId || message?.snapshot_audit_id || message?.snapshot?.id || "");
}