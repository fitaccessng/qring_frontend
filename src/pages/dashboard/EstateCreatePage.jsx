import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Bell,
  MapPin,
  ArrowRight,
  Building2,
  Plus,
  Copy,
  ExternalLink,
  QrCode,
  Layers,
  Printer,
  Download,
  CheckCircle2,
  X
} from "lucide-react";

// Core State & Services
import { env } from "../../config/env";
import {
  createEstate,
  createEstateSharedQr,
  listEstateSharedQrs
} from "../../services/estateService";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { showError, showSuccess } from "../../utils/flash";
import useSubscription from "../../hooks/useSubscription";

export default function EstateCreatePage() {
  const navigate = useNavigate();

  // -- Logic State --
  const [name, setName] = useState("");
  const [estateQrByEstateId, setEstateQrByEstateId] = useState({});
  const { overview, setOverview, error, setError, refresh } = useEstateOverviewState();
  const [busy, setBusy] = useState(false);
  const [qrBusyEstateId, setQrBusyEstateId] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Modal State for showing/printing the QR
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [activeQrData, setActiveQrData] = useState(null);

  const estates = useMemo(() => (Array.isArray(overview?.estates) ? overview.estates : []), [overview]);
  const planRestrictions = overview?.planRestrictions ?? {};
  const maxEstates = Number(planRestrictions.maxEstates ?? 0);
  const usedEstates = Number(planRestrictions.usedEstates ?? estates.length ?? 0);
  const { resolveLimit } = useSubscription();
  const limitState = resolveLimit({ maxCount: maxEstates, usedCount: usedEstates });
  const canCreateEstate = limitState.canAdd;
  const remainingEstates = maxEstates > 0 ? Math.max(maxEstates - usedEstates, 0) : null;

  // -- Computed Stats --
  const stats = useMemo(() => {
    const totalEstates = estates.length;
    const totalHomes = Number(overview?.homes?.length ?? 0);
    const activeQrs = Object.values(estateQrByEstateId).flat().filter(qr => qr.active !== false).length;
    return { totalEstates, totalHomes, activeQrs };
  }, [estates, estateQrByEstateId, overview]);

  const estatesWithQr = useMemo(
    () => estates.map((estate) => ({
      ...estate,
      sharedQr: (estateQrByEstateId?.[estate.id] ?? []).find((row) => row.active !== false) ?? null
    })),
    [estates, estateQrByEstateId]
  );

  // -- Effects --
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

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
      } catch { /* Silent fail */ }
    }
    loadSharedQrs();
    return () => { active = false; };
  }, [estates]);

  // -- Handlers --
  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await createEstate({ name });
      showSuccess(`Estate created: ${created?.name ?? name}`);
      setName("");
      setIsFormOpen(false);
      await refresh().catch(() => {});
    } catch (requestError) {
      showError(requestError.message ?? "Failed to create estate");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateSharedQr(estate) {
    if (qrBusyEstateId) return;
    setQrBusyEstateId(estate.id);
    try {
      await createEstateSharedQr(estate.id);
      const rows = await listEstateSharedQrs(estate.id, { force: true });
      setEstateQrByEstateId((prev) => ({ ...prev, [estate.id]: rows }));

      const newQr = rows.find(r => r.active !== false);
      if (newQr) {
        setActiveQrData({ ...newQr, estateName: estate.name });
        setIsQrModalOpen(true);
      }
      showSuccess(`Estate QR generated`);
    } catch (requestError) {
      showError(requestError.message ?? "Failed to create estate QR");
    } finally {
      setQrBusyEstateId("");
    }
  }

  // -- Print & Download Logic --
  const handleDownloadQR = (estateName) => {
    const qrImage = document.getElementById("active-qr-img");
    if (!qrImage) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = qrImage.src;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `${estateName.replace(/\s+/g, "-")}-Access-QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showSuccess("Image saved to gallery");
    };
  };

  const handlePrintQR = () => {
    const frame = document.getElementById("ifmcontentstoprint");
    const pri = frame?.contentWindow;
    if (!pri || !activeQrData) return;
    pri.document.open();
    pri.document.write(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; text-align: center; }
            .card { border: 3px solid #00346f; padding: 40px; border-radius: 30px; max-width: 380px; }
            img { width: 280px; height: 280px; margin-bottom: 20px; }
            h1 { color: #00346f; margin: 10px 0; font-size: 26px; font-weight: 900; }
            p { color: #64748b; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="card">
            <img src="${buildQrImageUrl(toPublicUrl(activeQrData.scanUrl), 600)}" />
            <h1>${activeQrData.estateName}</h1>
            <p>Master Entry QR: ${activeQrData.qrId}</p>
          </div>
        </body>
      </html>
    `);
    pri.document.close();
    pri.focus();
    pri.print();
  };

  const buildQrImageUrl = (value, size = 300) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  };

  const toPublicUrl = (path) => {
    const base = (env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
    if (!path || /^https?:\/\//i.test(path)) return path || base;
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      showSuccess("Link copied");
    } catch { showError("Copy failed"); }
  };

  return (
    <div className="bg-slate-50/80 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
      {/* MOBILE-FIRST HEADER BAR */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-800 safe-top">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate(-1)} 
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
              aria-label="Go Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight dark:text-white leading-tight">Manage Estates</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Property Portfolio</p>
            </div>
          </div>

          <Link
            to="/dashboard/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80 text-slate-700 dark:bg-slate-900 dark:text-slate-300 hover:bg-slate-200 transition-all active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mt-4 px-4 sm:px-6 max-w-7xl mx-auto space-y-4">
        
        {/* STATS & PLAN CAPACITY GRID */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 h-10 w-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Estates</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{stats.totalEstates}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 h-10 w-10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <QrCode size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active QRs</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">{stats.activeQrs}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Status</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                {maxEstates ? `${usedEstates} / ${maxEstates} Slots Used` : "Unlimited Plan"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-700 dark:text-slate-300">
              {stats.totalHomes} Homes
            </div>
          </div>
        </section>

        {!canCreateEstate && !limitState.isTrialBypass && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-400 shadow-xs">
            Plan limit reached. Upgrade your subscription to add more estates.
          </div>
        )}

        {/* PROPERTY GRID */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Estate Directory</h2>
            <span className="text-xs font-bold text-slate-500">{estatesWithQr.length} Registered</span>
          </div>

          {estatesWithQr.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {estatesWithQr.map((estate) => (
                <article key={estate.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-slate-300">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold uppercase tracking-wider dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                          <CheckCircle2 size={10} /> Active
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white truncate">{estate.name}</h3>
                      </div>
                      <button
                        onClick={() => handleGenerateSharedQr(estate)}
                        disabled={qrBusyEstateId === estate.id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 disabled:opacity-50 transition-all active:scale-95 shadow-xs"
                      >
                        {qrBusyEstateId === estate.id ? "..." : estate.sharedQr ? "Re-Gen" : "Generate"}
                      </button>
                    </div>
                  </div>

                  {estate.sharedQr ? (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs shrink-0">
                          <QrCode size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Access Code</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{estate.sharedQr.qrId}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setActiveQrData({ ...estate.sharedQr, estateName: estate.name });
                            setIsQrModalOpen(true);
                          }}
                          className="p-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 active:scale-95 transition-all"
                          aria-label="View QR"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={() => copyText(toPublicUrl(estate.sharedQr.scanUrl))}
                          className="p-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:text-indigo-600 active:scale-95 transition-all"
                          aria-label="Copy Access Link"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-2 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tap generate to assign master QR.</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
             <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Building2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Estates Found</p>
             </div>
          )}
        </section>
      </main>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsFormOpen(true)}
        disabled={!canCreateEstate}
        className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-[#4955b3] text-white shadow-lg shadow-indigo-500/30 active:scale-90 hover:bg-indigo-700 transition-all disabled:opacity-50"
        aria-label="Add Estate"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* QR CODE BOTTOM SHEET / MODAL */}
      {isQrModalOpen && activeQrData && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsQrModalOpen(false)} />

          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col pb-safe max-h-[90dvh]">
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden shrink-0" />
            
            <div className="px-5 pt-3 pb-2 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Master Access Code</h3>
               </div>
               <button onClick={() => setIsQrModalOpen(false)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full hover:text-rose-500 transition-all">
                 <X size={16} />
               </button>
            </div>

            <div className="p-6 text-center overflow-y-auto">
               <div className="inline-block p-3 bg-white rounded-2xl mb-4 border border-slate-200 shadow-xs">
                 <img
                    id="active-qr-img"
                    src={buildQrImageUrl(toPublicUrl(activeQrData.scanUrl))}
                    alt="Estate QR"
                    className="w-48 h-48 mx-auto"
                 />
               </div>

               <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">{activeQrData.estateName}</h4>
               <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6 bg-indigo-50 dark:bg-indigo-500/10 inline-block px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                 {activeQrData.qrId}
               </span>

               <div className="grid grid-cols-2 gap-2.5 mb-3 mt-4">
                  <button
                    onClick={handlePrintQR}
                    className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <Printer size={15} /> Print Code
                  </button>
                  <button
                    onClick={() => handleDownloadQR(activeQrData.estateName)}
                    className="flex items-center justify-center gap-1.5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <Download size={15} /> Save Image
                  </button>
               </div>

               <button
                  onClick={() => copyText(toPublicUrl(activeQrData.scanUrl))}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                 <Copy size={15} /> Copy Public Link
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for printing */}
      <iframe id="ifmcontentstoprint" title="print-frame" style={{ height: '0px', width: '0px', position: 'absolute' }}></iframe>

      {/* BOTTOM DRAWER ESTATE CREATION SHEET */}
      <EstateCreationSheet open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Create Estate Profile</h3>
              <p className="text-xs text-slate-400 font-medium">Add a new property to your management network</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Estate Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Palm Estate"
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-sm font-semibold text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <button type="submit" disabled={busy} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
            {busy ? "Creating..." : "Save & Launch Estate"} <ArrowRight size={15} />
          </button>

          {!canCreateEstate ? (
            <p className="text-center text-xs font-bold text-amber-600">
              Limit reached for current plan.
            </p>
          ) : remainingEstates !== null ? (
            <p className="text-center text-xs text-slate-400 font-medium">
              {remainingEstates} estate slot{remainingEstates === 1 ? "" : "s"} remaining.
            </p>
          ) : null}
        </form>
      </EstateCreationSheet>
    </div>
  );
}

function EstateCreationSheet({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close form"
      />

      <div className="
        relative flex w-full flex-col bg-white dark:bg-slate-900
        rounded-t-3xl sm:rounded-3xl
        shadow-2xl
        sm:max-w-md
        max-h-[85dvh] sm:max-h-[80dvh]
        overflow-hidden pb-safe
      ">
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden shrink-0" />

        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              New Estate
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Register property to generate entry codes
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 dark:bg-slate-800 p-2 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}