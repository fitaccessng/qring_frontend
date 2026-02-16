import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { addEstateHome, getEstateOverview } from "../../services/estateService";

export default function EstateHomesPage() {
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ estateId: "", name: "", homeownerId: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await getEstateOverview();
    setOverview(data);
    if (!form.estateId && data?.estates?.length) {
      setForm((prev) => ({ ...prev, estateId: data.estates[0].id }));
    }
    if (!form.homeownerId && data?.homeowners?.length) {
      setForm((prev) => ({ ...prev, homeownerId: data.homeowners[0].id }));
    }
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load homes"));
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await addEstateHome(form);
      setNotice("Home added successfully.");
      setForm((prev) => ({ ...prev, name: "" }));
      await load();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to add home");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Multi-Home Support">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Add Home</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <Select
            label="Estate"
            value={form.estateId}
            onChange={(value) => setForm((prev) => ({ ...prev, estateId: value }))}
            options={(overview?.estates ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <Select
            label="Homeowner"
            value={form.homeownerId}
            onChange={(value) => setForm((prev) => ({ ...prev, homeownerId: value }))}
            options={(overview?.homeowners ?? []).map((item) => ({ value: item.id, label: `${item.fullName} (${item.email})` }))}
          />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Home Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Saving..." : "Add Home"}
          </button>
        </form>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {(overview?.homes ?? []).map((home) => (
          <article key={home.id} className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
            <p className="font-semibold">{home.name}</p>
            <p className="mt-1 text-xs text-slate-500">{home.homeownerName || "No homeowner assigned"}</p>
            <p className="text-xs text-slate-500">{home.homeownerEmail}</p>
          </article>
        ))}
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
