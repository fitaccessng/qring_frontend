import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal
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
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [decisionAction, setDecisionAction] = useState("");
  const [callBusy, setCallBusy] = useState("");
  const [typingByThread, setTypingByThread] = useState({});
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
        setSelectedId((prev) => prev || (preferredExists ? preferredSessionId : sorted[0]?.id || ""));
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
        // Keep polling best-effort so temporary backend issues do not wipe the inbox.
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

    const handleAnyEvent = (event, data) => {
      console.log("[SOCKET EVENT]", event, data);
    };

    socket.on("chat.message", handleChatMessage);
    socket.on("session.status", handleSessionStatus);
    socket.on("session.activated", handleSessionActivated);
    socket.on("chat.typing", handleChatTyping);
    socket.on("incoming-call", handleIncomingCallNotice);
    socket.on("new_visitor_request", handleNewVisitorRequest);
    socket.on("call.invite", handleCallInvite);
    socket.onAny(handleAnyEvent);

    return () => {
      socket.off("chat.message", handleChatMessage);
      socket.off("session.status", handleSessionStatus);
      socket.off("session.activated", handleSessionActivated);
      socket.off("chat.typing", handleChatTyping);
      socket.off("incoming-call", handleIncomingCallNotice);
      socket.off("new_visitor_request", handleNewVisitorRequest);
      socket.off("call.invite", handleCallInvite);
      socket.offAny(handleAnyEvent);
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
    joinSession(selectedId);
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
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-32 overflow-x-hidden">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Inbox</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Secure Communications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <Bell size={18} />
              {globalUnreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold border border-rose-100 uppercase tracking-tight">
            {error}
          </div>
        )}

        {/* Search & Active Threads */}
        <section className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-600/10 outline-none"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
            {filteredThreads.map((thread) => {
              const isActive = selectedId === thread.id;
              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedId(thread.id)}
                  className={`flex-shrink-0 flex items-center gap-3 p-3 rounded-2xl transition-all border ${
                    isActive ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-600"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {(thread.name || "V")[0]}
                  </div>
                  <div className="pr-2">
                    <p className="text-[11px] font-black uppercase tracking-tight leading-none">{thread.name || "Visitor"}</p>
                    <p className={`text-[9px] mt-1 font-bold opacity-60`}>{formatClockTime(thread.time)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Chat Window */}
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[60vh]">
          {/* Live Feed / Header */}
          <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <div className="min-w-0">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Live: {heroThread?.gateLabel || "Main Entry"}
                </h2>
                <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                  {[heroThread?.purpose, heroThread?.visitorPhone].filter(Boolean).join(" • ") || "Waiting for visitor details"}
                </p>
                {typingByThread[selectedId]?.isTyping ? (
                  <p className="mt-1 text-[10px] font-semibold text-amber-600">
                    {typingByThread[selectedId]?.displayName || "Visitor"} is typing...
                  </p>
                ) : null}
              </div>
            </div>
            {heroThread?.photoUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                    <img src={heroThread.photoUrl} className="w-full h-full object-cover" />
                </div>
            )}
          </div>

          {heroThread ? (
            <div className="grid gap-4 border-b border-slate-100 bg-white px-5 py-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Visitor approval context</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DetailChip label="Visitor" value={heroThread.name || "Visitor"} />
                  <DetailChip label="Phone" value={heroThread.visitorPhone || "Not shared"} />
                  <DetailChip label="Purpose" value={heroThread.purpose || "Not provided"} />
                  <DetailChip label="Door / Unit" value={[heroThread.door, heroThread.unitName].filter(Boolean).join(" • ") || "Unknown"} />
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-[1.75rem] border border-slate-100 bg-slate-50 px-4 py-4">
                {heroThread.photoUrl ? (
                  <img
                    src={heroThread.photoUrl}
                    alt={`${heroThread.name || "Visitor"} snapshot`}
                    className="h-20 w-20 rounded-[1.5rem] object-cover shadow-sm"
                  />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-[1.5rem] bg-white text-lg font-black text-slate-400 shadow-sm">
                    {(heroThread.name || "V")[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{heroThread.name || "Visitor"}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{heroThread.gateLabel || heroThread.door || "Entry point"}</p>
                  <p className="mt-2 text-xs text-slate-500">{heroThread.estateName || heroThread.unitName || "Pending homeowner review"}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Messages Area */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
            {conversationLoading ? (
               <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
            ) : selectedMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.senderType === 'homeowner' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm font-medium ${
                  msg.senderType === 'homeowner'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50'
                }`}>
                  {renderMessageBody(msg.text)}
                  <p className={`text-[8px] mt-2 font-bold opacity-50 uppercase ${msg.senderType === 'homeowner' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {formatClockTime(msg.at)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-50">
            {accessAlreadyGranted ? (
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleStartCall("audio")}
                  disabled={callBusy === `${selectedId}:audio`}
                  className="flex-1 rounded-xl bg-indigo-50 py-2 text-[9px] font-black uppercase text-indigo-600 transition-all disabled:opacity-60"
                >
                  {callBusy === `${selectedId}:audio` ? "Calling..." : "Audio Call"}
                </button>
                <button
                  type="button"
                  onClick={() => handleStartCall("video")}
                  disabled={callBusy === `${selectedId}:video`}
                  className="flex-1 rounded-xl bg-slate-900 py-2 text-[9px] font-black uppercase text-white transition-all disabled:opacity-60"
                >
                  {callBusy === `${selectedId}:video` ? "Calling..." : "Video Call"}
                </button>
              </div>
            ) : (
              <div className="mb-4 flex gap-2">
                <button type="button" onClick={() => handleQuickReply("Please wait, checking.")} disabled={sending || decisionBusy} className="flex-1 py-2 bg-slate-50 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-60">Wait</button>
                <button type="button" onClick={handleRejectAccess} disabled={sending || decisionBusy} className="flex-1 py-2 bg-rose-50 rounded-xl text-[9px] font-black uppercase text-rose-600 disabled:opacity-60">{decisionAction === "reject" ? "Rejecting..." : "Reject"}</button>
                <button type="button" onClick={handleGrantAccess} disabled={sending || decisionBusy} className="flex-1 py-2 bg-emerald-50 rounded-xl text-[9px] font-black uppercase text-emerald-600 disabled:opacity-60">{decisionAction === "approve" ? "Accepting..." : "Accept"}</button>
              </div>
            )}
            <form onSubmit={handleSend} className="relative">
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
                placeholder="Type secure reply..."
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-5 pr-24 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/10"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="submit" disabled={!draft.trim() || sending} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50">
                  <SendHorizontal size={18} />
                </button>
              </div>
            </form>
          </div>
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

// --- Helpers ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageBody(text) {
  return <p>{text}</p>;
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

function upsertThreadPreview(msg, setThreads, selectedId, extra = {}) {
    setThreads(prev => prev.map(t => t.id === msg.sessionId ? { ...t, last: previewMessageText(msg.text), time: msg.at, ...extra } : t));
}

function sortThreadsForInbox(threads) {
  return [...threads].sort((a, b) => new Date(b.time) - new Date(a.time));
}

function mergeThreadCollections(current, incoming) {
  const map = new Map();
  for (const thread of current || []) {
    map.set(thread.id, thread);
  }
  for (const thread of incoming || []) {
    const previous = map.get(thread.id);
    map.set(thread.id, previous ? { ...previous, ...thread } : thread);
  }
  return sortThreadsForInbox(Array.from(map.values()));
}

function DetailChip({ label, value }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}
