import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Shield, 
  User, 
  Users, 
  X, 
  ChevronLeft, 
  Bell, 
  Loader2, 
  ShieldAlert 
} from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ESTATE_DATA_UPDATED_EVENT,
  createEstateSecurityUser,
  getEstateSecurityUserDetail,
  listEstateSecurityUsers,
  suspendEstateSecurityUser,
  unsuspendEstateSecurityUser
} from "../../../services/estateService";
import { estateFieldClassName } from "../../../components/mobile/EstateManagerPageShell";
import useResponsiveSheet from "../../../hooks/useResponsiveSheet";
import { showError, showSuccess } from "../../../utils/flash";
import { useEstateSecurityState } from "./useEstateSecurityState";

export default function EstateSecurityTeamPage() {
  const navigate = useNavigate();
  const { estateId, currentEstate, error, loading, securityUsers, setSecurityUsers, refreshSecurity, stats } = useEstateSecurityState();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [selectedGuard, setSelectedGuard] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", gateId: "" });

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function refreshUsers() {
    if (!estateId) return;
    try {
      const rows = await listEstateSecurityUsers(estateId);
      setSecurityUsers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      showError("Failed to fetch security team.");
    }
  }

  async function handleAddUser(event) {
    event.preventDefault();
    if (!estateId) {
      showError("Estate profile is still loading. Please try again in a moment.");
      return;
    }
    setSaving(true);
    try {
      const created = await createEstateSecurityUser({ estateId, ...form });
      if (created?.id) {
        setSecurityUsers((prev) => {
          const rows = Array.isArray(prev) ? prev : [];
          return rows.some((user) => user.id === created.id) ? rows : [...rows, { ...created, active: true }];
        });
      }
      await refreshUsers();
      await refreshSecurity?.();
      window.dispatchEvent(new Event(ESTATE_DATA_UPDATED_EVENT));
      setOpen(false);
      setForm({ fullName: "", email: "", password: "", phone: "", gateId: "" });
      showSuccess("Security personnel added");
    } catch (requestError) {
      showError(requestError?.message || "Unable to add security personnel");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle(user) {
    setActionId(user.id);
    try {
      if (user.active) await suspendEstateSecurityUser(estateId, user.id);
      else await unsuspendEstateSecurityUser(estateId, user.id);
      await refreshUsers();
      showSuccess("Security status updated");
    } catch (requestError) {
      showError(requestError?.message || "Unable to update security status");
    } finally {
      setActionId("");
    }
  }

  async function openGuardDetail(user) {
    setSelectedGuard(user);
    setDetailLoading(true);
    try {
      const detail = await getEstateSecurityUserDetail(estateId, user.id);
      setSelectedGuard(detail || user);
    } catch (requestError) {
      showError(requestError?.message || "Unable to load guard details");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">
      
      {/* --- STICKY GLASS HEADER --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Security Team</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-black text-white shadow-sm shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
            >
              <Plus size={16} /> Add Guard
            </button>
            <button 
              onClick={() => navigate("/dashboard/notifications")} 
              aria-label="Notifications"
              className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
            </button>
          </div>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        
        {/* --- TITLE & SUBTITLE --- */}
        <section className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">
            Guard Roster & Access
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {currentEstate?.name ? currentEstate.name : "Estate Security Team"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Manage guard login access and review personnel status.
          </p>
        </section>

        {/* --- STATS GRID --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100/20 shrink-0">
              <Users size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{loading ? "--" : stats.total}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Total Team</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-3xl border border-emerald-100/40 dark:border-emerald-500/10 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/20 shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{loading ? "--" : stats.active}</h4>
              <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/50 font-bold uppercase tracking-wider mt-1">Active</p>
            </div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-500/5 p-4 rounded-3xl border border-rose-100/40 dark:border-rose-500/10 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100/20 shrink-0">
              <User size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{loading ? "--" : stats.suspended}</h4>
              <p className="text-[9px] text-rose-600/70 dark:text-rose-400/50 font-bold uppercase tracking-wider mt-1">Suspended</p>
            </div>
          </div>
        </section>

        {/* --- ASSIGNED GUARDS PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Assigned Guards</h4>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold text-slate-400">Loading security team...</p>
              </div>
            ) : securityUsers.length ? (
              securityUsers.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                  <button type="button" onClick={() => openGuardDetail(user)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left group">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">{user.fullName || "Security user"}</p>
                      <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{user.gateId || "General gate"} · {user.email}</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleStatusToggle(user)}
                    disabled={actionId === user.id}
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide transition-all ${
                      user.active 
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/40" 
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {actionId === user.id ? <Loader2 size={10} className="animate-spin inline" /> : user.active ? "Active" : "Suspended"}
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center px-4">
                <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-black text-slate-700 dark:text-slate-300">No guards yet</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Add your first security personnel account to get started.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* --- ADD GUARD SHEET WITH EXPLICIT FIELD LABELS --- */}
      <SecurityPersonnelSheet open={open} onClose={() => setOpen(false)} busy={saving}>
        <form id="estate-security-form" onSubmit={handleAddUser} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
            <input required className={estateFieldClassName} value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="e.g. John Doe" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
            <input required type="email" className={estateFieldClassName} value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="guard@estate.com" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Temporary Password</label>
            <input required type="password" className={estateFieldClassName} value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="••••••••" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone Number <span className="text-slate-300 font-normal">(Optional)</span></label>
            <input className={estateFieldClassName} value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+1 (555) 000-0000" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gate Assignment <span className="text-slate-300 font-normal">(Optional)</span></label>
            <input className={estateFieldClassName} value={form.gateId} onChange={(event) => setForm((prev) => ({ ...prev, gateId: event.target.value }))} placeholder="e.g. Main Gate A" />
          </div>
        </form>
      </SecurityPersonnelSheet>

      <GuardDetailModal guard={selectedGuard} loading={detailLoading} onClose={() => setSelectedGuard(null)} />
    </div>
  );
}

function GuardDetailModal({ guard, loading, onClose }) {
  if (!guard || typeof document === "undefined") return null;
  const summary = guard.summary || {};
  
  const body = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Close guard details" />
      <section className="relative z-10 max-h-[86dvh] w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{guard.estateName || "Security Team"}</p>
            <h3 className="mt-1 text-base font-black text-slate-900 dark:text-white">{guard.fullName || "Security user"}</h3>
            <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">{guard.email || "No email"} · {guard.phone || "No phone"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto px-5 py-5 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-indigo-600" />
              <p className="text-xs font-bold text-slate-400">Loading guard details...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DetailMetric label="Entries" value={summary.entriesConfirmed || 0} />
                <DetailMetric label="Checkouts" value={summary.checkoutsPerformed || 0} />
                <DetailMetric label="Incidents" value={summary.incidentsReported || 0} />
                <DetailMetric label="Packages" value={summary.packagesRegistered || 0} />
              </div>
              <div className="rounded-3xl bg-slate-50 dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assignment Profile</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">Gate: <span className="font-medium">{guard.gateId || "General gate"}</span></p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Status: <span className="font-medium capitalize">{guard.status || (guard.active ? "active" : "suspended")}</span></p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Current shift: <span className="font-medium">{guard.currentShift ? "On duty" : "Off duty"}</span></p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity History</p>
                {(guard.activityHistory || []).length ? (
                  <div className="space-y-2">
                    {guard.activityHistory.map((item, index) => (
                      <div key={`${item.kind}-${item.at}-${index}`} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-white dark:bg-slate-900">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{item.label}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">{item.details?.visitor || item.details?.house || item.details?.gateId || "Estate activity"}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{item.at ? new Date(item.at).toLocaleString() : "No time"}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-3xl bg-slate-50 dark:bg-slate-850 py-8 text-center text-xs font-bold text-slate-400 border border-slate-100 dark:border-slate-800/60">No guard activity yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
  return createPortal(body, document.body);
}

function DetailMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-850 p-3 border border-slate-100 dark:border-slate-800/60">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function SecurityPersonnelSheet({ open, onClose, busy, children }) {
  const sheet = useResponsiveSheet({ open, onClose });
  if (!open || typeof document === "undefined") return null;

  const body = (
    <>
      <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Security Team</p>
          <h3 className="mt-1 text-base font-black text-slate-900 dark:text-white">Add Guard</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[62dvh] overflow-y-auto px-5 py-4">{children}</div>
      <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
        <button type="submit" form="estate-security-form" disabled={busy} className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs font-black text-white shadow-sm shadow-indigo-100 dark:shadow-none disabled:opacity-60 transition-all flex items-center justify-center gap-2">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {busy ? "Adding..." : "Add Security Personnel"}
        </button>
      </div>
    </>
  );

  if (!sheet.isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
        <motion.section initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl">
          {body}
        </motion.section>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
      <motion.section {...sheet.mobileSheetProps} className="relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-2xl">
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        {body}
      </motion.section>
    </div>,
    document.body
  );
}