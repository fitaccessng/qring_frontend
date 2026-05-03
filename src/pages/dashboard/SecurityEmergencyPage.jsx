import AppShell from "../../layouts/AppShell";
import EstateDashboard from "../../components/panic/EstateDashboard";

export default function SecurityEmergencyPage() {
  return (
    <AppShell title="Emergency Console">
      <EstateDashboard roleLabel="Guard Response Console" />
    </AppShell>
  );
}
