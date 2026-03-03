import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview, inviteHomeowner } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";

export default function EstateInvitesPage() {
  const [homeowners, setHomeowners] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUser, setBusyUser] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getEstateOverview();
      setHomeowners(Array.isArray(data?.homeowners) ? data.homeowners : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((requestError) => {
      setError(requestError.message ?? "Failed to load homeowners");
      setLoading(false);
    });
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
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-400">{notice}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Invite Homeowners</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Send secure access invites to residents from one estate workspace.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {loading ? <PageSkeleton blocks={4} className="sm:col-span-2" /> : null}
          {!loading && homeowners.map((homeowner) => (
            <article key={homeowner.id} className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
              <p className="font-semibold">{homeowner.fullName}</p>
              <p className="text-xs text-slate-500">{homeowner.email}</p>
              <button
                type="button"
                onClick={() => sendInvite(homeowner.id)}
                disabled={busyUser === homeowner.id}
                className="mt-3 rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {busyUser === homeowner.id ? "Sending..." : "Send Invite"}
              </button>
            </article>
          ))}
          {!loading && homeowners.length === 0 ? <p className="text-sm text-slate-500">No homeowners available yet.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}

