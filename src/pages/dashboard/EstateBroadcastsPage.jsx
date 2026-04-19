import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Plus,
  Megaphone,
  TrendingUp,
  Clock,
  Edit3,
  Trash2,
  LayoutDashboard,
  CreditCard,
  Building2,
  Settings,
  Users,
  X
} from 'lucide-react';

// Services & Hooks
import { createEstateAlert, deleteEstateAlert, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";
import { estateFieldClassName, estatePrimaryButtonClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";

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
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-14 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-base">Broadcasts</h1>
        <button onClick={() => navigate("/dashboard/notifications")} className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="flex-1 px-5 pt-6 pb-32 max-w-lg mx-auto w-full">
        <div className="mb-8">
          <span className="text-[#4955b3] font-bold tracking-widest text-[10px] uppercase mb-1 block">Communications Hub</span>
          <h2 className="text-3xl font-black tracking-tight text-[#2b3437]">Announcements</h2>
          <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed">Reach all {residentCount} residents instantly.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Sent</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#2b3437]">{sentCount}</span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className="bg-[#dfe0ff] p-5 rounded-[2rem] flex flex-col justify-between h-32">
            <span className="text-[#3b48a6] text-[10px] font-black uppercase tracking-wider">Reach</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-[#3b48a6]">{residentCount}</span>
              <Users size={16} className="text-[#3b48a6]" />
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          <h3 className="font-black text-lg text-[#2b3437] mb-2">History</h3>
          {alerts.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-0.5 bg-[#85f6e5]/40 text-[#005c53] text-[9px] font-black rounded uppercase tracking-tighter">
                  Sent
                </span>
                <span className="text-slate-400 text-[10px] font-bold">
                  {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <h4 className="text-base font-black text-[#2b3437] leading-tight mb-2">{item.title}</h4>
              <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed font-medium">{item.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  Audience: All Residents
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="p-2 text-slate-300 active:text-[#4955b3]"><Edit3 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 active:text-rose-500"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
          {!loading && alerts.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
               <Megaphone className="mx-auto text-slate-200 mb-2" size={32} />
               <p className="text-slate-400 font-bold text-sm">No broadcasts yet</p>
            </div>
          )}
        </div>
      </main>

      <button onClick={openCreate} className="fixed bottom-12 right-6 w-14 h-14 bg-[#4955b3] text-white rounded-2xl flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-all">
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* Mobile Bottom Navigation */}

      <BroadcastComposerSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        titleText={editingId ? "Edit Broadcast" : "New Broadcast"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Subject</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={estateFieldClassName} placeholder="e.g., Water Maintenance" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className={estateTextareaClassName} placeholder="Message for residents..." />
          </div>
          <button type="submit" disabled={busy} className={`${estatePrimaryButtonClassName} w-full py-4 text-xs font-black uppercase tracking-widest`}>
            {busy ? "Sending..." : editingId ? "Update" : "Broadcast Now"}
          </button>
        </form>
      </BroadcastComposerSheet>
    </div>
  );
};

export default EstateBroadcastsPage;

function BroadcastComposerSheet({
  open,
  onClose,
  titleText,
  children,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className="
          absolute inset-x-0 bottom-0
          bg-white

          h-[75dvh]
          max-h-[100dvh]

          flex flex-col
          overflow-hidden

          rounded-t-[2rem]

          md:top-1/2 md:left-1/2 md:bottom-auto md:right-auto
          md:-translate-x-1/2 md:-translate-y-1/2
          md:max-h-[90vh]
          md:w-full md:max-w-2xl
          md:rounded-2xl

          shadow-[0_-18px_40px_rgba(15,23,42,0.16)]
        "
      >
        {/* HEADER (fixed) */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">
                Communications Hub
              </p>
              <h3 className="mt-2 text-xl font-black text-[#2b3437]">
                {titleText}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="rounded-2xl bg-slate-50 p-3 text-slate-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 🔥 ONLY SCROLL AREA */}
        <div
          className="
            flex-1
            min-h-0
            overflow-y-auto
            px-5
            pb-10
            overscroll-contain
          "
          style={{
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="space-y-6 pt-4">
            {children}
          </div>
        </div>

        {/* SAFE AREA */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </div>
    </div>
  );
}


