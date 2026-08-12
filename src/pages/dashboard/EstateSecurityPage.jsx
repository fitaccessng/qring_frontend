import { Shield, ShieldCheck, Sliders, Users } from "lucide-react";
import { useEffect } from "react";
import { EstateSecurityShell, SecurityListLink, SecurityPanel, SecurityStatCard } from "./estateSecurity/EstateSecurityShell";
import { useEstateSecurityState } from "./estateSecurity/useEstateSecurityState";
import { showError } from "../../utils/flash";

export default function EstateSecurityPage() {
  const { currentEstate, error, estateId, estates, setEstateId, loading, stats, securityRules, suspiciousHouseThreshold, suspiciousRejectionThreshold } = useEstateSecurityState();

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  return (
    <EstateSecurityShell
      title="Security Center"
      subtitle={`Manage guard accounts, resident approval rules, and suspicious activity settings${currentEstate?.name ? ` for ${currentEstate.name}` : ""}.`}
      estates={estates}
      estateId={estateId}
      onEstateChange={setEstateId}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SecurityStatCard icon={Users} label="Active Guards" value={loading ? "--" : stats.active} helper={`${stats.suspended} suspended`} />
        <SecurityStatCard icon={ShieldCheck} label="Approval Rules" value={Object.values(securityRules).filter(Boolean).length} helper="Enabled controls" tone="emerald" />
        <SecurityStatCard icon={Sliders} label="Risk Threshold" value={`${suspiciousHouseThreshold}/${suspiciousRejectionThreshold}`} helper="House and rejection checks" />
      </div>

      <SecurityPanel title="Security Modules" subtitle="Each module opens as a standalone estate management page.">
        <SecurityListLink to="/dashboard/estate/security/team" icon={Users} title="Security Team" subtitle="Add guards, suspend access, and review assigned gates." meta={`${stats.total} users`} />
        <SecurityListLink to="/dashboard/estate/security/rules" icon={Shield} title="Approval Rules" subtitle="Control when guards may approve visits and how residents are notified." />
        <SecurityListLink to="/dashboard/estate/security/monitoring" icon={Sliders} title="Monitoring" subtitle="Tune automated suspicious-visit and reminder settings." />
      </SecurityPanel>
    </EstateSecurityShell>
  );
}
