import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { createEstateHomeowner, getEstateOverview, inviteHomeowner } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";

export default function EstateInvitesPage() {
  const [homeowners, setHomeowners] = useState([]);
  const [estates, setEstates] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUser, setBusyUser] = useState("");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    estateId: "",
    fullName: "",
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getEstateOverview();
      setHomeowners(Array.isArray(data?.homeowners) ? data.homeowners : []);
      const estateRows = Array.isArray(data?.estates) ? data.estates : [];
      setEstates(estateRows);
      if (!createForm.estateId && estateRows.length > 0) {
        setCreateForm((prev) => ({ ...prev, estateId: estateRows[0].id }));
      }
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

  async function createHomeowner(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const created = await createEstateHomeowner(createForm);
      setNotice(`Homeowner created: ${created?.fullName || createForm.fullName}. Send invite from the list below.`);
      setCreateForm((prev) => ({
        ...prev,
        fullName: "",
        username: "",
        password: ""
      }));
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create homeowner");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell title="Invite Homeowners">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-400">{notice}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Create and Invite Homeowners</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">
              Create homeowner accounts here, then send invite links to residents.
            </p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="rounded-[2rem] border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-100">
          Homeowner setup flow: Create homeowner account here, then use{" "}
          <Link to="/dashboard/estate/homes" className="font-semibold underline">
            Multi-Home
          </Link>{" "}
          and{" "}
          <Link to="/dashboard/estate/assign" className="font-semibold underline">
            Assign Doors
          </Link>{" "}
          to link access.
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Homeowner</h3>
          {loading ? (
            <PageSkeleton blocks={1} className="mt-4" />
          ) : (
            <form onSubmit={createHomeowner} className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estate</span>
                <select
                  value={createForm.estateId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, estateId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                >
                  {estates.length === 0 ? <option value="">No estate available</option> : null}
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</span>
                <input
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Username</span>
                <input
                  value={createForm.username}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Temporary Password</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={creating || estates.length === 0}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {creating ? "Creating..." : "Create Homeowner"}
              </button>
            </form>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Homeowners</h3>
            <span className="text-xs text-slate-500">{homeowners.length} total</span>
          </div>
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
