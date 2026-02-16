import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { apiRequest, ApiError } from "../../services/apiClient";

export default function AdminConfigPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const resp = await apiRequest("/admin/config");
        if (!active) return;
        setData(resp?.data ?? null);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Admin config endpoint not found (404). Restart backend so /api/v1/admin/config is available.");
        } else {
          setError(err.message ?? "Failed to load config");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell title="Admin Config">
      {error ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Runtime Config</h2>
        <p className="mt-1 text-sm text-slate-500">Read-only status of backend configuration.</p>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading...</p>
        ) : !data ? (
          <p className="mt-3 text-sm text-slate-500">No data.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ConfigRow label="Environment" value={String(data.environment)} />
            <ConfigRow label="Debug" value={data.debug ? "true" : "false"} />
            <ConfigRow label="Paystack Configured" value={data.paystackConfigured ? "true" : "false"} />
            <ConfigRow label="VAPID Configured" value={data.vapidConfigured ? "true" : "false"} />
            <ConfigRow label="Admin Signup Key Set" value={data.adminSignupKeySet ? "true" : "false"} />
            <ConfigRow label="Frontend Base URL" value={String(data.frontendBaseUrl)} mono />
          </div>
        )}
      </section>
    </AppShell>
  );
}

function ConfigRow({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

