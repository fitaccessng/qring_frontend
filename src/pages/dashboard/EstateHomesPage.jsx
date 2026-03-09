import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { addEstateHome, getEstateOverview } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";

export default function EstateHomesPage() {
  const [overview, setOverview] = useState(null);
  const [form, setForm] = useState({ estateId: "", name: "", homeownerId: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await getEstateOverview();
      setOverview(data);
      if (!form.estateId && data?.estates?.length) {
        setForm((prev) => ({ ...prev, estateId: data.estates[0].id }));
      }
      if (!form.homeownerId && data?.homeowners?.length) {
        setForm((prev) => ({ ...prev, homeownerId: data.homeowners[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch((requestError) => {
      setError(requestError.message ?? "Failed to load homes");
      setLoading(false);
    });
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await addEstateHome(form);
      setNotice("Home added successfully.");
      if (created?.id) {
        setOverview((prev) => {
          if (!prev) return prev;
          const homeowner = (prev.homeowners ?? []).find((row) => String(row.id) === String(form.homeownerId));
          const nextHome = {
            id: created.id,
            name: created.name ?? form.name,
            estateId: form.estateId,
            homeownerId: form.homeownerId,
            homeownerName: homeowner?.fullName || "",
            homeownerEmail: homeowner?.email || ""
          };
          return {
            ...prev,
            homes: [nextHome, ...(prev.homes ?? [])]
          };
        });
      }
      setForm((prev) => ({ ...prev, name: "" }));
    } catch (requestError) {
      setError(requestError.message ?? "Failed to add home");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Multi-Home Support">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-400">{notice}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Multi-Home Support</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Add homes and attach the right homeowner records to each property.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>
        {!loading && (overview?.homeowners?.length ?? 0) === 0 ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-100">
            You need at least one homeowner first. Create one in{" "}
            <Link to="/dashboard/estate/invites" className="font-semibold underline">
              Create / Invite Homeowners
            </Link>
            .
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          {loading ? (
            <PageSkeleton blocks={2} />
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy || (overview?.homeowners?.length ?? 0) === 0}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {busy ? "Saving..." : "Add Home"}
              </button>
            </form>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {loading ? <PageSkeleton blocks={3} className="sm:col-span-2" /> : null}
          {!loading && (overview?.homes ?? []).map((home) => (
            <article key={home.id} className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
              <p className="font-semibold">{home.name}</p>
              <p className="mt-1 text-xs text-slate-500">{home.homeownerName || "No homeowner assigned"}</p>
              <p className="text-xs text-slate-500">{home.homeownerEmail}</p>
            </article>
          ))}
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
