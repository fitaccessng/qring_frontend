import AppShell from "../../layouts/AppShell";
import EstateDashboard from "../../components/panic/EstateDashboard";
import { ShieldAlert } from "lucide-react";
import EstateManagerPageShell from "../../components/mobile/EstateManagerPageShell";

export default function EstateEmergencyPage() {
  return (
    <AppShell title="Emergency Console">
      <EstateManagerPageShell
        eyebrow="Emergency"
        title="Emergency Console"
        description="See urgent panic activity in one focused space for estate response."
        icon={<ShieldAlert className="h-5 w-5" />}
        accent="from-[#4f8cff] to-[#00346f]"
      >
        <EstateDashboard roleLabel="Estate Admin Console" />
      </EstateManagerPageShell>
    </AppShell>
  );
}
