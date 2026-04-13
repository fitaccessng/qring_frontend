import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Clock,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  Moon,
  MessageCircleQuestion,
  Pencil,
  Save,
  Shield,
  Smartphone,
  User,
  Users,
  Building2,
  DoorOpen,
  Camera,
  Verified,
  PhoneCall,
  Eye,
  LogOut
} from "lucide-react";
import AppShell from "../../layouts/AppShell";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import EstateManagerPageShell, {
  EstateManagerSection,
  estateFieldClassName
} from "../../components/mobile/EstateManagerPageShell";
import { env } from "../../config/env";
import { changePassword } from "../../services/authService";
import {
  getEstateOverview,
  getEstateSettings,
  updateEstateSettings
} from "../../services/estateService";
import { useAuth } from "../../state/AuthContext";
import { useTheme } from "../../state/ThemeContext";
import { getUserInitials } from "../../utils/profile";
import { showError, showSuccess } from "../../utils/flash";

// Shared border input style
const premiumInputClass = "w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-[#00346f] transition-all outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:focus:ring-blue-900/20";

export default function EstateSettingsPage() {
  const { logout } = useAuth();
  const { themeMode, isDark, setThemeMode, toggleTheme } = useTheme();

  const [profile, setProfile] = useState({
    fullName: "Nwakanma Estate Admin",
    email: "admin@qring.io",
    role: "Senior Manager",
    bio: "Chief of Operations for Resident Security."
  });

  const [overview, setOverview] = useState(null);
  const [selectedEstateId, setSelectedEstateId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState(1);
  const [reminderMode, setReminderMode] = useState("daily");

  // Estate Manager Specific Options
  const [securityRules, setSecurityRules] = useState({
    canApproveWithoutHomeowner: false,
    mustNotifyHomeowner: true,
    requirePhotoVerification: true,
    requireCallBeforeApproval: false
  });

  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const initials = getUserInitials(profile.fullName);
  const estateOptions = useMemo(() => (overview?.estates ?? []).map(r => ({ value: r.id, label: r.name })), [overview]);

  return (
    <AppShell title="Manager Profile">
      <EstateManagerPageShell
        eyebrow="System Configuration"
        title="Admin Control"
        description="Configure estate-wide access rules, billing automations, and your personal manager profile."
        icon={<Shield className="h-5 w-5" />}
        accent="from-[#00346f] to-[#0052b4]"
      >

        {/* Profile Identity Card */}
        <EstateManagerSection>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 flex flex-col items-center text-center dark:bg-slate-900 dark:border-slate-800">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center text-3xl font-black text-[#00346f] shadow-inner dark:from-slate-800 dark:to-slate-900">
                {initials}
              </div>
              <button onClick={() => setEditProfileOpen(true)} className="absolute bottom-0 right-0 bg-white text-[#00346f] p-2 rounded-full shadow-lg border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                <Pencil size={14} />
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile.fullName}</h2>
            <p className="text-[#00346f] text-xs font-black uppercase tracking-widest mt-1">{profile.role}</p>

            <div className="mt-8 grid grid-cols-3 gap-4 w-full">
              <StatItem icon={<Building2 size={16}/>} label="Estates" value="4" />
              <StatItem icon={<Users size={16}/>} label="Homes" value="128" />
              <StatItem icon={<DoorOpen size={16}/>} label="Doors" value="12" />
            </div>
          </div>
        </EstateManagerSection>

        {/* Access Code Bento Box */}
        <EstateManagerSection>
            <div className="bg-[#edf4ff] rounded-[2rem] p-6 flex items-center justify-between border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
               <div>
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Estate Join Code</p>
                  <p className="text-2xl font-black text-[#00346f] dark:text-blue-400 tracking-widest">QR-9902</p>
               </div>
               <button className="px-5 py-2.5 bg-[#00346f] text-white rounded-xl text-xs font-black uppercase tracking-widest">Copy</button>
            </div>
        </EstateManagerSection>

        {/* Security Protocols Section */}
        <EstateManagerSection
          title="Security Protocols"
          subtitle="Define mandatory verification steps for security personnel."
          right={<Lock className="h-5 w-5 text-blue-500" />}
        >
          <div className="mt-4 space-y-3">
             <ToggleRow
                icon={<Camera size={18} />}
                label="Require Photo Verification"
                subtitle="Guards must take a photo of every visitor"
                checked={securityRules.requirePhotoVerification}
                onChange={(v) => setSecurityRules(s => ({...s, requirePhotoVerification: v}))}
             />
             <ToggleRow
                icon={<Eye size={18} />}
                label="Homeowner Notification"
                subtitle="Instant alert when visitor is cleared"
                checked={securityRules.mustNotifyHomeowner}
                onChange={(v) => setSecurityRules(s => ({...s, mustNotifyHomeowner: v}))}
             />
             <ToggleRow
                icon={<PhoneCall size={18} />}
                label="Pre-Approval Calling"
                subtitle="Mandatory call to host for non-scheduled entries"
                checked={securityRules.requireCallBeforeApproval}
                onChange={(v) => setSecurityRules(s => ({...s, requireCallBeforeApproval: v}))}
             />
          </div>
        </EstateManagerSection>

        {/* Global Configuration */}
        <EstateManagerSection title="System Settings">
            <div className="space-y-3">
                <MenuRow icon={<Shield size={18} />} label="Privacy & Encryption" onClick={() => setChangePasswordOpen(true)} />
                <MenuRow icon={<Smartphone size={18} />} label="Display Preferences" value={isDark ? "Dark" : "Light"} onClick={toggleTheme} />
                <MenuRow icon={<Globe size={18} />} label="Regional Settings" value="Nigeria (GMT+1)" />
            </div>
        </EstateManagerSection>

        {/* Billing Cycles */}
        <EstateManagerSection
          title="Automated Reminders"
          subtitle="Configure payment nudge frequency for the estate."
          right={<Clock className="h-5 w-5 text-blue-500" />}
        >
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Select Estate Target</span>
              <select className={premiumInputClass}>
                 <option>Ikoyi Royal Estate</option>
                 <option>Lekki Gardens Ph 2</option>
              </select>
            </label>

            <div className="flex gap-2">
                {['daily', 'weekly', 'custom'].map(m => (
                    <button
                        key={m}
                        onClick={() => setReminderMode(m)}
                        className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${reminderMode === m ? 'bg-[#00346f] text-white' : 'bg-slate-50 text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                Sync Reminder Logic
            </button>
          </div>
        </EstateManagerSection>

        <section className="flex justify-center pt-8">
            <button onClick={() => setConfirmLeaveOpen(true)} className="flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase tracking-widest py-4">
                <LogOut size={16} /> Terminate Qring Session
            </button>
        </section>

      </EstateManagerPageShell>

      {/* Profile Modal with Border Inputs */}
      <ActionModal open={editProfileOpen} title="Manage Identity" onClose={() => setEditProfileOpen(false)}>
        <form className="p-6 space-y-5">
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Operational Name</span>
            <input type="text" className={premiumInputClass} value={profile.fullName} onChange={e => setProfile(p => ({...p, fullName: e.target.value}))} />
          </label>
          <label className="block space-y-2">
            <span className="text-[10px] font-black uppercase text-slate-400 ml-1">Professional Bio</span>
            <textarea className={`${premiumInputClass} h-24 resize-none`} value={profile.bio} onChange={e => setProfile(p => ({...p, bio: e.target.value}))} />
          </label>
          <button className="w-full py-4 bg-[#00346f] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20">
            Confirm Changes
          </button>
        </form>
      </ActionModal>
    </AppShell>
  );
}

/* --- Styled Sub-Components --- */

const StatItem = ({ icon, label, value }) => (
    <div className="flex flex-col items-center">
        <div className="text-[#00346f] mb-1">{icon}</div>
        <p className="text-lg font-black text-slate-900 dark:text-white">{value}</p>
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-tighter">{label}</p>
    </div>
);

function MenuRow({ icon, label, onClick, value }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-left border border-slate-100 shadow-sm active:scale-[0.98] transition-all dark:bg-slate-900 dark:border-slate-800"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 dark:bg-slate-800">
            {icon}
        </div>
        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md dark:bg-blue-900/20">{value}</span>}
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </div>
    </button>
  );
}

function ToggleRow({ icon, label, subtitle, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl dark:bg-slate-900/40">
      <div className="flex items-center gap-3">
        <div className="text-blue-500">{icon}</div>
        <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
            <p className="text-[10px] font-medium text-slate-400">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

function ActionModal({ open, title, onClose, children }) {
  return (
    <MobileBottomSheet open={open} title={title} onClose={onClose} width="640px" height="auto">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden">
            {children}
        </div>
    </MobileBottomSheet>
  );
}