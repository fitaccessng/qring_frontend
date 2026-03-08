import AppShell from "../../layouts/AppShell";
import LiveVisitorFeedSample from "../../components/advanced/LiveVisitorFeedSample";

export default function HomeownerLiveQueuePage() {
  return (
    <AppShell title="Live Visitor Queue">
      <div className="mx-auto w-full max-w-4xl">
        <LiveVisitorFeedSample />
      </div>
    </AppShell>
  );
}
