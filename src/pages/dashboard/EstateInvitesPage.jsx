import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview, inviteHomeowner } from "../../services/estateService";

export default function EstateInvitesPage() {
  const [homeowners, setHomeowners] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUser, setBusyUser] = useState("");

  async function load() {
    const data = await getEstateOverview();
    setHomeowners(Array.isArray(data?.homeowners) ? data.homeowners : []);
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load homeowners"));
  }, []);

  async function sendInvite(homeownerId) {
    setBusyUser(homeownerId);
    setError("");
    setNotice("");
    try {
      const sent = await inviteHomeowner(homeownerId);
      setNotice(`Invite sent. Token: ${sent?.inviteToken ?? "-"}`);
    } catch (requestError) {
      setError(requestError.message ?? "Failed to send invite");
    } finally {
      setBusyUser("");
    }
  }

  return (
    <AppShell title="Invite Homeowners">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Invite Homeowners</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
      </section>
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {homeowners.map((homeowner) => (
          <article key={homeowner.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
            <p className="font-semibold">{homeowner.fullName}</p>
            <p className="text-xs text-slate-500">{homeowner.email}</p>
            <button
              type="button"
              onClick={() => sendInvite(homeowner.id)}
              disabled={busyUser === homeowner.id}
              className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busyUser === homeowner.id ? "Sending..." : "Send Invite"}
            </button>
          </article>
        ))}
        {homeowners.length === 0 ? <p className="text-sm text-slate-500">No homeowners available yet.</p> : null}
      </section>
    </AppShell>
  );
}
