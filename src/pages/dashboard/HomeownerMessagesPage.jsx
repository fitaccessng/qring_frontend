import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, Search, SendHorizontal, MessageSquare, ArrowLeft
} from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
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
  const seenCallInviteIdsRef = useRef(new Set());
  const token = getAccessToken();

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);
  useEffect(() => { callBusyRef.current = callBusy; }, [callBusy]);

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
        const data = await getHomeownerMessages();
        if (!active) return;
        const normalized = (data || []).map((thread) => ({
          ...thread,
          last: previewMessageText(thread?.last || "")
        }));
        const sorted = sortThreadsForInbox(normalized);
        setThreads(sorted);
        
        const preferredExists = preferredSessionId && sorted.some((item) => item.id === preferredSessionId);
        const targetId = preferredExists ? preferredSessionId : sorted[0]?.id || "";
        
        if (targetId) {
          setSelectedId(targetId);
          if (preferredExists) {
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
        const data = await getHomeownerMessages();
        const normalized = (data || []).map((thread) => ({
          ...thread,
          last: previewMessageText(thread?.last || "")
        }));
        const sorted = sortThreadsForInbox(normalized);
        setThreads((prev) => mergeThreadCollections(prev, sorted));
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
        sessionId: incomingSessionId
      });
    };

    socket.on("chat.message", handleChatMessage);
    socket.on("session.status", handleSessionStatus);
    socket.on("session.activated", handleSessionActivated);
    socket.on("chat.typing", handleChatTyping);
    socket.on("incoming-call", handleIncomingCallNotice);
    socket.on("call.invite", handleCallInvite);

    return () => {
      socket.off("chat.message", handleChatMessage);
      socket.off("session.status", handleSessionStatus);
      socket.off("session.activated", handleSessionActivated);
      socket.off("chat.typing", handleChatTyping);
      socket.off("incoming-call", handleIncomingCallNotice);
      socket.off("call.invite", handleCallInvite);
      socketRef.current = null;
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling");
    };
  }, [token]);

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

  const handleSelectThread = (id) => {
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
      const response = await apiRequest("/calls/start", {
        method: "POST",
        body: JSON.stringify({ sessionId: selectedId, type: mode, hasVideo: mode === "video" })
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
    if (!incomingCall.sessionId) return;
    const mode = incomingCall.hasVideo ? "video" : "audio";
    window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify({ ...incomingCall }));
    setIncomingCall({ pending: false, hasVideo: false, callSessionId: "", visitorId: "", sessionId: "" });
    navigate(`/session/${incomingCall.sessionId}/${mode}`);
  }

  return (
    <div className="bg-[#f8f9fa] h-screen w-screen flex flex-col overflow-hidden font-sans antialiased text-slate-800">
      
      {/* Dynamic Native Top Header Row Container */}
      <header className="w-full bg-white border-b border-slate-100 px-4 py-3.5 flex-shrink-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {mobileView === "chat" ? (
              <button onClick={() => setMobileView("list")} className="md:hidden flex items-center gap-1.5 text-indigo-600 text-xs font-black uppercase tracking-tight bg-indigo-50 px-3 py-2 rounded-xl">
                <ArrowLeft size={14} />
                <span>Visitors</span>
              </button>
            ) : (
              <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className={mobileView === "chat" ? "hidden md:block" : "block"}>
              <h1 className="font-extrabold text-base md:text-lg text-slate-900 leading-none">Access Control</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live Portals</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100">
              <Bell size={18} />
              {globalUnreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Global Contextual Search Control pinned permanently to Header base */}
      <div className={`w-full bg-white border-b border-slate-100 p-3 flex-shrink-0 ${mobileView === "chat" ? "hidden md:block" : "block"}`}>
        <div className="max-w-6xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entry points, purpose, or visitors..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 outline-none transition-shadow"
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
                  {heroThread?.photoUrl ? (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-slate-200 bg-white flex-shrink-0 shadow-sm">
                      <SecureSnapshotImage
                        src={heroThread.photoUrl}
                        alt="Secure entryway capture pass snapshot"
                        className="w-full h-full object-cover"
                        fallback={<div className="grid h-full w-full place-items-center bg-slate-200 text-[10px] font-black text-slate-400">N/A</div>}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-base font-black text-indigo-600 flex-shrink-0 shadow-sm">
                      {(heroThread?.name || "V")[0]}
                    </div>
                  )}
                  
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-slate-900 truncate leading-tight uppercase tracking-tight">{heroThread?.name || "Visitor Identification"}</h2>
                    <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                      Purpose: <span className="text-slate-700 font-bold">{heroThread?.purpose || "Unprovided verification metrics"}</span>
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
                    <div key={i} className={`flex ${msg.senderType === 'homeowner' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3.5 rounded-xl text-sm ${
                        msg.senderType === 'homeowner'
                        ? 'bg-indigo-600 text-white rounded-tr-none font-medium shadow-xs'
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/70 shadow-xs'
                      }`}>
                        {renderMessageBody(msg.text)}
                        <p className={`text-[8px] mt-1.5 font-bold uppercase tracking-wider text-right ${msg.senderType === 'homeowner' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatClockTime(msg.at)}
                        </p>
                      </div>
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
        callerLabel="Visitor"
        onAccept={handleAcceptIncomingCall}
        onReject={() => setIncomingCall(p => ({ ...p, pending: false }))}
      />
    </div>
  );
}

// --- Component Helper Logics ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageBody(text) {
  return <p className="whitespace-pre-wrap break-words leading-relaxed font-medium">{text}</p>;
}

function previewMessageText(text) {
  return text;
}

function isLikelyDuplicateMessage(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if ((a.sessionId || "") !== (b.sessionId || "")) return false;
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
