import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { env } from "../../config/env";
import { createEstate, createEstateSharedQr, getEstateOverview, listEstateSharedQrs } from "../../services/estateService";

export default function EstateCreatePage() {
  const [name, setName] = useState("");
  const [estates, setEstates] = useState([]);
  const [estateQrByEstateId, setEstateQrByEstateId] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [qrBusyEstateId, setQrBusyEstateId] = useState("");

  async function load() {
    const data = await getEstateOverview();
    setEstates(Array.isArray(data?.estates) ? data.estates : []);
  }

  useEffect(() => {
    load().catch((requestError) => setError(requestError.message ?? "Failed to load estates"));
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSharedQrs() {
      if (estates.length === 0) return;
      try {
        const results = await Promise.all(
          estates.map(async (estate) => {
            const rows = await listEstateSharedQrs(estate.id);
            return [estate.id, rows];
          })
        );
        if (!active) return;
        setEstateQrByEstateId(Object.fromEntries(results));
      } catch {
        // Keep the page usable if this optional endpoint fails.
      }
    }
    loadSharedQrs();
    return () => {
      active = false;
    };
  }, [estates]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await createEstate({ name });
      setNotice(`Estate created: ${created?.name ?? name}`);
      if (created?.id) {
        setEstates((prev) => {
          const nextRow = {
            id: created.id,
            name: created.name ?? name,
            createdAt: new Date().toISOString()
          };
          return [nextRow, ...prev.filter((row) => row.id !== created.id)];
        });
      }
      setName("");
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create estate");
    } finally {
      setBusy(false);
    }
  }

  const estatesWithQr = useMemo(
    () =>
      estates.map((estate) => {
        const qrs = estateQrByEstateId[estate.id] ?? [];
        const activeQr = qrs.find((row) => row.active !== false) ?? null;
        return { ...estate, sharedQr: activeQr };
      }),
    [estates, estateQrByEstateId]
  );

  async function handleGenerateSharedQr(estateId) {
    setQrBusyEstateId(estateId);
    setError("");
    setNotice("");
    try {
      const created = await createEstateSharedQr(estateId);
      setNotice(`Estate QR created: ${created?.qrId ?? "ready"}`);
      const rows = await listEstateSharedQrs(estateId);
      setEstateQrByEstateId((prev) => ({ ...prev, [estateId]: rows }));
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create estate QR");
    } finally {
      setQrBusyEstateId("");
    }
  }

  return (
    <AppShell title="Create Estate">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/20 dark:bg-red-900/10 dark:text-red-400">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/20 dark:bg-emerald-900/10 dark:text-emerald-400">{notice}</div> : null}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white dark:bg-indigo-600">
          <div className="relative z-10">
            <h2 style={{color: "white"}} className="text-2xl font-bold tracking-tight">Create Estate</h2>
            <p className="mt-2 text-sm text-slate-200 dark:text-indigo-100">Launch a new estate profile and manage shared access from one place.</p>
          </div>
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Estate name"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none ring-brand-300 transition-all focus:ring-2 dark:border-slate-700 dark:bg-slate-800/70"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Creating..." : "Create"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white/95 p-5 shadow-[0_8px_30px_rgb(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Your Estates</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {estatesWithQr.map((estate) => (
            <article key={estate.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{estate.name}</p>
                  <p className="truncate text-xs text-slate-500">{estate.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateSharedQr(estate.id)}
                  disabled={qrBusyEstateId === estate.id}
                  className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {qrBusyEstateId === estate.id ? "Generating..." : estate.sharedQr ? "Regenerate QR" : "Generate QR"}
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estate QR (Shared)</p>
                {estate.sharedQr ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold">{estate.sharedQr.qrId}</p>
                    <p className="text-xs text-slate-500">Doors: {estate.sharedQr.doorCount ?? "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={estate.sharedQr.scanUrl}
                        className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700"
                      >
                        Open Scan Page
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(toPublicUrl(estate.sharedQr.scanUrl))}
                        className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold transition-all active:scale-95 dark:border-slate-700"
                      >
                        Copy Link
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      This QR is a selector QR: it can route visitors to any door in the estate.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Not generated yet. You need at least 1 home and 1 door in this estate before generating.
                  </p>
                )}
              </div>
            </article>
          ))}
          {estatesWithQr.length === 0 ? <p className="text-sm text-slate-500">No estates created yet.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function toPublicUrl(path) {
  const base = (env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    window.dispatchEvent(new CustomEvent("qring:toast", { detail: { message: "Copied" } }));
  } catch {
    // Ignore; clipboard may require HTTPS / user gesture on some browsers.
  }
}
