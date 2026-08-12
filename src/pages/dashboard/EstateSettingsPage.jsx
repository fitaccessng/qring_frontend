import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Bell, 
  User, 
  Shield, 
  Lock, 
  BellRing, 
  Moon, 
  Globe, 
  LogOut, 
  ChevronRight, 
  Building2,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { getEstateSettingsSummary, getEstateSettingsSummarySnapshot } from "../../services/estateService";
import { updateCurrentUserProfile } from "../../services/authService";
import { disablePushSubscription, getPushSubscriptionStatus } from "../../services/notificationService";
import { clearLastFcmPushToken, getLastFcmPushToken, registerFcmPushSubscription } from "../../services/pushMessagingService";
import { isNativeApp } from "../../utils/nativeRuntime";
import { showError, showSuccess } from "../../utils/flash";
import { useTheme } from "../../state/ThemeContext";
import { useLanguage } from "../../state/LanguageContext";
import { estateFieldClassName } from "../../components/mobile/EstateManagerPageShell";
import BottomSheet from "../../components/system/BottomSheet";

const ACTIVE_ESTATE_STORAGE_KEY = "qring.activeEstateId";

function readActiveEstateId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACTIVE_ESTATE_STORAGE_KEY) || "";
}

function writeActiveEstateId(estateId) {
  if (typeof window === "undefined") return;
  if (estateId) window.localStorage.setItem(ACTIVE_ESTATE_STORAGE_KEY, estateId);
  else window.localStorage.removeItem(ACTIVE_ESTATE_STORAGE_KEY);
}

