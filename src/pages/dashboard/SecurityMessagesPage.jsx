import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, ArrowLeft, Send, Search,
  MessageSquare, X,
  Phone, Video,
  Camera, PhoneIncoming, ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import {
  getSecurityMessages,
  getSecuritySessionMessages,
  sendSecuritySessionMessage,
} from "../../services/securityService";
import {
  startSessionCall,
} from "../../services/homeownerService";
import { env } from "../../config/env.js";
import { RealtimeEvent } from "../../services/realtimeEvents";
import { getAccessToken } from "../../services/authStorage.js";
import { createRealtimeSocket, releaseRealtimeSocket } from "../../services/socketClient";
import { resolveSnapshotUrl } from "../../services/mediaUrl";
import {
  mergeSecurityMessages,
  mergeRealtimeMessageIntoConversation,
  updateThreadFromRealtimeMessage
} from "../../utils/securityMessagesRealtime";

function getThreadId(thread = {}) {
  return String(thread.sessionId || thread.session_id || thread.visitorSessionId || thread.visitor_session_id || thread.id || "").trim();
}

export default function SecurityMessagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const messageEndRef = useRef(null);
  const preferredSessionId = String(searchParams.get("sessionId") || "").trim();

  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messagesByThread, setMessagesByThread] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sendPending, setSendPending] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [threads, setThreads] = useState([]);
  const [callBusyType, setCallBusyType] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const activeThreadIdRef = useRef(activeThreadId);
  const incomingCallRef = useRef(null);
  const refreshThreadsTimerRef = useRef(null);
  const refreshConversationTimerRef = useRef(null);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => () => {
    if (refreshThreadsTimerRef.current) window.clearTimeout(refreshThreadsTimerRef.current);
    if (refreshConversationTimerRef.current) window.clearTimeout(refreshConversationTimerRef.current);
  }, []);

  const getRealtimeSessionId = (payload = {}) => {
    return String(
      payload?.sessionId ||
      payload?.data?.sessionId ||
      payload?.payload?.sessionId ||
      payload?.id ||
      ""
    ).trim();
  };

  const loadThreads = useCallback(async ({ keepSelection = false } = {}) => {
    setIsLoading(true);
    setError("");
    try {
      const rows = await getSecurityMessages();
      setThreads(rows);
      if (preferredSessionId && rows.some((row) => getThreadId(row) === preferredSessionId)) {
        setActiveThreadId(preferredSessionId);
      } else if (!keepSelection) {
        setActiveThreadId(null);
      }
    } catch (requestError) {
      setError(requestError?.message || "Unable to load messages.");
    } finally {
      setIsLoading(false);
    }
  }, [preferredSessionId]);

  const refreshThreadsSoon = (delay = 250) => {
    if (refreshThreadsTimerRef.current) window.clearTimeout(refreshThreadsTimerRef.current);
    refreshThreadsTimerRef.current = window.setTimeout(() => {
      refreshThreadsTimerRef.current = null;
      loadThreads({ keepSelection: true });
    }, delay);
  };

  const refreshActiveConversationSoon = (sessionId, delay = 250) => {
    const nextSessionId = String(sessionId || "").trim();
    if (!nextSessionId || String(activeThreadIdRef.current || "") !== nextSessionId) return;
    if (refreshConversationTimerRef.current) window.clearTimeout(refreshConversationTimerRef.current);
    refreshConversationTimerRef.current = window.setTimeout(async () => {
      refreshConversationTimerRef.current = null;
      try {
        const rows = await getSecuritySessionMessages(nextSessionId);
        if (String(activeThreadIdRef.current || "") !== nextSessionId) return;
        setMessagesByThread((prev) => ({
          ...prev,
          [nextSessionId]: mergeSecurityMessages(prev[nextSessionId] || [], rows)
        }));
      } catch (requestError) {
        setError(requestError?.message || "Unable to refresh conversation.");
      }
    }, delay);
  };

  const handleRealtimeThreadChange = (payload = {}) => {
    const sessionId = getRealtimeSessionId(payload);
    const data = payload?.data || payload?.payload?.data || payload?.payload || {};
    if (sessionId) {
      const status = payload?.status || data?.status || data?.sessionStatus;
      const snapshotUrl = payload?.snapshotUrl || payload?.snapshot_url || data?.snapshotUrl || data?.snapshot_url || data?.photoUrl || data?.photo_url;
      setThreads((prev) => prev.map((thread) => (
        getThreadId(thread) === sessionId
          ? {
              ...thread,
              ...(status ? { status, sessionStatus: status } : {}),
              ...(snapshotUrl ? { snapshotUrl, photoUrl: snapshotUrl } : {}),
              ...(data && typeof data === "object" ? data : {})
            }
          : thread
      )));
      refreshActiveConversationSoon(sessionId);
    }
    refreshThreadsSoon();
  };

  useEffect(() => {
    if (!activeThreadId || !user?.id) return undefined;

    const namespace = env.signalingNamespace ?? "/realtime/signaling";
    const socket = createRealtimeSocket(namespace, {
      authBuilder: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      }
    });

    const joinSession = () => {
      socket.emit(RealtimeEvent.SESSION_JOIN, {
        sessionId: activeThreadId,
        displayName: user?.full_name || user?.name || "Gate Security"
      });
    };

    const handleIncomingChatMessage = (payload) => {
      const sessionId = String(payload?.sessionId || "").trim();
      if (!sessionId) return;

      setMessagesByThread((prev) => ({
        ...prev,
        [sessionId]: mergeRealtimeMessageIntoConversation(prev[sessionId] || [], payload)
      }));
      setThreads((prev) => updateThreadFromRealtimeMessage(prev, payload, activeThreadIdRef.current));
    };

    const handleConnect = () => {
      try { joinSession(); } catch (e) { console.warn("SecurityMessagesPage: joinSession failed", e); }
      loadThreads({ keepSelection: true });
    };

    socket.on("connect", handleConnect);
    socket.on(RealtimeEvent.CHAT_MESSAGE, handleIncomingChatMessage);
    socket.on(RealtimeEvent.CHAT_PERSISTED, handleIncomingChatMessage);

    if (socket.connected) {
      joinSession();
    }

    return () => {
      socket.emit(RealtimeEvent.SESSION_LEAVE, { sessionId: activeThreadId });
      socket.off("connect", handleConnect);
      socket.off(RealtimeEvent.CHAT_MESSAGE, handleIncomingChatMessage);
      socket.off(RealtimeEvent.CHAT_PERSISTED, handleIncomingChatMessage);
      releaseRealtimeSocket(namespace);
    };
  }, [activeThreadId, user?.id, user?.full_name, user?.name, loadThreads]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const namespace = env.signalingNamespace ?? "/realtime/signaling";
    const socket = createRealtimeSocket(namespace, {
      authBuilder: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      }
    });
    const threadSessionIds = Array.from(new Set(threads.map((thread) => String(thread?.id || "").trim()).filter(Boolean)));

    const joinThreads = () => {
      threadSessionIds.forEach((sessionId) => {
        socket.emit(RealtimeEvent.SESSION_JOIN, {
          sessionId,
          displayName: user?.full_name || user?.name || "Gate Security"
        });
      });
    };
    const handleMessage = (payload) => {
      const sessionId = getRealtimeSessionId(payload);
      if (!sessionId) return;
      setMessagesByThread((prev) => ({
        ...prev,
        [sessionId]: mergeRealtimeMessageIntoConversation(prev[sessionId] || [], { ...payload, sessionId })
      }));
      setThreads((prev) => updateThreadFromRealtimeMessage(prev, { ...payload, sessionId }, activeThreadIdRef.current));
      refreshThreadsSoon();
    };

    const handleSessionChange = (payload) => handleRealtimeThreadChange(payload);
    const handleConnect = () => {
      joinThreads();
      refreshThreadsSoon(0);
    };

    socket.on("connect", handleConnect);
    socket.on(RealtimeEvent.CHAT_MESSAGE, handleMessage);
    socket.on(RealtimeEvent.CHAT_PERSISTED, handleMessage);
    socket.on(RealtimeEvent.SESSION_SNAPSHOT, handleSessionChange);
    socket.on(RealtimeEvent.SESSION_STATUS, handleSessionChange);
    socket.on(RealtimeEvent.SESSION_ACTIVATED, handleSessionChange);
    if (socket.connected) joinThreads();

    return () => {
      threadSessionIds.forEach((sessionId) => socket.emit(RealtimeEvent.SESSION_LEAVE, { sessionId }));
      socket.off("connect", handleConnect);
      socket.off(RealtimeEvent.CHAT_MESSAGE, handleMessage);
      socket.off(RealtimeEvent.CHAT_PERSISTED, handleMessage);
      socket.off(RealtimeEvent.SESSION_SNAPSHOT, handleSessionChange);
      socket.off(RealtimeEvent.SESSION_STATUS, handleSessionChange);
      socket.off(RealtimeEvent.SESSION_ACTIVATED, handleSessionChange);
      releaseRealtimeSocket(namespace);
    };
  }, [user?.id, user?.full_name, user?.name, threads]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const dashboardSocket = createRealtimeSocket(env.dashboardNamespace, {
      authBuilder: () => {
        const token = getAccessToken();
        return token ? { token } : {};
      }
    });
    const dashboardEvents = [
      "visitor_forwarded",
      "gate_action_completed",
      "security_request_updated",
      "dashboard.patch",
      "security.request.created"
    ];
    const terminalCallEvents = ["call.accepted", "call.rejected", "call.ended", "call.failed", "call.cancelled", "call.missed"];
    const handleDashboardEvent = (payload) => handleRealtimeThreadChange(payload);
    const handleIncomingCall = (payload) => setIncomingCall(payload?.data ?? payload ?? null);
    const handleCallTerminal = (payload) => {
      const nextPayload = payload?.data ?? payload ?? {};
      const nextCallId = String(nextPayload?.callSessionId || nextPayload?.eventId || "").trim();
      const nextSessionId = String(nextPayload?.sessionId || "").trim();
      const activeIncoming = incomingCallRef.current;
      const currentCallId = String(activeIncoming?.callSessionId || activeIncoming?.eventId || "").trim();
      const currentSessionId = String(activeIncoming?.sessionId || "").trim();
      if ((currentCallId && nextCallId && currentCallId === nextCallId) || (currentSessionId && nextSessionId && currentSessionId === nextSessionId)) {
        setIncomingCall(null);
      }
    };
    dashboardEvents.forEach((eventName) => dashboardSocket.on(eventName, handleDashboardEvent));
    dashboardSocket.on("incoming-call", handleIncomingCall);
    terminalCallEvents.forEach((eventName) => dashboardSocket.on(eventName, handleCallTerminal));
    return () => {
      dashboardEvents.forEach((eventName) => dashboardSocket.off(eventName, handleDashboardEvent));
      dashboardSocket.off("incoming-call", handleIncomingCall);
      terminalCallEvents.forEach((eventName) => dashboardSocket.off(eventName, handleCallTerminal));
      releaseRealtimeSocket(env.dashboardNamespace);
    };
  }, [user?.id]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!preferredSessionId || !threads.length) return;
    if (!threads.some((row) => getThreadId(row) === preferredSessionId)) return;
    setActiveThreadId(preferredSessionId);
    setSearchParams((curr) => {
      const next = new URLSearchParams(curr);
      next.delete("sessionId");
      return next;
    }, { replace: true });
  }, [preferredSessionId, setSearchParams, threads]);

  useEffect(() => {
    if (!activeThreadId) return;
    let active = true;
    async function loadConversation() {
      setConversationLoading(true);
      setError("");
      try {
        const rows = await getSecuritySessionMessages(activeThreadId);
        if (!active) return;
        setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: rows }));
      } catch (requestError) {
        if (active) setError(requestError?.message || "Unable to load conversation.");
      } finally {
        if (active) setConversationLoading(false);
      }
    }
    loadConversation();
    return () => {
      active = false;
    };
  }, [activeThreadId]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t =>
      [t.name, t.visitorName, t.last, t.door, t.homeName, t.unitName].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [threads, searchQuery]);

  const activeThread = useMemo(() => {
    return threads.find(t => getThreadId(t) === activeThreadId) || null;
  }, [threads, activeThreadId]);

  const activeMessages = useMemo(() => messagesByThread[activeThreadId] || [], [activeThreadId, messagesByThread]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeThreadId) return;
    const text = typedMessage.trim();
    setSendPending(true);
    setError("");
    try {
      const saved = await sendSecuritySessionMessage(activeThreadId, text);
      const message = saved || {
        id: `local-${Date.now()}`,
        sessionId: activeThreadId,
        text,
        senderType: "security",
        at: new Date().toISOString(),
      };
      setMessagesByThread((prev) => ({
        ...prev,
        [activeThreadId]: mergeRealtimeMessageIntoConversation(prev[activeThreadId] || [], message)
      }));
      setTypedMessage("");
      loadThreads({ keepSelection: true });
    } catch (requestError) {
      setError(requestError?.message || "Unable to send message.");
    } finally {
      setSendPending(false);
    }
  };

  const handleStartCall = async (type) => {
    if (!activeThreadId) return;
    const nextType = type === "video" ? "video" : "audio";
    setCallBusyType(nextType);
    setError("");
    try {
      const response = await startSessionCall({
        sessionId: activeThreadId,
        type: nextType,
        hasVideo: nextType === "video",
        communicationTarget: "visitor"
      });
      const data = response?.data ?? response ?? {};
      window.sessionStorage.setItem("qring_call_start_intent", JSON.stringify({
        pending: true,
        sessionId: activeThreadId,
        mode: nextType,
        callSessionId: data?.callSessionId || "",
        visitorId: data?.visitorId || activeThreadId,
        rtcConfig: data?.rtcConfig || null
      }));
      navigate(`/session/${activeThreadId}/${nextType}`);
    } catch (requestError) {
      setError(requestError?.message || `Unable to start ${nextType} call.`);
    } finally {
      setCallBusyType("");
    }
  };

  const handleAnswerIncomingCall = () => {
    if (!incomingCall?.sessionId || !incomingCall?.callSessionId) return;
    window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify({
      sessionId: incomingCall.sessionId,
      hasVideo: Boolean(incomingCall.hasVideo),
      callSessionId: incomingCall.callSessionId,
      visitorId: incomingCall.visitorId || incomingCall.sessionId
    }));
    const nextMode = incomingCall.hasVideo ? "video" : "audio";
    const nextSessionId = incomingCall.sessionId;
    setIncomingCall(null);
    navigate(`/session/${nextSessionId}/${nextMode}`);
  };

  const snapshotPhotoUrl = resolveSnapshotUrl(activeThread?.snapshotUrl || activeThread?.photoUrl);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-500/20">

      {/* DYNAMIC HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          
          {/* LEFT AREA: BACK BUTTON & TITLE */}
          <div className="flex items-center gap-3 min-w-0">
            {activeThreadId ? (
              <button
                type="button"
                onClick={() => setActiveThreadId(null)}
                className="flex items-center gap-1.5 p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs rounded-xl hover:bg-indigo-100 transition active:scale-95"
              >
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            {!activeThreadId ? (
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Messages
                {threads.length > 0 && (
                  <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {threads.length}
                  </span>
                )}
              </h1>
            ) : (
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                  {activeThread?.visitorName || activeThread?.name || "Visitor"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">
                  {activeThread?.door || activeThread?.doorName || "Gate Security"}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT AREA: ACTION BUTTONS */}
          {!activeThreadId ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/notifications"
                className="relative p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition active:scale-95"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {snapshotPhotoUrl && (
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(true)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
                  title="View Visitor Photo"
                >
                  <Camera size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStartCall("audio")}
                disabled={Boolean(callBusyType)}
                className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition disabled:opacity-50"
                title="Audio Call Visitor"
              >
                <Phone size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleStartCall("video")}
                disabled={Boolean(callBusyType)}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm disabled:opacity-50"
                title="Video Call Visitor"
              >
                <Video size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* INCOMING CALL BANNER */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-14 z-50 bg-indigo-600 text-white shadow-lg border-b border-indigo-500 px-4 py-3"
          >
            <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full animate-bounce">
                  <PhoneIncoming size={18} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200">Incoming Gate Call</p>
                  <p className="text-sm font-bold">{incomingCall.callerName || "Security Gate"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnswerIncomingCall}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setIncomingCall(null)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition"
                >
                  Decline
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ERROR NOTICE */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-3xl mt-3 px-4"
          >
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError("")}
                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        
        {/* VIEW 1: CONVERSATIONS LIST VIEW */}
        {!activeThreadId && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* SEARCH */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search visitors, gates or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm focus:border-indigo-500 transition outline-none placeholder:text-slate-400"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* THREAD LIST CARDS */}
            <div className="space-y-2.5">
              {isLoading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl animate-pulse" />
                ))
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => {
                  const threadId = getThreadId(thread);
                  const status = String(thread.sessionStatus || thread.status || "").toLowerCase();
                  const isApproved = status === "approved";
                  const isRejected = ["rejected", "denied"].includes(status);

                  return (
                    <button
                      key={threadId}
                      type="button"
                      onClick={() => setActiveThreadId(threadId)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 p-4 rounded-2xl text-left flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all active:scale-[0.99] group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-base flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                          {(thread.visitorName || thread.name || "V").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isApproved ? "bg-emerald-500" : isRejected ? "bg-rose-500" : "bg-amber-400 animate-pulse"
                            }`} />
                            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {thread.visitorName || thread.name || "Visitor Request"}
                            </h3>
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-1">
                            {thread.last || "Tap to view conversation thread"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg">
                          {thread.door || thread.doorName || "Gate"}
                        </span>
                        <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
                  <MessageSquare size={32} className="mx-auto stroke-1 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No message history found</p>
                  <p className="text-[11px]">Visitor access requests and gate messages will appear here.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* VIEW 2: SINGLE CONVERSATION / MESSAGE HISTORY VIEW */}
        {activeThreadId && activeThread && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 pb-28"
          >
            {/* THREAD CONTEXT CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  {(activeThread.visitorName || activeThread.name || "V").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {activeThread.visitorName || activeThread.name || "Visitor"}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                    {activeThread.door || activeThread.doorName || "Gate"} • {activeThread.estateName || "Residential Gate"}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  ["approved", "granted"].includes(String(activeThread.sessionStatus || activeThread.status).toLowerCase())
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : ["rejected", "denied"].includes(String(activeThread.sessionStatus || activeThread.status).toLowerCase())
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                }`}>
                  {activeThread.sessionStatus || activeThread.status || "Pending"}
                </span>
              </div>
            </div>

            {/* MESSAGES FEED */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col h-[72vh] min-h-[480px] overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                {conversationLoading && activeMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading message history...</span>
                  </div>
                ) : activeMessages.length > 0 ? (
                  activeMessages.map((msg, index) => {
                    const senderType = String(msg.senderType || msg.sender_type || msg.senderRole || msg.sender_role || "").toLowerCase();
                    const isSecurity = ["security", "guard", "gateman", "gate_security"].includes(senderType);
                    const isSystem = ["system", "status"].includes(senderType);

                    if (isSystem) {
                      return (
                        <div key={msg.id || index} className="flex justify-center my-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full">
                            {msg.text || msg.message || msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isSecurity ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                            isSecurity
                              ? "bg-indigo-600 text-white rounded-br-none shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none shadow-sm"
                          }`}
                        >
                          {!isSecurity && (
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                              {msg.senderName || msg.sender_name || "Visitor"}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.text || msg.message || msg.content}</p>

                          {msg.snapshotUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden max-w-xs">
                              <SecureSnapshotImage
                                src={resolveSnapshotUrl(msg.snapshotUrl)}
                                alt="Visitor photo"
                                className="w-full h-auto object-cover rounded-xl"
                              />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 px-1">
                          {msg.at ? new Date(msg.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 space-y-2">
                    <MessageSquare size={28} className="stroke-1 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-bold">No messages in this conversation yet.</p>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type a message to the visitor..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  disabled={sendPending}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 transition outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={sendPending || !typedMessage.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-xl transition shadow-sm"
                  aria-label="Send message"
                >
                  {sendPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </main>

      {/* VISITOR SNAPSHOT PHOTO MODAL */}
      <AnimatePresence>
        {showSnapshotModal && snapshotPhotoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 max-w-md w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {activeThread?.visitorName || "Visitor Photo"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Gate Capture
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSnapshotModal(false)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[60vh] bg-slate-950 flex items-center justify-center">
                <SecureSnapshotImage
                  src={snapshotPhotoUrl}
                  alt={activeThread?.visitorName || "Visitor photo snapshot"}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
