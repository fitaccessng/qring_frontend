import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  Bell,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Globe,
  HelpCircle,
  Key,
  LogOut,
  Moon,
  ShieldCheck,
  User,
  Volume2,
  Wallet,
  X
} from "lucide-react";
import { changePassword } from "../../services/authService";
import {
  getHomeownerSettings,
  getHomeownerSettingsSnapshot,
  updateHomeownerProfile,
  updateHomeownerSettings
} from "../../services/homeownerSettingsService";
import { getCurrentDeviceLocation } from "../../utils/locationService";
import { useAuth } from "../../state/AuthContext";
import { useLanguage } from "../../state/LanguageContext";
import { useNotifications } from "../../state/NotificationsContext";
import { useTheme } from "../../state/ThemeContext";
import useSubscription from "../../hooks/useSubscription";
import { showError, showSuccess } from "../../utils/flash";

const DEFAULT_PROFILE_IMAGE = null;

const DEFAULT_SETTINGS = {
  pushAlerts: true,
  soundAlerts: true,
  autoRejectUnknownVisitors: false,
  autoApproveTrustedVisitors: false,
  autoApproveKnownContacts: false,
  knownContacts: [],
  allowDeliveryDropAtGate: true,
  smsFallbackEnabled: false,
  nearbyPanicAlertsEnabled: true,
  nearbyPanicAlertRadiusMeters: 500,
  nearbyPanicAvailability: "always",
  nearbyPanicCustomSchedule: [],
  nearbyPanicReceiveFrom: "everyone",
  nearbyPanicMutedUntil: null,
  nearbyPanicSameAreaLabel: "",
  panicIdentityVisibility: "masked",
  safetyHomeLocation: { lat: null, lng: null },
  managedByEstate: false,
  estateId: null,
  estateName: null,
  subscription: null,
  profile: null,
  home: null
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const HELP_CENTER_URL = "https://www.useqring.online";

// --- Helper Utilities ---
function buildUsernameFromEmail(email) {
  if (!email) return "user";
  return email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function mergeSettings(incoming) {
  return { ...DEFAULT_SETTINGS, ...(incoming || {}) };
}

function buildProfileForm(user, profile) {
  return {
    fullName: profile?.fullName || user?.fullName || "",
    username: user?.username || buildUsernameFromEmail(user?.email || profile?.email),
    email: user?.email || profile?.email || "",
    phone: profile?.phone || user?.phone || "",
    bio: user?.bio || ""
  };
}

function buildStats(settings) {
  return {
    plan: settings?.subscription?.planName || "FREE",
    referrals: settings?.referralCount || 0,
    earnings: settings?.earningsFormatted || "$0.00"
  };
}

function buildSettingsPayload(settings) {
  return {
    pushAlerts: settings.pushAlerts,
    soundAlerts: settings.soundAlerts,
    nearbyPanicAlertsEnabled: settings.nearbyPanicAlertsEnabled,
    nearbyPanicAlertRadiusMeters: settings.nearbyPanicAlertRadiusMeters,
    safetyHomeLocation: settings.safetyHomeLocation
  };
}

export default function HomeownerSettingsPage() {
  const cachedSettings = getHomeownerSettingsSnapshot();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const { language, selectedLanguage, languageOptions, setLanguage } = useLanguage();
  const { subscription, inSignupTrial } = useSubscription();
  const [settings, setSettings] = useState(() => mergeSettings(cachedSettings));
  const [stats, setStats] = useState(() => buildStats(mergeSettings(cachedSettings)));
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(user, mergeSettings(cachedSettings).profile));
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(() => !cachedSettings);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingPreference, setSavingPreference] = useState("");
  const [savingPanicNetwork, setSavingPanicNetwork] = useState(false);
  const [pendingExternalAction, setPendingExternalAction] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      if (!cachedSettings) {
        setLoading(true);
      }
      try {
        const data = (await getHomeownerSettings()) || DEFAULT_SETTINGS;
        if (!active) return;
        const merged = mergeSettings(data);
        setSettings(merged);
        setProfileForm(buildProfileForm(user, merged.profile));
        setStats(buildStats(merged));
      } catch (error) {
        if (!active) return;
        setSettings(DEFAULT_SETTINGS);
        setProfileForm(buildProfileForm(user, null));
        setStats(buildStats(DEFAULT_SETTINGS));
        showError(error?.message || "Failed to load your settings.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!activeModal) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeModal]);

  const profileImg = user?.photoUrl || DEFAULT_PROFILE_IMAGE;
  const displayedName = profileForm.fullName || user?.fullName || settings?.profile?.fullName || "Homeowner";
  const displayedUsername =
    profileForm.username ||
    user?.username ||
    buildUsernameFromEmail(profileForm.email || user?.email || settings?.profile?.email) ||
    "user";
  const displayedPlan = stats.plan.replace("HOME_", "");

  const securityBadge = useMemo(() => {
    if (settings.managedByEstate) return settings.estateName || "Estate Linked";
    return "Personal Account";
  }, [settings.estateName, settings.managedByEstate]);

  function openModal(modalType) {
    setActiveModal(modalType);
    if (modalType === "profile") {
      setProfileForm(buildProfileForm(user, settings.profile));
    }
    if (modalType === "security") {
      setPasswordForm(EMPTY_PASSWORD_FORM);
    }
    if (modalType === "external") {
      setPendingExternalAction("faq");
    }
  }

  function closeModal() {
    setActiveModal(null);
    setSavingProfile(false);
    setSavingSecurity(false);
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setProfileForm(buildProfileForm(user, settings.profile));
    setPendingExternalAction("");
  }

  async function handlePreferenceToggle(key, nextValue) {
    const previousSettings = settings;
    const nextSettings = { ...settings, [key]: nextValue };
    setSettings(nextSettings);
    setSavingPreference(key);

    try {
      const updated = await updateHomeownerSettings(buildSettingsPayload(nextSettings));
      setSettings((prev) => ({ ...prev, ...updated }));
      if (key === "pushAlerts") {
        showSuccess(`Notifications ${nextValue ? "enabled" : "disabled"}.`);
      }
      if (key === "soundAlerts") {
        showSuccess(`Sound alerts ${nextValue ? "enabled" : "disabled"}.`);
      }
    } catch (error) {
      setSettings(previousSettings);
      showError(error?.message || "Failed to update your preferences.");
    } finally {
      setSavingPreference("");
    }
  }

  async function handleThemeToggle() {
    toggleTheme();
    showSuccess(`Theme switched to ${isDark ? "light" : "dark"} mode.`);
  }

  async function handlePanicNetworkSave(patch = {}, successMessage = "Panic network updated.") {
    const previousSettings = settings;
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);
    setSavingPanicNetwork(true);
    try {
      const updated = await updateHomeownerSettings(buildSettingsPayload(nextSettings));
      setSettings((prev) => ({ ...prev, ...updated }));
      showSuccess(successMessage);
    } catch (error) {
      setSettings(previousSettings);
      showError(error?.message || "Failed to update panic network settings.");
    } finally {
      setSavingPanicNetwork(false);
    }
  }

  async function handleCaptureSafetyLocation() {
    setSavingPanicNetwork(true);
    try {
      const result = await getCurrentDeviceLocation({ enableHighAccuracy: false });
      if (!result?.ok || !result?.coords) {
        throw new Error("Location capture was not available.");
      }
      const patch = {
        safetyHomeLocation: {
          lat: Number(result.coords.latitude),
          lng: Number(result.coords.longitude)
        }
      };
      const updated = await updateHomeownerSettings(buildSettingsPayload({ ...settings, ...patch }));
      setSettings((prev) => ({ ...prev, ...updated }));
      showSuccess("Home safety location saved for nearby panic matching.");
    } catch (error) {
      showError(error?.message || "Unable to capture your location.");
    } finally {
      setSavingPanicNetwork(false);
    }
  }

  function handleLanguageSelect(nextLanguage) {
    setLanguage(nextLanguage);
    showSuccess(`Language updated.`);
    closeModal();
  }

  function openExternalPermission(action) {
    setPendingExternalAction(action);
    setActiveModal("external");
  }

  function confirmExternalNavigation() {
    window.open(HELP_CENTER_URL, "_blank", "noopener,noreferrer");
    showSuccess(`${pendingExternalAction === "support" ? "Support" : "FAQs"} opened.`);
    closeModal();
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    const fullName = profileForm.fullName.trim();
    const phone = profileForm.phone.trim();

    if (!fullName) {
      showError("Full name is required.");
      return;
    }

    setSavingProfile(true);
    try {
      const savedProfile = await updateHomeownerProfile({
        fullName,
        phone: phone || null
      });

      const nextProfile = {
        ...(settings.profile || {}),
        ...(savedProfile || {}),
        fullName,
        email: profileForm.email || savedProfile?.email || settings?.profile?.email || user?.email || "",
        phone: phone || null
      };

      const nextUser = {
        ...(user || {}),
        fullName,
        phone: nextProfile.phone,
        email: nextProfile.email,
        username: profileForm.username.trim() || user?.username || buildUsernameFromEmail(nextProfile.email),
        bio: profileForm.bio.trim()
      };

      updateUser(nextUser);
      setSettings((prev) => ({ ...prev, profile: nextProfile }));
      setProfileForm(buildProfileForm(nextUser, nextProfile));
      showSuccess("Profile updated successfully.");
      closeModal();
    } catch (error) {
      showError(error?.message || "Failed to update your profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSecuritySave(event) {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showError("Fill in all password fields.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError("New password and confirm password do not match.");
      return;
    }

    setSavingSecurity(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      showSuccess("Password changed successfully.");
      closeModal();
    } catch (error) {
      showError(error?.message || "Failed to change password.");
    } finally {
      setSavingSecurity(false);
    }
  }

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-40 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 px-4 py-3.5 sm:py-4 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Settings</h1>
          </div>
          <Link
            to="/dashboard/notifications"
            className="relative p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-950" />
            )}
          </Link>
        </div>
      </header>

      <main className="mt-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
        {/* PROFILE HEADER */}
        <section className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-slate-100/50 dark:border-slate-800/40">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative shrink-0">
              {profileImg ? (
                <img src={profileImg} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 ring-4 ring-slate-50 dark:ring-slate-800 flex items-center justify-center">
                  <User size={36} className="text-slate-400" />
                </div>
              )}
              <button onClick={() => openModal("profile")} className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-md transition-all active:scale-90">
                <Edit3 size={12} />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-1">{displayedName}</h2>
              <p className="text-xs text-slate-400 font-semibold tracking-wide mb-3.5">@{displayedUsername}</p>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                  stats.plan === "FREE" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
                }`}>
                {stats.plan}
              </span>
            </div>
          </div>
        </section>

        {/* COMPACT STATS PANEL */}
        <section className="grid grid-cols-3 bg-white dark:bg-slate-900 rounded-2xl p-2.5 shadow-sm border border-slate-100/50 dark:border-slate-800/40">
          <StatBoxCompact label="Plan" value={loading ? "..." : displayedPlan} icon={<Award size={14} />} color="text-indigo-600" />
          <StatBoxCompact label="Referrals" value={loading ? "..." : stats.referrals} icon={<User size={14} />} color="text-emerald-600" />
          <StatBoxCompact label="Earnings" value={loading ? "..." : stats.earnings} icon={<Wallet size={14} />} color="text-amber-600" />
        </section>

        {inSignupTrial ? (
          <section className="rounded-[2rem] border border-emerald-200/80 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-400">Free Trial</p>
                <h3 className="mt-1 text-lg font-extrabold text-emerald-900 dark:text-emerald-200">Your account is still in the free trial period</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                  {subscription?.trialDaysRemaining ?? 0} day{(subscription?.trialDaysRemaining ?? 0) === 1 ? "" : "s"} remaining. No payment method is required until the trial ends.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/billing/paywall")}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                View billing
              </button>
            </div>
          </section>
        ) : null}

        {/* SETTINGS GROUPINGS */}
        <div className="space-y-6">
          <SettingsGroup title="Account">
            <SettingsItem icon={<User size={18} />} label="Edit Profile" color="bg-blue-50/60 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" onClick={() => openModal("profile")} />
            <SettingsItem icon={<ShieldCheck size={18} />} label="Privacy & Security" sublabel={securityBadge} color="bg-emerald-50/60 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" onClick={() => openModal("privacy")} />
            <SettingsItem icon={<Key size={18} />} label="Change Password" color="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" onClick={() => openModal("security")} />
          </SettingsGroup>

          <SettingsGroup title="Preferences">
            <SettingsItem icon={<Bell size={18} />} label="Notifications" toggle checked={Boolean(settings.pushAlerts)} disabled={savingPreference === "pushAlerts"} onToggle={(v) => handlePreferenceToggle("pushAlerts", v)} />
            <SettingsItem icon={<Volume2 size={18} />} label="Sound Alerts" toggle checked={Boolean(settings.soundAlerts)} disabled={savingPreference === "soundAlerts"} onToggle={(v) => handlePreferenceToggle("soundAlerts", v)} />
            <SettingsItem icon={<Moon size={18} />} label="Dark Mode" toggle checked={isDark} onToggle={handleThemeToggle} />
            <SettingsItem icon={<Globe size={18} />} label="Language" sublabel={selectedLanguage?.label || "English"} color="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" onClick={() => openModal("language")} />
            <SettingsItem icon={<HelpCircle size={18} />} label="FAQs" color="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" onClick={() => openExternalPermission("faq")} />
            <SettingsItem icon={<HelpCircle size={18} />} label="Support" color="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400" onClick={() => openExternalPermission("support")} />
          </SettingsGroup>

          <SettingsGroup title="Panic Network">
            <div className="rounded-3xl border border-slate-100/50 bg-white px-5 py-5 shadow-sm dark:border-slate-800/40 dark:bg-slate-900">
              <div
                onClick={() => openModal("panic")}
                className="w-full flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-2xl p-2 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Allow Nearby Panic Alerts</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 leading-normal">
                    Alert trusted people nearby who have chosen to help.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingPanicNetwork}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePanicNetworkSave({ nearbyPanicAlertsEnabled: !settings.nearbyPanicAlertsEnabled });
                  }}
                  className={`w-10 h-6 rounded-full relative transition-colors duration-250 flex-shrink-0 ${settings.nearbyPanicAlertsEnabled ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-250 ${settings.nearbyPanicAlertsEnabled ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </SettingsGroup>

          {!settings.managedByEstate && !inSignupTrial && (
            <SettingsGroup title="Subscription">
              <SettingsItem icon={<CreditCard size={18} />} label="Billing & Subscription" badge={stats.plan} onClick={() => navigate("/billing/paywall")} />
            </SettingsGroup>
          )}

          <button onClick={logout} className="w-full py-4.5 text-rose-600 dark:text-rose-400 font-extrabold text-sm tracking-wider flex items-center justify-center gap-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-rose-50 dark:hover:bg-rose-950/30">
            <LogOut size={16} /> SIGN OUT
          </button>
        </div>
      </main>

      {/* Dedicated Modals */}
      <ProfileModal
        isOpen={activeModal === "profile"}
        onClose={closeModal}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        savingProfile={savingProfile}
        handleProfileSave={handleProfileSave}
      />

      <PrivacyModal
        isOpen={activeModal === "privacy"}
        onClose={closeModal}
        settings={settings}
      />

      <SecurityModal
        isOpen={activeModal === "security"}
        onClose={closeModal}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        savingSecurity={savingSecurity}
        handleSecuritySave={handleSecuritySave}
      />

      <LanguageModal
        isOpen={activeModal === "language"}
        onClose={closeModal}
        languageOptions={languageOptions}
        language={language}
        handleLanguageSelect={handleLanguageSelect}
      />

      <ExternalModal
        isOpen={activeModal === "external"}
        onClose={closeModal}
        pendingExternalAction={pendingExternalAction}
        confirmExternalNavigation={confirmExternalNavigation}
      />

      <PanicNetworkModal
        isOpen={activeModal === "panic"}
        onClose={closeModal}
        settings={settings}
        savingPanicNetwork={savingPanicNetwork}
        handlePanicNetworkSave={handlePanicNetworkSave}
        handleCaptureSafetyLocation={handleCaptureSafetyLocation}
      />
    </div>
  );
}

