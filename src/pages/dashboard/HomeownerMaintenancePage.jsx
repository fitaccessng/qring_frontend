import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { createMaintenanceRequest } from "../../services/residentService";
import { showError, showSuccess } from "../../utils/flash";

export default function ResidentMaintenancePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createMaintenanceRequest({
        title: title.trim(),
        description: description.trim()
      });
      showSuccess("Maintenance request submitted.");
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err?.message || "Failed to submit request");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  return (
    <AppShell title="Maintenance Request">
      <div className="mx-auto w-full max-w-3xl space-y-5">

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Report an issue</h2>
          <p className="mt-1 text-xs text-slate-500">Your estate manager will be notified.</p>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Leaking pipe near gate"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Details</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Location, urgency, and any helpful notes."
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Submitting..." : "Send Request"}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
