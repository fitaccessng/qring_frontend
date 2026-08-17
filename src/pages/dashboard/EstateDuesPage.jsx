import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard, Filter, Plus, Search, WalletCards } from "lucide-react";
import { createEstateAlert, listEstateAlerts } from "../../services/estateService";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { showError, showSuccess } from "../../utils/flash";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";

const money = (value) => `NGN ${Number(value || 0).toLocaleString()}`;

function statusFor(row) {
  const summary = row.paymentSummary || {};
  const paid = Number(summary.paid || 0);
  const pending = Number(summary.pending || 0);
  const failed = Number(summary.failed || 0);
  if (paid > 0 && pending <= 0 && failed <= 0) return "paid";
  if (paid > 0 && pending > 0) return "partial";
  const due = row.dueDate ? new Date(row.dueDate) : null;
  if (due && !Number.isNaN(due.getTime()) && due.getTime() < Date.now() && pending > 0) return "overdue";
  return "pending";
}

function statusClass(status) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  if (status === "overdue") return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20";
  if (status === "partial") return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
  return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
}

export default function EstateDuesPage() {
  const navigate = useNavigate();
  const { estateId, error, setError } = useEstateOverviewState();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", amountDue: "", dueDate: "" });

  useEffect(() => { if (error) showError(error); }, [error]);

  const load = useCallback(async () => {
    if (!estateId) return;
    setLoading(true);
    try {
      setRows(await listEstateAlerts(estateId, "payment_request"));
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load dues");
    } finally {
      setLoading(false);
    }
  }, [estateId, setError]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!estateId) return;
    getDashboardSocket().emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: load,
    ALERT_UPDATED: load,
    ALERT_DELETED: load,
    PAYMENT_STATUS_UPDATED: load
  }), [load]));

  const enrichedRows = useMemo(() => rows.map((row) => ({ ...row, dueStatus: statusFor(row) })), [rows]);
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return enrichedRows.filter((row) => {
      const matchesStatus = status === "all" || row.dueStatus === status;
      const text = `${row.title || ""} ${row.description || ""}`.toLowerCase();
      return matchesStatus && (!needle || text.includes(needle));
    });
  }, [enrichedRows, query, status]);

  const metrics = useMemo(() => {
    const totalExpected = enrichedRows.reduce((sum, row) => sum + Number(row.amountDue || 0), 0);
    const totalPaidCount = enrichedRows.reduce((sum, row) => sum + Number(row.paymentSummary?.paid || 0), 0);
    const totalPendingCount = enrichedRows.reduce((sum, row) => sum + Number(row.paymentSummary?.pending || 0), 0);
    const totalParticipants = totalPaidCount + totalPendingCount;
    const collectionRate = totalParticipants ? Math.round((totalPaidCount / totalParticipants) * 100) : 0;
    return {
      totalExpected,
      totalCollected: enrichedRows.reduce((sum, row) => sum + (Number(row.amountDue || 0) * Number(row.paymentSummary?.paid || 0)), 0),
      outstanding: enrichedRows.reduce((sum, row) => sum + (Number(row.amountDue || 0) * Number(row.paymentSummary?.pending || 0)), 0),
      collectionRate
    };
  }, [enrichedRows]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return showError("Title is required");
    if (!Number(form.amountDue || 0)) return showError("Amount is required");
    setBusy(true);
    try {
      await createEstateAlert({
        estateId,
        title: form.title.trim(),
        description: form.description.trim(),
        alertType: "payment_request",
        amountDue: Number(form.amountDue),
        dueDate: form.dueDate || undefined
      });
      setForm({ title: "", description: "", amountDue: "", dueDate: "" });
      setFormOpen(false);
      showSuccess("Due created");
      await load();
    } catch (err) {
      showError(err?.message || "Unable to create due");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black tracking-tight">Dues</h1>
            <p className="truncate text-xs font-semibold text-slate-500">Manage estate dues, payments and outstanding balances.</p>
          </div>
          <button onClick={() => setFormOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-sm active:scale-95 dark:bg-white dark:text-slate-950">
            <Plus size={16} /> Create Due
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 pt-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total Expected", money(metrics.totalExpected), WalletCards],
            ["Total Collected", money(metrics.totalCollected), CreditCard],
            ["Outstanding", money(metrics.outstanding), CalendarDays],
            ["Collection Rate", `${metrics.collectionRate}%`, Filter]
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon size={17} /></div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dues" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none dark:border-slate-800 dark:bg-slate-950">
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-slate-500">Loading dues...</div>
          ) : filteredRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-3 font-black">Due</th>
                    <th className="px-4 py-3 font-black">Amount</th>
                    <th className="px-4 py-3 font-black">Due Date</th>
                    <th className="px-4 py-3 font-black">Status</th>
                    <th className="px-4 py-3 font-black">Payments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="px-4 py-4"><p className="font-black">{row.title}</p><p className="mt-1 max-w-md text-xs font-medium text-slate-500">{row.description || "Estate payment request"}</p></td>
                      <td className="px-4 py-4 font-black">{money(row.amountDue)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-300">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "Not set"}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${statusClass(row.dueStatus)}`}>{row.dueStatus}</span></td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-500">Paid {row.paymentSummary?.paid ?? 0} · Pending {row.paymentSummary?.pending ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-black">{rows.length ? "No dues match your filters." : "No dues created yet."}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Create a payment request to start tracking estate dues.</p>
            </div>
          )}
        </section>
      </main>

      {formOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-black">Create Due</h2>
              <p className="text-xs font-semibold text-slate-500">Send a payment request to estate homeowners.</p>
            </div>
            <div className="space-y-3">
              <input required value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Due title" className={estateFieldClassName} />
              <input required type="number" min="1" value={form.amountDue} onChange={(event) => setForm((prev) => ({ ...prev, amountDue: event.target.value }))} placeholder="Amount" className={estateFieldClassName} />
              <input type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} className={estateFieldClassName} />
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className={estateTextareaClassName} />
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-black dark:border-slate-800">Cancel</button>
              <button disabled={busy} className="h-11 flex-1 rounded-lg bg-slate-950 text-sm font-black text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">{busy ? "Creating..." : "Create"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
