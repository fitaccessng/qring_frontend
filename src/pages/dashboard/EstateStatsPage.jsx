import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateAccessLogs, getEstateOverview } from "../../services/estateService";

export default function EstateStatsPage() {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [overviewData, logRows] = await Promise.all([
          getEstateOverview(),
          getEstateAccessLogs()
        ]);
        if (!active) return;
        setOverview(overviewData);
        setLogs(logRows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load stats");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalVisits = logs.length;
    const approved = logs.filter((row) => String(row.status || "").toLowerCase().includes("approved")).length;
    const rejected = logs.filter((row) => String(row.status || "").toLowerCase().includes("rejected")).length;
    const activeHomes = overview?.homes?.length ?? 0;
    const activeDoors = overview?.doors?.length ?? 0;
    const residents = overview?.homeowners?.length ?? 0;
    return { totalVisits, approved, rejected, activeHomes, activeDoors, residents };
  }, [logs, overview]);

  return (
    <AppShell title="Visitor Statistics">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Total visits" value={stats.totalVisits} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Rejected" value={stats.rejected} />
          <StatCard label="Homes" value={stats.activeHomes} />
          <StatCard label="Doors" value={stats.activeDoors} />
          <StatCard label="Residents" value={stats.residents} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent visitor activity</h3>
          {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          {!loading && logs.length === 0 ? <p className="mt-3 text-sm text-slate-500">No visits logged yet.</p> : null}
          <div className="mt-3 space-y-2">
            {logs.slice(0, 12).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{row.visitor || "Visitor"}</p>
                  <p className="text-[11px] text-slate-500">{row.homeName} · {row.doorName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide">{row.status}</p>
                  <p className="text-[10px] text-slate-400">{row.startedAt ? new Date(row.startedAt).toLocaleString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
