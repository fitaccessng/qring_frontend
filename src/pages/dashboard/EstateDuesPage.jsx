import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  PlusCircle,
  Send,
  Wallet,
  Timer,
  Filter,
  Receipt,
  Edit3,
  Trash2,
  AlertCircle,
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  CheckCircle2,
  Clock,
  TrendingUp,
  X
} from 'lucide-react';
import {
  createEstateAlert,
  listEstateAlertPayments,
  listEstateAlerts,
  sendEstateAlertReminder,
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { useNavigate } from "react-router-dom";

// Helper for formatting
const formatCurrency = (val) => `₦${Number(val).toLocaleString()}`;

const EstateDuesPage = () => {
  const { estateId, error, setError } = useEstateOverviewState();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => { if (error) showError(error); }, [error]);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!estateId) return;
    setDataLoading(true);
    try {
      const [rows, paymentRows] = await Promise.all([
        listEstateAlerts(estateId, "payment_request"),
        listEstateAlertPayments(estateId, { force: true })
      ]);
      setAlerts(rows);
      setPayments(paymentRows);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load collection data");
    } finally {
      setDataLoading(false);
    }
  }, [estateId, setError]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: refresh,
    ALERT_UPDATED: refresh,
    ALERT_DELETED: refresh,
    PAYMENT_STATUS_UPDATED: refresh
  }), [refresh]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createEstateAlert({
        estateId,
        title: title.trim(),
        description: description.trim(),
        alertType: "payment_request",
        amountDue: Number(amountDue),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null
      });
      showSuccess("Payment request sent.");
      setTitle("");
      setDescription("");
      setAmountDue("");
      setDueDate("");
      setComposeOpen(false);
      await refresh();
    } catch (err) { showError(err.message); }
    finally { setBusy(false); }
  };

  const latestAlert = alerts[0] || null;

  const handleSendReminder = async () => {
    if (!latestAlert?.id) {
      showError("Create a due first before sending reminders.");
      return;
    }
    setBusy(true);
    try {
      const result = await sendEstateAlertReminder(latestAlert.id);
      const reminded = Number(result?.reminded ?? 0);
      const emailed = Number(result?.emailed ?? 0);
      showSuccess(reminded > 0 ? `Reminder sent to ${reminded} homeowner${reminded === 1 ? "" : "s"}${emailed ? `, email delivered to ${emailed}` : ""}.` : "No unpaid homeowners to remind.");
      await refresh();
    } catch (err) {
      showError(err?.message || "Failed to send reminders");
    } finally {
      setBusy(false);
    }
  };

  const paymentRows = useMemo(() =>
    payments.flatMap((alert) =>
      (alert.homeowners ?? []).map((row) => ({
        ...row,
        alertId: alert.id,
        alertTitle: alert.title,
        amountDue: Number(alert.amountDue ?? 0),
        dueDate: alert.dueDate,
        createdAt: alert.createdAt
      }))
    ),
  [payments]);

  const totalCollected = useMemo(() =>
    paymentRows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amountPaid ?? r.amountDue), 0),
  [paymentRows]);

  const outstanding = useMemo(() =>
    paymentRows.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.amountDue), 0),
  [paymentRows]);

  const complianceRate = useMemo(() => {
    if (paymentRows.length === 0) return 0;
    return Math.round((paymentRows.filter(r => r.status === "paid").length / paymentRows.length) * 100);
  }, [paymentRows]);

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans flex flex-col selection:bg-indigo-100">

      {/* Premium Mobile Header */}
       <header className="sticky top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
              <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <h1 className="text-[#2b3437] font-black tracking-tight text-lg font-headline">Dues Management</h1>
              <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
                <Bell size={22} strokeWidth={2.5} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
              </button>
            </header>

      <main className="flex-1 px-5 pt-24 pb-32 max-w-7xl mx-auto w-full">

        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-[#4955b3] font-bold tracking-[0.15em] uppercase text-[10px] mb-1 block">Financial Oversight</span>
            <h2 className="text-4xl font-black tracking-tight text-[#2b3437] font-headline">Dues Management</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSendReminder}
              disabled={busy || !latestAlert?.id}
              className="bg-slate-200/50 text-[#2b3437] px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all w-full sm:w-auto text-sm disabled:opacity-50"
            >
              <Send size={18} strokeWidth={2.5} />
              Send Reminder
            </button>
            <button
              onClick={() => setComposeOpen(true)}
              className="bg-[#4955b3] text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all w-full sm:w-auto text-sm"
            >
              <PlusCircle size={18} strokeWidth={2.5} />
              Create Due
            </button>
          </div>
        </div>

        {/* Financial Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Total Received */}
          <div className="bg-white p-8 rounded-[2.5rem] flex flex-col justify-between border border-slate-100 shadow-sm min-h-[180px]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-[#85f6e5]/30 text-[#005c53] rounded-2xl">
                <Wallet size={24} />
              </div>
              <div className="flex items-center gap-1 text-[#006b61] bg-[#006b61]/10 px-3 py-1 rounded-full">
                <TrendingUp size={12} />
                <span className="text-[10px] font-black uppercase tracking-wider">Growth</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">Total Received</p>
              <p className="text-3xl font-black mt-1 text-[#2b3437]">{formatCurrency(totalCollected)}</p>
            </div>
          </div>

          {/* Outstanding */}
          <div className="bg-white p-8 rounded-[2.5rem] flex flex-col justify-between border border-slate-100 shadow-sm min-h-[180px]">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <Timer size={24} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{paymentRows.length} Active</span>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">Total Outstanding</p>
              <p className="text-3xl font-black mt-1 text-rose-600">{formatCurrency(outstanding)}</p>
            </div>
          </div>

          {/* Collection Progress */}
          <div className="bg-[#4955b3] text-white p-8 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between shadow-lg shadow-indigo-100">
            <div className="relative z-10">
              <p className="text-white/70 text-sm font-bold uppercase tracking-tight">Compliance Rate</p>
              <p className="text-4xl font-black mt-1">{complianceRate}%</p>
            </div>
            <div className="relative z-10 w-full bg-white/20 h-2.5 rounded-full mt-6">
              <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: `${complianceRate}%` }}></div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* List Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black tracking-tight font-headline">Recent Activity</h3>
            <button className="flex items-center gap-2 text-xs font-black text-[#4955b3] uppercase tracking-widest hover:opacity-70 transition-all">
              Filter <Filter size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="space-y-4">
            {dataLoading && <p className="text-center py-10 font-bold text-slate-400">Syncing ledger...</p>}

            {!dataLoading && paymentRows.length === 0 && (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                <p className="text-slate-400 font-bold">No payment activity recorded yet.</p>
              </div>
            )}

            {paymentRows.map((row, idx) => (
              <div key={idx} className="group bg-white hover:border-[#4955b3]/30 border border-slate-100 transition-all duration-300 p-5 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm active:scale-[0.99]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-[#4955b3] border border-slate-100">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="font-black text-[#2b3437]">{row.homeownerName || "Resident"}</p>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">{row.alertTitle}</p>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col justify-between w-full sm:w-auto items-center sm:items-start border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                  <div className="sm:text-left">
                    <p className="text-lg font-black text-[#2b3437]">{formatCurrency(row.amountDue)}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                      Due {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'No date'}
                    </p>
                  </div>

                  <div className={`mt-0 sm:mt-3 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${
                    row.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {row.status || 'pending'}
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-1">
                  <button className="p-2.5 text-slate-400 hover:text-[#4955b3] hover:bg-slate-50 rounded-xl transition-all"><Receipt size={18} /></button>
                  <button className="p-2.5 text-slate-400 hover:text-[#4955b3] hover:bg-slate-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                  <button className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}


      <DuesComposerSheet open={composeOpen} onClose={() => setComposeOpen(false)} busy={busy}>
        <form id="estate-dues-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Levy Title</label>
            <input
              className={estateFieldClassName}
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Security Levy Q3" required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Amount (₦)</label>
            <input
              type="number" className={estateFieldClassName}
              value={amountDue} onChange={e => setAmountDue(e.target.value)}
              placeholder="25000" required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Notes</label>
            <textarea
              className={estateTextareaClassName}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Details for residents..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Due Date</label>
            <input
              type="date" className={estateFieldClassName}
              value={dueDate} onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </form>
      </DuesComposerSheet>
    </div>
  );
};

export default EstateDuesPage;

function DuesComposerSheet({ open, onClose, busy, children }) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (!open) return null;

  const footer = (
    <div className="border-t border-slate-100 bg-white px-5 py-4">
      <button
        type="submit"
        form="estate-dues-form"
        disabled={busy}
        className="w-full bg-[#4955b3] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
      >
        {busy ? "Broadcasting..." : "Confirm & Send"}
      </button>
    </div>
  );

  if (!sheet.isMobile) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} aria-label="Close dues form" />
        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.2)]"
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">Financial Oversight</p>
              <h3 className="mt-2 text-2xl font-black text-[#2b3437]">Create New Levy</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-50 p-3 text-slate-500 transition-all hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto px-6 py-6">{children}</div>
          {footer}
        </motion.section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={onClose} aria-label="Close dues form" />
      <motion.section
        {...sheet.mobileSheetProps}
        className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.16)]"
      >
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">Financial Oversight</p>
            <h3 className="mt-2 text-xl font-black text-[#2b3437]">Create New Levy</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-slate-50 p-3 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div
          ref={sheet.contentRef}
          onScroll={sheet.onContentScroll}
          onPointerDown={sheet.onContentPointerDown}
          className="flex-1 overflow-y-auto px-5 pb-4"
        >
          {children}
        </div>
        {footer}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </motion.section>
    </div>
  );
}
