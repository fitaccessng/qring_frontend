import AppShell from "../../layouts/AppShell";
import SafetyOperationsConsole from "../../components/safety/SafetyOperationsConsole";

export default function EstateEmergencyPage() {
  return (
    <AppShell title="Emergency Console">
      <SafetyOperationsConsole roleLabel="Estate Admin Console" />
    </AppShell>
  );
}
