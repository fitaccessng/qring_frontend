import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { assignDoorToHomeowner, getEstateOverview } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import CardSurface from "../../components/CardSurface";

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

        <CardSurface accent="from-indigo-100/80 via-white/10 to-transparent" glow="bg-indigo-300/50" className="sm:p-6">
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
        </CardSurface>

        <CardSurface accent="from-slate-100/80 via-white/10 to-transparent" glow="bg-slate-300/50" className="sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Door Assignments</h3>
            <span className="text-xs text-slate-500">{overview?.doors?.length ?? 0} total</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(overview?.doors ?? []).map((door) => (
              <CardSurface
                as="div"
                key={door.id}
                className="rounded-[1.4rem] border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                accent="from-slate-100/80 via-white/10 to-transparent"
                glow="bg-slate-300/30"
              >
                <p className="font-semibold">{door.name}</p>
                <p className="text-xs text-slate-500">
                  {door.homeName || "Home"} · {door.homeownerName || "Unassigned"}
                </p>
              </CardSurface>
            ))}
            {(overview?.doors ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No doors assigned yet.</p>
            ) : null}
          </div>
        </CardSurface>
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