const PAGE_TRANSLATIONS = {
  en: {
    settings: "Settings", subtitle: "Profile & Configurations", role: "Estate Manager",
    account: "Account Settings", personal: "Personal Details", password: "Password & Security",
    passwordHint: "Update security password credentials", billing: "Billing & Subscription",
    noPlan: "No active operational tier", estateControls: "Estate Controls", estates: "My Estates",
    compliance: "Compliance Rules", complianceHint: "System access protocols and variables",
    devices: "Connected Devices", system: "System Settings", darkMode: "Dark Mode",
    notifications: "Notification Preferences", notificationHint: "Configure push and email notifications",
    language: "System Language", saveChanges: "Save Changes", updatePassword: "Update Password",
    fullName: "Full Name", email: "Email Address", currentPassword: "Current Password",
    newPassword: "New Password", confirmPassword: "Confirm New Password", savePreferences: "Save Preferences",
    push: "Push Notifications", pushHint: "Real-time mobile and web alerts",
    emailNotifications: "Email Notifications", emailHint: "Updates and daily audit digests",
    selectLanguage: "Select Language", selected: "Selected", choose: "Choose", on: "On", off: "Off"
  },
  fr: {
    settings: "Paramètres", subtitle: "Profil et configuration", role: "Gestionnaire de résidence",
    account: "Paramètres du compte", personal: "Informations personnelles", password: "Mot de passe et sécurité",
    passwordHint: "Mettre à jour vos identifiants de sécurité", billing: "Facturation et abonnement",
    noPlan: "Aucun forfait actif", estateControls: "Gestion de la résidence", estates: "Mes résidences",
    compliance: "Règles de conformité", complianceHint: "Protocoles et paramètres d’accès au système",
    devices: "Appareils connectés", system: "Paramètres système", darkMode: "Mode sombre",
    notifications: "Préférences de notification", notificationHint: "Configurer les notifications push et e-mail",
    language: "Langue du système", saveChanges: "Enregistrer", updatePassword: "Modifier le mot de passe",
    fullName: "Nom complet", email: "Adresse e-mail", currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe", confirmPassword: "Confirmer le mot de passe", savePreferences: "Enregistrer les préférences",
    push: "Notifications push", pushHint: "Alertes mobiles et web en temps réel",
    emailNotifications: "Notifications par e-mail", emailHint: "Mises à jour et résumés quotidiens",
    selectLanguage: "Choisir la langue", selected: "Sélectionné", choose: "Choisir", on: "Activé", off: "Désactivé"
  },
  ar: {
    settings: "الإعدادات", subtitle: "الملف الشخصي والإعدادات", role: "مدير المجمع",
    account: "إعدادات الحساب", personal: "البيانات الشخصية", password: "كلمة المرور والأمان",
    passwordHint: "تحديث بيانات الأمان", billing: "الفوترة والاشتراك", noPlan: "لا توجد خطة نشطة",
    estateControls: "إدارة المجمع", estates: "مجمعاتي", compliance: "قواعد الامتثال",
    complianceHint: "بروتوكولات ومتغيرات الوصول للنظام", devices: "الأجهزة المتصلة",
    system: "إعدادات النظام", darkMode: "الوضع الداكن", notifications: "تفضيلات الإشعارات",
    notificationHint: "إعداد إشعارات الهاتف والبريد", language: "لغة النظام", saveChanges: "حفظ التغييرات",
    updatePassword: "تحديث كلمة المرور", fullName: "الاسم الكامل", email: "البريد الإلكتروني",
    currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", confirmPassword: "تأكيد كلمة المرور",
    savePreferences: "حفظ التفضيلات", push: "إشعارات الهاتف", pushHint: "تنبيهات فورية للهاتف والويب",
    emailNotifications: "إشعارات البريد", emailHint: "التحديثات والملخصات اليومية",
    selectLanguage: "اختر اللغة", selected: "محدد", choose: "اختيار", on: "تشغيل", off: "إيقاف"
  },
  ig: {
    settings: "Ntọala", subtitle: "Profaịlụ na nhazi", role: "Onye njikwa ebe obibi",
    account: "Ntọala akaụntụ", personal: "Nkọwa onwe", password: "Okwuntughe na nchekwa",
    passwordHint: "Gbanwee okwuntughe nchekwa", billing: "Ụgwọ na ndebanye aha", noPlan: "Enweghị atụmatụ na-arụ ọrụ",
    estateControls: "Njikwa ebe obibi", estates: "Ebe obibi m", compliance: "Iwu nnabata",
    complianceHint: "Usoro nnweta sistemụ", devices: "Ngwa ejikọrọ", system: "Ntọala sistemụ",
    darkMode: "Ọnọdụ ọchịchịrị", notifications: "Ntọala ọkwa", notificationHint: "Hazie ọkwa push na email",
    language: "Asụsụ sistemụ", saveChanges: "Chekwaa mgbanwe", updatePassword: "Gbanwee okwuntughe",
    fullName: "Aha zuru ezu", email: "Adreesị email", currentPassword: "Okwuntughe ugbu a",
    newPassword: "Okwuntughe ọhụrụ", confirmPassword: "Kwenye okwuntughe ọhụrụ", savePreferences: "Chekwaa ntọala",
    push: "Ọkwa push", pushHint: "Ọkwa ozugbo na ekwentị na webụ", emailNotifications: "Ọkwa email",
    emailHint: "Mmelite na nchịkọta kwa ụbọchị", selectLanguage: "Họrọ asụsụ", selected: "Ahọrọ", choose: "Họrọ", on: "Gbanye", off: "Gbanyụọ"
  }
};

