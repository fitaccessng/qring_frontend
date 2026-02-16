import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { assignDoorToHomeowner, getEstateOverview } from "../../services/estateService";

export default function EstateAssignPage() {
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ doorId: "", homeownerId: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await assignDoorToHomeowner(form.doorId, form.homeownerId);
      setNotice("Door assigned to homeowner.");
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to assign door");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Assign Doors">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Assign Doors To Homeowners</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
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
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Assigning..." : "Assign Door"}
          </button>
        </form>
      </section>
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
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
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
