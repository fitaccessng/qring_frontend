import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { apiRequest, ApiError } from "../../services/apiClient";

export default function AdminUsersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        if (role) qs.set("role", role);
        if (query.trim()) qs.set("q", query.trim());
        const resp = await apiRequest(`/admin/users?${qs.toString()}`);
        if (!active) return;
        setRows(Array.isArray(resp?.data) ? resp.data : []);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Admin users endpoint not found (404). Restart backend so /api/v1/admin/users is available.");
        } else {
          setError(err.message ?? "Failed to load users");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query, role]);

  const filtered = useMemo(() => rows, [rows]);

  async function toggleActive(user) {
    setBusyId(user.id);
    setError("");
    try {
      const resp = await apiRequest(`/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.active })
      });
      const updated = resp?.data ?? null;
      if (!updated) return;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, active: updated.active } : r)));
    } catch (err) {
      setError(err.message ?? "Failed to update user");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppShell title="Admin Users">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Users</h2>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">All roles</option>
              <option value="homeowner">Homeowner</option>
              <option value="estate">Estate</option>
              <option value="admin">Admin</option>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-72"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading users...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">Email</th>
                  <th className="py-2 font-semibold">Role</th>
                  <th className="py-2 font-semibold">Active</th>
                  <th className="py-2 font-semibold">Created</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 font-semibold">{user.fullName}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.role}</td>
                    <td className="py-2">{user.active ? "Yes" : "No"}</td>
                    <td className="py-2">{formatTime(user.createdAt)}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => toggleActive(user)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700 disabled:opacity-50"
                      >
                        {busyId === user.id ? "Saving..." : user.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
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

