import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal, MessageSquare
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
import {
  decideVisit,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  requestHomeownerCall,
  sendHomeownerSessionMessage
} from "../../services/homeownerService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";

export default function HomeownerMessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
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
  const token = getAccessToken();
  const notificationBackTarget = String(location.state?.backTo || "").trim();
  const openedFromNotification = Boolean(location.state?.fromNotification) || notificationBackTarget === "/dashboard/notifications";

  async function refreshThreads(options = {}) {
    const { focusSessionId = "" } = options;
    const data = await getHomeownerMessages();
    // eslint-disable-next-line no-console
    console.info("QRING_HOMEOWNER_MESSAGES_RAW", data);
    const normalized = (data || []).map((thread) => normalizeInboxThread(thread));
    // eslint-disable-next-line no-console
    console.info("QRING_HOMEOWNER_MESSAGES_NORMALIZED", normalized.map((thread) => ({
      id: thread.id,
      name: thread.name,
      snapshotUrl: thread.snapshotUrl,
      photoUrl: thread.photoUrl,
      hasSnapshot: Boolean(thread.snapshotUrl || thread.photoUrl)
    })));
    // eslint-disable-next-line no-console
    console.info(
      "qring.homeowner.messages.snapshot_check",
      normalized.map((thread) => ({
        id: thread.id,
        name: thread.name,
        snapshotUrl: thread.snapshotUrl,
        photoUrl: thread.photoUrl,
        hasSnapshot: Boolean(thread.snapshotUrl || thread.photoUrl)
      }))
    );
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

  // Keep chat scrolled down smoothly
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messagesByThread, selectedId, mobileView]);

  // --- Initial Data Load ---
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

  // --- Socket Connection Logic ---
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
      // eslint-disable-next-line no-console
      console.info("qring.homeowner.sessions.joined", { count: ids.size, sessionIds: Array.from(ids) });
    };

    const handleChatMessage = (payload) => {
      const incomingSessionId = payload?.sessionId;
      if (!incomingSessionId) return;
      const snapshotUrl = extractSnapshotUrl(payload);
      const normalized = {
        id: payload?.messageId || payload?.id || `${payload?.at || Date.now()}-${Math.random()}`,
        messageId: payload?.messageId || payload?.id || "",
        sessionId: incomingSessionId,
        text: payload?.text || "",
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
      // eslint-disable-next-line no-console
      console.info("qring.homeowner.chat.received", {
        sessionId: incomingSessionId,
        messageId: normalized.id,
        senderType: normalized.senderType
      });
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
      const snapshotUrl = extractSnapshotUrl(payload);
      const snapshotMessage = buildSnapshotMessage({ ...payload, snapshotUrl }, incomingSessionId);
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
      if (payload?.photoUrl || payload?.snapshotAuditId) {
        // eslint-disable-next-line no-console
        console.info("qring.homeowner.snapshot.session_update", {
          sessionId: incomingSessionId,
          photoUrl: payload?.photoUrl || null,
          snapshotAuditId: payload?.snapshotAuditId || null
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
      const nextUrl = extractSnapshotUrl(data);
      if (visitorSessionId && nextUrl) {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === visitorSessionId
              ? { ...thread, photoUrl: nextUrl, snapshotUrl: nextUrl, snapshotAuditId: data?.id || thread.snapshotAuditId }
              : thread
          )
        );
        const snapshotMessage = buildSnapshotMessage(
          {
            ...data,
            sessionId: visitorSessionId,
            photoUrl: nextUrl,
            snapshotUrl: nextUrl
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
            // eslint-disable-next-line no-console
            console.info("QRING_HOMEOWNER_SESSION_MESSAGES_RAW", {
              selectedId,
              rows
            });
            // eslint-disable-next-line no-console
            console.info("QRING_HOMEOWNER_SESSION_MESSAGES_SNAPSHOT_CHECK", {
              selectedId,
              hasSnapshotMessage: rows.some((row) =>
                String(row?.messageType || "").trim() === "visitor_snapshot" ||
                Boolean(row?.snapshotUrl || row?.photoUrl || row?.imageUrl)
              )
            });
            // eslint-disable-next-line no-console
            console.info("qring.homeowner.conversation.snapshot_check", {
              selectedId,
              hasSnapshotMessage: rows.some((row) => String(row?.messageType || "").trim() === "visitor_snapshot" || Boolean(row?.snapshotUrl)),
              rows: rows.map((row) => ({
                id: row?.id,
                messageType: row?.messageType,
                snapshotUrl: row?.snapshotUrl,
                photoUrl: row?.photoUrl
              }))
            });
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
    return sorted.filter((t) => [t.name, t.last].join(" ").toLowerCase().includes(term));
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
    setCallBusy(`${selectedId}:${mode}`);
    try {
      const response = await requestHomeownerCall({
        visitorSessionId: selectedId,
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
    <div className="bg-[#f8f9fa] h-screen w-screen flex flex-col overflow-hidden font-sans antialiased text-slate-800">
      
      {/* Dynamic Native Top Header Row Container */}
      <header className="w-full bg-white/90 backdrop-blur-xl border-b border-slate-100 px-3 sm:px-4 py-3 flex-shrink-0 z-50 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleMobileBack}
              className="md:hidden inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm transition-transform active:scale-95"
              aria-label={mobileView === "chat" && openedFromNotification ? "Back to notifications" : "Back"}
            >
              <ChevronLeft size={14} />
              <span>{mobileView === "chat" && openedFromNotification ? "Alerts" : "Back"}</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="hidden md:inline-flex p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="font-extrabold text-base md:text-lg text-slate-900 leading-none tracking-tight truncate">
                Access Control
              </h1>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 truncate">
                {mobileView === "chat" ? "Visitor thread open" : "Live Portals"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/dashboard/notifications"
              className="relative inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {globalUnreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Global Contextual Search Control pinned permanently to Header base */}
      <div className={`w-full bg-white/80 backdrop-blur-md border-b border-slate-100 p-3 flex-shrink-0 ${mobileView === "chat" ? "hidden md:block" : "block"}`}>
        <div className="max-w-6xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entry points, purpose, or visitors..."
            className="w-full bg-slate-50/90 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 outline-none transition-shadow shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="m-4 mb-0 bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold border border-rose-100 uppercase tracking-tight flex-shrink-0">
          {error}
        </div>
      )}

      {/* Master Workspace Distribution Interface Panel */}
      <main className="flex-1 max-w-6xl w-full mx-auto flex overflow-hidden p-0 md:p-4 gap-4">
        
        {/* SIDEBAR VIEWPORT: Interactive Directory Feed Logs */}
        <section className={`w-full md:w-80 flex flex-col flex-shrink-0 bg-white md:bg-transparent ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-2.5">
            {filteredThreads.map((thread) => {
              const isActive = selectedId === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all border text-left ${
                    isActive ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                    {(thread.name || "V")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className="text-xs font-extrabold uppercase tracking-tight truncate pr-2">{thread.name || "Visitor"}</p>
                      <span className="text-[9px] font-bold tracking-tighter opacity-70">{formatClockTime(thread.time)}</span>
                    </div>
                    <p className="text-xs truncate opacity-80 mb-1">{thread.last || "Awaiting entry verification snapshot..."}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                      {thread.doorName || thread.gateLabel || thread.door || "Entry Unit Gate"}
                    </p>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-200' : 'text-indigo-600'}`}>
                      {thread.gateLabel || "Entry Unit Gate"}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredThreads.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold uppercase tracking-tight">No Active Portals Located</div>
            )}
          </div>
        </section>

        {/* WORKSPACE VIEWPORT: Active Interactive Feed Stream */}
        <section className={`flex-1 bg-white md:rounded-2xl border-0 md:border border-slate-100 shadow-xs overflow-hidden flex flex-col h-full ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
          {heroThread ? (
            <>
              {/* Context-Aware Header Frame with Impeccable Image Snapshots Rendering */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-full max-w-[280px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:w-64 dark:border-slate-700 dark:bg-slate-800">
                    {heroSnapshotUrl ? (
                      <SecureSnapshotImage
                        src={heroSnapshotUrl}
                        alt="Visitor snapshot"
                        className="h-48 w-full object-cover md:h-56"
                        onError={({ src }) => {
                          // eslint-disable-next-line no-console
                          console.warn("qring.snapshot.render_failed", {
                            sessionId: heroThread?.id || "",
                            snapshotUrl: src || heroSnapshotUrl
                          });
                        }}
                        fallback={
                          <div className="grid h-48 w-full place-items-center bg-gradient-to-br from-rose-50 to-amber-50 p-4 text-center text-xs font-semibold text-rose-700 md:h-56">
                            Snapshot image could not be loaded. Please check image storage or URL access.
                          </div>
                        }
                      />
                    ) : (
                      <div className="grid h-48 w-full place-items-center bg-gradient-to-br from-rose-50 to-amber-50 p-4 text-center text-xs font-semibold text-rose-700 md:h-56">
                        Snapshot image is missing for this visitor request.
                      </div>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{heroThread?.name || "Visitor Identification"}</h2>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      Purpose: <span className="text-slate-700 font-bold">{heroThread?.purpose || "Unprovided verification metrics"}</span>
                    </p>
                    <p className="text-[10px] font-extrabold text-indigo-600 mt-0.5 tracking-wide uppercase truncate">
                      Door: {heroThread?.doorName || heroThread?.gateLabel || heroThread?.door || "Unknown Door"}
                    </p>
                    <p className="text-[10px] font-extrabold text-indigo-600 mt-0.5 tracking-wide uppercase">
                      {heroThread?.gateLabel || "Intercom Link"} • {heroThread?.visitorPhone || "No Mobile Record"}
                    </p>
                  </div>
                </div>

                {typingByThread[selectedId]?.isTyping && (
                  <span className="text-[9px] tracking-tight bg-amber-50 text-amber-700 border border-amber-100 px-2 py-1 rounded-md font-black animate-pulse uppercase">
                    Typing
                  </span>
                )}
              </div>

              {/* Streaming Intercom Encryption Logs Node */}
              <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/20">
                {conversationLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  selectedMessages.map((msg, i) => (
                    <div key={msg.messageId || msg.id || i} className={`flex ${msg.senderType === 'homeowner' ? 'justify-end' : 'justify-start'}`}>
                      {(() => {
                        const snapshotBubble = isSnapshotThreadMessage(msg);
                        const bubbleClass = msg.senderType === "homeowner"
                          ? "bg-indigo-600 text-white rounded-tr-none font-medium shadow-xs"
                          : snapshotBubble
                            ? "bg-white text-slate-800 rounded-tl-none border border-slate-200/90 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-100"
                            : "bg-white text-slate-700 rounded-tl-none border border-slate-200/70 shadow-xs";
                        return (
                          <div className={`max-w-[85%] p-3.5 rounded-xl text-sm ${bubbleClass}`}>
                            {renderThreadMessageBody(msg)}
                            <p className={`text-[8px] mt-1.5 font-bold uppercase tracking-wider text-right ${msg.senderType === 'homeowner' ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {formatClockTime(msg.at)}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>

              {/* Secure Bottom Transaction Actions Terminal Panel */}
              <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex-shrink-0">
                {accessAlreadyGranted ? (
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartCall("audio")}
                      disabled={Boolean(callBusy)}
                      className="flex-1 rounded-xl bg-slate-100 hover:bg-indigo-50 py-3 text-xs font-extrabold uppercase text-indigo-600 transition-all disabled:opacity-50"
                    >
                      Audio Call
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCall("video")}
                      disabled={Boolean(callBusy)}
                      className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-3 text-xs font-extrabold uppercase text-white transition-all disabled:opacity-50"
                    >
                      Video Link
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex gap-2">
                    <button type="button" onClick={() => handleQuickReply("Please stand by.")} disabled={sending || decisionBusy} className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-extrabold uppercase tracking-tight text-slate-600 hover:bg-slate-200 transition-all">Standby</button>
                    <button type="button" onClick={handleRejectAccess} disabled={sending || decisionBusy} className="flex-1 py-3 bg-rose-50 rounded-xl text-xs font-extrabold uppercase tracking-tight text-rose-600 hover:bg-rose-100 transition-all">{decisionAction === "reject" ? "Declining..." : "Deny Access"}</button>
                    <button type="button" onClick={handleGrantAccess} disabled={sending || decisionBusy} className="flex-1 py-3 bg-emerald-600 rounded-xl text-xs font-extrabold uppercase tracking-tight text-white shadow-sm hover:bg-emerald-700 transition-all">{decisionAction === "approve" ? "Opening..." : "Approve Pass"}</button>
                  </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      socketRef.current?.emit("chat.typing", {
                        sessionId: selectedId,
                        senderType: "homeowner",
                        displayName: user?.fullName || "Homeowner",
                        isTyping: Boolean(e.target.value.trim())
                      });
                    }}
                    placeholder="Transmit dispatch directly to access unit..."
                    className="w-full bg-slate-50 border-none rounded-xl py-4 pl-4 pr-16 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/10"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <button type="submit" disabled={!draft.trim() || sending} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 transition-opacity">
                      <SendHorizontal size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-6 bg-slate-50/50">
              <MessageSquare size={36} className="text-slate-300 mb-2" />
              <p className="text-xs font-extrabold uppercase tracking-tight">Select Entry Pass Request To Mount Logs</p>
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

// --- Component Helper Logics ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Ensure bolding rules don't match unstyled strings improperly
function renderMessageBody(text) {
  return <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{text}</p>;
}

function renderThreadMessageBody(message) {
  const snapshotUrl = extractSnapshotUrl(message);
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
  return renderMessageBody(message?.text);
}

function roleLabel(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "homeowner") return "Homeowner";
  if (normalized === "security") return "Security";
  if (normalized === "visitor") return "Visitor";
  return "";
}

function previewMessageText(text) {
  return text;
}

function normalizeInboxThread(thread) {
  const normalized = { ...(thread || {}) };
  const snapshotUrl = extractSnapshotUrl(normalized) || String(
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
  normalized.last = previewMessageText(normalized?.last || "");
  normalized.snapshotUrl = snapshotUrl || normalized.snapshotUrl || "";
  normalized.photoUrl = snapshotUrl || normalized.photoUrl || "";
  normalized.snapshotAuditId = String(
    normalized.snapshotAuditId ||
    normalized.snapshot_audit_id ||
    normalized.snapshot?.id ||
    normalized.requestPayload?.snapshotAuditId ||
    ""
  ).trim();
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
    if (found) {
      return prev.map(t => t.id === msg.sessionId ? {
        ...t, last: msg.text, time: msg.at, unread: t.id === selectedId ? 0 : (t.unread || 0) + 1, ...extra
      } : t);
    }
    return [{ id: msg.sessionId, last: msg.text, time: msg.at, unread: 1, ...extra }, ...prev];
  });
}

function getThreadSnapshotSrc(thread) {
  if (!thread) return "";
  const photoUrl = extractSnapshotUrl(thread);
  if (photoUrl) return photoUrl;
  const snapshotAuditId = String(
    thread.snapshotAuditId ||
    thread.snapshot_audit_id ||
    thread.snapshot?.id ||
    ""
  ).trim();
  if (!snapshotAuditId) return "";
  return `/api/v1/advanced/visitor/snapshots/${encodeURIComponent(snapshotAuditId)}/file`;
}

function buildSnapshotMessage(payload, fallbackSessionId = "") {
  const sessionId = String(payload?.sessionId || fallbackSessionId || "").trim();
  if (!sessionId) return null;
  const snapshotUrl = extractSnapshotUrl(payload);
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
    at: payload?.at || payload?.timestamp || new Date().toISOString()
  };
}

function ensureSnapshotConversationRows(rows, sessionId, threadSnapshot) {
  const list = Array.isArray(rows) ? [...rows] : [];
  const hasSnapshotMessage = list.some((item) => String(item?.messageType || "").trim() === "visitor_snapshot" || Boolean(extractSnapshotUrl(item)));
  if (hasSnapshotMessage) return list;
  const source = threadSnapshot && extractSnapshotUrl(threadSnapshot)
    ? {
        sessionId,
        snapshotUrl: extractSnapshotUrl(threadSnapshot),
        photoUrl: extractSnapshotUrl(threadSnapshot),
        snapshotAuditId: threadSnapshot?.snapshotAuditId || "",
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
    ""
  ).trim();
}

function isSnapshotThreadMessage(message) {
  return String(message?.messageType || "").trim() === "visitor_snapshot" || Boolean(extractSnapshotUrl(message));
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
