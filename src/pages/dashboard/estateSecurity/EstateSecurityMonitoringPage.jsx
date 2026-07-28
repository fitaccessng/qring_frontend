import { useEffect, useState } from "react";
import { Clock, Save, Sliders, Sparkles } from "lucide-react";
import { EstateSecurityShell, SecurityPanel, SecurityStatCard, SecurityToggleRow } from "./EstateSecurityShell";
import { useEstateSecurityState } from "./useEstateSecurityState";
import { showError, showSuccess } from "../../../utils/flash";

export default function EstateSecurityMonitoringPage() {
  const {
    currentEstate,
    error,
    securityRules,
    reminderFrequencyDays,
    setReminderFrequencyDays,
    autoApproveTrustedVisitors,
    setAutoApproveTrustedVisitors,
    suspiciousVisitWindowMinutes,
    setSuspiciousVisitWindowMinutes,
    suspiciousHouseThreshold,
    setSuspiciousHouseThreshold,
    suspiciousRejectionThreshold,
    setSuspiciousRejectionThreshold,
    saveSettings
  } = useEstateSecurityState();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({
        rules: securityRules,
        reminderFrequencyDays,
        autoApproveTrustedVisitors,
        suspiciousVisitWindowMinutes,
        suspiciousHouseThreshold,
        suspiciousRejectionThreshold
      });
      showSuccess("Monitoring settings saved");
    } catch (requestError) {
      showError(requestError?.message || "Unable to save monitoring settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EstateSecurityShell
      title="Monitoring"
      subtitle={`Tune reminders and suspicious visit detection${currentEstate?.name ? ` for ${currentEstate.name}` : ""}.`}
      action={
        <button onClick={handleSave} disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4955b3] px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-60">
          <Save size={18} /> {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SecurityStatCard icon={Clock} label="Reminder Cycle" value={`${reminderFrequencyDays}d`} helper="Resident reminder frequency" />
        <SecurityStatCard icon={Sliders} label="Visit Window" value={`${suspiciousVisitWindowMinutes}m`} helper="Suspicious activity interval" />
        <SecurityStatCard icon={Sparkles} label="Trusted Visitors" value={autoApproveTrustedVisitors ? "On" : "Off"} helper="Automatic trusted approval" tone="emerald" />
      </div>

      <SecurityPanel title="Automation" subtitle="Set the guardrails used by estate security automation.">
        <SecurityToggleRow
          title="Auto-approve trusted visitors"
          subtitle="Allow known trusted visitors to pass with less manual handling."
          active={Boolean(autoApproveTrustedVisitors)}
          onToggle={() => setAutoApproveTrustedVisitors((value) => !value)}
        />
        <NumberSetting label="Reminder frequency" suffix="days" value={reminderFrequencyDays} onChange={setReminderFrequencyDays} />
        <NumberSetting label="Suspicious visit window" suffix="minutes" value={suspiciousVisitWindowMinutes} onChange={setSuspiciousVisitWindowMinutes} />
        <NumberSetting label="House threshold" suffix="visits" value={suspiciousHouseThreshold} onChange={setSuspiciousHouseThreshold} />
        <NumberSetting label="Rejection threshold" suffix="rejections" value={suspiciousRejectionThreshold} onChange={setSuspiciousRejectionThreshold} />
      </SecurityPanel>
    </EstateSecurityShell>
  );
}

function NumberSetting({ label, value, onChange, suffix }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <p className="text-sm font-black text-[#2b3437]">{label}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{suffix}</p>
      </div>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right text-sm font-black text-[#2b3437] outline-none focus:border-[#4955b3] focus:bg-white"
      />
    </label>
  );
}