// --- Dynamic Component Sub-Blocks ---

function StatBoxCompact({ label, value, icon, color }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 w-full rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 ${color} mb-1 flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{value}</span>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-2.5 space-y-0.5 shadow-sm border border-slate-100/50 dark:border-slate-800/40">
        {children}
      </div>
    </div>
  );
}

function SettingsItem({ icon, label, sublabel, color, badge, toggle, checked, disabled, onToggle, onClick }) {
  return (
    <div
      onClick={!toggle ? onClick : undefined}
      className={`flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`p-2 rounded-xl shrink-0 flex items-center justify-center ${color || "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
            {icon}
          </div>
        )}
        <div className="text-left">
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {badge && (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-md text-[9px] font-extrabold uppercase">
            {badge}
          </span>
        )}
        {toggle ? (
          <button
            type="button"
            onClick={() => onToggle?.(!checked)}
            className={`w-10 h-6 rounded-full relative transition-colors duration-250 flex-shrink-0 ${checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"}`}
          >
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-250 ${checked ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        ) : (
          <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
        )}
      </div>
    </div>
  );
}

// Optimized Reusable Modal Container Wrapper
function ModalWrapper({ children, onClose, title }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Auto-scroll modal into center view on mount
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh] my-auto"
      >
        <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto text-slate-800 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, type = "text", onChange, readOnly, autoFocus }) {
  return (
    <div className="flex flex-col gap-1 text-left w-full">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 text-sm font-semibold focus:border-indigo-500 dark:bg-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 transition-colors"
      />
    </div>
  );
}

