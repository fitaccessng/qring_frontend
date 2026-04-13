import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  ShieldAlert,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import {
  formatRelativeNotificationTime,
  getNotificationMeta,
  groupNotificationsByDate
} from "../../utils/notificationMeta";

function NotificationTypeIcon({ category }) {
  const icons = {
    visitor: UserRound,
    payment: CreditCard,
    security: ShieldAlert,
    access: CheckCheck,
    system: Sparkles
  };
  const Icon = icons[category] || Bell;
  return <Icon className="h-4 w-4" strokeWidth={2.1} />;
}

function priorityClasses(priority) {
  if (priority === "critical") {
    return "border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300";
  }
  if (priority === "low") {
    return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300";
  }
  return "border-sky-200 bg-sky-50/80 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-300";
}

export default function NotificationFeed({
  items,
  loading,
  compact = false,
  activeActionId = "",
  actionError = "",
  headerAction,
  onOpen,
  onMarkRead,
  onVisitorAction
}) {
  const groups = useMemo(() => groupNotificationsByDate(items), [items]);

  return (
    <div className={`space-y-${compact ? "3" : "4"}`}>
      {!compact && headerAction ? <div className="flex justify-start sm:justify-end">{headerAction}</div> : null}

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/30 dark:text-rose-300">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              className={`animate-pulse ${compact ? "h-20 rounded-[1.4rem]" : "h-24 rounded-3xl"} border border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60`}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className={`border border-dashed border-slate-300 bg-white/70 text-center dark:border-slate-700 dark:bg-slate-900/50 ${compact ? "rounded-[1.4rem] px-4 py-10" : "rounded-[1.75rem] px-5 py-12"}`}>
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <Bell className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-slate-900 dark:text-white">No notifications yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            New visitor requests and access updates will appear here.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.label} className={compact ? "space-y-2" : "space-y-3"}>
            <div className={`flex items-center ${compact ? "justify-between" : "gap-3"}`}>
              {compact ? null : <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />}
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {group.label}
              </p>
              {compact ? <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> : <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />}
            </div>

            <div className={compact ? "space-y-2" : "space-y-3"}>
              {group.items.map((item, index) => {
                const meta = getNotificationMeta(item.kind, item.payload);
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.18) }}
                    className={`border transition-all ${
                      item.unread
                        ? compact
                          ? "rounded-[1.35rem] border-sky-100 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-sky-900/40 dark:bg-slate-900"
                          : "rounded-[1.6rem] border-sky-200 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-sky-900/40 dark:bg-slate-900"
                        : compact
                          ? "rounded-[1.35rem] border-slate-200/80 bg-white/92 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80"
                          : "rounded-[1.6rem] border-slate-200 bg-white/85 p-4 dark:border-slate-800 dark:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`mt-0.5 grid shrink-0 place-items-center border ${compact ? "h-10 w-10 rounded-[1rem]" : "h-11 w-11 rounded-2xl"} ${priorityClasses(item.priority)}`}
                      >
                        <NotificationTypeIcon category={item.category} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-slate-900 dark:text-white">{item.title}</p>
                              {item.unread ? <span className="h-2.5 w-2.5 rounded-full bg-sky-500" aria-hidden="true" /> : null}
                            </div>
                            <p className={`mt-1 whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300 ${compact ? "text-[13px] leading-5" : "text-sm leading-6"}`}>
                              {item.message}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {formatRelativeNotificationTime(item.createdAt)}
                            </p>
                            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                              {meta.category}
                            </span>
                          </div>
                        </div>

                        <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "text-[11px]" : "text-xs"}`}>
                          {item.unread ? (
                            <button
                              type="button"
                              onClick={() => onMarkRead?.(item.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark read
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => onOpen?.(item)}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                          >
                            View details
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>

                          {item.canRespondToVisit ? (
                            <>
                              <button
                                type="button"
                                disabled={activeActionId === `${item.id}:approve`}
                                onClick={() => onVisitorAction?.(item, "approve")}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                {activeActionId === `${item.id}:approve` ? "Approving..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={activeActionId === `${item.id}:reject`}
                                onClick={() => onVisitorAction?.(item, "reject")}
                                className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                              >
                                <X className="h-3.5 w-3.5" />
                                {activeActionId === `${item.id}:reject` ? "Rejecting..." : "Reject"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
