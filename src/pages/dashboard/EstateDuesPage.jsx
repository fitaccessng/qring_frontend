import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard, Filter, Plus, Search, WalletCards, Receipt, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { createEstateAlert, listEstateAlerts } from "../../services/estateService";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { showError, showSuccess } from "../../utils/flash";
import { estateFieldClassName, estateTextareaClassName, estatePrimaryButtonClassName } from "../../components/mobile/EstateManagerPageShell";
import BottomSheet from "../../components/system/BottomSheet";

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

function statusBadge(status) {
  switch (status) {
    case "paid":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
          <CheckCircle2 size={10} /> Paid
        </span>
      );
    case "overdue":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
          <AlertCircle size={10} /> Overdue
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
          <Clock size={10} /> Partial
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
          <Clock size={10} /> Pending
        </span>
      );
  }
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
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col">
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              aria-label="Go back"
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Estate Dues</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        <div className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Financials</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Dues & Collections</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Manage estate dues, tracking payment requests, and balances in real-time.
          </p>
        </div>

        {/* METRICS GRID */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <WalletCards size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Collected</p>
              <h4 className="text-sm font-black leading-none mt-0.5 text-slate-900 dark:text-white truncate max-w-[120px]">{money(metrics.totalCollected)}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-amber-50 dark:bg-amber-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CalendarDays size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Outstanding</p>
              <h4 className="text-sm font-black leading-none mt-0.5 text-slate-900 dark:text-white truncate max-w-[120px]">{money(metrics.outstanding)}</h4>
            </div>
          </div>
        </section>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input 
              value={query} 
              onChange={(event) => setQuery(event.target.value)} 
              placeholder="Search payment dues..." 
              className="w-full bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 dark:text-white shadow-sm outline-none focus:border-indigo-500 transition-all" 
            />
          </div>
          <select 
            value={status} 
            onChange={(event) => setStatus(event.target.value)} 
            className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {/* DUES HISTORY FEED */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Active Requests</h4>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">Loading dues...</p>
              </div>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <article key={row.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm transition-all flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    {statusBadge(row.dueStatus)}
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                      Due: {row.dueDate ? new Date(row.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : "Not set"}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">{row.title}</h4>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{money(row.amountDue)}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">{row.description || "Estate payment request"}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100/50 dark:border-slate-800/60 text-xs">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Paid: <strong className="text-slate-700 dark:text-slate-300">{row.paymentSummary?.paid ?? 0}</strong> &middot; Pending: <strong className="text-slate-700 dark:text-slate-300">{row.paymentSummary?.pending ?? 0}</strong>
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                <Receipt className="mx-auto text-slate-200 dark:text-slate-850 mb-2" size={32} />
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">{rows.length ? "No dues match your filters." : "No dues created yet."}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FLOATING ACTION SHORTCUT */}
      <button 
        onClick={() => setFormOpen(true)} 
        aria-label="Create Due"
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 z-40 active:scale-90 hover:bg-indigo-700 transition-all"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* BOTTOM SHEET DRAWER */}
      <BottomSheet open={formOpen} onClose={() => setFormOpen(false)} title="Create Due">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Due Title</label>
            <input 
              required 
              value={form.title} 
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} 
              placeholder="e.g. Monthly Security Levy" 
              className={`${estateFieldClassName} text-xs font-semibold`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Amount (NGN)</label>
            <input 
              required 
              type="number" 
              min="1" 
              value={form.amountDue} 
              onChange={(event) => setForm((prev) => ({ ...prev, amountDue: event.target.value }))} 
              placeholder="e.g. 25000" 
              className={`${estateFieldClassName} text-xs font-semibold`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Due Date</label>
            <input 
              type="date" 
              value={form.dueDate} 
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} 
              className={`${estateFieldClassName} text-xs font-semibold`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Description</label>
            <textarea 
              value={form.description} 
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} 
              rows={3} 
              placeholder="Add details about this payment request..." 
              className={`${estateTextareaClassName} text-xs font-semibold`} 
            />
          </div>

          <button 
            type="submit" 
            disabled={busy} 
            className={`${estatePrimaryButtonClassName} w-full py-3.5 mt-2 text-[11px] font-black uppercase tracking-wider rounded-xl`}
          >
            {busy ? "Creating Request..." : "Broadcast Payment Request"}
          </button>
        </form>
      </BottomSheet>
    </div>
  );
}