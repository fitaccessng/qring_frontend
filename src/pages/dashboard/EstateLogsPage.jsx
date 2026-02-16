import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateAccessLogs } from "../../services/estateService";

export default function EstateLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await getEstateAccessLogs();
        if (!mounted) return;
        setLogs(data);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError.message ?? "Failed to load access logs");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell title="Access Logs">
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">View Access Logs</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
      </section>
      <section className="mt-4 space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80">
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
        {logs.length === 0 ? <p className="text-sm text-slate-500">No access logs yet.</p> : null}
      </section>
    </AppShell>
  );
}
