import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateAccessLogs } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";
import { showError } from "../../utils/flash";

export default function EstateLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstateAccessLogs();
        if (!mounted) return;
        setLogs(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load access logs");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  return (
    <AppShell title="Access Logs">
      <div className="mx-auto max-w-7xl space-y-6">

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{ color: "white" }} className="text-2xl font-bold tracking-tight">Access Logs</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Track visitor activity and access outcomes across all properties.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="space-y-3">
          {loading ? <PageSkeleton blocks={4} /> : null}
          {!loading && logs.map((log) => (
            <article key={log.id} className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{log.visitor}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase dark:bg-slate-800">{log.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {log.doorName} | {log.homeName}
              </p>
              <p className="mt-1 text-xs text-slate-500">Started: {new Date(log.startedAt).toLocaleString()}</p>
            </article>
          ))}
          {!loading && logs.length === 0 ? <p className="text-sm text-slate-500">No access logs yet.</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
