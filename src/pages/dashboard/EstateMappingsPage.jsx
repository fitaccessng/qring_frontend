import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateMappings } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";

export default function EstateMappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstateMappings();
        if (!mounted) return;
        setMappings(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load mappings");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Door Mappings">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Manage Door Mappings</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Review how homes and doors are mapped across your estate.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="space-y-3">
          {loading ? <PageSkeleton blocks={3} /> : null}
          {!loading && mappings.map((home) => (
            <article key={home.homeId} className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
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
                  <div key={door.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                    <p className="text-sm font-semibold">{door.name}</p>
                    <p className="mt-1 text-xs text-slate-500">QR: {(door.qr ?? []).join(", ") || "None"}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!loading && mappings.length === 0 ? <p className="text-sm text-slate-500">No mappings created yet.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}