export default function EstateSettingsPage() {
  const cachedSummary = getEstateSettingsSummarySnapshot();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, languageOptions, selectedLanguage, setLanguage } = useLanguage();
  const copy = PAGE_TRANSLATIONS[language] || PAGE_TRANSLATIONS.en;
  
  const [summary, setSummary] = useState(() => cachedSummary || { estates: [], doors: [], subscription: {} });
  const [selectedEstateId, setSelectedEstateIdState] = useState(() => readActiveEstateId() || cachedSummary?.estates?.[0]?.id || "");
  const [loading, setLoading] = useState(() => !cachedSummary);
  const [loadError, setLoadError] = useState("");
  const [editValues, setEditValues] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [pushState, setPushState] = useState({ status: "checking", enabled: false, message: "Checking notification state..." });
  const [savingPush, setSavingPush] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("qring_estate_notification_preferences") || "null");
      return {
        pushNotifications: saved?.pushNotifications ?? true,
        emailNotifications: saved?.emailNotifications ?? true,
      };
    } catch {
      return { pushNotifications: true, emailNotifications: true };
    }
  });

  function setSelectedEstateId(estateId) {
    setSelectedEstateIdState(estateId || "");
    writeActiveEstateId(estateId || "");
  }

  useEffect(() => {
    localStorage.setItem("qring_estate_notification_preferences", JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  useEffect(() => {
    let active = true;
    async function loadPushState() {
      try {
        if (isNativeApp()) {
          if (active) setPushState({ status: "unsupported", enabled: false, message: "Mobile push registration is handled by the native shell." });
          return;
        }
        if (typeof window === "undefined" || typeof window.Notification === "undefined" || !("serviceWorker" in navigator)) {
          if (active) setPushState({ status: "unsupported", enabled: false, message: "This browser does not support Qring web push." });
          return;
        }
        if (window.Notification.permission === "denied") {
          if (active) setPushState({ status: "permission_denied", enabled: false, message: "Browser permission is blocked. Enable notifications in browser settings." });
          return;
        }
        const status = await getPushSubscriptionStatus();
        if (!active) return;
        setPushState({
          status: status.enabled ? "enabled" : "disabled",
          enabled: Boolean(status.enabled),
          message: status.enabled ? `${status.activeCount || 1} device token registered.` : "Notifications are disabled for this browser.",
        });
        setNotificationPrefs((current) => ({ ...current, pushNotifications: Boolean(status.enabled) }));
      } catch (error) {
        if (active) setPushState({ status: "registration_failed", enabled: false, message: error?.message || "Unable to check notification state." });
      }
    }
    loadPushState();
    return () => { active = false; };
  }, []);

  async function handleProfileSave() {
    if (savingProfile) return;
    const fullName = String(editValues.fullName ?? user?.fullName ?? "").trim();
    const phone = String(editValues.phone ?? user?.phone ?? "").trim();
    if (!fullName) {
      showError("Full name is required.");
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await updateCurrentUserProfile({ fullName, phone: phone || null });
      updateUser((current) => ({ ...(current || {}), ...(updated || {}) }));
      setEditValues({});
      setActiveModal(null);
      showSuccess("Profile updated.");
    } catch (error) {
      showError(error?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePushToggle(nextEnabled) {
    if (savingPush) return;
    setSavingPush(true);
    try {
      if (!nextEnabled) {
        const token = getLastFcmPushToken();
        await disablePushSubscription(token ? { provider: "fcm", token } : { provider: "fcm" });
        clearLastFcmPushToken();
        setNotificationPrefs((current) => ({ ...current, pushNotifications: false }));
        setPushState({ status: "disabled", enabled: false, message: "Notifications are disabled for this browser." });
        showSuccess("Notifications disabled.");
        return;
      }

      if (isNativeApp()) {
        setPushState({ status: "unsupported", enabled: false, message: "Mobile push registration is handled by the native shell." });
        return;
      }
      if (typeof window === "undefined" || typeof window.Notification === "undefined" || !("serviceWorker" in navigator)) {
        setPushState({ status: "unsupported", enabled: false, message: "This browser does not support Qring web push." });
        return;
      }
      const permission = window.Notification.permission === "granted" ? "granted" : await window.Notification.requestPermission();
      if (permission === "denied") {
        setPushState({ status: "permission_denied", enabled: false, message: "Browser permission is blocked. Enable notifications in browser settings." });
        setNotificationPrefs((current) => ({ ...current, pushNotifications: false }));
        return;
      }
      if (permission !== "granted") {
        setPushState({ status: "disabled", enabled: false, message: "Notification permission was not granted." });
        setNotificationPrefs((current) => ({ ...current, pushNotifications: false }));
        return;
      }
      const result = await registerFcmPushSubscription();
      if (result.status !== "registered") {
        const message = {
          unsupported: "This browser does not support Qring web push.",
          missing_vapid_key: "Push is not configured for this environment.",
          no_token: "No push token was returned by the browser.",
          registration_failed: "Push token registration failed.",
          permission_denied: "Browser permission is blocked.",
          permission_required: "Notification permission is required.",
        }[result.status] || "Unable to enable notifications.";
        setPushState({ status: result.status, enabled: false, message });
        setNotificationPrefs((current) => ({ ...current, pushNotifications: false }));
        return;
      }
      setNotificationPrefs((current) => ({ ...current, pushNotifications: true }));
      setPushState({ status: "enabled", enabled: true, message: "Notifications are enabled for this browser." });
      showSuccess("Notifications enabled.");
    } catch (error) {
      setPushState({ status: "registration_failed", enabled: false, message: error?.message || "Push registration failed." });
      setNotificationPrefs((current) => ({ ...current, pushNotifications: false }));
    } finally {
      setSavingPush(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      if (!cachedSummary) setLoading(true);
      try {
        const data = await getEstateSettingsSummary();
        if (!active) return;
        setSummary(data || { estates: [], doors: [], subscription: {} });
        setLoadError("");
      } catch (error) {
        if (!active) return;
        setLoadError(error?.message || "Failed to load estate profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadSummary();
    return () => { active = false; };
  }, [cachedSummary]);

  useEffect(() => {
    if (!selectedEstateId && summary?.estates?.length) {
      setSelectedEstateId(summary.estates[0].id);
    }
  }, [selectedEstateId, summary?.estates]);

  const currentEstate = useMemo(() => {
    if (!summary?.estates?.length) return null;
    return summary.estates.find((e) => String(e.id) === String(selectedEstateId)) ?? summary.estates[0];
  }, [selectedEstateId, summary?.estates]);

  const currentEstateId = currentEstate?.id ?? "";

  const activeEstates = useMemo(() => {
    return (summary?.estates ?? []).filter((e) => String(e.status || "").toLowerCase() === "active").length;
  }, [summary?.estates]);

  const totalEstates = summary?.estates?.length ?? 0;

  const connectedDevices = useMemo(() => {
    if (!currentEstateId) return 0;
    return (summary?.doors ?? []).filter((d) => String(d.estateId) === String(currentEstateId)).length;
  }, [currentEstateId, summary?.doors]);

  const subscription = summary?.subscription ?? {};

  const profile = {
    name: user?.fullName || "User",
    role: copy.role,
  };

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">
      
      {/* --- STICKY GLASS HEADER --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">{copy.settings}</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{copy.subtitle}</p>
            </div>
          </div>
          
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="mt-6 px-4 max-w-2xl mx-auto w-full space-y-6 flex-1">
        
        {/* Profile Identity Block */}
        <section className="flex items-center justify-center bg-white p-5 text-center dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm">
          <div className="flex min-w-0 flex-col items-center">
            <h2 className="text-base font-black text-slate-900 dark:text-white truncate leading-tight">{profile.name}</h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {profile.role}
              </span>
            </div>
          </div>
        </section>

        {loadError && (
          <div className="rounded-2xl border border-rose-100 dark:border-rose-950/40 bg-rose-50 dark:bg-rose-500/5 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Section: Account Configuration */}
        <section className="space-y-2">
          <h3 className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{copy.account}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-950/40">
            <SettingsRow 
              icon={<User size={16} />} 
              label={copy.personal}
              value={`${user?.fullName || "N/A"} • ${user?.email || "N/A"}`}
              onClick={() => setActiveModal("personalDetails")}
            />
            <SettingsRow 
              icon={<Lock size={16} />} 
              label={copy.password}
              value={copy.passwordHint}
              onClick={() => setActiveModal("password")}
            />
            <SettingsRow 
              icon={<CreditCard size={16} />} 
              label={copy.billing}
              value={subscription?.planName || copy.noPlan}
              onClick={() => navigate("/billing/paywall")}
            />
          </div>
        </section>

        {/* Section: Management Controls */}
        <section className="space-y-2">
          <h3 className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{copy.estateControls}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-950/40">
            <SettingsRow 
              icon={<Building2 size={16} />} 
              label={copy.estates}
              value={loading ? "Synchronizing estates..." : `${activeEstates} Operational · ${totalEstates} Registered`}
              onClick={() => setActiveModal("estates")}
            />
            <SettingsRow 
              icon={<Shield size={16} />} 
              label={copy.compliance}
              value={copy.complianceHint}
              onClick={() => setActiveModal("compliance")}
            />
            <SettingsRow 
              icon={<Smartphone size={16} />} 
              label={copy.devices}
              value={loading ? "Mapping terminals..." : `${connectedDevices} Active Gate Terminal${connectedDevices !== 1 ? "s" : ""}`}
              onClick={() => setActiveModal("devices")}
            />
          </div>
        </section>

        {/* Section: System Preferences */}
        <section className="space-y-2">
          <h3 className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{copy.system}</h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 overflow-hidden shadow-sm divide-y divide-slate-50 dark:divide-slate-950/40">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-800 shrink-0">
                  <Moon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{copy.darkMode}</p>
                </div>
              </div>
              <button 
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label={`Turn dark mode ${isDark ? "off" : "on"}`}
                onClick={toggleTheme}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              >
                <span className="w-7 text-right text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {isDark ? copy.on : copy.off}
                </span>
                <span className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${isDark ? "bg-indigo-600" : "bg-slate-200"}`}>
                  <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDark ? "translate-x-5" : "translate-x-0"}`} />
                </span>
              </button>
            </div>
            
            <SettingsRow 
              icon={<BellRing size={16} />} 
              label={copy.notifications}
              value={copy.notificationHint}
              onClick={() => setActiveModal("notifications")} 
            />
            
            <SettingsRow 
              icon={<Globe size={16} />} 
              label={copy.language}
              value={selectedLanguage?.label || "English"}
              onClick={() => setActiveModal("language")}
            />
          </div>
        </section>

        {/* Logout */}
        <button 
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="w-full py-4 bg-rose-500/5 dark:bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
        >
          <LogOut size={16} />
          Terminate Session
        </button>

        {/* ===== MODAL RESPONSIBLE SHEETS ===== */}

        {/* Personal Details */}
        <SettingsSheet
          open={activeModal === "personalDetails"}
          title={copy.personal}
          onClose={() => setActiveModal(null)}
          onAction={handleProfileSave}
          actionLabel={savingProfile ? "Saving..." : copy.saveChanges}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">{copy.fullName}</span>
              <input 
                type="text" 
                className={estateFieldClassName}
                defaultValue={user?.fullName || ""} 
                onChange={(e) => setEditValues({ ...editValues, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">Phone</span>
              <input 
                type="tel" 
                className={estateFieldClassName}
                defaultValue={user?.phone || ""} 
                onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">{copy.email}</span>
              <input 
                type="email" 
                className={estateFieldClassName}
                defaultValue={user?.email || ""} 
                readOnly
              />
              <p className="text-[10px] font-semibold text-slate-400">Email is your sign-in identity and is managed through account security.</p>
            </div>
          </div>
        </SettingsSheet>

        {/* Password Security */}
        <SettingsSheet
          open={activeModal === "password"}
          title={copy.password}
          onClose={() => setActiveModal(null)}
          onAction={() => setActiveModal(null)}
          actionLabel={copy.updatePassword}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">{copy.currentPassword}</span>
              <input type="password" placeholder="••••••••" className={estateFieldClassName} />
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">{copy.newPassword}</span>
              <input type="password" placeholder="••••••••" className={estateFieldClassName} />
            </div>
            <div className="space-y-1.5">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-0.5">{copy.confirmPassword}</span>
              <input type="password" placeholder="••••••••" className={estateFieldClassName} />
            </div>
          </div>
        </SettingsSheet>

        {/* Estates Selection */}
        <SettingsSheet
          open={activeModal === "estates"}
          title="My Estates"
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-2.5">
            {summary?.estates?.map((estate) => (
              <button
                type="button"
                key={estate.id}
                onClick={() => {
                  setSelectedEstateId(estate.id);
                  setActiveModal(null);
                }}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900 rounded-2xl hover:border-indigo-500/50 transition-all text-left"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">{estate.name}</h4>
                  <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full ${
                    String(estate.status).toLowerCase() === 'active' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-500'
                  }`}>
                    {estate.status}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-2">Terminals Hooked: {estate.doorCount ?? 0}</p>
              </button>
            ))}
            {!summary?.estates?.length && <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">No records indexed</p>}
          </div>
        </SettingsSheet>

        {/* Compliance Rules */}
        <SettingsSheet open={activeModal === "compliance"} title="Compliance Directives" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/40 dark:border-indigo-500/10">
              <h4 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-400">Access Protocols</h4>
              <ul className="text-[10px] font-bold text-indigo-850 dark:text-indigo-300/80 uppercase tracking-wide mt-2 space-y-1">
                <li>✓ Multi-Factor Verification Operational</li>
                <li>✓ Session TTL Horizon: 30 Min</li>
                <li>✓ Active Node Logging Enabled</li>
              </ul>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-300">Security Guidelines</h4>
              <ul className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-2 space-y-1">
                <li>• Rotate credentials every 90 days</li>
                <li>• Keep distinct gate tokens isolated</li>
              </ul>
            </div>
          </div>
        </SettingsSheet>

        {/* Devices */}
        <SettingsSheet open={activeModal === "devices"} title="Gate Terminals" onClose={() => setActiveModal(null)}>
          <div className="space-y-2.5">
            {summary?.doors?.filter((door) => String(door.estateId) === String(currentEstateId)).map((door) => (
              <div key={door.id} className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100/40 dark:border-slate-900/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight truncate">{door.name || door.doorName}</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-wider mt-0.5 truncate">MAC / ID: {door.deviceId || "N/A"}</p>
                </div>
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full border ${
                  door.status === "online" 
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                    : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                }`}>
                  {door.status || "offline"}
                </span>
              </div>
            ))}
            {!summary?.doors?.filter((door) => String(door.estateId) === String(currentEstateId)).length && (
              <p className="text-center text-slate-400 dark:text-slate-500 text-xs py-8">No terminals synced to this node</p>
            )}
          </div>
        </SettingsSheet>

        {/* Notification Settings Toggle */}
        <SettingsSheet
          open={activeModal === "notifications"}
          title={copy.notifications}
          onClose={() => setActiveModal(null)}
          onAction={() => setActiveModal(null)}
          actionLabel={copy.savePreferences}
        >
          <div className="space-y-2.5">
            <PreferenceSwitch
              label={copy.push}
              description={copy.pushHint}
              checked={pushState.enabled}
              disabled={savingPush}
              onLabel={copy.on}
              offLabel={copy.off}
              onChange={handlePushToggle}
            />
            <p className={`rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
              pushState.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500 dark:bg-slate-950/40 dark:text-slate-400"
            }`}>
              {pushState.message}
            </p>
            
            <PreferenceSwitch
              label={copy.emailNotifications}
              description={copy.emailHint}
              checked={notificationPrefs.emailNotifications}
              onLabel={copy.on}
              offLabel={copy.off}
              onChange={(checked) => setNotificationPrefs((current) => ({ ...current, emailNotifications: checked }))}
            />
          </div>
        </SettingsSheet>

        <SettingsSheet
          open={activeModal === "language"}
          title={copy.selectLanguage}
          onClose={() => setActiveModal(null)}
        >
          <div className="space-y-2.5">
            {languageOptions.map((option) => {
              const isSelected = option.code === language;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setLanguage(option.code);
                    setActiveModal(null);
                  }}
                  className={`flex min-h-14 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-extrabold">{option.label}</span>
                    <span className="block text-xs font-semibold opacity-70">{option.nativeLabel}</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{isSelected ? copy.selected : copy.choose}</span>
                </button>
              );
            })}
          </div>
        </SettingsSheet>

      </main>
    </div>
  );
}

function PreferenceSwitch({ label, description, checked, onChange, disabled = false, onLabel = "On", offLabel = "Off" }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100/40 bg-slate-50/50 p-3.5 dark:border-slate-900/40 dark:bg-slate-950/40">
      <div className="min-w-0">
        <h4 className="text-xs font-extrabold leading-tight text-slate-900 dark:text-white">{label}</h4>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${checked ? "Turn off" : "Turn on"} ${label}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span className="min-w-7 text-right text-[10px] font-black uppercase text-slate-500 dark:text-slate-300">{checked ? onLabel : offLabel}</span>
        <span className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
          <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>
    </div>
  );
}

/* --- PRESERVED SINGLE LIST ROW COMPONENT --- */
function SettingsRow({ icon, label, value, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all ${
        onClick ? "cursor-pointer group" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-400 border border-slate-100 dark:border-slate-800 shrink-0 transition-all">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">{label}</p>
          {value && <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5 truncate pr-2">{value}</p>}
        </div>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 dark:text-slate-700 transition-all shrink-0" />
    </div>
  );
}

/* --- BOTTOM SHEET DRAG-CONTAINER WRAPPER --- */
function SettingsSheet({ open, onClose, title, onAction, actionLabel, children }) {
  const footer = onAction ? (
    <button
      type="button"
      onClick={onAction}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95"
    >
      {actionLabel}
    </button>
  ) : null;

  return (
    <BottomSheet open={open} onClose={onClose} title={title} footer={footer}>
      {children}
    </BottomSheet>
  );
}
 
