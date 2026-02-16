import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { apiRequest, ApiError } from "../../services/apiClient";

export default function AdminSessionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        if (status) qs.set("status", status);
        const resp = await apiRequest(`/admin/sessions?${qs.toString()}`);
        if (!active) return;
        setRows(Array.isArray(resp?.data) ? resp.data : []);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Admin sessions endpoint not found (404). Restart backend so /api/v1/admin/sessions is available.");
        } else {
          setError(err.message ?? "Failed to load sessions");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [status]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.id, r.qrId, r.homeId, r.doorId, r.homeownerId, r.visitor, r.status].join(" ").toLowerCase().includes(term)
    );
  }, [rows, query]);

  return (
    <AppShell title="Admin Sessions">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Visitor Sessions</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
              <option value="completed">Completed</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search session, visitor, ids..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-80"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading sessions...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No sessions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">Visitor</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">QR</th>
                  <th className="py-2 font-semibold">Door</th>
                  <th className="py-2 font-semibold">Homeowner</th>
                  <th className="py-2 font-semibold">Started</th>
                  <th className="py-2 font-semibold">Ended</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 font-semibold">{row.visitor || "-"}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2 font-mono text-xs">{row.qrId}</td>
                    <td className="py-2 font-mono text-xs">{row.doorId}</td>
                    <td className="py-2 font-mono text-xs">{row.homeownerId}</td>
                    <td className="py-2">{formatTime(row.startedAt)}</td>
                    <td className="py-2">{formatTime(row.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

