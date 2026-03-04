import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
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
  X
} from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import { changePassword } from "../../services/authService";
import { getEstateOverview } from "../../services/estateService";
import { useAuth } from "../../state/AuthContext";
import { useTheme } from "../../state/ThemeContext";

const ESTATE_OVERVIEW_CACHE_TTL_MS = 60 * 1000;
let estateOverviewCache = null;
let estateOverviewCacheAt = 0;

function isCacheFresh(cachedAt, ttlMs) {
  return Number(cachedAt) > 0 && Date.now() - cachedAt < ttlMs;
}

export default function EstateSettingsPage() {
  const { logout } = useAuth();
  const { themeMode, isDark, setThemeMode, toggleTheme } = useTheme();
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("qring_user") || "{}");
    } catch {
      return {};
    }
  })();

  const [profile, setProfile] = useState({
    fullName: storedUser?.fullName || "",
    email: storedUser?.email || "",
    role: storedUser?.role || "estate",
    username: storedUser?.username || "estate-manager",
    bio: storedUser?.bio || "Estate administrator on Qring"
  });
  const [overview, setOverview] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOverview() {
      setError("");
      const hasCachedOverview = estateOverviewCache && isCacheFresh(estateOverviewCacheAt, ESTATE_OVERVIEW_CACHE_TTL_MS);
      setLoading(!hasCachedOverview);
      if (hasCachedOverview) {
        setOverview(estateOverviewCache);
      }
      try {
        const data = await getEstateOverview();
        if (!active) return;
        estateOverviewCache = data;
        estateOverviewCacheAt = Date.now();
        setOverview(data);
      } catch (requestError) {
        if (!active) return;
        if (!hasCachedOverview) {
          setError(requestError?.message || "Failed to load estate profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      active = false;
    };
  }, []);

  const statItems = useMemo(
    () => [
      { label: "Estates", value: String(overview?.estates?.length ?? 0), icon: <Building2 className="h-4 w-4" /> },
      { label: "Homes", value: String(overview?.homes?.length ?? 0), icon: <Users className="h-4 w-4" /> },
      { label: "Doors", value: String(overview?.doors?.length ?? 0), icon: <DoorOpen className="h-4 w-4" /> }
    ],
    [overview]
  );

  function saveProfile(event) {
    event.preventDefault();
    setError("");
    const nextUser = {
      ...storedUser,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      username: profile.username,
      bio: profile.bio
    };
    localStorage.setItem("qring_user", JSON.stringify(nextUser));
    setNotice("Profile details updated on this device.");
    setEditProfileOpen(false);
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setChangingPassword(true);
    setError("");
    setNotice("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      setChangingPassword(false);
      return false;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Password changed successfully.");
      return true;
    } catch (requestError) {
      setError(requestError?.message || "Failed to change password");
      return false;
    } finally {
      setChangingPassword(false);
    }
  }

  async function openWebsiteAndEndSession() {
    setConfirmLeaveOpen(true);
  }

  async function confirmLeaveApp() {
    setConfirmLeaveOpen(false);
    try {
      await logout();
    } catch {
      // Continue with redirect even if logout request fails.
    } finally {
      window.location.assign(env.publicAppUrl);
    }
  }

  return (
    <AppShell title="My Profile">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-1 pb-16">
        {error || notice ? (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400"
            }`}
          >
            {error || notice}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 lg:p-8">
          {loading ? (
            <div className="grid h-52 place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {(profile.fullName || "E").charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-extrabold lg:text-3xl">{profile.fullName || "Estate Manager"}</h2>
                <p className="text-xs text-slate-500 lg:text-sm">{profile.bio}</p>
              </div>

              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white lg:mt-6">
                {statItems.map((item) => (
                  <div key={item.label} className="py-3 text-center lg:py-4">
                    <p className="inline-flex items-center gap-1 text-lg font-bold lg:text-2xl">
                      {item.icon}
                      {item.value}
                    </p>
                    <p className="text-[11px] text-white/80 lg:text-xs">{item.label}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 lg:py-3 lg:text-base"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>

              <div className="mt-4 space-y-2 lg:mt-6 lg:space-y-3">
                <ToggleRow icon={<Bell className="h-4 w-4" />} label="Notifications" checked disabled />
                <ToggleRow
                  icon={<Smartphone className="h-4 w-4" />}
                  label="Use Device Theme"
                  checked={themeMode === "system"}
                  onChange={(checked) => setThemeMode(checked ? "system" : isDark ? "dark" : "light")}
                />
                <ToggleRow
                  icon={<Moon className="h-4 w-4" />}
                  label="Dark Mode"
                  checked={isDark}
                  disabled={themeMode === "system"}
                  onChange={() => toggleTheme()}
                />
                <MenuRow icon={<Shield className="h-4 w-4" />} label="Privacy & Security" onClick={() => setChangePasswordOpen(true)} />
                <MenuRow icon={<Globe className="h-4 w-4" />} label="Language" value="English" />
                <MenuRow icon={<MessageCircleQuestion className="h-4 w-4" />} label="FAQs" onClick={openWebsiteAndEndSession} />
                <MenuRow icon={<HelpCircle className="h-4 w-4" />} label="Support" onClick={openWebsiteAndEndSession} />
              </div>
            </>
          )}
        </section>
      </div>

      <ActionModal open={editProfileOpen} title="Edit Profile" onClose={() => setEditProfileOpen(false)}>
        <form className="space-y-3" onSubmit={saveProfile}>
          <ProfileField label="Full Name" icon={<User className="h-4 w-4" />} value={profile.fullName} onChange={(value) => setProfile((p) => ({ ...p, fullName: value }))} />
          <ProfileField label="Username" icon={<User className="h-4 w-4" />} value={profile.username} onChange={(value) => setProfile((p) => ({ ...p, username: value }))} />
          <ProfileField label="Email" icon={<Mail className="h-4 w-4" />} value={profile.email} readOnly />
          <ProfileField label="Bio" value={profile.bio} onChange={(value) => setProfile((p) => ({ ...p, bio: value }))} />
          <button type="submit" className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
            <span className="inline-flex items-center gap-2">
              <Save className="h-4 w-4" /> Save Changes
            </span>
          </button>
        </form>
      </ActionModal>

      <ActionModal open={changePasswordOpen} title="Privacy & Security" onClose={() => setChangePasswordOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            const ok = await handleChangePassword(event);
            if (ok) setChangePasswordOpen(false);
          }}
        >
          <ProfileField label="Current Password" icon={<Lock className="h-4 w-4" />} type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((p) => ({ ...p, currentPassword: value }))} />
          <ProfileField label="New Password" icon={<Lock className="h-4 w-4" />} type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((p) => ({ ...p, newPassword: value }))} />
          <ProfileField label="Confirm Password" icon={<Lock className="h-4 w-4" />} type="password" value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((p) => ({ ...p, confirmPassword: value }))} />
          <button type="submit" disabled={changingPassword} className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-60">
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </ActionModal>

      <ActionModal open={confirmLeaveOpen} title="Leave Qring?" onClose={() => setConfirmLeaveOpen(false)}>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You are about to open an external page. Continue?
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setConfirmLeaveOpen(false)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={confirmLeaveApp}
            className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Continue
          </button>
        </div>
      </ActionModal>
    </AppShell>
  );
}

function MenuRow({ icon, label, onClick, value }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm dark:border-slate-700 dark:bg-slate-800/60"
    >
      <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-200">
        {icon}
        {label}
      </span>
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        {value ? value : null}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function ToggleRow({ icon, label, checked, onChange, disabled = false }) {
  return (
    <div className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm dark:border-slate-700 dark:bg-slate-800/60">
      <span className={`inline-flex items-center gap-2 ${disabled ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>
        {icon}
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${disabled ? "cursor-not-allowed bg-slate-300/70 dark:bg-slate-700/70" : checked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

function ProfileField({ label, icon, value, onChange, readOnly = false, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span> : null}
        <input
          type={type}
          value={value}
          onChange={readOnly ? undefined : (event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800 ${icon ? "pl-10" : "pl-3"} ${readOnly ? "cursor-not-allowed text-slate-500" : ""}`}
        />
      </div>
    </label>
  );
}

function ActionModal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 dark:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
