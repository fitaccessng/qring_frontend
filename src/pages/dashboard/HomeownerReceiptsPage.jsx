import AppShell from "../../layouts/AppShell";
import PaymentLogsSample from "../../components/advanced/PaymentLogsSample";

export default function HomeownerReceiptsPage() {
  return (
    <AppShell title="Digital Receipts">
      <div className="mx-auto w-full max-w-4xl">
        <PaymentLogsSample />
      </div>
    </AppShell>
  );
}
