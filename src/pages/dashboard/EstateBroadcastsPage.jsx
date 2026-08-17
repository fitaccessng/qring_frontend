import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Bell,
  Plus,
  Megaphone,
  TrendingUp,
  Edit3,
  Trash2,
  Users,
  X
} from 'lucide-react';

// Services & Hooks
import { createEstateAlert, deleteEstateAlert, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { estateFieldClassName, estatePrimaryButtonClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";
import BottomSheet from "../../components/system/BottomSheet";

const EstateBroadcastsPage = () => {
  const navigate = useNavigate();
  const { overview, estateId, loading, error, setError } = useEstateOverviewState();

  const [alerts, setAlerts] = useState([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const loadAlerts = async () => {
    if (!estateId) return;
    try {
      const rows = await listEstateAlerts(estateId, "notice");
      setAlerts(rows);
    } catch (err) {
      setError(err?.message || "Failed to load broadcasts");
    }
  };

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    loadAlerts();
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: loadAlerts,
    ALERT_UPDATED: loadAlerts,
    ALERT_DELETED: loadAlerts
  }), [estateId]));

  // Stats calculation
  const sentCount = alerts.length;
  const residentCount = overview?.homeowners?.length ?? 0;

  const openCreate = () => {
    setEditingId("");
    setTitle("");
    setMessage("");
    setComposeOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.description);
    setComposeOpen(true);
  };

  async function handleDelete(id) {
    if (!window.confirm("Delete this broadcast?")) return;
    try {
      await deleteEstateAlert(id);
      showSuccess("Deleted");
      loadAlerts();
    } catch (err) { showError(err?.message); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!estateId || !title.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateEstateAlert(editingId, { title: title.trim(), description: message.trim() });
        showSuccess("Updated");
      } else {
        await createEstateAlert({ estateId, title: title.trim(), description: message.trim(), alertType: "notice" });
        showSuccess("Sent");
      }
      setComposeOpen(false);
      loadAlerts();
    } catch (err) {
      showError(err?.message);
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
            {/* <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button> */}
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Broadcasts</h1>
              {/* <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Communications Hub</p> */}
            </div>
          </div>
          <button 
            onClick={() => navigate("/dashboard/notifications")} 
            className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        <div className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Mass Messaging</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Estate Announcements</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Reach all {residentCount} active resident profiles instantly.
          </p>
        </div>

        {/* COMPACT STATISTICS MODULES */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Sent</p>
              <h4 className="text-lg font-black leading-none mt-0.5 text-slate-900 dark:text-white">{sentCount}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Audience</p>
              <h4 className="text-lg font-black leading-none mt-0.5 text-slate-900 dark:text-white">{residentCount}</h4>
            </div>
          </div>
        </section>

        {/* BROADCAST HISTORY FEED */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Broadcast History</h4>
          </div>

          <div className="space-y-2.5">
            {alerts.map((item) => (
              <article key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm transition-all flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    Delivered
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">
                    {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">{item.title}</h4>
                  <p className="text-slate-550 dark:text-slate-400 text-xs mt-1.5 leading-relaxed line-clamp-2">{item.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100/50 dark:border-slate-800/60">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    Target: All Residents
                  </span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => openEdit(item)} 
                      className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 dark:text-slate-400 rounded-lg transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-slate-400 hover:text-rose-600 dark:text-slate-400 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!loading && alerts.length === 0 && (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                 <Megaphone className="mx-auto text-slate-200 dark:text-slate-850 mb-2" size={32} />
                 <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">No Broadcasts Active</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FLOATING ACTION ACTION SHORTCUT */}
      <button 
        onClick={openCreate} 
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 z-40 active:scale-90 hover:bg-indigo-700 transition-all"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* COMPOSER BOTTOM SHEET DRAWER */}
      <BroadcastComposerSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        titleText={editingId ? "Edit Broadcast" : "New Announcement"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Subject Heading</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className={`${estateFieldClassName} text-xs font-semibold`} 
              placeholder="e.g. Scheduled Power Interruption" 
              required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Alert Details</label>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              rows={4} 
              className={`${estateTextareaClassName} text-xs font-semibold`} 
              placeholder="Type your announcement content here..." 
            />
          </div>
          <button 
            type="submit" 
            disabled={busy} 
            className={`${estatePrimaryButtonClassName} w-full py-3.5 mt-2 text-[11px] font-black uppercase tracking-wider rounded-xl`}
          >
            {busy ? "Sending..." : editingId ? "Update Alert" : "Broadcast to Residents"}
          </button>
        </form>
      </BroadcastComposerSheet>
    </div>
  );
};

export default EstateBroadcastsPage;

function BroadcastComposerSheet({ open, onClose, titleText, children }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={titleText}>{children}</BottomSheet>
  );
}
