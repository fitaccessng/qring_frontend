import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, ShieldCheck, MoreVertical, Plus,
  Power, Trash2, DoorOpen, LayoutGrid, Settings,
  Shield, User, Mail, Phone, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Service Imports
import {
  createEstateSecurityUser,
  deleteEstateSecurityUser,
  getEstateSettings,
  listEstateSecurityUsers,
  suspendEstateSecurityUser,
  unsuspendEstateSecurityUser,
  updateEstateSettings
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";

const defaultRules = {
  canApproveWithoutHomeowner: false,
  mustNotifyHomeowner: true,
  requirePhotoVerification: false,
  requireCallBeforeApproval: false
};

function buildSettingsPayload({
  reminderFrequencyDays,
  rules,
  autoApproveTrustedVisitors,
  suspiciousVisitWindowMinutes,
  suspiciousHouseThreshold,
  suspiciousRejectionThreshold
}) {
  const parsedReminderDays = Number.parseInt(String(reminderFrequencyDays ?? 1), 10);
  const parsedVisitWindow = Number.parseInt(String(suspiciousVisitWindowMinutes ?? 20), 10);
  const parsedHouseThreshold = Number.parseInt(String(suspiciousHouseThreshold ?? 3), 10);
  const parsedRejectionThreshold = Number.parseInt(String(suspiciousRejectionThreshold ?? 2), 10);

  return {
    reminderFrequencyDays: Number.isFinite(parsedReminderDays) && parsedReminderDays > 0 ? parsedReminderDays : 1,
    canApproveWithoutHomeowner: Boolean(rules?.canApproveWithoutHomeowner),
    mustNotifyHomeowner: Boolean(rules?.mustNotifyHomeowner ?? true),
    requirePhotoVerification: Boolean(rules?.requirePhotoVerification),
    requireCallBeforeApproval: Boolean(rules?.requireCallBeforeApproval),
    autoApproveTrustedVisitors: Boolean(autoApproveTrustedVisitors),
    suspiciousVisitWindowMinutes: Number.isFinite(parsedVisitWindow) && parsedVisitWindow > 0 ? parsedVisitWindow : 20,
    suspiciousHouseThreshold: Number.isFinite(parsedHouseThreshold) && parsedHouseThreshold > 0 ? parsedHouseThreshold : 3,
    suspiciousRejectionThreshold: Number.isFinite(parsedRejectionThreshold) && parsedRejectionThreshold > 0 ? parsedRejectionThreshold : 2
  };
}

const EstateSecurityPage = () => {
  const navigate = useNavigate();
  const { overview, estateId, loading, error, setError } = useEstateOverviewState();

  // State
  const [selectedEstateId, setSelectedEstateId] = useState(estateId || "");
  const [securityRules, setSecurityRules] = useState(defaultRules);
  const [securityUsers, setSecurityUsers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [securityActionId, setSecurityActionId] = useState("");
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState(1);
  const [autoApproveTrustedVisitors, setAutoApproveTrustedVisitors] = useState(false);
  const [suspiciousVisitWindowMinutes, setSuspiciousVisitWindowMinutes] = useState(20);
  const [suspiciousHouseThreshold, setSuspiciousHouseThreshold] = useState(3);
  const [suspiciousRejectionThreshold, setSuspiciousRejectionThreshold] = useState(2);
  const [securityForm, setSecurityForm] = useState({ fullName: "", email: "", password: "", phone: "", gateId: "" });

  // Sync estateId
  useEffect(() => {
    if (estateId && !selectedEstateId) setSelectedEstateId(estateId);
  }, [estateId, selectedEstateId]);

  // Load Data
  useEffect(() => {
    if (!selectedEstateId) return;
    let active = true;
    async function loadData() {
      try {
        const [users, settings] = await Promise.all([
          listEstateSecurityUsers(selectedEstateId),
          getEstateSettings(selectedEstateId).catch(() => null)
        ]);
        if (!active) return;
        setSecurityUsers(Array.isArray(users) ? users : []);

        // Load all settings from server
        if (settings) {
          const nextRules = settings?.securityRules || settings?.rules?.security || settings?.rules || null;
          setSecurityRules(nextRules ? { ...defaultRules, ...nextRules } : defaultRules);
          setReminderFrequencyDays(settings?.reminderFrequencyDays ?? 1);
          setAutoApproveTrustedVisitors(settings?.autoApproveTrustedVisitors ?? false);
          setSuspiciousVisitWindowMinutes(settings?.suspiciousVisitWindowMinutes ?? 20);
          setSuspiciousHouseThreshold(settings?.suspiciousHouseThreshold ?? 3);
          setSuspiciousRejectionThreshold(settings?.suspiciousRejectionThreshold ?? 2);
        } else {
          setSecurityRules(defaultRules);
          setReminderFrequencyDays(1);
          setAutoApproveTrustedVisitors(false);
          setSuspiciousVisitWindowMinutes(20);
          setSuspiciousHouseThreshold(3);
          setSuspiciousRejectionThreshold(2);
        }
      } catch (err) {
        if (active) setError(err?.message || "Failed to load security team.");
      }
    }
    loadData();
    return () => { active = false; };
  }, [selectedEstateId, setError]);

  useEffect(() => { if (error) showError(error); }, [error]);

  // Logic Helpers
  const normalizedUsers = useMemo(() =>
    securityUsers.map((user) => ({
      ...user,
      active: typeof user.active === "boolean" ? user.active : !user.suspendedAt
    })), [securityUsers]
  );

  const stats = useMemo(() => ({
    onDuty: normalizedUsers.filter(u => u.active).length,
    offDuty: normalizedUsers.filter(u => !u.active).length,
    total: normalizedUsers.length
  }), [normalizedUsers]);

  // Actions
  const handleToggleRule = async (key) => {
    const newRules = { ...securityRules, [key]: !securityRules[key] };
    setSecurityRules(newRules);
    try {
      await updateEstateSettings(selectedEstateId, buildSettingsPayload({
        reminderFrequencyDays,
        rules: newRules,
        autoApproveTrustedVisitors,
        suspiciousVisitWindowMinutes,
        suspiciousHouseThreshold,
        suspiciousRejectionThreshold
      }));
      showSuccess("Rule updated");
    } catch (err) {
      showError(err?.message || "Failed to sync rule to server");
      setSecurityRules(securityRules);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createEstateSecurityUser({ estateId: selectedEstateId, ...securityForm });
      const rows = await listEstateSecurityUsers(selectedEstateId);
      setSecurityUsers(rows);
      setIsAddModalOpen(false);
      setSecurityForm({ fullName: "", email: "", password: "", phone: "", gateId: "" });
      showSuccess("Personnel added");
    } catch (err) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (user) => {
    setSecurityActionId(user.id);
    try {
      if (user.active) await suspendEstateSecurityUser(selectedEstateId, user.id);
      else await unsuspendEstateSecurityUser(selectedEstateId, user.id);
      const rows = await listEstateSecurityUsers(selectedEstateId);
      setSecurityUsers(rows);
      showSuccess("Status updated");
    } catch (err) {
      showError(err.message);
    } finally {
      setSecurityActionId("");
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-32">

      {/* Premium Header */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-lg">Security Control</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <Bell size={22} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="pt-24 px-5 max-w-5xl mx-auto space-y-8">

        {/* Hero Section */}
        <section className="space-y-2">
          <span className="text-[#4955b3] font-black uppercase tracking-[0.2em] text-[10px]">Guard Oversight</span>
          <h2 className="text-3xl font-black text-[#2b3437] tracking-tight">System Access</h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md font-medium">
            Configure safety protocols and manage personnel for {overview?.estates?.find(e => e.id === selectedEstateId)?.name || 'the estate'}.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column: Safety Rules */}
          <section className="lg:col-span-5 space-y-6">
            <div className="bg-[#eaeff1] rounded-[2.5rem] p-7 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#4955b3] shadow-sm">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-black text-[#2b3437]">Safety Rules</h3>
              </div>

              <div className="space-y-6">
                <RuleItem
                  title="Instant Approval"
                  desc="Security approves without homeowner"
                  active={securityRules.canApproveWithoutHomeowner}
                  onToggle={() => handleToggleRule('canApproveWithoutHomeowner')}
                />
                <RuleItem
                  title="Photo Verify"
                  desc="Capture visitor photo at gate"
                  active={securityRules.requirePhotoVerification}
                  onToggle={() => handleToggleRule('requirePhotoVerification')}
                />
                <RuleItem
                  title="Notify Residents"
                  desc="Always ping homeowners"
                  active={securityRules.mustNotifyHomeowner}
                  onToggle={() => handleToggleRule('mustNotifyHomeowner')}
                />
              </div>
            </div>

            {/* System Status Card */}
            <div className="bg-[#273492] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                  <Shield size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-black mb-2">System Armed</h3>
                <p className="text-indigo-200 text-xs mb-6 font-medium leading-relaxed opacity-80">
                  Perimeter monitoring is active across {stats.total} registered personnel.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Monitoring
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Staff Roster */}
          <section className="lg:col-span-7">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-[#2b3437]">Staff Roster</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Personnel</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-12 h-12 bg-[#4955b3] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="space-y-2 min-h-[300px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 opacity-30">
                    <div className="w-8 h-8 border-4 border-[#4955b3] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">Syncing Personnel...</p>
                  </div>
                ) : normalizedUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                    <p className="text-sm font-bold text-slate-400">No personnel found</p>
                  </div>
                ) : (
                  normalizedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#4955b3]">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-black text-[#2b3437] text-sm">{user.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{user.gateId || "General Gate"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStatusToggle(user)}
                          disabled={securityActionId === user.id}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full transition-all ${
                            user.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {securityActionId === user.id ? '...' : user.active ? 'Active' : 'Suspended'}
                        </button>
                        <button className="p-2 text-slate-300 hover:text-rose-500">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Stats Grid */}
              <div className="mt-12 grid grid-cols-3 gap-4">
                <StatBox label="On Duty" val={stats.onDuty} color="text-[#4955b3]" />
                <StatBox label="Off Duty" val={stats.offDuty} color="text-slate-400" />
                <StatBox label="Total" val={stats.total} color="text-slate-400" />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Add Personnel Sheet */}
      <MobileBottomSheet
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Personnel"
      >
        <form onSubmit={handleAddUser} className="space-y-4 pb-12">
          <Input label="Full Name" value={securityForm.fullName} onChange={v => setSecurityForm(p => ({...p, fullName: v}))} />
          <Input label="Email Address" type="email" value={securityForm.email} onChange={v => setSecurityForm(p => ({...p, email: v}))} />
          <Input label="Password" type="password" value={securityForm.password} onChange={v => setSecurityForm(p => ({...p, password: v}))} />
          <Input label="Gate / Location" placeholder="Main Entrance" value={securityForm.gateId} onChange={v => setSecurityForm(p => ({...p, gateId: v}))} />

          <button
            disabled={saving}
            className="w-full py-5 bg-[#4955b3] text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Registering..." : "Confirm Registration"}
          </button>
        </form>
      </MobileBottomSheet>

      {/* Persistent Bottom Nav */}

    </div>
  );
};

// Sub-components for cleaner structure
const RuleItem = ({ title, desc, active, onToggle }) => (
  <div className="flex items-center justify-between">
    <div className="flex-1 pr-4">
      <p className="font-bold text-[#2b3437] text-sm">{title}</p>
      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{desc}</p>
    </div>
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-[#4955b3]' : 'bg-slate-300'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`} />
    </button>
  </div>
);

const StatBox = ({ label, val, color }) => (
  <div className="bg-slate-50 p-4 rounded-3xl text-center">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
    <p className={`text-2xl font-black ${color}`}>{val < 10 ? `0${val}` : val}</p>
  </div>
);

const Input = ({ label, value, onChange, ...props }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
    <input
      required
      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold text-sm focus:ring-2 focus:ring-indigo-500/10"
      value={value}
      onChange={e => onChange(e.target.value)}
      {...props}
    />
  </div>
);

const NavBtn = ({ icon: Icon, label, active }) => (
  <button className={`flex flex-col items-center gap-1.5 px-5 py-2 rounded-2xl transition-all active:scale-90 ${active ? 'bg-indigo-50/50 text-[#4955b3]' : 'text-slate-300'}`}>
    <Icon size={20} strokeWidth={active ? 3 : 2} />
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

export default EstateSecurityPage;
