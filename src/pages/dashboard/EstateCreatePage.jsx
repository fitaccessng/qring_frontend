import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
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
      setName("");
      await load();
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
      {error ? <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div> : null}
      <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Create Estate</h2>
        <p className="mt-1 text-sm text-slate-500">Built for multi-home estates with central control and audit-ready workflows.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Estate name"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-brand-300 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
        <h2 className="font-heading text-lg font-bold sm:text-xl">Your Estates</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {estatesWithQr.map((estate) => (
            <article key={estate.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{estate.name}</p>
                  <p className="truncate text-xs text-slate-500">{estate.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleGenerateSharedQr(estate.id)}
                  disabled={qrBusyEstateId === estate.id}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                >
                  {qrBusyEstateId === estate.id ? "Generating..." : estate.sharedQr ? "Regenerate QR" : "Generate QR"}
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estate QR (Shared)</p>
                {estate.sharedQr ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold">{estate.sharedQr.qrId}</p>
                    <p className="text-xs text-slate-500">Doors: {estate.sharedQr.doorCount ?? "-"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={estate.sharedQr.scanUrl}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
                      >
                        Open Scan Page
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(`${window.location.origin}${estate.sharedQr.scanUrl}`)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
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
    </AppShell>
  );
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    window.dispatchEvent(new CustomEvent("qring:toast", { detail: { message: "Copied" } }));
  } catch {
    // Ignore; clipboard may require HTTPS / user gesture on some browsers.
  }
}
