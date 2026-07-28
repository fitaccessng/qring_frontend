import { useEffect, useState } from "react";
import { Shield, ShieldCheck } from "lucide-react";
import { EstateSecurityShell, SecurityPanel, SecurityStatCard, SecurityToggleRow } from "./EstateSecurityShell";
import { useEstateSecurityState } from "./useEstateSecurityState";
import { showError, showSuccess } from "../../../utils/flash";

const ruleCopy = {
  canApproveWithoutHomeowner: {
    title: "Guard instant approval",
    subtitle: "Allow gate personnel to approve visitors without homeowner action."
  },
  mustNotifyHomeowner: {
    title: "Notify homeowners",
    subtitle: "Send resident alerts when security handles a visitor request."
  },
  requirePhotoVerification: {
    title: "Photo verification",
    subtitle: "Require visitor photo capture before access can be approved."
  },
  requireCallBeforeApproval: {
    title: "Call before approval",
    subtitle: "Require a voice or video check before access approval."
  }
};

export default function EstateSecurityRulesPage() {
  const { currentEstate, error, securityRules, setSecurityRules, saveSettings } = useEstateSecurityState();
  const [busyKey, setBusyKey] = useState("");

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function toggleRule(key) {
    const previous = securityRules;
    const nextRules = { ...securityRules, [key]: !securityRules[key] };
    setSecurityRules(nextRules);
    setBusyKey(key);
    try {
      await saveSettings({ rules: nextRules });
      showSuccess("Security rule updated");
    } catch (requestError) {
      setSecurityRules(previous);
      showError(requestError?.message || "Unable to update rule");
    } finally {
      setBusyKey("");
    }
  }

  const enabledCount = Object.values(securityRules).filter(Boolean).length;

  return (
    <EstateSecurityShell
      title="Approval Rules"
      subtitle={`Define how gate approvals should work${currentEstate?.name ? ` for ${currentEstate.name}` : ""}.`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SecurityStatCard icon={ShieldCheck} label="Enabled Rules" value={enabledCount} helper="Active approval controls" tone="emerald" />
        <SecurityStatCard icon={Shield} label="Resident Alerts" value={securityRules.mustNotifyHomeowner ? "On" : "Off"} helper="Homeowner notification rule" />
      </div>

      <SecurityPanel title="Approval Policy" subtitle="These rules affect how security can process visitors at the gate.">
        {Object.entries(ruleCopy).map(([key, copy]) => (
          <SecurityToggleRow
            key={key}
            title={copy.title}
            subtitle={copy.subtitle}
            active={Boolean(securityRules[key])}
            onToggle={() => toggleRule(key)}
            busy={busyKey === key}
          />
        ))}
      </SecurityPanel>
    </EstateSecurityShell>
  );
}
