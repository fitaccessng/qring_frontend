import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Plus, Power, Settings2, Shield, Trash2, User } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import {
  createEstateSecurityUser,
  deleteEstateSecurityUser,
  getEstateOverview,
  getEstateSettings,
  listEstateSecurityUsers,
  suspendEstateSecurityUser,
  unsuspendEstateSecurityUser,
  updateEstateSettings
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";

const defaultRules = {
  canApproveWithoutHomeowner: false,
  mustNotifyHomeowner: true,
  requirePhotoVerification: false,
  requireCallBeforeApproval: false
};

export default function EstateSecurityPage() {
  const [overview, setOverview] = useState(null);
  const [selectedEstateId, setSelectedEstateId] = useState("");
  const [securityRules, setSecurityRules] = useState(defaultRules);
  const [securityUsers, setSecurityUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("team");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [securityForm, setSecurityForm] = useState({ fullName: "", email: "", password: "", phone: "", gateId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securityActionId, setSecurityActionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      setLoading(true);
      try {
        const data = await getEstateOverview();
        if (!active) return;
        setOverview(data);
        setSelectedEstateId((prev) => prev || data?.estates?.[0]?.id || "");
      } catch (err) {
        if (active) setError(err?.message || "Failed to load estate security controls.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedEstateId) return;
    let active = true;
    async function loadEstateSecurity() {
      try {
        const [users, settings] = await Promise.all([
          listEstateSecurityUsers(selectedEstateId),
          getEstateSettings(selectedEstateId).catch(() => null)
        ]);
        if (!active) return;
        setSecurityUsers(Array.isArray(users) ? users : []);
        const nextRules = settings?.securityRules || settings?.rules?.security || settings?.rules || null;
        setSecurityRules(nextRules ? { ...defaultRules, ...nextRules } : defaultRules);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load security team.");
      }
    }
    loadEstateSecurity();
    return () => {
      active = false;
    };
  }, [selectedEstateId]);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  const currentEstateName = useMemo(
    () => overview?.estates?.find((estate) => String(estate.id) === String(selectedEstateId))?.name || "Select Estate",
    [overview, selectedEstateId]
  );

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((estate) => ({ value: estate.id, label: estate.name })),
    [overview]
  );

  const normalizedUsers = useMemo(
    () =>
      securityUsers.map((user) => ({
        ...user,
        active:
          typeof user.active === "boolean"
            ? user.active
            : user.status
              ? String(user.status).toLowerCase() !== "suspended"
              : !user.suspendedAt
      })),
    [securityUsers]
  );

  function resetForm() {
    setSecurityForm({ fullName: "", email: "", password: "", phone: "", gateId: "" });
  }

  async function reloadUsers() {
    if (!selectedEstateId) return;
    const rows = await listEstateSecurityUsers(selectedEstateId);
    setSecurityUsers(Array.isArray(rows) ? rows : []);
  }

  async function handleSaveRules() {
    if (!selectedEstateId || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateEstateSettings(selectedEstateId, { securityRules });
      const nextRules = updated?.securityRules || updated?.rules?.security || updated?.rules || securityRules;
      setSecurityRules({ ...defaultRules, ...nextRules });
      showSuccess("Security rules updated.");
    } catch (err) {
      setError(err?.message || "Failed to update security rules.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSecurityUser(event) {
    event.preventDefault();
    if (!selectedEstateId || saving) return;
    if (!securityForm.fullName.trim() || !securityForm.email.trim() || !securityForm.password.trim()) {
      setError("Full name, email, and password are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createEstateSecurityUser({
        estateId: selectedEstateId,
        fullName: securityForm.fullName.trim(),
        email: securityForm.email.trim(),
        password: securityForm.password,
        phone: securityForm.phone.trim() || undefined,
        gateId: securityForm.gateId.trim() || undefined
      });
      await reloadUsers();
      resetForm();
      setIsAddModalOpen(false);
      showSuccess("Security personnel added.");
    } catch (err) {
      setError(err?.message || "Failed to add security personnel.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSecurityUser(user) {
    if (!selectedEstateId || !user?.id || securityActionId) return;
    setSecurityActionId(user.id);
    setError("");
    try {
      if (user.active) {
        await suspendEstateSecurityUser(selectedEstateId, user.id);
        showSuccess(`${user.fullName || "Security member"} suspended.`);
      } else {
        await unsuspendEstateSecurityUser(selectedEstateId, user.id);
        showSuccess(`${user.fullName || "Security member"} reactivated.`);
      }
      await reloadUsers();
    } catch (err) {
      setError(err?.message || "Failed to update security member.");
    } finally {
      setSecurityActionId("");
    }
  }

  async function handleDeleteSecurityUser(user) {
    if (!selectedEstateId || !user?.id || securityActionId) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${user.fullName || "this security member"}?`)) return;
    setSecurityActionId(user.id);
    setError("");
    try {
      await deleteEstateSecurityUser(selectedEstateId, user.id);
      await reloadUsers();
      showSuccess("Security member deleted.");
    } catch (err) {
      setError(err?.message || "Failed to delete security member.");
    } finally {
      setSecurityActionId("");
    }
  }

  return (
    <AppShell title="Security Control">
      <div className="mx-auto max-w-lg min-h-screen bg-slate-50 pb-24 dark:bg-slate-950">
        <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Manage Estate</p>
              <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{currentEstateName}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
              <Shield className="h-5 w-5 text-sky-600" />
            </div>
          </div>

          {estateOptions.length > 1 ? (
            <select
              value={selectedEstateId}
              onChange={(event) => setSelectedEstateId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {estateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          <div className="mt-4 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {["team", "rules"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
                  activeTab === tab
                    ? "bg-white text-sky-600 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500"
                }`}
              >
                {tab === "team" ? "Security Team" : "Safety Rules"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Loading security controls...
            </div>
          ) : activeTab === "team" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-400">Active Personnel</h3>
                <span className="text-xs font-medium text-slate-400">{normalizedUsers.length} total</span>
              </div>

              {normalizedUsers.length === 0 ? (
                <EmptyState onAdd={() => setIsAddModalOpen(true)} />
              ) : (
                normalizedUsers.map((user) => (
                  <SecurityMemberCard
                    key={user.id}
                    user={user}
                    onToggle={() => handleToggleSecurityUser(user)}
                    onDelete={() => handleDeleteSecurityUser(user)}
                    isProcessing={securityActionId === user.id}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Global Access Rules</h3>
                <div className="space-y-3">
                  <RuleToggle
                    icon={User}
                    label="Independent Approval"
                    description="Allow security to approve visitors without homeowner confirmation."
                    checked={securityRules.canApproveWithoutHomeowner}
                    onChange={(value) => setSecurityRules((prev) => ({ ...prev, canApproveWithoutHomeowner: value }))}
                  />
                  <RuleToggle
                    icon={Mail}
                    label="Mandatory Notifications"
                    description="Notify homeowners whenever gate activity needs their attention."
                    checked={securityRules.mustNotifyHomeowner}
                    onChange={(value) => setSecurityRules((prev) => ({ ...prev, mustNotifyHomeowner: value }))}
                  />
                  <RuleToggle
                    icon={Shield}
                    label="Photo Verification"
                    description="Require visitor photo capture before access can move forward."
                    checked={securityRules.requirePhotoVerification}
                    onChange={(value) => setSecurityRules((prev) => ({ ...prev, requirePhotoVerification: value }))}
                  />
                  <RuleToggle
                    icon={Phone}
                    label="Call Before Approval"
                    description="Ask security to call the homeowner before final approval."
                    checked={securityRules.requireCallBeforeApproval}
                    onChange={(value) => setSecurityRules((prev) => ({ ...prev, requireCallBeforeApproval: value }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveRules}
                  disabled={saving || !selectedEstateId}
                  className="mt-6 w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  {saving ? "Updating..." : "Update Rules"}
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab === "team" ? (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-300 transition-transform active:scale-90 dark:shadow-none"
          >
            <Plus className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      <MobileBottomSheet open={isAddModalOpen} title="Add New Security" onClose={() => setIsAddModalOpen(false)} width="680px" height="90dvh" zIndex={100}>
        <form onSubmit={handleAddSecurityUser} className="space-y-4 pt-2">
          <MobileInput
            label="Full Name"
            placeholder="e.g. John Doe"
            value={securityForm.fullName}
            onChange={(event) => setSecurityForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
          <MobileInput
            label="Email Address"
            type="email"
            placeholder="security@estate.com"
            value={securityForm.email}
            onChange={(event) => setSecurityForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <MobileInput
            label="Password"
            type="password"
            placeholder="Create temporary password"
            value={securityForm.password}
            onChange={(event) => setSecurityForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <MobileInput
            label="Phone Number"
            placeholder="080..."
            value={securityForm.phone}
            onChange={(event) => setSecurityForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <MobileInput
            label="Assigned Gate"
            placeholder="Main Gate"
            value={securityForm.gateId}
            onChange={(event) => setSecurityForm((prev) => ({ ...prev, gateId: event.target.value }))}
          />
          <button
            type="submit"
            disabled={saving || !selectedEstateId}
            className="w-full rounded-2xl bg-sky-600 py-4 font-bold text-white disabled:opacity-60"
          >
            {saving ? "Registering..." : "Register Personnel"}
          </button>
        </form>
      </MobileBottomSheet>
    </AppShell>
  );
}

function SecurityMemberCard({ user, onToggle, onDelete, isProcessing }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 transition-all active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${user.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.fullName || "Security Member"}</h4>
          <p className="truncate text-xs text-slate-500">{user.gateId || "General Security"}</p>
          {user.email ? <p className="truncate text-[11px] text-slate-400">{user.email}</p> : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggle}
            disabled={isProcessing}
            className="rounded-xl bg-slate-50 p-2 text-slate-600 disabled:opacity-60 dark:bg-slate-800"
          >
            <Power className={`h-4 w-4 ${user.active ? "text-emerald-500" : "text-slate-400"}`} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isProcessing}
            className="rounded-xl bg-rose-50 p-2 text-rose-500 disabled:opacity-60 dark:bg-rose-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-1 font-semibold ${user.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
          {isProcessing ? "Updating..." : user.active ? "Active" : "Suspended"}
        </span>
        {user.phone ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{user.phone}</span> : null}
      </div>
    </div>
  );
}

function RuleToggle({ label, description, checked, onChange, icon: Icon }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start gap-4 rounded-2xl border border-slate-50 p-4 transition-colors active:bg-slate-50 dark:border-slate-800"
    >
      <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-lg ${checked ? "bg-sky-100 text-sky-600" : "bg-slate-100 text-slate-400"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
        <p className="text-[11px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className={`mt-1 h-5 w-10 rounded-full transition-colors ${checked ? "bg-sky-500" : "bg-slate-300"}`}>
        <div className={`h-5 w-5 rounded-full border-2 border-white bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </div>
  );
}

function MobileInput({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 rounded-full bg-slate-100 p-6 dark:bg-slate-900">
        <Shield className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">No Team Members</h3>
      <p className="mt-1 px-8 text-xs text-slate-500">Start by adding your security personnel to manage gates and visitor approvals.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-bold text-white"
      >
        <Plus className="h-4 w-4" />
        Add Security Member
      </button>
    </div>
  );
}
