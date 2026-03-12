import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { assignDoorToHomeowner, getEstateOverview } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";

export default function EstateAssignPage() {
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ doorId: "", homeownerId: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await getEstateOverview();
    setOverview(data);
    if (!form.doorId && data?.doors?.length) setForm((prev) => ({ ...prev, doorId: data.doors[0].id }));
    if (!form.homeownerId && data?.homeowners?.length) setForm((prev) => ({ ...prev, homeownerId: data.homeowners[0].id }));
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load assignment data"));
  }, []);
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await assignDoorToHomeowner(form.doorId, form.homeownerId);
      showSuccess("Door assigned to homeowner.");
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to assign door");
    } finally {
      setBusy(false);
    }
  }

  const hasHomeowners = (overview?.homeowners?.length ?? 0) > 0;
  const hasDoors = (overview?.doors?.length ?? 0) > 0;

  return (
    <AppShell title="Assign Doors">
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Assign Doors To Homeowners</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Map each door to the right resident with a clean one-step workflow.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        {!hasHomeowners || !hasDoors ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-100">
            {!hasHomeowners ? (
              <>
                No homeowners yet. Create one in <Link to="/dashboard/estate/invites" className="font-semibold underline">Create / Invite Homeowners</Link>.
              </>
            ) : null}
            {!hasHomeowners && !hasDoors ? " " : null}
            {!hasDoors ? (
              <>
                No doors yet. Add one in <Link to="/dashboard/estate/doors" className="font-semibold underline">Estate Doors</Link>.
              </>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Select
              label="Door"
              value={form.doorId}
              onChange={(value) => setForm((prev) => ({ ...prev, doorId: value }))}
              options={(overview?.doors ?? []).map((door) => ({ value: door.id, label: door.name }))}
            />
            <Select
              label="Homeowner"
              value={form.homeownerId}
              onChange={(value) => setForm((prev) => ({ ...prev, homeownerId: value }))}
              options={(overview?.homeowners ?? []).map((user) => ({
                value: user.id,
                label: `${user.fullName} (${user.email})`
              }))}
            />
            <button
              type="submit"
              disabled={busy || !hasHomeowners || !hasDoors}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Assigning..." : "Assign Door"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Door Assignments</h3>
            <span className="text-xs text-slate-500">{overview?.doors?.length ?? 0} total</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(overview?.doors ?? []).map((door) => (
              <div key={door.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                <p className="font-semibold">{door.name}</p>
                <p className="text-xs text-slate-500">
                  {door.homeName || "Home"} · {door.homeownerName || "Unassigned"}
                </p>
              </div>
            ))}
            {(overview?.doors ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No doors assigned yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
        required
      >
        {options.length === 0 ? <option value="">No options available</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
