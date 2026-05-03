import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import {
  createCommunityPost,
  listCommunityPosts,
  markCommunityPostRead
} from "../../services/advancedService";

export default function CommunityBoardSample({ canPost = false }) {
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadBoard() {
    const data = await listCommunityPosts("estate", 100);
    setRows(data);
  }

  useEffect(() => {
    loadBoard().catch(() => {});
    const socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      ...realtimeTransportOptions
    });
    const onCreated = () => loadBoard();
    socket.on("community.post.created", onCreated);
    return () => {
      socket.off("community.post.created", onCreated);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createCommunityPost({
        audienceScope: "estate",
        title,
        body,
        tag: "notice",
        pinned: false
      });
      setTitle("");
      setBody("");
      await loadBoard();
    } finally {
      setBusy(false);
    }
  }

  async function handleRead(postId) {
    await markCommunityPostRead(postId);
    await loadBoard();
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <h3 className="text-base font-black">Community Board</h3>
      {canPost ? (
        <form onSubmit={handleCreate} className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Message"
            rows={2}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Posting..." : "Post Update"}
          </button>
        </form>
      ) : null}
      <div className="mt-3 space-y-2">
        {rows.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border px-3 py-2 ${
              item.read
                ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70"
                : "border-indigo-200 bg-indigo-50 dark:border-indigo-700/60 dark:bg-indigo-900/20"
            }`}
          >
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-slate-500">{item.body}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</p>
              {!item.read ? (
                <button
                  type="button"
                  onClick={() => handleRead(item.id)}
                  className="rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-indigo-700"
                >
                  Mark read
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600">Read</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
