import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  Bell,
  MapPin,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Globe,
  HelpCircle,
  History,
  Key,
  LayoutGrid,
  LogOut,
  MessageSquare,
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

const EMPTY_PROFILE_FORM = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  bio: ""
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

const HELP_CENTER_URL = "https://www.useqring.online";

export default function HomeownerSettingsPage() {
  const cachedSettings = getHomeownerSettingsSnapshot();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const { language, selectedLanguage, languageOptions, setLanguage } = useLanguage();
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
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-40 dark:bg-slate-950">
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 dark:bg-slate-950/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-bold text-lg text-slate-900 leading-none dark:text-white">Settings</h1>
          </div>
          <Link
            to="/dashboard/notifications"
            className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
            )}
          </Link>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Profile Header */}
        <section className="bg-white rounded-[2.5rem] p-6 mb-8 border border-slate-100 shadow-sm flex items-center gap-5 dark:bg-slate-900 dark:border-slate-800">
          <div className="relative">
            {profileImg ? (
              <img src={profileImg} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-50 dark:ring-slate-800" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 ring-4 ring-indigo-50 dark:ring-slate-800 flex items-center justify-center">
                <svg className="w-12 h-12 text-slate-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
            <button onClick={() => openModal("profile")} className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors">
              <Edit3 size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-900 leading-tight dark:text-white">{displayedName}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">@{displayedUsername}</p>
            <div className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${
                stats.plan === "FREE" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
              }`}>
              {stats.plan}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3 mb-10">
          <StatBox label="Plan" value={loading ? "..." : displayedPlan} icon={<Award size={14} />} color="text-indigo-600" />
          <StatBox label="Referrals" value={loading ? "..." : stats.referrals} icon={<User size={14} />} color="text-emerald-600" />
          <StatBox label="Earnings" value={loading ? "..." : stats.earnings} icon={<Wallet size={14} />} color="text-amber-600" />
        </div>

        <div className="space-y-8">
          <SettingsGroup title="Account">
            <SettingsItem icon={<User />} label="Edit Profile" color="bg-blue-50 text-blue-600" onClick={() => openModal("profile")} />
            <SettingsItem icon={<ShieldCheck />} label="Privacy & Security" sublabel={securityBadge} color="bg-emerald-50 text-emerald-600" onClick={() => openModal("privacy")} />
            <SettingsItem icon={<Key />} label="Change Password" color="bg-slate-50 text-slate-600" onClick={() => openModal("security")} />
          </SettingsGroup>

          <SettingsGroup title="Preferences">
            <SettingsItem icon={<Bell />} label="Notifications" toggle checked={Boolean(settings.pushAlerts)} disabled={savingPreference === "pushAlerts"} onToggle={(v) => handlePreferenceToggle("pushAlerts", v)} />
            <SettingsItem icon={<Volume2 />} label="Sound Alerts" toggle checked={Boolean(settings.soundAlerts)} disabled={savingPreference === "soundAlerts"} onToggle={(v) => handlePreferenceToggle("soundAlerts", v)} />
            <SettingsItem icon={<Moon />} label="Dark Mode" toggle checked={isDark} onToggle={handleThemeToggle} />
            <SettingsItem icon={<Globe />} label="Language" sublabel={selectedLanguage?.label || "English"} color="bg-slate-50 text-slate-600" onClick={() => openModal("language")} />
            <SettingsItem icon={<HelpCircle />} label="FAQs" color="bg-slate-50 text-slate-600" onClick={() => openExternalPermission("faq")} />
            <SettingsItem icon={<HelpCircle />} label="Support" color="bg-slate-50 text-slate-600" onClick={() => openExternalPermission("support")} />
          </SettingsGroup>

          <SettingsGroup title="Panic Network">
            <div className="rounded-[1.6rem] border border-slate-100 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={() => openModal("panic")}
                className="w-full flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl p-2 transition-colors"
              >
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900 dark:text-white">Allow Nearby Panic Alerts</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                  className={`w-11 h-6 rounded-full relative transition-all flex-shrink-0 ${settings.nearbyPanicAlertsEnabled ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${settings.nearbyPanicAlertsEnabled ? "right-1" : "left-1"}`} />
                </button>
              </button>
            </div>
          </SettingsGroup>

          {!settings.managedByEstate && (
            <SettingsGroup title="Subscription">
              <SettingsItem icon={<CreditCard />} label="Billing & Subscription" badge={stats.plan} onClick={() => navigate("/billing/paywall")} />
            </SettingsGroup>
          )}

          <button onClick={logout} className="w-full py-5 text-rose-500 font-black flex items-center justify-center gap-3 bg-rose-50 rounded-3xl active:scale-95 transition-all dark:bg-rose-500/10">
            <LogOut size={20} /> SIGN OUT
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
        setSettings={setSettings}
        savingPanicNetwork={savingPanicNetwork}
        handlePanicNetworkSave={handlePanicNetworkSave}
        handleCaptureSafetyLocation={handleCaptureSafetyLocation}
      />
    </div>
  );
}

/**
 * Profile Modal Component
 */
function ProfileModal({ isOpen, onClose, profileForm, setProfileForm, savingProfile, handleProfileSave }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Edit Profile">
      <form className="space-y-4" onSubmit={handleProfileSave}>
        <InputGroup
          label="Full Name"
          value={profileForm.fullName}
          onChange={(value) => setProfileForm((prev) => ({ ...prev, fullName: value }))}
        />
        <InputGroup
          style={{ border: "2px solid black", backgroundColor: "#f9fafb" }}
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
            rows={4}
            onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
            className="w-full bg-slate-50 border border-slate-400 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
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
 * Privacy & Security Modal Component
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
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
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
 * Security/Password Modal Component
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
          className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {savingSecurity ? "Updating..." : "Change Password"}
        </button>
      </form>
    </ModalWrapper>
  );
}

/**
 * Language Modal Component
 */
function LanguageModal({ isOpen, onClose, languageOptions, language, handleLanguageSelect }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Select Language">
      <div className="space-y-3">
        {languageOptions.map((option) => {
          const isSelected = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => handleLanguageSelect(option.code)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${
                isSelected
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <span>
                <span className="block text-sm font-black">{option.label}</span>
                <span className="block text-xs font-bold opacity-70">{option.nativeLabel}</span>
              </span>
              {isSelected ? <span className="text-xs font-black uppercase tracking-widest">Active</span> : null}
            </button>
          );
        })}
      </div>
    </ModalWrapper>
  );
}

/**
 * External Link Modal Component
 */
function ExternalModal({ isOpen, onClose, pendingExternalAction, confirmExternalNavigation }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Open External Page">
      <div className="space-y-5">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          You are about to open the {pendingExternalAction === "support" ? "support" : "FAQs"} page in a new tab.
        </p>
        <button
          type="button"
          onClick={confirmExternalNavigation}
          className="w-full rounded-2xl bg-indigo-600 py-4 text-sm font-black text-white transition-colors hover:bg-indigo-700"
        >
          Continue
        </button>
      </div>
    </ModalWrapper>
  );
}

/**
 * Panic Network Modal Component
 */
function PanicNetworkModal({ isOpen, onClose, settings, setSettings, savingPanicNetwork, handlePanicNetworkSave, handleCaptureSafetyLocation }) {
  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} title="Panic Network Settings">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">Allow Nearby Panic Alerts</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Alert trusted people nearby who have chosen to help.
            </p>
          </div>
          <button
            type="button"
            disabled={savingPanicNetwork}
            onClick={() => handlePanicNetworkSave({ nearbyPanicAlertsEnabled: !settings.nearbyPanicAlertsEnabled })}
            className={`w-11 h-6 rounded-full relative transition-all flex-shrink-0 ${settings.nearbyPanicAlertsEnabled ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"}`}
          >
            <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${settings.nearbyPanicAlertsEnabled ? "right-1" : "left-1"}`} />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InlineSelect
            label="Alert Radius"
            value={String(settings.nearbyPanicAlertRadiusMeters || 500)}
            disabled={savingPanicNetwork}
            options={[
              { value: "200", label: "200m" },
              { value: "500", label: "500m" },
              { value: "1000", label: "1km" }
            ]}
            onChange={(value) => handlePanicNetworkSave({ nearbyPanicAlertRadiusMeters: Number(value) })}
          />
          <InlineSelect
            label="Availability"
            value={settings.nearbyPanicAvailability || "always"}
            disabled={savingPanicNetwork}
            options={[
              { value: "always", label: "Always" },
              { value: "night_only", label: "Night Only" },
              { value: "custom", label: "Custom Schedule" }
            ]}
            onChange={(value) =>
              handlePanicNetworkSave({
                nearbyPanicAvailability: value,
                nearbyPanicCustomSchedule:
                  value === "custom"
                    ? [{ days: [0, 1, 2, 3, 4, 5, 6], start: "20:00", end: "06:00" }]
                    : settings.nearbyPanicCustomSchedule
              })
            }
          />
          <InlineSelect
            label="Receive From"
            value={settings.nearbyPanicReceiveFrom || "everyone"}
            disabled={savingPanicNetwork}
            options={[
              { value: "everyone", label: "Everyone" },
              { value: "verified_only", label: "Verified Users Only" },
              { value: "same_area", label: "Same Street / Area" }
            ]}
            onChange={(value) => handlePanicNetworkSave({ nearbyPanicReceiveFrom: value })}
          />
          <InlineSelect
            label="Identity"
            value={settings.panicIdentityVisibility || "masked"}
            disabled={savingPanicNetwork}
            options={[
              { value: "masked", label: "Masked" },
              { value: "public", label: "Public" }
            ]}
            onChange={(value) => handlePanicNetworkSave({ panicIdentityVisibility: value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <InputGroup
            label="Area Label"
            value={settings.nearbyPanicSameAreaLabel || ""}
            onChange={(value) => setSettings((current) => ({ ...current, nearbyPanicSameAreaLabel: value }))}
          />
          <button
            type="button"
            disabled={savingPanicNetwork}
            onClick={() => handlePanicNetworkSave({ nearbyPanicSameAreaLabel: settings.nearbyPanicSameAreaLabel || "" }, "Area label saved.")}
            className="self-end rounded-2xl bg-slate-900 px-4 py-4 text-sm font-black text-white dark:bg-white dark:text-slate-900"
          >
            Save Area
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={savingPanicNetwork}
            onClick={() => handlePanicNetworkSave({ nearbyPanicMutedUntil: addMuteHours(1) }, "Nearby panic alerts muted for 1 hour.")}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Mute 1 Hour
          </button>
          <button
            type="button"
            disabled={savingPanicNetwork}
            onClick={() => handlePanicNetworkSave({ nearbyPanicMutedUntil: endOfTodayIso() }, "Nearby panic alerts muted for today.")}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            Mute Today
          </button>
          <button
            type="button"
            disabled={savingPanicNetwork}
            onClick={() => handlePanicNetworkSave({ nearbyPanicMutedUntil: null }, "Nearby panic alerts resumed.")}
            className="rounded-full border border-emerald-200 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
          >
            Unmute
          </button>
        </div>

        <div className="rounded-[1.4rem] border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">Home Safety Location</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Used to match you with nearby panic alerts inside your chosen radius.
              </p>
              <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                {formatSafetyLocation(settings.safetyHomeLocation)}
              </p>
            </div>
            <button
              type="button"
              disabled={savingPanicNetwork}
              onClick={handleCaptureSafetyLocation}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white"
            >
              <MapPin size={14} />
              {savingPanicNetwork ? "Saving..." : "Use Current Location"}
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}

/**
 * Reusable Modal Wrapper Component
 */
function ModalWrapper({ children, onClose, title }) {
  const sheetRef = React.useRef(null);

  useEffect(() => {
    if (sheetRef.current) {
      sheetRef.current.focus();
      sheetRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, []);

  useEffect(() => {
    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab' || !sheetRef.current) return;

      const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = sheetRef.current.querySelectorAll(focusableSelector);
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleFocusTrap);
    return () => window.removeEventListener('keydown', handleFocusTrap);
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div 
        ref={sheetRef}
        tabIndex="-1"
        className="relative w-full max-w-xl bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 dark:bg-slate-900 outline-none"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full dark:bg-slate-800 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pb-10">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Helper Functions & Small Components
 */
function buildProfileForm(user, profile) {
  const email = profile?.email || user?.email || "";
  return {
    fullName: profile?.fullName || user?.fullName || "",
    username: user?.username || buildUsernameFromEmail(email),
    email,
    phone: profile?.phone || user?.phone || "",
    bio: user?.bio || ""
  };
}

function mergeSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    profile: {
      ...(DEFAULT_SETTINGS.profile || {}),
      ...(settings?.profile || {})
    },
    home: {
      ...(DEFAULT_SETTINGS.home || {}),
      ...(settings?.home || {})
    }
  };
}

function buildStats(settings) {
  const subscriptionPlan = normalizePlanLabel(settings?.subscription?.plan || settings?.subscription?.tier || settings?.subscription?.name);
  const referralsValue = settings?.subscription?.referrals ?? settings?.home?.doorCount ?? 0;
  const earningsValue = settings?.subscription?.earnings ?? 0;
  return {
    plan: subscriptionPlan,
    referrals: String(referralsValue ?? 0),
    earnings: formatCurrency(earningsValue)
  };
}

function buildSettingsPayload(settings) {
  return {
    pushAlerts: Boolean(settings.pushAlerts),
    soundAlerts: Boolean(settings.soundAlerts),
    autoRejectUnknownVisitors: Boolean(settings.autoRejectUnknownVisitors),
    autoApproveTrustedVisitors: Boolean(settings.autoApproveTrustedVisitors),
    autoApproveKnownContacts: Boolean(settings.autoApproveKnownContacts),
    knownContacts: Array.isArray(settings.knownContacts) ? settings.knownContacts : [],
    allowDeliveryDropAtGate: Boolean(settings.allowDeliveryDropAtGate),
    smsFallbackEnabled: Boolean(settings.smsFallbackEnabled),
    nearbyPanicAlertsEnabled: Boolean(settings.nearbyPanicAlertsEnabled),
    nearbyPanicAlertRadiusMeters: Number(settings.nearbyPanicAlertRadiusMeters || 500),
    nearbyPanicAvailability: String(settings.nearbyPanicAvailability || "always"),
    nearbyPanicCustomSchedule: Array.isArray(settings.nearbyPanicCustomSchedule) ? settings.nearbyPanicCustomSchedule : [],
    nearbyPanicReceiveFrom: String(settings.nearbyPanicReceiveFrom || "everyone"),
    nearbyPanicMutedUntil: settings.nearbyPanicMutedUntil || null,
    nearbyPanicSameAreaLabel: String(settings.nearbyPanicSameAreaLabel || ""),
    panicIdentityVisibility: String(settings.panicIdentityVisibility || "masked"),
    safetyHomeLocation: {
      lat: Number(settings?.safetyHomeLocation?.lat ?? 0) || null,
      lng: Number(settings?.safetyHomeLocation?.lng ?? 0) || null
    }
  };
}

function addMuteHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function endOfTodayIso() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function formatSafetyLocation(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "No saved location yet.";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function normalizePlanLabel(value) {
  return String(value || "").trim() || "FREE";
}

function buildUsernameFromEmail(email) {
  const value = String(email || "").trim();
  if (!value.includes("@")) return "";
  return value.split("@")[0];
}

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "₦0";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}

function StatBox({ label, value, icon, color }) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center dark:bg-slate-900 dark:border-slate-800">
      <div className={`p-2 rounded-xl bg-slate-50 ${color} mb-2 dark:bg-slate-800`}>{icon}</div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
      <p className="text-sm font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function InputGroup({ label, value, onChange, type = "text", readOnly = false, style }) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        style={style}
        className="w-full bg-slate-50 border border-slate-400 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}

function InlineSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="flex flex-col gap-1 text-left">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section>
      <h2 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mb-4 ml-4">{title}</h2>
      <div className="bg-white rounded-[2rem] p-2 border border-slate-100 shadow-sm space-y-1 dark:bg-slate-900 dark:border-slate-800">{children}</div>
    </section>
  );
}

function SettingsItem({ icon, label, sublabel, color, toggle = false, checked = false, onClick, onToggle, badge, disabled = false }) {
  return (
    <div
      onClick={!toggle && !disabled ? onClick : undefined}
      className={`w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all group ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} dark:hover:bg-slate-800/60`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color || "bg-slate-50 text-slate-400"} dark:bg-slate-800`}>
          {React.cloneElement(icon, { size: 18 })}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm dark:text-white">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-400 font-bold">{sublabel}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {badge && <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md dark:bg-indigo-500/10">{badge}</span>}
        {toggle ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(!checked);
            }}
            className={`w-10 h-5 rounded-full relative transition-all ${checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? "right-1" : "left-1"}`} />
          </button>
        ) : (
          <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors dark:text-slate-600" />
        )}
      </div>
    </div>
  );
}
