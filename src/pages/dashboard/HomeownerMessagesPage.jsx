import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  Bell, ChevronLeft, LayoutGrid, History, CalendarDays,
  MessageSquare, User, Search, SendHorizontal, Trash2
} from "lucide-react";
import VoiceNoteRecorder from "../../components/VoiceNoteRecorder";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import { resolveVoiceNoteUrl, uploadResidentVoiceNote } from "../../services/voiceNoteService";
import { playMessageNotificationSound } from "../../utils/notificationSound";
  deleteResidentSessionMessage,
  getResidentMessages,
  getResidentSessionMessages,
  sendResidentSessionMessage
} from "../../services/residentService";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";

export default function ResidentMessagesPage() {
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

  const messagesRef = useRef(null);
  const selectedIdRef = useRef("");
  const threadsRef = useRef([]);
  const socketRef = useRef(null);
  const joinedSessionIdsRef = useRef(new Set());
  const token = localStorage.getItem("qring_access_token");

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { threadsRef.current = threads; }, [threads]);

  // --- Initial Data Load ---
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getResidentMessages();
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

  // --- Socket Logic & Message Handlers ---
  useEffect(() => {
    if (!token) return;
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      auth: (cb) => {
        const latestToken = localStorage.getItem("qring_access_token");
        cb(latestToken ? { token: latestToken } : {});
      }
    });
    socketRef.current = socket;

    socket.on("chat.message", (payload) => {
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
        if (current.some((item) => isLikelyDuplicateMessage(item, normalized))) return prev;
        return { ...prev, [incomingSessionId]: [...current, normalized] };
      });
      if (normalized.senderType !== "homeowner") playMessageNotificationSound();
      upsertThreadPreview(normalized, setThreads, selectedIdRef.current);
    });

    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    if (!selectedId) return;
    async function loadConv() {
        setConversationLoading(true);
        try {
            const rows = await getHomeownerSessionMessages(selectedId);
            setMessagesByThread(prev => ({ ...prev, [selectedId]: rows }));
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

  async function handleSend(e) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, text);
      const outbound = { id: saved?.id || Date.now(), sessionId: selectedId, text, senderType: "homeowner", at: new Date().toISOString() };
      setMessagesByThread(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), outbound] }));
      setDraft("");
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
  }

  async function handleSendVoiceNote(file) {
    if (!selectedId) return;
    setSending(true);
    try {
      const upload = await uploadHomeownerVoiceNote(selectedId, file);
      const url = resolveVoiceNoteUrl(upload?.url);
      const text = `voice_note_url:${url}`;
      await sendHomeownerSessionMessage(selectedId, text);
      setMessagesByThread(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), { text, senderType: "homeowner", at: new Date() }] }));
    } catch (err) { setError(err.message); }
    finally { setSending(false); }
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
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Live: {heroThread?.gateLabel || "Main Entry"}
              </h2>
            </div>
            {heroThread?.photoUrl && (
                <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                    <img src={heroThread.photoUrl} className="w-full h-full object-cover" />
                </div>
            )}
          </div>

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
            <div className="flex gap-2 mb-4">
                 <button onClick={() => handleSend({ preventDefault: () => {}, target: { value: "Please wait, checking." } })} className="flex-1 py-2 bg-slate-50 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">Wait</button>
                 <button onClick={() => handleSend({ preventDefault: () => {}, target: { value: "Access Granted." } })} className="flex-1 py-2 bg-emerald-50 rounded-xl text-[9px] font-black uppercase text-emerald-600">Grant</button>
            </div>
            <form onSubmit={handleSend} className="relative">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type secure reply..."
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-5 pr-24 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600/10"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <VoiceNoteRecorder onSend={handleSendVoiceNote} />
                <button type="submit" disabled={!draft.trim() || sending} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50">
                  <SendHorizontal size={18} />
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/homeowner/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
        <NavItem to="/dashboard/homeowner/messages" icon={<MessageSquare size={22} />} label="Inbox" active />
        <NavItem to="/dashboard/homeowner/settings" icon={<User size={22} />} label="Profile" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] transition-all active:scale-90 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{label}</span>
    </Link>
  );
}

// --- Helpers ---
function formatClockTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderMessageBody(text) {
  if (text?.startsWith("voice_note")) {
    const src = text.split(":")[1];
    return <audio src={src} controls className="h-8 w-40" />;
  }
  return <p>{text}</p>;
}

function previewMessageText(text) {
  if (text?.startsWith("voice_note")) return "Voice note";
  return text;
}

function isLikelyDuplicateMessage(a, b) {
  return a.text === b.text && Math.abs(new Date(a.at) - new Date(b.at)) < 2000;
}

function upsertThreadPreview(msg, setThreads, selectedId) {
    setThreads(prev => prev.map(t => t.id === msg.sessionId ? { ...t, last: previewMessageText(msg.text), time: msg.at } : t));
}

function sortThreadsForInbox(threads) {
  return [...threads].sort((a, b) => new Date(b.time) - new Date(a.time));
}