import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  Bell,
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
  updateHomeownerProfile,
  updateHomeownerSettings
} from "../../services/homeownerSettingsService";
import { useAuth } from "../../state/AuthContext";
import { useLanguage } from "../../state/LanguageContext";
import { useNotifications } from "../../state/NotificationsContext";
import { useTheme } from "../../state/ThemeContext";
import { showError, showSuccess } from "../../utils/flash";

const DEFAULT_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop";

const DEFAULT_SETTINGS = {
  pushAlerts: true,
  soundAlerts: true,
  autoRejectUnknownVisitors: false,
  autoApproveTrustedVisitors: false,
  autoApproveKnownContacts: false,
  knownContacts: [],
  allowDeliveryDropAtGate: true,
  smsFallbackEnabled: false,
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
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { isDark, toggleTheme } = useTheme();
  const { language, selectedLanguage, languageOptions, setLanguage } = useLanguage();
  const modalContentRef = useRef(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stats, setStats] = useState({ plan: "...", referrals: "0", earnings: "₦0" });
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState("none");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingPreference, setSavingPreference] = useState("");
  const [pendingExternalAction, setPendingExternalAction] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      try {
        const data = (await getHomeownerSettings()) || DEFAULT_SETTINGS;
        if (!active) return;
        const merged = {
          ...DEFAULT_SETTINGS,
          ...data,
          profile: {
            ...(DEFAULT_SETTINGS.profile || {}),
            ...(data?.profile || {})
          },
          home: {
            ...(DEFAULT_SETTINGS.home || {}),
            ...(data?.home || {})
          }
        };
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
    if (!isModalOpen) {
      document.body.style.overflow = "unset";
      return () => {
        document.body.style.overflow = "unset";
      };
    }

    document.body.style.overflow = "hidden";
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen, activeView]);

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

  function openModal(view) {
    setActiveView(view);
    if (view === "profile") {
      setProfileForm(buildProfileForm(user, settings.profile));
    }
    if (view === "security") {
      setPasswordForm(EMPTY_PASSWORD_FORM);
    }
    if (view === "external") {
      setPendingExternalAction("faq");
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setActiveView("none");
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

  function handleLanguageSelect(nextLanguage) {
    setLanguage(nextLanguage);
    showSuccess(`Language preference updated to ${languageOptions.find((option) => option.code === nextLanguage)?.label || "English"}.`);
    closeModal();
  }

  function openExternalPermission(action) {
    setPendingExternalAction(action);
    setActiveView("external");
    setIsModalOpen(true);
  }

  function confirmExternalNavigation() {
    window.open(HELP_CENTER_URL, "_blank", "noopener,noreferrer");
    showSuccess(`${pendingExternalAction === "support" ? "Support" : "FAQs"} opened in a new tab.`);
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
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950" />
            ) : null}
          </Link>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        <section className="bg-white rounded-[2.5rem] p-6 mb-8 border border-slate-100 shadow-sm flex items-center gap-5 dark:bg-slate-900 dark:border-slate-800">
          <div className="relative">
            <img src={profileImg} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-50 dark:ring-slate-800" />
            <button onClick={() => openModal("profile")} className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full">
              <Edit3 size={12} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-900 leading-tight dark:text-white">{displayedName}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">@{displayedUsername}</p>
            <div
              className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase ${
                stats.plan === "FREE" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
              }`}
            >
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
            <SettingsItem
              icon={<ShieldCheck />}
              label="Privacy & Security"
              sublabel={securityBadge}
              color="bg-emerald-50 text-emerald-600"
              onClick={() => openModal("security")}
            />
            <SettingsItem icon={<Key />} label="Change Password" color="bg-slate-50 text-slate-600" onClick={() => openModal("security")} />
          </SettingsGroup>

          <SettingsGroup title="Preferences">
            <SettingsItem
              icon={<Bell />}
              label="Notifications"
              toggle
              checked={Boolean(settings.pushAlerts)}
              disabled={savingPreference === "pushAlerts"}
              onToggle={(nextValue) => handlePreferenceToggle("pushAlerts", nextValue)}
            />
            <SettingsItem
              icon={<Volume2 />}
              label="Sound Alerts"
              toggle
              checked={Boolean(settings.soundAlerts)}
              disabled={savingPreference === "soundAlerts"}
              onToggle={(nextValue) => handlePreferenceToggle("soundAlerts", nextValue)}
            />
            <SettingsItem icon={<Moon />} label="Dark Mode" toggle checked={isDark} onToggle={handleThemeToggle} />
            <SettingsItem
              icon={<Globe />}
              label="Language"
              sublabel={selectedLanguage?.label || "English"}
              color="bg-slate-50 text-slate-600"
              onClick={() => openModal("language")}
            />
            <SettingsItem
              icon={<HelpCircle />}
              label="FAQs"
              color="bg-slate-50 text-slate-600"
              onClick={() => openExternalPermission("faq")}
            />
            <SettingsItem
              icon={<HelpCircle />}
              label="Support"
              color="bg-slate-50 text-slate-600"
              onClick={() => openExternalPermission("support")}
            />
          </SettingsGroup>

          {!settings.managedByEstate ? (
            <SettingsGroup title="Subscription">
              <SettingsItem
                icon={<CreditCard />}
                label="Billing & Subscription"
                badge={stats.plan}
                onClick={() => navigate("/billing/paywall")}
              />
            </SettingsGroup>
          ) : null}

          <button
            onClick={logout}
            className="w-full py-5 text-rose-500 font-black flex items-center justify-center gap-3 bg-rose-50 rounded-3xl active:scale-95 transition-all dark:bg-rose-500/10"
          >
            <LogOut size={20} /> SIGN OUT
          </button>
        </div>
      </main>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={closeModal} />

          <div className="relative bg-white w-full max-w-md max-h-[92dvh] rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 dark:bg-slate-900 flex flex-col">
            <div className="flex justify-between items-center px-8 pt-8 pb-4 sticky top-0 bg-white z-10 dark:bg-slate-900 rounded-t-[2.5rem]">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {activeView === "profile"
                    ? "Edit Profile"
                    : activeView === "security"
                      ? "Privacy & Security"
                      : activeView === "language"
                        ? "Language"
                        : "Open External Page"}
                </h3>
                <button onClick={closeModal} className="p-2 bg-slate-50 rounded-full text-slate-400 dark:bg-slate-800 dark:text-slate-300">
                  <X size={20} />
                </button>
            </div>

            <div ref={modalContentRef} className="px-8 pb-8 overflow-y-auto overscroll-contain">
              {activeView === "profile" ? (
                <form className="space-y-4" onSubmit={handleProfileSave}>
                  <InputGroup label="Full Name" value={profileForm.fullName} onChange={(value) => setProfileForm((prev) => ({ ...prev, fullName: value }))} />
                  <InputGroup label="Username" value={profileForm.username} onChange={(value) => setProfileForm((prev) => ({ ...prev, username: value }))} />
                  <InputGroup label="Email" value={profileForm.email} readOnly />
                  <InputGroup label="Phone Number" value={profileForm.phone} onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))} />
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
                      rows="3"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : activeView === "security" ? (
                <form className="space-y-4" onSubmit={handleSecuritySave}>
                  <div className="bg-slate-50 rounded-2xl p-4 dark:bg-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Status</p>
                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{securityBadge}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {settings.managedByEstate ? "Your account is linked to an estate profile." : "Your account privacy is managed directly from this profile."}
                    </p>
                  </div>
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
                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60"
                  >
                    {savingSecurity ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              ) : activeView === "language" ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-300">
                    Choose a language preference for the app.
                  </p>
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => handleLanguageSelect(option.code)}
                      className={`w-full flex items-center justify-between rounded-2xl p-4 text-left transition-all ${
                        language === option.code
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
                          : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-black">{option.label}</span>
                        <span className="block text-xs font-bold opacity-70">{option.nativeLabel}</span>
                      </span>
                      {language === option.code ? <span className="text-[10px] font-black uppercase tracking-widest">Selected</span> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-slate-50 rounded-2xl p-4 dark:bg-slate-800">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {pendingExternalAction === "support" ? "Open Support?" : "Open FAQs?"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      You are about to open {HELP_CENTER_URL}. Continue?
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold transition-all dark:bg-slate-800 dark:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmExternalNavigation}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] dark:bg-slate-950 dark:border-slate-800">
        <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/homeowner/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
        <NavItem to="/dashboard/homeowner/messages" icon={<MessageSquare size={22} />} label="Inbox" />
        <NavItem to="/dashboard/homeowner/settings" icon={<User size={22} />} label="Profile" active />
      </nav>
    </div>
  );
}

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
    smsFallbackEnabled: Boolean(settings.smsFallbackEnabled)
  };
}

function normalizePlanLabel(value) {
  const nextValue = String(value || "").trim();
  return nextValue || "FREE";
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

function InputGroup({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white"
      />
    </div>
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
          {sublabel ? <p className="text-[10px] text-slate-400 font-bold">{sublabel}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {badge ? <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md dark:bg-indigo-500/10">{badge}</span> : null}
        {toggle ? (
          <button
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) return;
              onToggle?.(!checked);
            }}
            className={`w-10 h-5 rounded-full relative transition-all ${checked ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"}`}
            aria-pressed={checked}
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

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] active:scale-90 ${active ? "text-indigo-600" : "text-slate-400 dark:text-slate-500"}`}>
      <div className={`${active ? "bg-indigo-50 p-2 rounded-xl dark:bg-indigo-500/10" : ""}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{label}</span>
    </Link>
  );
}
