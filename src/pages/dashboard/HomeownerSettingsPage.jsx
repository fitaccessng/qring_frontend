import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getHomeownerSettings, updateHomeownerSettings } from "../../services/homeownerSettingsService";
import { changePassword } from "../../services/authService";
import { getReferralSummary } from "../../services/paymentService";

export default function HomeownerSettingsPage() {
  const [settings, setSettings] = useState({
    pushAlerts: true,
    soundAlerts: true,
    autoRejectUnknownVisitors: false
  });
  const [managedByEstate, setManagedByEstate] = useState(false);
  const [estateName, setEstateName] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [referral, setReferral] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [copyingReferralCode, setCopyingReferralCode] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError("");
      try {
        const [data, referralData] = await Promise.all([getHomeownerSettings(), getReferralSummary()]);
        if (!active) return;
        setSettings({
          pushAlerts: Boolean(data?.pushAlerts),
          soundAlerts: Boolean(data?.soundAlerts),
          autoRejectUnknownVisitors: Boolean(data?.autoRejectUnknownVisitors)
        });
        setManagedByEstate(Boolean(data?.managedByEstate));
        setEstateName(data?.estateName || "");
        localStorage.setItem("qring_sound_alerts", String(Boolean(data?.soundAlerts)));
        window.dispatchEvent(new Event("qring:sound-alerts-updated"));
        setSubscription(data?.subscription ?? null);
        setReferral(referralData);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Failed to load settings");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  async function savePreferences(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateHomeownerSettings(settings);
      setSettings({
        pushAlerts: Boolean(updated?.pushAlerts),
        soundAlerts: Boolean(updated?.soundAlerts),
        autoRejectUnknownVisitors: Boolean(updated?.autoRejectUnknownVisitors)
      });
      localStorage.setItem("qring_sound_alerts", String(Boolean(updated?.soundAlerts)));
      window.dispatchEvent(new Event("qring:sound-alerts-updated"));
      setNotice("Settings updated successfully.");
    } catch (requestError) {
      setError(requestError.message ?? "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setChangingPassword(true);
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirm password do not match.");
      setChangingPassword(false);
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Password changed successfully.");
    } catch (requestError) {
      setError(requestError.message ?? "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleCopyReferralCode() {
    const code = String(referral?.referralCode || "").trim();
    if (!code) {
      setError("No referral code available yet.");
      return;
    }

    setCopyingReferralCode(true);
    setError("");
    try {
      await navigator.clipboard.writeText(code);
      setNotice("Referral code copied.");
    } catch {
      setError("Unable to copy referral code. Please copy manually.");
    } finally {
      setCopyingReferralCode(false);
    }
  }

  return (
    <AppShell title="Profile & Settings">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}
      {managedByEstate ? (
        <div className="mb-4 rounded-xl border border-brand-300/40 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
          Your plan is managed by estate admin{estateName ? ` (${estateName})` : ""}.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-500 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
          Loading settings...
        </div>
      ) : (
        <section className="grid gap-3 sm:gap-4 xl:grid-cols-12">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-soft dark:border-slate-800 dark:bg-slate-900/85 xl:col-span-12">
            <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-teal-500 px-4 py-5 text-white sm:px-6">
              <p className="text-xs uppercase tracking-wide text-white/80">Profile Hub</p>
              <h2 className="font-heading text-xl font-bold sm:text-2xl">Your Account Overview</h2>
              <p className="mt-1 max-w-2xl text-sm text-white/90">
                Manage alerts, referrals, subscription and account security from one place.
              </p>
            </div>
            <div className="grid gap-3 p-4 sm:p-6 md:grid-cols-3">
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Plan</p>
                <p className="mt-1 text-base font-semibold">{subscription?.plan ?? "Not available"}</p>
                <p className="mt-1 text-xs text-slate-500">Status: {subscription?.status ?? "Unknown"}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Referral Earnings</p>
                <p className="mt-1 text-base font-semibold">
                  NGN {new Intl.NumberFormat("en-NG").format(referral?.earnings ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Rewarded: {referral?.rewardedReferrals ?? 0} / {referral?.totalReferrals ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Referral Code</p>
                <p className="mt-1 text-base font-semibold">{referral?.referralCode ?? "N/A"}</p>
                <button
                  type="button"
                  onClick={handleCopyReferralCode}
                  disabled={copyingReferralCode || !referral?.referralCode}
                  className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-slate-700"
                >
                  {copyingReferralCode ? "Copying..." : "Copy code"}
                </button>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-6 xl:col-span-7">
            <h2 className="font-heading text-lg font-bold sm:text-xl">Preferences</h2>
            <p className="mt-1 text-xs text-slate-500">Manage how you receive alerts and visitor auto-reject behavior.</p>

            <form className="mt-4 space-y-3" onSubmit={savePreferences}>
              <ToggleRow
                label="Push Alerts"
                checked={settings.pushAlerts}
                onChange={(checked) => setSettings((prev) => ({ ...prev, pushAlerts: checked }))}
              />
              <ToggleRow
                label="Sound Alerts"
                checked={settings.soundAlerts}
                onChange={(checked) => setSettings((prev) => ({ ...prev, soundAlerts: checked }))}
              />
              <ToggleRow
                label="Auto Reject Unknown Visitors"
                checked={settings.autoRejectUnknownVisitors}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoRejectUnknownVisitors: checked
                  }))
                }
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto dark:bg-white dark:text-slate-900"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-6 xl:col-span-5">
            <h2 className="font-heading text-lg font-bold sm:text-xl">Security</h2>
            <p className="mt-1 text-xs text-slate-500">Update your password regularly to keep your account protected.</p>

            {subscription?.limits ? (
              <div className="mt-4 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500">Plan Limits</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {subscription.limits.maxDoors} doors, {subscription.limits.maxQrCodes} QR codes
                </p>
              </div>
            ) : null}

            <form className="mt-6 space-y-3" onSubmit={handleChangePassword}>
              <h3 className="text-sm font-semibold">Reset Password</h3>
              <PasswordField
                label="Current Password"
                value={passwordForm.currentPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
              />
              <PasswordField
                label="New Password"
                value={passwordForm.newPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
              />
              <PasswordField
                label="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
              />
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </article>
        </section>
      )}
    </AppShell>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-brand-500"
      />
    </label>
  );
}

function PasswordField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="password"
        value={value}
        required
        minLength={8}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-300 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

