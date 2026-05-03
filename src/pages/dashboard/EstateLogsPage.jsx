import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateAccessLogs, getEstateAccessLogsSnapshot } from "../../services/estateService";
import PageSkeleton from "../../components/PageSkeleton";
import { showError } from "../../utils/flash";
import EstateManagerPageShell, {
  EstateBadge,
  EstateManagerSection,
  EstateMetricStrip
} from "../../components/mobile/EstateManagerPageShell";

export default function EstateLogsPage() {
  const [logs, setLogs] = useState(() => getEstateAccessLogsSnapshot() ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => !getEstateAccessLogsSnapshot());

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
      <EstateManagerPageShell
        eyebrow="Operations"
        title="Access Logs"
        description="Track visitor activity and access outcomes across all properties."
        stats={[{ label: "Entries", value: logs.length, helper: "Recent access records" }]}
      >
        <EstateMetricStrip
          items={[
            { label: "Entries", value: logs.length, helper: "Current feed" },
            { label: "Approved", value: logs.filter((log) => String(log.status || "").toLowerCase().includes("approved")).length, helper: "Successful access" }
          ]}
        />

        <EstateManagerSection title="Recent activity" subtitle="A stacked activity feed designed for quick mobile scanning.">
          {loading ? <PageSkeleton blocks={4} /> : null}
          {!loading &&
            logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,244,245,0.92))] p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <EstateBadge tone="slate">Activity</EstateBadge>
                    <p className="mt-3 font-heading text-xl font-extrabold tracking-tight text-slate-900">{log.visitor}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold uppercase">{log.status}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Door</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{log.doorName}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Home</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{log.homeName}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Started</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(log.startedAt).toLocaleString()}</p>
                  </div>
                </div>
              </article>
            ))}
          {!loading && logs.length === 0 ? <p className="text-sm text-slate-500">No access logs yet.</p> : null}
        </EstateManagerSection>
      </EstateManagerPageShell>
    </AppShell>
  );
}
