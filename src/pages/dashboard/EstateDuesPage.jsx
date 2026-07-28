import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Sliders,
  Edit3,
  Trash2,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { useNavigate } from "react-router-dom";

// Placeholder mock actions matching standard service structure. 
const mockCreateRequest = async (data) => { console.log("Created:", data); return { success: true }; };
const mockListRequests = async (id) => [];

const EstateMaintenancePage = () => {
  const { estateId, error, setError } = useEstateOverviewState();
  const [issueTitle, setIssueTitle] = useState("");
  const [category, setCategory] = useState("plumbing");
  const [priority, setPriority] = useState("medium");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => { if (error) showError(error); }, [error]);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    if (!estateId) return;
    setDataLoading(true);
    try {
      const rows = await mockListRequests(estateId);
      setRequests(rows);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load maintenance logs");
    } finally {
      setDataLoading(false);
    }
  }, [estateId, setError]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:maintenance` });
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    MAINTENANCE_CREATED: refresh,
    MAINTENANCE_UPDATED: refresh,
    MAINTENANCE_DELETED: refresh
  }), [refresh]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await mockCreateRequest({
        estateId,
        title: issueTitle.trim(),
        category,
        priority,
        location: location.trim(),
        description: description.trim(),
        status: "pending"
      });
      showSuccess("Maintenance request logged.");
      setIssueTitle("");
      setCategory("plumbing");
      setPriority("medium");
      setLocation("");
      setDescription("");
      setComposeOpen(false);
      await refresh();
    } catch (err) { 
      showError(err.message); 
    } finally { 
      setBusy(false); 
    }
  };

  const pendingCount = useMemo(() => requests.filter(r => r.status === "pending").length, [requests]);
  const inProgressCount = useMemo(() => requests.filter(r => r.status === "in_progress").length, [requests]);
  const resolvedCount = useMemo(() => requests.filter(r => r.status === "resolved").length, [requests]);

  const resolutionRate = useMemo(() => {
    if (requests.length === 0) return 100;
    return Math.round((resolvedCount / requests.length) * 100);
  }, [requests, resolvedCount]);

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">

      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Maintenance</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Repairs & Facilities</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-4xl mx-auto w-full space-y-6 flex-1">
        
        {/* Dynamic Header Information */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
          <div>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Infrastructure Care</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Work Orders</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 max-w-md leading-relaxed">
              Track emergency repairs, review community facility breakdowns, and schedule maintenance technicians.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setComposeOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-xs"
            >
              <Plus size={14} strokeWidth={2.5} />
              Log Issue
            </button>
          </div>
        </div>

        {/* Bento Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Unresolved / Active Requests */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col justify-between min-h-[135px] shadow-sm">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-450 rounded-xl">
                <AlertTriangle size={18} />
              </div>
              <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-850 px-2.5 py-0.5 rounded-full">
                {pendingCount} Pending
              </span>
            </div>
            <div className="mt-2">
              <p className="text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Active Work Requests</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{pendingCount + inProgressCount} Open</p>
            </div>
          </div>

          {/* Average Resolution Rate */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 flex flex-col justify-between min-h-[135px] shadow-sm">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-xl">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-[8px] font-extrabold text-emerald-650 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/5 px-2.5 py-0.5 rounded-full">
                {resolvedCount} Solved
              </span>
            </div>
            <div className="mt-2">
              <p className="text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">Resolution Efficiency</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-450 mt-0.5">{resolutionRate}% Rate</p>
            </div>
          </div>

          {/* In Progress Quick View */}
          <div className="bg-indigo-600 text-white p-5 rounded-3xl relative overflow-hidden flex flex-col justify-between min-h-[135px] shadow-md shadow-indigo-500/10">
            <div className="relative z-10">
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">In Progress Work</p>
              <p className="text-2xl font-black mt-0.5">{inProgressCount} Jobs</p>
            </div>
            <div className="relative z-10 w-full bg-white/20 h-2 rounded-full mt-4">
              <div className="bg-white h-full rounded-full transition-all duration-1000" style={{ width: requests.length > 0 ? `${(inProgressCount / requests.length) * 100}%` : '0%' }}></div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </div>

        {/* Ledger */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Maintenance Logs</h3>
            <button className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:opacity-75 transition-all">
              Filter <Filter size={12} />
            </button>
          </div>

          <div className="space-y-2.5">
            {dataLoading && (
              <div className="text-center py-10 text-[10px] font-bold uppercase tracking-wider text-slate-400">Syncing logs...</div>
            )}

            {!dataLoading && requests.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
                <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs">All systems functional. No maintenance requested.</p>
              </div>
            )}

            {requests.map((row, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100/50 dark:border-slate-800">
                    <Wrench size={18} />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">{row.title}</p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">{row.category} • {row.location || "Common Area"}</p>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col justify-between w-full sm:w-auto items-center sm:items-start border-t sm:border-t-0 border-slate-100/50 dark:border-slate-800/40 pt-2.5 sm:pt-0 mt-1 sm:mt-0">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase ${
                      row.priority === "high" 
                        ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600" 
                        : "bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-400"
                    }`}>
                      {row.priority} Priority
                    </span>
                    <p className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                      <Calendar size={10} />
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'Today'}
                    </p>
                  </div>

                  <div className={`mt-0 sm:mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    row.status === 'resolved' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450' 
                      : row.status === 'in_progress'
                      ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-450'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${row.status === 'resolved' ? 'bg-emerald-500' : row.status === 'in_progress' ? 'bg-indigo-500' : 'bg-amber-500'}`}></span>
                    {row.status?.replace("_", " ") || 'pending'}
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-1">
                  <button className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-550 dark:hover:text-indigo-450 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all"><FileText size={14} /></button>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 dark:text-slate-550 dark:hover:text-indigo-450 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all"><Edit3 size={14} /></button>
                  <button className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-550 dark:hover:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MAINTENANCE COMPOSER DRAWER */}
      <MaintenanceComposerSheet open={composeOpen} onClose={() => setComposeOpen(false)} busy={busy}>
        <form id="estate-maintenance-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Issue Title</span>
            <input
              className={estateFieldClassName}
              value={issueTitle} onChange={e => setIssueTitle(e.target.value)}
              placeholder="e.g. Street Light Breakdown" required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Category</span>
              <select
                className={estateFieldClassName}
                value={category} onChange={e => setCategory(e.target.value)}
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="security">Security Gates</option>
                <option value="structural">Structural</option>
                <option value="horticulture">Gardening & Parks</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Severity Priority</span>
              <select
                className={estateFieldClassName}
                value={priority} onChange={e => setPriority(e.target.value)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">Urgent (High)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Location</span>
            <input
              className={estateFieldClassName}
              value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Block C entrance or House 12" required
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Problem Details</span>
            <textarea
              className={estateTextareaClassName}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the failure, leak, or damage..."
              required
            />
          </div>
        </form>
      </MaintenanceComposerSheet>
    </div>
  );
};

