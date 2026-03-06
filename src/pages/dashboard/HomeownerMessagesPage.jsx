import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";
import { ChevronLeft, MoreVertical, Search, SendHorizontal, SlidersHorizontal, Trash2 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import { playMessageNotificationSound } from "../../utils/notificationSound";
import {
  deleteHomeownerSessionMessage,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  sendHomeownerSessionMessage
} from "../../services/homeownerService";

export default function HomeownerMessagesPage() {
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
  const [threadFilter, setThreadFilter] = useState("all");
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const selectedIdRef = useRef("");
  const socketRef = useRef(null);
  const token = localStorage.getItem("qring_access_token");

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  function isLikelyDuplicateMessage(current, next) {
    if (!current || !next) return false;
    if (current.id && next.id && current.id === next.id) return true;
    if ((current.text || "").trim() !== (next.text || "").trim()) return false;
    if ((current.senderType || "") !== (next.senderType || "")) return false;
    const currentTs = new Date(current.at).getTime();
    const nextTs = new Date(next.at).getTime();
    if (Number.isNaN(currentTs) || Number.isNaN(nextTs)) return false;
    return Math.abs(currentTs - nextTs) < 10000;
  }

  function upsertThreadPreview(message) {
    if (!message?.sessionId) return;
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === message.sessionId
          ? {
              ...thread,
              last: message.text,
              time: message.at,
              unread:
                selectedIdRef.current === message.sessionId || message.senderType === "homeowner"
                  ? 0
                  : (thread.unread || 0) + 1
            }
          : thread
      )
    );
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getHomeownerMessages();
        if (!active) return;
        setThreads(data);
        const sortedThreads = sortThreadsForInbox(data);
        const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
        const preferredExists = preferredSessionId && sortedThreads.some((item) => item.id === preferredSessionId);
        setSelectedId((prev) => {
          if (prev) return prev;
          if (preferredExists) return preferredSessionId;
          return isDesktop ? sortedThreads[0]?.id || "" : "";
        });
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load messages");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [preferredSessionId]);

  useEffect(() => {
    if (!preferredSessionId) return;
    const exists = threads.some((thread) => thread.id === preferredSessionId);
    if (!exists) return;
    setSelectedId(preferredSessionId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("sessionId");
      return next;
    }, { replace: true });
  }, [preferredSessionId, setSearchParams, threads]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const run = async () => {
      setConversationLoading(true);
      try {
        const rows = await getHomeownerSessionMessages(selectedId);
        if (!active) return;
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: rows }));
        const freshThreads = await getHomeownerMessages();
        if (!active) return;
        setThreads(freshThreads.map((item) => (item.id === selectedId ? { ...item, unread: 0 } : item)));
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load conversation");
      } finally {
        if (active) setConversationLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const syncConversation = async () => {
      try {
        const [rows, latestThreads] = await Promise.all([
          getHomeownerSessionMessages(selectedId),
          getHomeownerMessages()
        ]);
        if (!active) return;
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: rows }));
        setThreads(latestThreads.map((item) => (item.id === selectedId ? { ...item, unread: 0 } : item)));
      } catch {
        // Keep live view resilient when network/sockets are unstable.
      }
    };

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      syncConversation();
    }, 4500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!token) return () => {};
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2000,
      timeout: 7000,
      auth: (cb) => {
        const latestToken = localStorage.getItem("qring_access_token");
        cb(latestToken ? { token: latestToken } : {});
      },
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const knownSessionIds = new Set(
        threads.map((thread) => String(thread?.id || "").trim()).filter(Boolean)
      );
      if (selectedIdRef.current) {
        knownSessionIds.add(String(selectedIdRef.current));
      }
      knownSessionIds.forEach((sessionId) => {
        socket.emit("session.join", { sessionId, displayName: "Homeowner" });
      });
    });

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
      upsertThreadPreview(normalized);
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!socketRef.current || !socketRef.current.connected) return;
    const knownSessionIds = new Set(
      threads.map((thread) => String(thread?.id || "").trim()).filter(Boolean)
    );
    if (selectedIdRef.current) {
      knownSessionIds.add(String(selectedIdRef.current));
    }
    knownSessionIds.forEach((sessionId) => {
      socketRef.current?.emit("session.join", { sessionId, displayName: "Homeowner" });
    });
  }, [threads, selectedId]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [selectedId, messagesByThread]);

  const filteredThreads = useMemo(() => {
    let list = sortThreadsForInbox(threads);
    if (threadFilter === "archived") {
      list = list.filter((thread) => Number(thread.unread || 0) === 0);
    } else if (threadFilter === "unread") {
      list = list.filter((thread) => Number(thread.unread || 0) > 0);
    }

    const term = query.trim().toLowerCase();
    if (!term) return list;
    return list.filter((thread) =>
      [thread.name, thread.last, thread.door, formatClockTime(thread.time)].join(" ").toLowerCase().includes(term)
    );
  }, [threads, query, threadFilter]);

  const filterLabel = useMemo(() => {
    if (threadFilter === "all") return "All messages";
    if (threadFilter === "unread") return "Unread messages";
    return "Archived messages";
  }, [threadFilter]);

  function cycleFilter() {
    setThreadFilter((prev) => {
      if (prev === "all") return "archived";
      if (prev === "archived") return "unread";
      return "all";
    });
  }

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedId) ?? null,
    [threads, selectedId]
  );
  const selectedMessages = useMemo(() => messagesByThread[selectedId] ?? [], [messagesByThread, selectedId]);

  async function handleSend(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    try {
      const saved = await sendHomeownerSessionMessage(selectedId, text);
      const outbound = {
        id: saved?.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sessionId: selectedId,
        text,
        senderType: "homeowner",
        displayName: saved?.displayName || "Homeowner",
        at: saved?.at || new Date().toISOString()
      };
      setMessagesByThread((prev) => {
        const current = prev[selectedId] ?? [];
        if (current.some((item) => isLikelyDuplicateMessage(item, outbound))) return prev;
        return { ...prev, [selectedId]: [...current, outbound] };
      });
      upsertThreadPreview(outbound);
      socketRef.current?.emit("chat.message", outbound);
      setDraft("");
    } catch (requestError) {
      setError(requestError.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!selectedId || !messageId || deletingMessageId) return;
    setError("");
    setDeletingMessageId(messageId);
    try {
      const nextMessages = selectedMessages.filter((row) => row.id !== messageId);
      await deleteHomeownerSessionMessage(selectedId, messageId);
      setMessagesByThread((prev) => ({ ...prev, [selectedId]: nextMessages }));
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== selectedId) return thread;
          const latest = nextMessages[nextMessages.length - 1];
          return { ...thread, last: latest?.text ?? "", time: latest?.at ?? thread.time };
        })
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to delete message");
    } finally {
      setDeletingMessageId("");
    }
  }

  return (
    <AppShell >
      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <article
          className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-[74vh] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">Messages</h2>
            <button
              type="button"
              onClick={cycleFilter}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              title="Cycle filter: All, Archived, Unread"
              aria-label="Cycle thread filter"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search messages..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-bold">{filterLabel} ({filteredThreads.length})</p>
            <button
              type="button"
              onClick={() => setThreadFilter("all")}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              View all messages
            </button>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto pr-1">
            {loading ? <p className="px-2 py-4 text-sm text-slate-500">Loading messages...</p> : null}
            {!loading && filteredThreads.length === 0 ? (
              <p className="px-2 py-4 text-sm text-slate-500">No threads found.</p>
            ) : null}
            {filteredThreads.map((thread) => {
              const initial = (thread.name || "V").charAt(0).toUpperCase();
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                    selectedId === thread.id ? "bg-white shadow-sm dark:bg-slate-800" : "hover:bg-white/70 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <span className="grid h-full w-full place-items-center text-sm font-bold">{initial}</span>
                    {thread.unread > 0 ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold">{thread.name}</p>
                      <p className="text-xs text-slate-500">{formatClockTime(thread.time)}</p>
                    </div>
                    <p className="truncate text-sm text-slate-500">{thread.last || "No messages yet"}</p>
                  </div>
                  {thread.unread > 0 ? (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </article>

        <article
          className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-[74vh] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/60`}
        >
          {selectedThread ? (
            <>
              <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId("")}
                    className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200/70 lg:hidden"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    <span className="grid h-full w-full place-items-center text-xs font-bold">
                      {(selectedThread.name || "V").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedThread.name}</p>
                    <p className="text-xs text-slate-500">{selectedThread.door || "Door chat"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedId ? (
                    <>
                      <Link
                        to={`/session/${selectedId}/audio`}
                        className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                      >
                        Audio
                      </Link>
                      <Link
                        to={`/session/${selectedId}/video`}
                        className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500"
                      >
                        Video
                      </Link>
                    </>
                  ) : null}
                  <button type="button" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {conversationLoading ? <p className="text-sm text-slate-500">Loading conversation...</p> : null}
                {!conversationLoading && selectedMessages.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages in this session yet.</p>
                ) : null}
                {selectedMessages.map((message) => {
                  const mine = message.senderType === "homeowner";
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[84%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                            : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <p>{message.text}</p>
                        <div className={`mt-1 flex items-center gap-2 text-[11px] ${mine ? "text-slate-300 dark:text-slate-500" : "text-slate-400"}`}>
                          <span>{formatClockTime(message.at)}</span>
                          {mine ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(message.id)}
                              disabled={deletingMessageId === message.id}
                              className="rounded p-0.5 hover:bg-black/10 disabled:opacity-60 dark:hover:bg-white/20"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="mb-20 border-t border-slate-200 bg-white/90 p-3 dark:border-slate-800 dark:bg-slate-900/80 lg:mb-0">
                <div className="flex items-center gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Type your message..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
              <p>Select a conversation to start messaging.</p>
            </div>
          )}
        </article>
      </section>
    </AppShell>
  );
}

function formatClockTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getSessionPriority(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return 0;
  if (normalized === "approved") return 1;
  if (normalized === "pending") return 2;
  return 3;
}

function sortThreadsForInbox(rows) {
  return [...(rows || [])].sort((a, b) => {
    const priorityDelta = getSessionPriority(a?.sessionStatus) - getSessionPriority(b?.sessionStatus);
    if (priorityDelta !== 0) return priorityDelta;
    const aTime = new Date(a?.time || 0).getTime();
    const bTime = new Date(b?.time || 0).getTime();
    return bTime - aTime;
  });
}
