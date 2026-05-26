import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal, MessageSquare, Menu
} from "lucide-react";
import VisitorIncomingCallModal from "../../components/VisitorIncomingCallModal";
import { env } from "../../config/env";
import { getAccessToken } from "../../services/authStorage";
import { apiRequest } from "../../services/apiClient";
import { RealtimeEvent } from "../../services/realtimeEvents";
import { createRealtimeSocket, releaseRealtimeSocket } from "../../services/socketClient";
import { playMessageNotificationSound } from "../../utils/notificationSound";
import {
  decideVisit,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  sendHomeownerSessionMessage
} from "../../services/homeownerService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";

export default function HomeownerMessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount: globalUnreadCount } = useNotifications();
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
  const [typingByThread, setTypingByThread] = useState({});
  const [mobileView, setMobileView] = useState("list"); // "list" or "chat"
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
  const seenCallInviteIdsRef = useRef(new Set());
  const token = getAccessToken();

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);
  useEffect(() => { callBusyRef.current = callBusy; }, [callBusy]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messagesByThread, selectedId]);

  // --- Initial Data Load ---
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getHomeownerMessages();
        if (!active) return;
        const normalized = (data || []).map((thread) => ({
          ...thread,
          last: previewMessageText(thread?.last || "")
        }));
        const sorted = sortThreadsForInbox(normalized);
        setThreads(sorted);
        const preferredExists = preferredSessionId && sorted.some((item) => item.id === preferredSessionId);
        const defaultId = preferredExists ? preferredSessionId : sorted[0]?.id || "";
        setSelectedId((prev) => prev || defaultId);
        
        if (defaultId && window.innerWidth < 768) {
          // Keep it on list initially for mobile unless explicitly chosen
          setMobileView("list");
        } else if (defaultId) {
          setMobileView("chat");
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
        const data = await getHomeownerMessages();
        const normalized = (data || []).map((thread) => ({
          ...thread,
          last: previewMessageText(thread?.last || "")
        }));
        const sorted = sortThreadsForInbox(normalized);
        setThreads((prev) => mergeThreadCollections(prev, sorted));
      } catch {
        // Keep polling best-effort
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  // --- Socket Logic & Message Handlers ---
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

    const handleChatMessage = (payload) => {
      const incomingSessionId = payload?.sessionId;
      if (!incomingSessionId) return;
      const normalized = {
        id: payload?.id ?? `${payload?.at || Date.now()}-${Math.random()}`,
        sessionId: incomingSessionId,
        text: payload?.text || "",
        senderType: payload?.senderType || "visitor",
        displayName: payload?.displayName || "Participant",
        at: payload?.at || new Date().toISOString()
      };
      setMessagesByThread((prev) => {
        const current = prev[incomingSessionId] ?? [];
        return { ...prev, [incomingSessionId]: mergeMessageCollections(current, [normalized]) };
      });
      if (normalized.senderType !== "homeowner") playMessageNotificationSound();
      upsertThreadPreview(normalized, setThreads, selectedIdRef.current);
    };

    const handleSessionStatus = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      const nextStatus = String(payload?.status || "").trim();
      if (!incomingSessionId || !nextStatus) return;
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === incomingSessionId
            ? {
                ...thread,
                sessionStatus: nextStatus,
                last: payload?.sessionActivated ? "Access approved. Visitor can now enter the session." : thread.last,
                time: new Date().toISOString()
              }
            : thread
        )
      );
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

    const handleNewVisitorRequest = async () => {
      try {
        const data = await getHomeownerMessages();
        const normalized = (data || []).map((thread) => ({
          ...thread,
          last: previewMessageText(thread?.last || "")
        }));
        const sorted = sortThreadsForInbox(normalized);
        setThreads((prev) => mergeThreadCollections(prev, sorted));
        if (!selectedIdRef.current && sorted[0]?.id) {
          setSelectedId(sorted[0].id);
        }
      } catch {
        // ignore transient refresh failures
      }
    };

    const handleCallInvite = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      const callSessionId = String(payload?.callSessionId || "").trim();
      if (!incomingSessionId || !callSessionId) return;
      if (callBusyRef.current.startsWith(`${incomingSessionId}:`)) return;
      if (seenCallInviteIdsRef.current.has(callSessionId)) return;
      if (incomingCall.pending && incomingCall.callSessionId === callSessionId) return;
      seenCallInviteIdsRef.current.add(callSessionId);
      socket.timeout(5000).emit(RealtimeEvent.CALL_INVITE_RECEIVED, {
        sessionId: incomingSessionId,
        callSessionId
      }, () => {});
      setIncomingCall({
        pending: true,
        hasVideo: Boolean(payload?.hasVideo),
        callSessionId,
        visitorId: String(payload?.visitorId || incomingSessionId),
        sessionId: incomingSessionId
      });
      if (!selectedIdRef.current) {
        setSelectedId(incomingSessionId);
      }
    };

    socket.on("chat.message", handleChatMessage);
    socket.on("session.status", handleSessionStatus);
    socket.on("session.activated", handleSessionActivated);
    socket.on("chat.typing", handleChatTyping);
    socket.on("incoming-call", handleIncomingCallNotice);
    socket.on("new_visitor_request", handleNewVisitorRequest);
    socket.on("call.invite", handleCallInvite);

    return () => {
      socket.off("chat.message", handleChatMessage);
      socket.off("session.status", handleSessionStatus);
      socket.off("session.activated", handleSessionActivated);
      socket.off("chat.typing", handleChatTyping);
      socket.off("incoming-call", handleIncomingCallNotice);
      socket.off("new_visitor_request", handleNewVisitorRequest);
      socket.off("call.invite", handleCallInvite);
      socketRef.current = null;
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
        autoConnect: true,
        reconnection: true,
        withCredentials: true
      });
    };
  }, [incomingCall.callSessionId, incomingCall.pending, token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const joinSession = (sessionId) => {
      const normalizedId = String(sessionId || "").trim();
      if (!normalizedId || joinedSessionIdsRef.current.has(normalizedId)) return;
      socket.timeout(5000).emit(RealtimeEvent.SESSION_JOIN, {
        sessionId: normalizedId,
        displayName: user?.fullName || "Homeowner"
      }, () => {});
      joinedSessionIdsRef.current.add(normalizedId);
    };

    threads.forEach((thread) => joinSession(thread.id));
    if (selectedId) joinSession(selectedId);
  }, [selectedId, threads, user?.fullName]);

  useEffect(() => {
    if (!selectedId) return;
    async function loadConv() {
        setConversationLoading(true);
        try {
            const rows = await getHomeownerSessionMessages(selectedId);
            setMessagesByThread(prev => ({ ...prev, [selectedId]: mergeMessageCollections(prev[selectedId] || [], rows) }));
            setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, unread: 0 } : t));
        } catch (err) { setError(err.message); }
        finally { setConversationLoading(false); }
    }
    loadConv();
  }, [selectedId]);

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    const sorted = sortThreadsForInbox(threads);
    if (!term) return sorted;
    return sorted.filter((t) => [t.name, t.last].join(" ").toLowerCase().includes(term));
  }, [threads, query]);

  const heroThread = useMemo(() => threads.find(t => t.id === selectedId) || filteredThreads[0], [threads, selectedId, filteredThreads]);
  const selectedMessages = useMemo(() => messagesByThread[selectedId] || [], [messagesByThread, selectedId]);
  const heroThreadState = String(heroThread?.sessionStatus || "").trim().toLowerCase();
  const accessAlreadyGranted = useMemo(() => {
    if (["approved", "accepted", "gate_confirmed", "completed", "closed"].includes(heroThreadState)) {
      return true;
    }
    return selectedMessages.some((msg) => String(msg?.text || "").trim().toLowerCase() === "access granted.");
  }, [heroThreadState, selectedMessages]);

  const decisionBusy = Boolean(decisionAction);

  const selectThreadOnMobile = (id) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  async function handleSend(e) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, text);
      if (saved) {
        socketRef.current?.emit("chat.typing", {
          sessionId: selectedId,
          senderType: "homeowner",
          displayName: user?.fullName || "Homeowner",
          isTyping: false
        });
        setMessagesByThread((prev) => {
          const current = prev[selectedId] || [];
          return { ...prev, [selectedId]: mergeMessageCollections(current, [saved]) };
        });
        upsertThreadPreview(saved, setThreads, selectedId);
      }
      setDraft("");
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function handleQuickReply(text) {
    const normalized = String(text || "").trim();
    if (!normalized || sending) return;
    setDraft(normalized);
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, normalized);
      if (saved) {
        setMessagesByThread((prev) => {
          const current = prev[selectedId] || [];
          return { ...prev, [selectedId]: mergeMessageCollections(current, [saved]) };
        });
        upsertThreadPreview(saved, setThreads, selectedId);
      }
      setDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleGrantAccess() {
    if (!selectedId || decisionBusy || accessAlreadyGranted) return;
    setDecisionAction("approve");
    setError("");
    try {
      await decideVisit(selectedId, "approve");
      const saved = await sendHomeownerSessionMessage(selectedId, "Access granted.");
      if (saved) {
        setMessagesByThread((prev) => {
          const current = prev[selectedId] || [];
          return { ...prev, [selectedId]: mergeMessageCollections(current, [saved]) };
        });
        upsertThreadPreview(saved, setThreads, selectedId, { sessionStatus: "approved" });
      } else {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === selectedId ? { ...thread, sessionStatus: "approved" } : thread
          )
        );
      }
    } catch (err) {
      setError(err?.message || "Unable to grant access.");
    } finally {
      setDecisionAction("");
    }
  }

  async function handleRejectAccess() {
    if (!selectedId || decisionBusy) return;
    setDecisionAction("reject");
    setError("");
    try {
      await decideVisit(selectedId, "reject");
      const saved = await sendHomeownerSessionMessage(selectedId, "Access declined.");
      if (saved) {
        setMessagesByThread((prev) => {
          const current = prev[selectedId] || [];
          return { ...prev, [selectedId]: mergeMessageCollections(current, [saved]) };
        });
        upsertThreadPreview(saved, setThreads, selectedId, { sessionStatus: "rejected" });
      } else {
        setThreads((prev) =>
          prev.map((thread) =>
            thread.id === selectedId ? { ...thread, sessionStatus: "rejected" } : thread
          )
        );
      }
    } catch (err) {
      setError(err?.message || "Unable to reject visitor.");
    } finally {
      setDecisionAction("");
    }
  }

  async function handleStartCall(type) {
    if (!selectedId || callBusy || !accessAlreadyGranted) return;
    const nextMode = type === "video" ? "video" : "audio";
    const busyKey = `${selectedId}:${nextMode}`;
    setCallBusy(busyKey);
    setError("");
    try {
      const response = await apiRequest("/calls/start", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, type: nextMode, hasVideo: nextMode === "video" })
      });
      const data = response?.data ?? response ?? {};
      window.sessionStorage.setItem(
        "qring_call_start_intent",
        JSON.stringify({
          pending: true,
          sessionId: selectedId,
          mode: nextMode,
          callSessionId: data?.callSessionId || "",
          visitorId: data?.visitorId || selectedId,
          rtcConfig: data?.rtcConfig || null
        })
      );
      navigate(`/session/${selectedId}/${nextMode}`);
    } catch (err) {
      setError(err?.message || `Unable to start ${nextMode} call.`);
    } finally {
      setCallBusy("");
    }
  }

  function handleAcceptIncomingCall() {
    if (!incomingCall.pending || !incomingCall.sessionId || !incomingCall.callSessionId) return;
    setCallBusy(`${incomingCall.sessionId}:${incomingCall.hasVideo ? "video" : "audio"}`);
    try {
      window.sessionStorage.setItem(
        "qring_call_accept_intent",
        JSON.stringify({
          sessionId: incomingCall.sessionId,
          hasVideo: incomingCall.hasVideo,
          callSessionId: incomingCall.callSessionId,
          visitorId: incomingCall.visitorId
        })
      );
    } catch {
      // Keep storage failure non-blocking and continue to route.
    }
    const mode = incomingCall.hasVideo ? "video" : "audio";
    seenCallInviteIdsRef.current.add(incomingCall.callSessionId);
    setIncomingCall({
      pending: false,
      hasVideo: false,
      callSessionId: "",
      visitorId: "",
      sessionId: ""
    });
    navigate(`/session/${incomingCall.sessionId}/${mode}`);
  }

  async function handleRejectIncomingCall() {
    const activeIncoming = incomingCall;
    if (activeIncoming.callSessionId) {
      seenCallInviteIdsRef.current.add(activeIncoming.callSessionId);
    }
    setIncomingCall({
      pending: false,
      hasVideo: false,
      callSessionId: "",
      visitorId: "",
      sessionId: ""
    });
    if (!activeIncoming.callSessionId) return;
    try {
      await apiRequest("/calls/end", {
        method: "POST",
        body: JSON.stringify({
          callSessionId: activeIncoming.callSessionId,
          participantType: "homeowner"
        })
      });
    } catch (err) {
      setError(err?.message || "Unable to reject call.");
    }
  }

  return (
    <div className="bg-[#f8f9fa] h-screen font-sans flex flex-col overflow-hidden">
      {/* Dynamic Top Header */}
      <header className="w-full z-[100] bg-white border-b border-slate-100 px-4 py-3 md:px-6 md:py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            {mobileView === "chat" && (
              <button 
                onClick={() => setMobileView("list")} 
                className="md:hidden p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50"
              >
                <Menu size={18} />
              </button>
            )}
            <button onClick={() => navigate(-1)} className="p-2 md:p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="font-bold text-base md:text-lg text-slate-900 leading-none">Inbox</h1>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Secure Communications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/notifications" className="relative p-2 md:p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <Bell size={18} />
              {globalUnreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-2 bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold border border-rose-100 uppercase tracking-tight flex-shrink-0">
          {error}
        </div>
      )}

      {/* Main Container Layout split-view setup */}
      <main className="max-w-6xl w-full mx-auto flex flex-1 overflow-hidden p-2 md:p-4 gap-4">
        
        {/* Left Side: Thread List (Hidden on Mobile if Chat open) */}
        <section className={`w-full md:w-80 flex flex-col flex-shrink-0 gap-3 ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white border border-slate-100 rounded-xl py-3 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-600/10 outline-none"
            />
          </div>

          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto pb-2 md:pb-0 flex-1 premium-scrollbar">
            {filteredThreads.map((thread) => {
              const isActive = selectedId === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => selectThreadOnMobile(thread.id)}
                  className={`flex-shrink-0 md:w-full flex items-center gap-3 p-3 rounded-xl transition-all border text-left ${
                    isActive ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-700'}`}>
                    {(thread.name || "V")[0]}
                  </div>
                  <div className="pr-2 min-w-0 flex-1 hidden sm:block md:block">
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none truncate">{thread.name || "Visitor"}</p>
                    <p className="text-[10px] mt-1 truncate opacity-80 max-w-[150px]">{thread.last || "No messages"}</p>
                    <p className={`text-[9px] mt-1 font-bold opacity-60`}>{formatClockTime(thread.time)}</p>
                  </div>
                  {/* Minified layout for micro viewports */}
                  <div className="sm:hidden md:hidden pr-1">
                    <p className="text-[11px] font-black uppercase leading-none">{thread.name || "V"}</p>
                  </div>
                </button>
              );
            })}
            {filteredThreads.length === 0 && (
              <div className="text-center p-6 text-slate-400 text-xs w-full">No active sessions</div>
            )}
          </div>
        </section>

        {/* Right Side: Responsive Dynamic Live Feed Window */}
        <section className={`flex-1 bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
          {heroThread ? (
            <>
              {/* Dynamic Context and Image Snapshot Header Banner */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo/Snapshot Block rendering safely */}
                  {heroThread?.photoUrl ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0 shadow-sm">
                      <img src={heroThread.photoUrl} alt="Visitor snapshot" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg font-black text-indigo-500 flex-shrink-0 shadow-sm">
                      {(heroThread?.name || "V")[0]}
                    </div>
                  )}
                  
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                      <h2 className="text-sm font-bold text-slate-800 truncate">{heroThread?.name || "Visitor"}</h2>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                      {[heroThread?.purpose, heroThread?.visitorPhone].filter(Boolean).join(" • ") || "Entry Session Context"}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-indigo-600 font-bold mt-0.5">
                      {heroThread?.gateLabel || "Main Guard Gate"} • {heroThread?.unitName || "Unit Residence"}
                    </p>
                    {typingByThread[selectedId]?.isTyping && (
                      <p className="text-[10px] font-semibold text-amber-600 animate-bounce mt-1">
                        Typing...
                      </p>
                    )}
                  </div>
                </div>

                {/* Micro Action Badges layout */}
                <div className="hidden sm:flex flex-col text-right text-xs gap-1">
                  <span className="font-bold text-slate-700">Status: <span className="uppercase text-[11px] text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-md ml-1">{heroThread?.sessionStatus || "Pending"}</span></span>
                  <span className="text-[10px] text-slate-400">{formatClockTime(heroThread?.time)}</span>
                </div>
              </div>

              {/* Chat Thread Messaging Core Workspace Area */}
              <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50/30 premium-scrollbar">
                {conversationLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  selectedMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.senderType === 'homeowner' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-xl text-sm ${
                        msg.senderType === 'homeowner'
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm font-medium'
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/60 shadow-xs'
                      }`}>
                        {renderMessageBody(msg.text)}
                        <p className={`text-[8px] mt-1.5 font-bold uppercase tracking-tight text-right ${msg.senderType === 'homeowner' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatClockTime(msg.at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Workspace & Context-Aware Quick Response Actions Panel */}
              <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex-shrink-0">
                {accessAlreadyGranted ? (
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartCall("audio")}
                      disabled={callBusy === `${selectedId}:audio`}
                      className="flex-1 rounded-xl bg-slate-100 hover:bg-indigo-50 py-2.5 text-[10px] font-black uppercase text-indigo-600 transition-all disabled:opacity-60"
                    >
                      {callBusy === `${selectedId}:audio` ? "Calling..." : "Audio Call"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartCall("video")}
                      disabled={callBusy === `${selectedId}:video`}
                      className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-[10px] font-black uppercase text-white transition-all disabled:opacity-60"
                    >
                      {callBusy === `${selectedId}:video` ? "Calling..." : "Video Call"}
                    </button>
                  </div>
                ) : (
                  <div className="mb-3 flex gap-2">
                    <button type="button" onClick={() => handleQuickReply("Please wait, checking.")} disabled={sending || decisionBusy} className="flex-1 py-2.5 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all disabled:opacity-60">Wait</button>
                    <button type="button" onClick={handleRejectAccess} disabled={sending || decisionBusy} className="flex-1 py-2.5 bg-rose-50 rounded-xl text-[10px] font-black uppercase text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-60">{decisionAction === "reject" ? "Declining..." : "Decline"}</button>
                    <button type="button" onClick={handleGrantAccess} disabled={sending || decisionBusy} className="flex-1 py-2.5 bg-emerald-50 rounded-xl text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-60">{decisionAction === "approve" ? "Granting..." : "Grant Entry"}</button>
                  </div>
                )}

                <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    value={draft}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setDraft(nextValue);
                      socketRef.current?.emit("chat.typing", {
                        sessionId: selectedId,
                        senderType: "homeowner",
                        displayName: user?.fullName || "Homeowner",
                        isTyping: Boolean(nextValue.trim())
                      });
                    }}
                    placeholder="Type reply..."
                    className="w-full bg-slate-50 border-none rounded-xl py-3.5 pl-4 pr-16 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/10"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                    <button type="submit" disabled={!draft.trim() || sending} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-40 transition-colors">
                      <SendHorizontal size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-6 bg-slate-50/40">
              <MessageSquare size={36} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Select an active visitor thread to open interaction log</p>
            </div>
          )}
        </section>
      </main>

      <VisitorIncomingCallModal
        open={incomingCall.pending}
        hasVideo={incomingCall.hasVideo}
        callerLabel="Visitor"
        busy={callBusy === `${incomingCall.sessionId}:${incomingCall.hasVideo ? "video" : "audio"}`}
        onAccept={handleAcceptIncomingCall}
        onReject={handleRejectIncomingCall}
      />
    </div>
  );
}

// --- Helpers & Global Methods Preservation ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageBody(text) {
  return <p className="whitespace-pre-wrap break-words">{text}</p>;
}

function previewMessageText(text) {
  return text;
}

function isLikelyDuplicateMessage(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if ((a.sessionId || "") !== (b.sessionId || "")) return false;
  if ((a.senderType || "") !== (b.senderType || "")) return false;
  if ((a.text || "").trim() !== (b.text || "").trim()) return false;
  const left = new Date(a.at).getTime();
  const right = new Date(b.at).getTime();
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return Math.abs(left - right) < 8000;
}

function mergeMessageCollections(current, incoming) {
  const merged = [...(current || [])];
  for (const candidate of incoming || []) {
    if (!candidate) continue;
    const normalized = {
      ...candidate,
      sessionId: candidate.sessionId || candidate.session_id || ""
    };
    const existingIndex = merged.findIndex((item) => isLikelyDuplicateMessage(item, normalized));
    if (existingIndex === -1) {
      merged.push(normalized);
      continue;
    }
    merged[existingIndex] = { ...merged[existingIndex], ...normalized };
  }
  return merged.sort((left, right) => new Date(left.at || 0) - new Date(right.at || 0));
}

function sortThreadsForInbox(arr) {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

function mergeThreadCollections(old, next) {
  const map = new Map(old.map(t => [t.id, t]));
  next.forEach(t => {
    const existing = map.get(t.id);
    map.set(t.id, existing ? { ...existing, ...t } : t);
  });
  return Array.from(map.values());
}

function upsertThreadPreview(msg, setThreads, selectedId, extra = {}) {
  setThreads((prev) => {
    const matched = prev.find(t => t.id === msg.sessionId);
    if (matched) {
      return prev.map(t => t.id === msg.sessionId ? {
        ...t,
        last: msg.text,
        time: msg.at,
        unread: t.id === selectedId ? 0 : (t.unread || 0) + 1,
        ...extra
      } : t);
    }
    return [{ id: msg.sessionId, last: msg.text, time: msg.at, unread: 1, ...extra }, ...prev];
  });
}