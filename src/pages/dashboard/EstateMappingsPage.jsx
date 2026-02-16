import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateMappings } from "../../services/estateService";

export default function EstateMappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getEstateMappings();
        if (!mounted) return;
        setMappings(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load mappings");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Door Mappings">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Manage Door Mappings</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
      </section>
      <section className="mt-4 space-y-3">
        {mappings.map((home) => (
          <article key={home.homeId} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold">{home.homeName}</h3>
                <p className="text-xs text-slate-500">
                  {home.homeownerName} | {home.homeownerEmail}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">
                {home.doors?.length ?? 0} doors
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(home.doors ?? []).map((door) => (
                <div key={door.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm font-semibold">{door.name}</p>
                  <p className="mt-1 text-xs text-slate-500">QR: {(door.qr ?? []).join(", ") || "None"}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
        {mappings.length === 0 ? <p className="text-sm text-slate-500">No mappings created yet.</p> : null}
      </section>
    </AppShell>
  );
}