export default EstateMaintenancePage;

function MaintenanceComposerSheet({ open, onClose, busy, children }) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (!open) return null;

  const footer = (
    <div className="border-t border-slate-100/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shrink-0">
      <button
        type="submit"
        form="estate-maintenance-form"
        disabled={busy}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
      >
        {busy ? "Broadcasting Job..." : "Log Work Request"}
      </button>
    </div>
  );

  // Desktop Overlay/Modal Layout
  if (!sheet.isMobile) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-slate-100/50 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-2xl max-w-lg z-10"
        >
          <div className="flex items-start justify-between border-b border-slate-100/50 dark:border-slate-800/40 px-5 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Infrastructure Care</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">New Maintenance Ticket</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-755">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[60dvh] overflow-y-auto px-5 py-5 overscroll-contain">{children}</div>
          {footer}
        </motion.section>
      </div>
    );
  }

  // Mobile Bottom Sheet Layout
  return (
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
      <motion.section
        {...sheet.mobileSheetProps}
        className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white dark:bg-slate-900 shadow-2xl max-h-[85dvh]"
      >
        {/* Drag Indicator handle */}
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3 shrink-0 cursor-grab active:cursor-grabbing">
          <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4 border-b border-slate-100/50 dark:border-slate-800/40 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Infrastructure Care</p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">New Maintenance Ticket</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div
          ref={sheet.contentRef}
          onScroll={sheet.onContentScroll}
          onPointerDown={sheet.onContentPointerDown}
          className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain"
        >
          {children}
        </div>
        {footer}
        <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 shrink-0" />
      </motion.section>
    </div>
  );
}