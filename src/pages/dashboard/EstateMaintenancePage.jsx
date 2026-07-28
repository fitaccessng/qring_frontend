import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from "react-dom";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  HardHat,
  Verified,
  TriangleAlert,
  Lightbulb,
  Plus,
  Settings,
  CheckCircle2,
  Filter,
  X
} from 'lucide-react';

// Service & Hook Imports
import {
  listEstateAlerts,
  listMaintenanceAudits,
  updateEstateAlert,
  createEstateAlert
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";

const EstateMaintenancePage = () => {
  const navigate = useNavigate();
  const { overview, estateId, setEstateId, loading, error, setError } = useEstateOverviewState();

  const [requests, setRequests] = useState([]);
  const [audits, setAudits] = useState([]);
  const [updatingId, setUpdatingId] = useState("");
  const [controlsOpen, setControlsOpen] = useState(false);

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium' });

  useEffect(() => { if (error) showError(error); }, [error]);

  const loadData = async () => {
    if (!estateId) return;
    try {
      const [rows, auditRows] = await Promise.all([
        listEstateAlerts(estateId, "maintenance_request"),
        listMaintenanceAudits(estateId)
      ]);
      setRequests(rows);
      setAudits(auditRows);
    } catch (err) {
      setError(err?.message || "Failed to load maintenance data");
    }
  };

  useEffect(() => { loadData(); }, [estateId]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: loadData,
    ALERT_UPDATED: loadData,
    ALERT_DELETED: loadData
  }), [estateId]));

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formData.title) return showError("Title is required");

    setIsSubmitting(true);
    try {
      await createEstateAlert({
        estateId,
        title: String(formData.title || "").trim(),
        description: String(formData.description || "").trim(),
        alertType: "maintenance_request"
      });
      showSuccess("Maintenance request created");
      setFormOpen(false);
      setFormData({ title: '', description: '', priority: 'medium' });
      await loadData();
    } catch (err) {
      showError(err?.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (item, status) => {
    if (!item?.id || updatingId) return;
    setUpdatingId(item.id);
    try {
      await updateEstateAlert(item.id, {
        title: item.title,
        description: item.description || "",
        maintenanceStatus: status
      });
      showSuccess(`Marked as ${status}`);
      await loadData();
    } catch (err) {
      showError(err?.message || "Update failed");
    } finally {
      setUpdatingId("");
    }
  };

  // --- Dynamic Calculations ---
  const pendingRequests = requests.filter(r => r.maintenanceStatus !== "solved");
  const resolvedRequests = requests.filter(r => r.maintenanceStatus === "solved");
  const pendingCount = pendingRequests.length;
  const resolvedCount = resolvedRequests.length;
  const totalCount = requests.length;
  const healthScore = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

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
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Operations</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maintenance Hub</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
            )}
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-4xl mx-auto w-full space-y-6 flex-1">
        
        {/* Dynamic Header Information */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
          <div>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Central Command</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Operations Summary</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 max-w-md leading-relaxed">
              Track infrastructure issues, organize audit schedules, and direct quick solutions across the estate.
            </p>
          </div>
          
          {/* Health Score Indicator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm self-start sm:self-auto shrink-0">
            <div className="relative flex items-center justify-center">
              <svg className="w-10 h-10 transform -rotate-90">
                <circle className="text-slate-100 dark:text-slate-800" cx="20" cy="20" fill="transparent" r="16" stroke="currentColor" strokeWidth="3.5"></circle>
                <circle className="text-emerald-500 transition-all duration-1000" cx="20" cy="20" fill="transparent" r="16" stroke="currentColor" strokeDasharray="100.5" strokeDashoffset={100.5 - (100.5 * healthScore) / 100} strokeWidth="3.5" strokeLinecap="round"></circle>
              </svg>
              <div className="absolute text-emerald-500"><CheckCircle2 size={14} /></div>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Health Score</p>
              <p className="text-base font-black text-emerald-500">{healthScore}%</p>
            </div>
          </div>
        </div>

        {/* Bento Stats Block Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Open Tickets */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/30 rounded-3xl p-5 flex flex-col justify-between min-h-[135px]">
            <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-500/10 w-fit rounded-xl text-indigo-600 dark:text-indigo-400"><Settings size={18} /></div>
            <div>
              <h3 className="text-2xl font-black text-indigo-950 dark:text-white leading-none">{pendingCount}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mt-1.5">Open Tickets</p>
            </div>
          </div>

          {/* Audits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 rounded-3xl p-5 flex flex-col justify-between min-h-[135px] shadow-sm">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-850 w-fit rounded-xl text-slate-400 dark:text-slate-500"><HardHat size={18} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{audits.length}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1.5">Audits</p>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/20 dark:border-emerald-900/10 rounded-3xl p-5 flex flex-col justify-between min-h-[135px]">
            <div className="p-2.5 bg-emerald-100/30 dark:bg-emerald-500/10 w-fit rounded-xl text-emerald-600 dark:text-emerald-400"><Verified size={18} /></div>
            <div>
              <h3 className="text-2xl font-black text-emerald-850 dark:text-emerald-450 leading-none">{resolvedCount}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-450 mt-1.5">Resolved</p>
            </div>
          </div>

          {/* Critical Items */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/45 dark:border-rose-900/20 rounded-3xl p-5 flex flex-col justify-between min-h-[135px]">
            <div className="p-2.5 bg-rose-100/40 dark:bg-rose-500/10 w-fit rounded-xl text-rose-600 dark:text-rose-450"><TriangleAlert size={18} /></div>
            <div>
              <h3 className="text-2xl font-black text-rose-700 dark:text-rose-450 leading-none">{pendingRequests.filter(r => r.priority === 'high').length}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-450 mt-1.5">Critical</p>
            </div>
          </div>
        </div>

        {/* Requests Feed Ledger */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Active Requests</h3>
            <button 
              onClick={() => setControlsOpen(true)} 
              className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:opacity-75 transition-all"
            >
              Estate Settings <Filter size={12} />
            </button>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="text-center py-10 text-[10px] font-bold uppercase tracking-wider text-slate-400">Syncing Feed...</div>
            ) : requests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm">
                <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs">No active maintenance requests found.</p>
              </div>
            ) : requests.map((item) => (
              <div key={item.id} className="group bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100/50 dark:border-slate-800 shrink-0">
                    <Lightbulb size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">{item.title}</h5>
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'NOW'}
                      </span>
                    </div>
                    <p className="text-slate-550 dark:text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3.5 w-full sm:w-auto border-t sm:border-t-0 border-slate-100/50 dark:border-slate-800/40 pt-2.5 sm:pt-0 mt-1 sm:mt-0 shrink-0">
                  <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    item.maintenanceStatus === 'solved' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-450' 
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-450'
                  }`}>
                    <span className={`w-1 h-1 rounded-full ${item.maintenanceStatus === 'solved' ? 'bg-emerald-500' : 'bg-amber-550'}`}></span>
                    {item.maintenanceStatus || 'pending'}
                  </div>

                  {item.maintenanceStatus !== 'solved' && (
                    <button
                      onClick={() => updateStatus(item, 'solved')}
                      disabled={!!updatingId}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                    >
                      {updatingId === item.id ? '...' : 'Resolve'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FIXED CREATE FAB */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed right-5 bottom-5 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-500/15 flex items-center justify-center z-[90] active:scale-90 transition-transform hover:bg-indigo-700"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* CREATE FORM SHEET */}
      <MaintenanceSheetFrame
        open={formOpen}
        onClose={() => setFormOpen(false)}
        eyebrow="Central Command"
        title="New Request"
        busy={isSubmitting}
        footer={
          <button
            type="submit"
            form="maintenance-request-form"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post Request'}
          </button>
        }
      >
        <form id="maintenance-request-form" onSubmit={handleCreateRequest} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Issue Title</label>
            <input
              type="text"
              placeholder="e.g., Street Light Repair"
              className={estateFieldClassName}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({...formData, priority: p})}
                  className={`py-3 rounded-xl text-[10px] font-extrabold uppercase border transition-all ${
                    formData.priority === p 
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-400 dark:text-indigo-400' 
                      : 'bg-white border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the issue in detail..."
              className={estateTextareaClassName}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
        </form>
      </MaintenanceSheetFrame>

      {/* CONTEXT SWITCHER SHEET */}
      <MaintenanceSheetFrame
        open={controlsOpen}
        onClose={() => setControlsOpen(false)}
        eyebrow="Central Command"
        title="Estate Context"
        footer={
          <button 
            onClick={() => setControlsOpen(false)} 
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 py-3.5 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-95"
          >
            Close
          </button>
        }
      >
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Selected Estate</span>
            <select
              value={estateId}
              onChange={(e) => { setEstateId(e.target.value); setControlsOpen(false); }}
              className={estateFieldClassName}
            >
              {(overview?.estates ?? []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </MaintenanceSheetFrame>

    </div>
  );
};

export default EstateMaintenancePage;

function MaintenanceSheetFrame({
  open,
  onClose,
  eyebrow,
  title,
  busy,
  footer,
  children,
}) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (typeof document === "undefined") return null;

  const resolvedFooter = footer && (
    <div className="border-t border-slate-100/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shrink-0">
      {footer}
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div 
          className="fixed left-0 right-0 top-0 z-[200] flex flex-col justify-end md:justify-center items-center" 
          style={{ height: sheet.isMobile ? (sheet.viewportHeight || "100dvh") : "100vh" }}
        >
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet Panel */}
          {sheet.isMobile ? (
            /* Mobile Bottom Sheet Layout */
            <motion.section
              {...sheet.mobileSheetProps}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white dark:bg-slate-900 shadow-2xl max-h-[85dvh] z-10"
            >
              {/* Drag Handle Bar */}
              <div onPointerDown={sheet.startDrag} className="flex justify-center py-4 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              
              {/* Modal Title Block */}
              <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4 border-b border-slate-100/50 dark:border-slate-800/40 shrink-0">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400">
                  <X size={16} />
                </button>
              </div>

              {/* Scroll Container */}
              <div
                ref={sheet.contentRef}
                onScroll={sheet.onContentScroll}
                onPointerDown={sheet.onContentPointerDown}
                className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain"
              >
                {children}
              </div>

              {resolvedFooter}
              {/* Device Bottom Safe Space Offset */}
              <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 shrink-0" />
            </motion.section>
          ) : (
            /* Desktop / Tablet Modal Dialog */
            <motion.section
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full overflow-hidden rounded-[2rem] border border-slate-100/50 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-2xl max-w-lg z-10 m-4"
            >
              <div className="flex items-start justify-between border-b border-slate-100/50 dark:border-slate-800/40 px-5 py-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-750">
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[60dvh] overflow-y-auto px-5 py-5 overscroll-contain">{children}</div>
              
              {resolvedFooter}
            </motion.section>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
