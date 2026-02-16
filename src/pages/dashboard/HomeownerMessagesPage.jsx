import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import {
  deleteHomeownerSessionMessage,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  sendHomeownerSessionMessage
} from "../../services/homeownerService";

export default function HomeownerMessagesPage() {
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messagesByThread, setMessagesByThread] = useState({});
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const token = localStorage.getItem("qring_access_token");

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
                selectedId === message.sessionId || message.senderType === "homeowner"
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
        setSelectedId((prev) => prev || data[0]?.id || "");
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load messages");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const data = await getHomeownerMessages();
        setThreads((prev) => {
          if (!prev.length) return data;
          const unreadById = Object.fromEntries(prev.map((item) => [item.id, item.unread || 0]));
          return data.map((item) => ({ ...item, unread: unreadById[item.id] ?? item.unread ?? 0 }));
        });
      } catch {
        // silent background refresh failure
      }
    }, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    const run = async () => {
      setConversationLoading(true);
      try {
        const rows = await getHomeownerSessionMessages(selectedId);
        if (!active) return;
        setMessagesByThread((prev) => ({ ...prev, [selectedId]: rows }));
        setThreads((prev) =>
          prev.map((item) => (item.id === selectedId ? { ...item, unread: 0 } : item))
        );
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
    const socket = io(`${env.socketUrl}${env.signalingNamespace ?? "/realtime/signaling"}`, {
      path: env.socketPath,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
      withCredentials: true
    });
    socket.on("connect", () => {
      socket.emit("session.join", { sessionId: selectedId, displayName: "Homeowner" });
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
        if (current.some((item) => item.id === normalized.id)) return prev;
        return {
          ...prev,
          [incomingSessionId]: [...current, normalized]
        };
      });
      upsertThreadPreview(normalized);
    });
    return () => {
      socket.disconnect();
    };
  }, [selectedId, token]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [selectedId, messagesByThread]);

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
      const data = await sendHomeownerSessionMessage(selectedId, text);
      if (data) {
        setMessagesByThread((prev) => {
          const current = prev[selectedId] ?? [];
          if (current.some((item) => item.id === data.id)) return prev;
          return { ...prev, [selectedId]: [...current, data] };
        });
        upsertThreadPreview(data);
      }
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
      setMessagesByThread((prev) => ({
        ...prev,
        [selectedId]: nextMessages
      }));
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== selectedId) return thread;
          const latest = nextMessages[nextMessages.length - 1];
          return {
            ...thread,
            last: latest?.text ?? "",
            time: latest?.at ?? thread.time
          };
        })
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to delete message");
    } finally {
      setDeletingMessageId("");
    }
  }

  return (
    <AppShell title="Messages">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:gap-4 lg:grid-cols-12">
        <article className="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-5 sm:p-5">
          <h2 className="mb-4 font-heading text-lg font-bold sm:text-xl">Threads</h2>

          {loading ? <EmptyState text="Loading threads..." /> : null}
          {!loading && threads.length === 0 ? <EmptyState text="No messages yet." /> : null}

          <div className="space-y-3">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedId(thread.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  selectedId === thread.id
                    ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{thread.name}</p>
                  <p className="truncate text-xs text-slate-500">{thread.last}</p>
                </div>
                <div className="ml-3 text-right">
                  <p className="text-xs text-slate-500">{formatTime(thread.time)}</p>
                  {thread.unread > 0 ? (
                    <span className="mt-1 inline-block rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/90 p-3 sm:p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-7 sm:p-5">
          <h2 className="mb-4 font-heading text-lg font-bold sm:text-xl">Conversation</h2>
          {!selectedThread ? (
            <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Select a thread to view details.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Visitor</p>
                  <p className="mt-1 text-sm font-semibold">{selectedThread.name}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Door</p>
                  <p className="mt-1 text-sm font-semibold">{selectedThread.door}</p>
                </div>
              </div>

              <div
                ref={messagesRef}
                className="max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
              >
                {conversationLoading ? (
                  <p className="text-sm text-slate-500">Loading conversation...</p>
                ) : null}
                {!conversationLoading && selectedMessages.length === 0 ? (
                  <p className="text-sm text-slate-500">No messages in this session yet.</p>
                ) : null}
                {selectedMessages.map((message) => {
                  const mine = message.senderType === "homeowner";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        mine
                          ? "ml-auto bg-brand-500 text-white"
                          : "bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <p className="text-[11px] font-semibold opacity-80">{message.displayName}</p>
                      <p>{message.text}</p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-80">
                        <p>{formatTime(message.at)}</p>
                        {mine ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(message.id)}
                            disabled={deletingMessageId === message.id}
                            className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-inherit disabled:opacity-60"
                          >
                            {deletingMessageId === message.id ? "Deleting..." : "Delete"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Type a message to this visitor"
                />
                <button
                  type="submit"
                  disabled={sending || !selectedId || !draft.trim()}
                  className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          )}
        </article>
      </section>
    </AppShell>
  );
}

function EmptyState({ text }) {
  return <div className="mb-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{text}</div>;
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

