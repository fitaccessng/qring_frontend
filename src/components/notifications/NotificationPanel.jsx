import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, CheckCheck, Trash2 } from "lucide-react";
import NotificationFeed from "./NotificationFeed";
import { useNotifications } from "../../state/NotificationsContext";

export default function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const { items, loading, unreadCount, connected, markRead, markAllRead, clearAll, runVisitorAction } = useNotifications();
  const [activeActionId, setActiveActionId] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleOpen(item) {
    setActionError("");
    if (item.unread) {
      await markRead(item.id);
    }
    navigate(item.route || "/dashboard/notifications");
    onClose?.();
  }

  async function handleVisitorAction(item, action) {
    const key = `${item.id}:${action}`;
    setActiveActionId(key);
    setActionError("");
    const result = await runVisitorAction(item, action);
    if (!result?.ok) {
      setActionError(result?.error || "Unable to update notification.");
    }
    setActiveActionId("");
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="absolute right-0 top-14 z-40 w-[min(34rem,calc(100vw-1rem))] overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8fafc]/95 shadow-[0_28px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95"
      >
        <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(14,116,144,0.92))] px-5 py-5 text-white dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/10">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black">Notification Center</p>
                <p className="mt-1 text-xs text-slate-200">
                  {connected ? "Realtime sync connected" : "Realtime fallback active"} · {unreadCount} unread
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/notifications"
              onClick={() => onClose?.()}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open page
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => markAllRead()}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={() => clearAll()}
              disabled={items.length === 0}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear feed
            </button>
          </div>
        </div>

        <div className="max-h-[min(78vh,42rem)] overflow-y-auto px-4 py-4">
          <NotificationFeed
            items={items}
            loading={loading}
            compact
            activeActionId={activeActionId}
            actionError={actionError}
            onOpen={handleOpen}
            onMarkRead={markRead}
            onVisitorAction={handleVisitorAction}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
