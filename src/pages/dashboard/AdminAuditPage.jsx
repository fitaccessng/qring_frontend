import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { apiRequest, ApiError } from "../../services/apiClient";

export default function AdminAuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const resp = await apiRequest("/admin/audit");
        if (!active) return;
        setRows(Array.isArray(resp?.data) ? resp.data : []);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Admin audit endpoint not found (404). Restart backend so /api/v1/admin/audit is available.");
        } else {
          setError(err.message ?? "Failed to load audit logs");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Admin Audit">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Audit Log</h2>
        <p className="mt-1 text-sm text-slate-500">Records admin actions like user toggles, subscription activations, and message deletes.</p>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading audit logs...</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No audit entries yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">Time</th>
                  <th className="py-2 font-semibold">Action</th>
                  <th className="py-2 font-semibold">Resource</th>
                  <th className="py-2 font-semibold">Actor</th>
                  <th className="py-2 font-semibold">Meta</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{formatTime(row.createdAt)}</td>
                    <td className="py-2 font-semibold">{row.action}</td>
                    <td className="py-2">
                      <span className="font-mono text-xs">{row.resourceType}</span>
                      {row.resourceId ? <span className="ml-2 font-mono text-xs text-slate-500">{row.resourceId}</span> : null}
                    </td>
                    <td className="py-2 font-mono text-xs">{row.actorUserId || "-"}</td>
                    <td className="py-2 font-mono text-xs text-slate-500">{truncate(row.meta || "", 120)}</td>
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

function truncate(value, max) {
  const text = String(value ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

