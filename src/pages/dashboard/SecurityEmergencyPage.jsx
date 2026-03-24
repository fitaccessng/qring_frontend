import AppShell from "../../layouts/AppShell";
import SafetyOperationsConsole from "../../components/safety/SafetyOperationsConsole";

export default function SecurityEmergencyPage() {
  return (
    <AppShell title="Emergency Console">
      <SafetyOperationsConsole roleLabel="Guard Response Console" />
    </AppShell>
  );
}
