import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getAdminOverview } from "../../services/adminService";
import { ApiError } from "../../services/apiClient";
import {
  clearDemoRequests,
  getDemoRequests,
  removeDemoRequest
} from "../../services/demoRequestService";

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [demoRequests, setDemoRequests] = useState(() => getDemoRequests());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const overview = await getAdminOverview();
        if (!active) return;
        setData(overview);
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 404) {
          setError(
            "Admin overview endpoint not found (404). Restart the backend server so /api/v1/admin/overview is available."
          );
        } else {
          setError(requestError.message ?? "Failed to load admin overview");
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

  const refreshDemoRequests = () => setDemoRequests(getDemoRequests());

  const filteredVisits = useMemo(() => {
    const rows = data?.visits?.rows ?? [];
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [
        row.visitor,
        row.homeownerName,
        row.homeownerEmail,
        row.estateName,
        row.doorName,
        row.status
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [data, query]);

  const metrics = data?.metrics ?? {};

  return (
    <AppShell title="Admin Overview">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="mb-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold sm:text-xl">Demo Requests</h2>
            <p className="mt-1 text-sm text-slate-500">
              Captured from the public request demo form (stored in this browser).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshDemoRequests}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                clearDemoRequests();
                refreshDemoRequests();
              }}
              className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/15"
            >
              Clear
            </button>
          </div>
        </div>

        {demoRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No demo requests captured yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">Name</th>
                  <th className="py-2 font-semibold">Email</th>
                  <th className="py-2 font-semibold">Phone</th>
                  <th className="py-2 font-semibold">Organization</th>
                  <th className="py-2 font-semibold">Role</th>
                  <th className="py-2 font-semibold">Doors</th>
                  <th className="py-2 font-semibold">Created</th>
                  <th className="py-2 font-semibold">Notes</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {demoRequests.slice(0, 100).map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top dark:border-slate-800">
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{row.fullName || "-"}</td>
                    <td className="py-2">{row.email || "-"}</td>
                    <td className="py-2">{row.phone || "-"}</td>
                    <td className="py-2">{row.organization || "-"}</td>
                    <td className="py-2">{row.role || "-"}</td>
                    <td className="py-2">{row.doors || "-"}</td>
                    <td className="py-2">{formatTime(row.createdAt)}</td>
                    <td className="py-2">
                      <span className="block max-h-16 max-w-[22rem] overflow-hidden whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">
                        {row.notes || "-"}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => {
                          removeDemoRequest(row.id);
                          refreshDemoRequests();
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Homeowners" value={metrics.totalHomeowners} loading={loading} />
        <MetricCard label="Total Estates" value={metrics.totalEstates} loading={loading} />
        <MetricCard label="Total Visits" value={metrics.totalVisits} loading={loading} />
        <MetricCard
          label="Total Payments"
          value={loading ? "..." : formatCurrency(metrics.totalPaymentAmount)}
          loading={false}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <DataTable
          title="Homeowners"
          loading={loading}
          rows={data?.homeowners ?? []}
          columns={[
            { key: "fullName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "homeCount", label: "Homes" },
            { key: "doorCount", label: "Doors" },
            { key: "qrCount", label: "QR" },
            { key: "visits", label: "Visits", render: (row) => row.visits?.total ?? 0 },
            { key: "plan", label: "Plan", render: (row) => row.subscription?.plan ?? "free" }
          ]}
        />
        <DataTable
          title="Estates"
          loading={loading}
          rows={data?.estates ?? []}
          columns={[
            { key: "fullName", label: "Name" },
            { key: "email", label: "Email" },
            { key: "estateCount", label: "Estates" },
            { key: "homeownerCount", label: "Homeowners" },
            { key: "doorCount", label: "Doors" },
            { key: "qrCount", label: "QR" },
            { key: "plan", label: "Plan", render: (row) => row.subscription?.plan ?? "free" }
          ]}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <DataTable
          title="Homeowner Payment History"
          loading={loading}
          rows={data?.payments?.homeownerHistory ?? []}
          columns={[
            { key: "userName", label: "User" },
            { key: "userEmail", label: "Email" },
            { key: "plan", label: "Plan" },
            { key: "status", label: "Status" },
            { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
            { key: "startsAt", label: "Date", render: (row) => formatTime(row.startsAt) }
          ]}
        />
        <DataTable
          title="Estate Payment History"
          loading={loading}
          rows={data?.payments?.estateHistory ?? []}
          columns={[
            { key: "userName", label: "User" },
            { key: "userEmail", label: "Email" },
            { key: "plan", label: "Plan" },
            { key: "status", label: "Status" },
            { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
            { key: "startsAt", label: "Date", render: (row) => formatTime(row.startsAt) }
          ]}
        />
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold sm:text-xl">Visits By User</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search visitor, homeowner, estate, door..."
            className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Loading visits...</p>
        ) : filteredVisits.length === 0 ? (
          <p className="text-sm text-slate-500">No visits found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 font-semibold">Visitor</th>
                  <th className="py-2 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Homeowner</th>
                  <th className="py-2 font-semibold">Estate</th>
                  <th className="py-2 font-semibold">Door</th>
                  <th className="py-2 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{row.visitor}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">{row.homeownerName || "-"}</td>
                    <td className="py-2">{row.estateName || "-"}</td>
                    <td className="py-2">{row.doorName || "-"}</td>
                    <td className="py-2">{formatTime(row.startedAt)}</td>
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

function MetricCard({ label, value, loading }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{loading ? "..." : value ?? 0}</p>
    </article>
  );
}

function DataTable({ title, rows, columns, loading }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
      <h2 className="mb-3 font-heading text-lg font-bold sm:text-xl">{title}</h2>
      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No records.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                {columns.map((column) => (
                  <th key={column.label} className="py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                  {columns.map((column) => (
                    <td key={`${row.id}-${column.label}`} className="py-2">
                      {column.render ? column.render(row) : row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `N${new Intl.NumberFormat("en-NG").format(amount)}`;
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

