import { useEffect, useState } from "react";
import { Plus, Shield, User, Users, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  createEstateSecurityUser,
  listEstateSecurityUsers,
  suspendEstateSecurityUser,
  unsuspendEstateSecurityUser
} from "../../../services/estateService";
import { estateFieldClassName } from "../../../components/mobile/EstateManagerPageShell";
import useResponsiveSheet from "../../../hooks/useResponsiveSheet";
import { showError, showSuccess } from "../../../utils/flash";
import { EstateSecurityShell, SecurityPanel, SecurityStatCard } from "./EstateSecurityShell";
import { useEstateSecurityState } from "./useEstateSecurityState";

export default function EstateSecurityTeamPage() {
  const { estateId, currentEstate, error, loading, securityUsers, setSecurityUsers, stats } = useEstateSecurityState();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", gateId: "" });

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function refreshUsers() {
    const rows = await listEstateSecurityUsers(estateId);
    setSecurityUsers(Array.isArray(rows) ? rows : []);
  }

  async function handleAddUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await createEstateSecurityUser({ estateId, ...form });
      await refreshUsers();
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

  return (
    <EstateSecurityShell
      title="Security Team"
      subtitle={`Manage guard login access${currentEstate?.name ? ` for ${currentEstate.name}` : ""}.`}
      action={
        <button onClick={() => setOpen(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4955b3] px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 active:scale-95">
          <Plus size={18} /> Add Guard
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SecurityStatCard icon={Users} label="Total Team" value={loading ? "--" : stats.total} />
        <SecurityStatCard icon={Shield} label="Active" value={loading ? "--" : stats.active} tone="emerald" />
        <SecurityStatCard icon={User} label="Suspended" value={loading ? "--" : stats.suspended} tone="rose" />
      </div>

      <SecurityPanel title="Assigned Guards" subtitle="These accounts can sign in to security tools for the estate.">
        {loading ? (
          <p className="py-12 text-center text-sm font-bold text-slate-400">Loading security team...</p>
        ) : securityUsers.length ? (
          <div>
            {securityUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-4 last:border-b-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-[#4955b3]">
                    <User size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#2b3437]">{user.fullName || "Security user"}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{user.gateId || "General gate"} · {user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleStatusToggle(user)}
                  disabled={actionId === user.id}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
                    user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {actionId === user.id ? "..." : user.active ? "Active" : "Suspended"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-black text-slate-700">No guards yet</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Add your first security personnel account.</p>
          </div>
        )}
      </SecurityPanel>

      <SecurityPersonnelSheet open={open} onClose={() => setOpen(false)} busy={saving}>
        <form id="estate-security-form" onSubmit={handleAddUser} className="space-y-4">
          <input required className={estateFieldClassName} value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="Full name" />
          <input required type="email" className={estateFieldClassName} value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email address" />
          <input required type="password" className={estateFieldClassName} value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} placeholder="Temporary password" />
          <input className={estateFieldClassName} value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone number" />
          <input className={estateFieldClassName} value={form.gateId} onChange={(event) => setForm((prev) => ({ ...prev, gateId: event.target.value }))} placeholder="Gate assignment" />
        </form>
      </SecurityPersonnelSheet>
    </EstateSecurityShell>
  );
}

function SecurityPersonnelSheet({ open, onClose, busy, children }) {
  const sheet = useResponsiveSheet({ open, onClose });
  if (!open || typeof document === "undefined") return null;

  const body = (
    <>
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-[#4955b3]">Security Team</p>
          <h3 className="mt-1 text-lg font-black text-[#2b3437]">Add Guard</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 p-2 text-slate-400">
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[62dvh] overflow-y-auto px-5 py-5">{children}</div>
      <div className="border-t border-slate-100 bg-white px-5 py-4">
        <button type="submit" form="estate-security-form" disabled={busy} className="w-full rounded-2xl bg-[#4955b3] py-4 text-sm font-black text-white disabled:opacity-60">
          {busy ? "Adding..." : "Add Security Personnel"}
        </button>
      </div>
    </>
  );

  if (!sheet.isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
        <motion.section initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative z-10 w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl">
          {body}
        </motion.section>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-label="Close form" />
      <motion.section {...sheet.mobileSheetProps} className="relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl">
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3">
          <div className="h-1 w-12 rounded-full bg-slate-200" />
        </div>
        {body}
      </motion.section>
    </div>,
    document.body
  );
}
