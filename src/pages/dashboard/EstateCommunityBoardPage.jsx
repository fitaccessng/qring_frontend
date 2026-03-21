import AppShell from "../../layouts/AppShell";
import CommunityBoardSample from "../../components/advanced/CommunityBoardSample";
import EstateManagerPageShell, { EstateManagerSection } from "../../components/mobile/EstateManagerPageShell";
import { Users } from "lucide-react";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";
import { createCommunityPost } from "../../services/advancedService";
import { useState } from "react";
import { showSuccess } from "../../utils/flash";

export default function EstateCommunityBoardPage() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(event) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createCommunityPost({
        audienceScope: "estate",
        title: title.trim(),
        body: body.trim(),
        tag: "notice",
        pinned: false
      });
      setTitle("");
      setBody("");
      setComposeOpen(false);
      showSuccess("Community update posted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Community Board">
      <EstateManagerPageShell
        eyebrow="Estate Community"
        title="Community Board"
        description="Share updates, conversations, and notices in a space that feels approachable on mobile."
        icon={<Users size={22} />}
        accent="from-fuchsia-500 to-indigo-500"
        stats={[
          { label: "Mode", value: "Live", helper: "Posting enabled" },
          { label: "Audience", value: "Residents", helper: "Community-wide visibility" }
        ]}
      >
        <EstateManagerSection title="Community updates" subtitle="Open the composer only when you want to publish a new notice.">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
          >
            New Community Post
          </button>
        </EstateManagerSection>
        <EstateManagerSection title="Board feed" subtitle="Post updates and keep the estate conversation easy to scan on smaller screens.">
          <CommunityBoardSample canPost={false} />
        </EstateManagerSection>
      </EstateManagerPageShell>
      <MobileBottomSheet open={composeOpen} title="Create Community Post" onClose={() => setComposeOpen(false)} width="720px" height="82dvh">
        <form onSubmit={handleCreate} className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Post title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={estateFieldClassName} placeholder="Weekend sanitation update" required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} className={estateTextareaClassName} placeholder="Share the update with all residents." />
          </label>
          <button type="submit" disabled={busy} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            {busy ? "Posting..." : "Post Update"}
          </button>
        </form>
      </MobileBottomSheet>
    </AppShell>
  );
}
