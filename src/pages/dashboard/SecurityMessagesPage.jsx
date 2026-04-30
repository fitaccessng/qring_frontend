import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { ChevronLeft, Phone, Search, SendHorizontal, Trash2, Video, X, MessageSquare } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import { getAccessToken } from "../../services/authStorage";
import { playMessageNotificationSound } from "../../utils/notificationSound";
import {
  deleteSecuritySessionMessage,
  getSecurityMessages,
  getSecuritySessionMessages,
  sendSecuritySessionMessage
} from "../../services/securityService";
import { apiRequest } from "../../services/apiClient";

export default function SecurityMessagesPage() {
  const navigate = useNavigate();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [callBusy, setCallBusy] = useState("");
  const [view, setView] = useState("list"); // "list" | "chat" on mobile
  const messagesRef = useRef(null);
  const selectedIdRef = useRef("");
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const token = getAccessToken();

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  function isLikelyDuplicate(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    if ((a.text || "").trim() !== (b.text || "").trim()) return false;
    if ((a.senderType || "") !== (b.senderType || "")) return false;
    const ta = new Date(a.at).getTime(), tb = new Date(b.at).getTime();
    if (isNaN(ta) || isNaN(tb)) return false;
    return Math.abs(ta - tb) < 10000;
  }

  function upsertThreadPreview(msg) {
    if (!msg?.sessionId) return;
    setThreads(prev => prev.map(t =>
      t.id === msg.sessionId
        ? { ...t, last: previewText(msg.text), time: msg.at, unread: selectedIdRef.current === msg.sessionId || msg.senderType === "security" ? 0 : (t.unread || 0) + 1 }
        : t
    ));
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const data = await getSecurityMessages();
        if (!active) return;
        const normalized = (data || []).map(t => ({ ...t, last: previewText(t?.last || "") }));
        setThreads(normalized);
        const firstId = preferredSessionId && normalized.some(r => r.id === preferredSessionId)
          ? preferredSessionId : normalized[0]?.id || "";
        setSelectedId(prev => prev || firstId);
      } catch (e) {
        if (active) setError(e?.message || "Failed to load conversations.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [preferredSessionId]);

  useEffect(() => {
    if (!preferredSessionId) return;
    const exists = threads.some(t => t.id === preferredSessionId);
    if (!exists) return;
    setSelectedId(preferredSessionId);
    setView("chat");
    setSearchParams(curr => { const n = new URLSearchParams(curr); n.delete("sessionId"); return n; }, { replace: true });
  }, [preferredSessionId, setSearchParams, threads]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    async function loadConvo() {
      setConversationLoading(true);
      try {
        const [rows, latest] = await Promise.all([getSecuritySessionMessages(selectedId), getSecurityMessages()]);
        if (!active) return;
        setMessagesByThread(prev => ({ ...prev, [selectedId]: rows }));
        setThreads(latest.map(t => ({ ...t, last: previewText(t?.last || ""), unread: t.id === selectedId ? 0 : t.unread })));
      } catch (e) {
        if (active) setError(e?.message || "Failed to load conversation.");
      } finally {
        if (active) setConversationLoading(false);
      }
    }
    loadConvo();
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    if (!token) return;
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 400,
      reconnectionDelayMax: 2000, timeout: 7000,
      auth: cb => { const t = getAccessToken(); cb(t ? { token: t } : {}); },
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const ids = new Set(threads.map(t => String(t?.id || "").trim()).filter(Boolean));
      if (selectedIdRef.current) ids.add(String(selectedIdRef.current));
      ids.forEach(id => socket.emit("session.join", { sessionId: id, displayName: "Security" }));
    });

    socket.on("chat.message", payload => {
      const sid = payload?.sessionId;
      if (!sid) return;
      const msg = {
        id: payload?.id ?? `${payload?.at || Date.now()}-${Math.random()}`,
        sessionId: sid, text: payload?.text || "",
        senderType: payload?.senderType || "visitor",
        displayName: payload?.displayName || "Participant",
        at: payload?.at || new Date().toISOString()
      };
      setMessagesByThread(prev => {
        const curr = prev[sid] ?? [];
        if (curr.some(m => isLikelyDuplicate(m, msg))) return prev;
        return { ...prev, [sid]: [...curr, msg] };
      });
      if (msg.senderType !== "security") playMessageNotificationSound();
      upsertThreadPreview(msg);
    });

    return () => { socketRef.current = null; socket.disconnect(); };
  }, [token, threads]);

  useEffect(() => {
    if (!socketRef.current?.connected) return;
    const ids = new Set(threads.map(t => String(t?.id || "").trim()).filter(Boolean));
    if (selectedIdRef.current) ids.add(String(selectedIdRef.current));
    ids.forEach(id => socketRef.current?.emit("session.join", { sessionId: id, displayName: "Security" }));
  }, [threads, selectedId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [selectedId, messagesByThread]);

  const filteredThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter(t => [t.name, t.last, t.door].join(" ").toLowerCase().includes(term));
  }, [threads, query]);

  const selectedThread = useMemo(() => threads.find(t => t.id === selectedId) ?? null, [threads, selectedId]);
  const selectedMessages = useMemo(() => messagesByThread[selectedId] ?? [], [messagesByThread, selectedId]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const saved = await sendSecuritySessionMessage(selectedId, text);
      const out = {
        id: saved?.id ?? `local-${Date.now()}`,
        sessionId: selectedId, text, senderType: "security",
        displayName: saved?.displayName || "Security",
        at: saved?.at || new Date().toISOString()
      };
      setMessagesByThread(prev => {
        const curr = prev[selectedId] ?? [];
        if (curr.some(m => isLikelyDuplicate(m, out))) return prev;
        return { ...prev, [selectedId]: [...curr, out] };
      });
      upsertThreadPreview(out);
      setDraft("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e?.message || "Unable to send.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId) {
    if (!selectedId || !messageId) return;
    setDeletingMessageId(messageId);
    try {
      await deleteSecuritySessionMessage(selectedId, messageId);
      setMessagesByThread(prev => ({ ...prev, [selectedId]: (prev[selectedId] || []).filter(m => m.id !== messageId) }));
    } catch (e) {
      setError(e?.message || "Unable to delete.");
    } finally {
      setDeletingMessageId(""); }
  }

  async function startCall(type) {
    if (!selectedId) return;
    const key = `${selectedId}:${type}`;
    setCallBusy(key);
    try {
      window.sessionStorage.setItem("qring_call_start_intent", JSON.stringify({ pending: true, sessionId: selectedId, mode: type === "video" ? "video" : "audio" }));
      await apiRequest("/calls/start", { method: "POST", body: JSON.stringify({ sessionId: selectedId, type, hasVideo: type === "video" }) });
      navigate(`/session/${selectedId}/${type === "video" ? "video" : "audio"}`);
    } catch (e) {
      setError(e?.message || "Unable to start call.");
    } finally {
      setCallBusy(""); }
  }

  function openThread(id) {
    setSelectedId(id);
    setView("chat");
  }

  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);

  return (
    <AppShell title="Security Messages">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap');

        .msg-root { font-family: 'Instrument Sans', sans-serif; background: #f5f4f0; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        .msg-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .fraunces { font-family: 'Fraunces', serif; }
        .dm-mono { font-family: 'DM Mono', monospace; }

        /* Topbar */
        .msg-topbar { background: #0c0c0c; flex-shrink: 0; }

        /* Thread list */
        .thread-list { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
        .thread-list::-webkit-scrollbar { display: none; }
        .thread-item { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #ece9e2; background: #fff; cursor: pointer; transition: background 0.12s; }
        .thread-item:active { background: #f5f4f0; }
        .thread-item.selected { background: #f0fdf4; border-left: 3px solid #10b981; }
        .thread-avatar { width: 44px; height: 44px; border-radius: 14px; background: #1a1a1a; display: grid; place-items: center; flex-shrink: 0; }

        /* Chat panel */
        .chat-panel { display: flex; flex-direction: column; height: 100%; background: #fafaf8; }
        .chat-header { background: #fff; border-bottom: 1px solid #ece9e2; flex-shrink: 0; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .messages-area { flex: 1; overflow-y: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 10px; overscroll-behavior: contain; }
        .messages-area::-webkit-scrollbar { width: 3px; }
        .messages-area::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

        /* Bubbles */
        .bubble { max-width: 78%; padding: 10px 13px; border-radius: 18px; position: relative; animation: bubbleIn 0.15s ease; }
        @keyframes bubbleIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .bubble-mine { background: #0c0c0c; color: #fff; border-bottom-right-radius: 4px; align-self: flex-end; }
        .bubble-theirs { background: #fff; color: #1a1a1a; border-bottom-left-radius: 4px; align-self: flex-start; border: 1px solid #ece9e2; }

        /* Compose */
        .compose-bar { background: #fff; border-top: 1px solid #ece9e2; padding: 10px 14px; flex-shrink: 0; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
        .compose-inner { display: flex; align-items: flex-end; gap: 8px; background: #f5f4f0; border-radius: 20px; padding: 8px 8px 8px 14px; }
        .compose-textarea { flex: 1; background: none; border: none; outline: none; font-family: 'Instrument Sans', sans-serif; font-size: 14px; color: #1a1a1a; resize: none; max-height: 120px; min-height: 24px; line-height: 1.5; }
        .compose-textarea::placeholder { color: #a8a29e; }
        .send-btn { width: 36px; height: 36px; border-radius: 50%; background: #0c0c0c; border: none; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; transition: transform 0.12s, opacity 0.12s; }
        .send-btn:not(:disabled):active { transform: scale(0.9); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Search overlay */
        .search-bar { background: #0c0c0c; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
        .search-input { flex: 1; background: rgba(255,255,255,0.1); border: none; border-radius: 10px; padding: 9px 12px; color: #fff; font-family: 'Instrument Sans', sans-serif; font-size: 14px; outline: none; }
        .search-input::placeholder { color: rgba(255,255,255,0.4); }

        /* Call buttons */
        .call-btn { width: 38px; height: 38px; border-radius: 12px; border: 1px solid #ece9e2; background: #f5f4f0; display: grid; place-items: center; cursor: pointer; transition: background 0.12s; }
        .call-btn:active { background: #e5e3dc; }
        .call-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Mobile nav tabs */
        .mobile-tabs { display: flex; background: #fff; border-top: 1px solid #ece9e2; flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
        .mobile-tab { flex: 1; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; border: none; background: none; font-family: 'Instrument Sans', sans-serif; font-size: 10px; font-weight: 600; color: #a8a29e; letter-spacing: 0.04em; text-transform: uppercase; }
        .mobile-tab.active { color: #0c0c0c; }

        /* Empty state */
        .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #a8a29e; padding: 32px; text-align: center; }

        /* Delete hover */
        .delete-btn { opacity: 0; background: none; border: none; cursor: pointer; padding: 2px 4px; border-radius: 6px; transition: opacity 0.15s; display: inline-flex; align-items: center; gap: 3px; font-family: 'Instrument Sans', sans-serif; font-size: 10px; font-weight: 600; }
        .bubble-mine:hover .delete-btn { opacity: 1; }
        .delete-btn-always { opacity: 0.6; }

        /* Unread dot */
        .unread-dot { background: #10b981; color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: grid; place-items: center; padding: 0 4px; flex-shrink: 0; }

        /* Loading spinner */
        .spinner { width: 20px; height: 20px; border: 2px solid #e5e3dc; border-top-color: #10b981; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="msg-root">

        {/* ── TOP BAR ── */}
        {view === "list" ? (
          <div className="msg-topbar">
            {!searchOpen ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56 }}>
                {/* <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link to="/dashboard/security" style={{ color: "#6b7280", display: "flex", alignItems: "center" }}>
                    <ChevronLeft size={18} color="#6b7280" />
                  </Link>
                  <span className="fraunces" style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>Messages</span>
                  {totalUnread > 0 && (
                    <span style={{ background: "#10b981", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 7px" }}>
                      {totalUnread}
                    </span>
                  )}
                </div> */}
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer" }}
                >
                  <Search size={15} color="#fff" />
                </button>
              </div>
            ) : (
              <div className="search-bar">
                <Search size={15} color="rgba(255,255,255,0.5)" />
                <input
                  autoFocus
                  className="search-input"
                  placeholder="Search conversations…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setQuery(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <X size={15} color="rgba(255,255,255,0.6)" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Chat header */
          <div className="chat-header" style={{ background: "#0c0c0c", borderBottom: "1px solid #1a1a1a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <button
                type="button"
                onClick={() => setView("list")}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <ChevronLeft size={16} color="#fff" />
              </button>
              {selectedThread ? (
                <div style={{ minWidth: 0 }}>
                  <p className="fraunces" style={{ color: "#fff", fontSize: 15, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedThread.name}
                  </p>
                  <p style={{ color: "#6b7280", fontSize: 11, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedThread.door}
                  </p>
                </div>
              ) : (
                <span className="fraunces" style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Conversation</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" className="call-btn" onClick={() => startCall("audio")} disabled={callBusy === `${selectedId}:audio`} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Phone size={15} color="#d1fae5" />
              </button>
              <button type="button" className="call-btn" onClick={() => startCall("video")} disabled={callBusy === `${selectedId}:video`} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Video size={15} color="#d1fae5" />
              </button>
            </div>
          </div>
        )}

        {/* ── ERROR STRIP ── */}
        {error && (
          <div style={{ background: "#fef2f2", padding: "8px 16px", fontSize: 12, color: "#dc2626", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {error}
            <button type="button" onClick={() => setError("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={13} color="#dc2626" />
            </button>
          </div>
        )}

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* LIST VIEW */}
          {view === "list" && (
            <div className="thread-list">
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
                  <div className="spinner" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={32} strokeWidth={1.2} />
                  <p className="fraunces" style={{ fontSize: 16, fontWeight: 600, color: "#6b7280", margin: 0 }}>
                    {query ? "No matches" : "No conversations yet"}
                  </p>
                  <p style={{ fontSize: 13, color: "#a8a29e", margin: 0 }}>
                    {query ? "Try a different search." : "Visitor chats will appear here."}
                  </p>
                </div>
              ) : (
                filteredThreads.map(thread => (
                  <div
                    key={thread.id}
                    className={`thread-item${selectedId === thread.id ? " selected" : ""}`}
                    onClick={() => openThread(thread.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && openThread(thread.id)}
                  >
                    <div className="thread-avatar">
                      <span className="fraunces" style={{ color: "#10b981", fontSize: 16, fontWeight: 700 }}>
                        {(thread.name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0c0c0c", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {thread.name}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {thread.time && (
                            <span className="dm-mono" style={{ fontSize: 10, color: "#a8a29e" }}>
                              {formatClockTime(thread.time)}
                            </span>
                          )}
                          {thread.unread > 0 && (
                            <span className="unread-dot">{thread.unread}</span>
                          )}
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: "#10b981", fontWeight: 600, margin: "0 0 3px" }}>{thread.door}</p>
                      <p style={{ fontSize: 13, color: "#78716c", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {thread.last || "No messages yet"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CHAT VIEW */}
          {view === "chat" && (
            <div className="chat-panel">
              {!selectedThread ? (
                <div className="empty-state">
                  <MessageSquare size={32} strokeWidth={1.2} />
                  <p className="fraunces" style={{ fontSize: 16, fontWeight: 600, color: "#6b7280" }}>Select a conversation</p>
                </div>
              ) : (
                <>
                  <div className="messages-area" ref={messagesRef}>
                    {conversationLoading ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                        <div className="spinner" />
                      </div>
                    ) : selectedMessages.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0" }}>
                        <p style={{ fontSize: 13, color: "#a8a29e" }}>No messages yet — start the conversation.</p>
                      </div>
                    ) : (
                      selectedMessages.map((msg, i) => {
                        const mine = msg.senderType === "security";
                        const showName = i === 0 || selectedMessages[i - 1]?.senderType !== msg.senderType;
                        return (
                          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                            {showName && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: "#a8a29e", marginBottom: 3, paddingInline: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                {mine ? "You" : msg.displayName}
                              </span>
                            )}
                            <div className={`bubble ${mine ? "bubble-mine" : "bubble-theirs"}`}>
                              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</p>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: mine ? "flex-end" : "flex-start", gap: 6, marginTop: 5 }}>
                                <span className="dm-mono" style={{ fontSize: 10, opacity: 0.5 }}>
                                  {formatClockTime(msg.at)}
                                </span>
                                {mine && (
                                  <button
                                    type="button"
                                    className={`delete-btn delete-btn-always`}
                                    onClick={() => handleDelete(msg.id)}
                                    disabled={deletingMessageId === msg.id}
                                    style={{ color: "rgba(255,255,255,0.5)" }}
                                  >
                                    <Trash2 size={10} />
                                    {deletingMessageId === msg.id ? "…" : ""}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Compose */}
                  <div className="compose-bar">
                    <form className="compose-inner" onSubmit={handleSend}>
                      <textarea
                        ref={inputRef}
                        className="compose-textarea"
                        value={draft}
                        rows={1}
                        onChange={e => {
                          setDraft(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                        }}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                        placeholder="Message homeowner or visitor…"
                      />
                      <button type="submit" className="send-btn" disabled={sending || !draft.trim()}>
                        <SendHorizontal size={15} color="#fff" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM TABS ── */}
        <div className="mobile-tabs">
          <button
            type="button"
            className={`mobile-tab${view === "list" ? " active" : ""}`}
            onClick={() => setView("list")}
          >
            <MessageSquare size={18} strokeWidth={view === "list" ? 2.2 : 1.6} />
            Threads
            {totalUnread > 0 && view !== "list" && (
              <span style={{ position: "absolute", top: 6, fontSize: 8, background: "#10b981", color: "#fff", borderRadius: 10, padding: "1px 5px", fontWeight: 800 }}>{totalUnread}</span>
            )}
          </button>
          <button
            type="button"
            className={`mobile-tab${view === "chat" ? " active" : ""}`}
            onClick={() => view !== "chat" && selectedId ? setView("chat") : null}
            style={{ opacity: selectedId ? 1 : 0.4 }}
          >
            <Phone size={18} strokeWidth={view === "chat" ? 2.2 : 1.6} />
            {selectedThread ? selectedThread.name?.split(" ")[0] : "Chat"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function previewText(value) {
  const t = String(value || "").trim();
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
}

function formatClockTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
}