/**
 * Profile Modal
 */
function ProfileModal({ isOpen, onClose, profileForm, setProfileForm, savingProfile, handleProfileSave }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Edit Profile">
      <form className="space-y-4" onSubmit={handleProfileSave}>
        <InputGroup
          label="Full Name"
          value={profileForm.fullName}
          autoFocus
          onChange={(value) => setProfileForm((prev) => ({ ...prev, fullName: value }))}
        />
        <InputGroup
          label="Username"
          value={profileForm.username}
          onChange={(value) => setProfileForm((prev) => ({ ...prev, username: value }))}
        />
        <InputGroup label="Email" value={profileForm.email} readOnly />
        <InputGroup
          label="Phone"
          value={profileForm.phone}
          onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
        />
        <div className="flex flex-col gap-1 text-left">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bio</label>
          <textarea
            value={profileForm.bio}
            rows={3}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
            placeholder="Tell your neighbors a little about yourself"
          />
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingProfile ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/**
 * Privacy & Security Modal
 */
function PrivacyModal({ isOpen, onClose, settings }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Privacy & Security">
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {settings.managedByEstate 
              ? `Your account is managed by ${settings.estateName || "your estate"}. Some settings may be controlled by estate administrators.`
              : "Manage your personal account privacy and security preferences."}
          </p>
        </div>
        
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Account Status</h3>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Type</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
              {settings.managedByEstate ? "Estate Managed" : "Personal Account"}
            </p>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

/**
 * Security / Password Change Modal
 */
function SecurityModal({ isOpen, onClose, passwordForm, setPasswordForm, savingSecurity, handleSecuritySave }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Change Password">
      <form className="space-y-4" onSubmit={handleSecuritySave}>
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          Update your password to keep your homeowner account secure.
        </p>
        <InputGroup
          label="Current Password"
          type="password"
          value={passwordForm.currentPassword}
          autoFocus
          onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
        />
        <InputGroup
          label="New Password"
          type="password"
          value={passwordForm.newPassword}
          onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
        />
        <InputGroup
          label="Confirm Password"
          type="password"
          value={passwordForm.confirmPassword}
          onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
        />
        <button
          type="submit"
          disabled={savingSecurity}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingSecurity ? "Updating Password..." : "Change Password"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/**
 * Language Modal
 */
function LanguageModal({ isOpen, onClose, languageOptions = [], language, handleLanguageSelect }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Select Language">
      <div className="space-y-2">
        {languageOptions.map((opt) => (
          <button
            key={opt.code || opt.value}
            onClick={() => handleLanguageSelect(opt.code || opt.value)}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition-colors ${
              (opt.code || opt.value) === language
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                : "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
            }`}
          >
            <span>{opt.label}</span>
            {(opt.code || opt.value) === language && <span className="text-xs font-black uppercase">Active</span>}
          </button>
        ))}
      </div>
    </ModalWrapper>
  );
}

/**
 * External Navigation Modal (FAQ / Support)
 */
function ExternalModal({ isOpen, onClose, pendingExternalAction, confirmExternalNavigation }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title={pendingExternalAction === "support" ? "Contact Support" : "Help Center"}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You are about to open the external QRing help portal. Would you like to proceed?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={confirmExternalNavigation}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Continue
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/**
 * Panic Network Settings Modal
 */
function PanicNetworkModal({
  isOpen,
  onClose,
  settings,
  savingPanicNetwork,
  handlePanicNetworkSave,
  handleCaptureSafetyLocation
}) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Panic Network Configuration">
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Alert Radius ({settings.nearbyPanicAlertRadiusMeters || 500}m)
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={settings.nearbyPanicAlertRadiusMeters || 500}
            onChange={(e) => handlePanicNetworkSave({ nearbyPanicAlertRadiusMeters: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
        </div>

        <button
          type="button"
          disabled={savingPanicNetwork}
          onClick={handleCaptureSafetyLocation}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
        >
          <MapPin size={16} />
          {settings.safetyHomeLocation?.lat ? "Update Home Safety Coordinates" : "Set Current Location as Safety Home"}
        </button>
      </div>
    </ModalWrapper>
  );
}