import AppShell from "../../layouts/AppShell";
import CommunityBoardSample from "../../components/advanced/CommunityBoardSample";

export default function EstateCommunityBoardPage() {
  return (
    <AppShell title="Community Board">
      <div className="mx-auto w-full max-w-4xl">
        <CommunityBoardSample canPost />
      </div>
    </AppShell>
  );
}
