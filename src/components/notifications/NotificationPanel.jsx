import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCheck, Grip, Trash2, X } from "lucide-react";
import NotificationFeed from "./NotificationFeed";
import { useNotifications } from "../../state/NotificationsContext";
import { getNotificationDetailRoute } from "../../utils/notificationMeta";

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
    navigate(getNotificationDetailRoute(item));
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

  function handleOpenNotificationsPage() {
    navigate("/dashboard/notifications");
    onClose?.();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <>
        <motion.button
          type="button"
          aria-label="Close notifications"
          onClick={() => onClose?.()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="fixed inset-0 z-40 bg-slate-950/24 md:bg-transparent"
        />

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.99 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          data-notification-panel-root="true"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(85dvh,42rem)] flex-col overflow-hidden rounded-t-[1.9rem] border border-slate-200/80 bg-[#f8fafc] shadow-[0_-20px_50px_rgba(15,23,42,0.14)] md:inset-x-auto md:bottom-auto md:right-4 md:top-[5.25rem] md:h-auto md:max-h-[min(78vh,42rem)] md:w-[min(26rem,calc(100vw-1rem))] md:rounded-[1.6rem] md:bg-white md:shadow-[0_18px_54px_rgba(15,23,42,0.14)] lg:right-8 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="px-4 pt-3 md:hidden">
            <div className="mx-auto flex w-full max-w-[4.25rem] items-center justify-center rounded-full bg-slate-300/70 py-1 text-slate-500 dark:bg-slate-700/90 dark:text-slate-300">
              <Grip className="h-4 w-4" />
            </div>
          </div>

          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-4 pt-4 text-slate-900 md:px-5 md:py-4 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-black tracking-tight">Notifications</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {connected ? "Live now" : "Refreshing in background"} · {unreadCount} unread
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="rounded-[1.1rem] bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Unread</p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{unreadCount}</p>
              </div>
              <button
                type="button"
                onClick={() => markAllRead()}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Read all
              </button>
              <button
                type="button"
                onClick={() => clearAll()}
                disabled={items.length === 0}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={handleOpenNotificationsPage}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 md:hidden dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Open page
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 md:pb-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
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
      </>
    </AnimatePresence>,
    document.body
  );
}
