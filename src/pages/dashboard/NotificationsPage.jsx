import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import {
  clearNotifications,
  getNotifications,
  markNotificationRead
} from "../../services/notificationService";
import { useAuth } from "../../state/AuthContext";
import { resolveNotificationRoute } from "../../utils/notificationRouting";

function parsePayload(payload) {
  if (payload && typeof payload === "object") return payload;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return { message: payload };
    }
  }
  return {};
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await getNotifications();
      setItems(Array.isArray(rows) ? rows : []);
    } catch (requestError) {
      setError(requestError?.message ?? "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const parsed = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        payload: parsePayload(item?.payload)
      })),
    [items]
  );

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, readAt: row.readAt || new Date().toISOString() } : row)));
    } catch {
      // Keep UI responsive if mark-read fails.
    }
  }

  async function handleNotificationClick(item) {
    await handleMarkRead(item.id);
    navigate(
      resolveNotificationRoute({
        role: user?.role,
        kind: item?.kind,
        payload: item?.payload
      })
    );
  }

  async function handleClearAll() {
    setBusy(true);
    try {
      await clearNotifications();
      setItems((prev) => prev.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })));
    } catch (requestError) {
      setError(requestError?.message ?? "Failed to clear notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Notifications">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Recent Alerts</h2>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={busy}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60 dark:border-slate-700"
            >
              {busy ? "Clearing..." : "Clear All"}
            </button>
          </div>

          {error ? (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">Loading notifications...</p>
          ) : parsed.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {parsed.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${
                    item.readAt
                      ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      : "border-violet-200 bg-violet-50 dark:border-violet-700/60 dark:bg-violet-900/20"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.kind || "notification"}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.payload?.message || "You have a new alert."}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatTime(item.createdAt)}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
