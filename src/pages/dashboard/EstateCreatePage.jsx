import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';

// Core State & Services
import { env } from "../../config/env";
import {
  createEstate,
  createEstateSharedQr,
  listEstateSharedQrs
} from "../../services/estateService";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { showError, showSuccess } from "../../utils/flash";

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
  const canCreateEstate = !maxEstates || usedEstates < maxEstates;
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
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = `${estateName.replace(/\s+/g, "-")}-Access-QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showSuccess("Image saved to gallery");
    };
  };

  const handlePrintQR = () => {
    const pri = document.getElementById("ifmcontentstoprint").contentWindow;
    pri.document.open();
    pri.document.write(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; text-align: center; }
            .card { border: 3px solid #00346f; padding: 50px; border-radius: 40px; max-width: 400px; }
            img { width: 300px; height: 300px; margin-bottom: 20px; }
            h1 { color: #00346f; margin: 10px 0; font-size: 28px; font-weight: 900; }
            p { color: #64748b; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
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
      showSuccess("Link copied to clipboard");
    } catch { showError("Copy failed"); }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Manage Estates</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Portfolio Control</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto space-y-4">
        
        {/* COMPACT STATISTICS STRIP (Preserves layout on small viewports) */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Layers size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Estates</p>
              <h4 className="text-lg font-black leading-none mt-0.5 text-slate-900 dark:text-white">{stats.totalEstates}</h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 w-9 h-9 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <QrCode size={16} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Active QRs</p>
              <h4 className="text-lg font-black leading-none mt-0.5 text-slate-900 dark:text-white">{stats.activeQrs}</h4>
            </div>
          </div>
        </section>

        {/* PLAN LIMITATION INFO BAR */}
        <section className="rounded-2xl border border-slate-100/50 dark:border-slate-800/40 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none">Plan Capacity</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">Property Slots</h3>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">Homes:</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">{stats.totalHomes}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {maxEstates
              ? `Using ${usedEstates} of ${maxEstates} estate slots on your current plan.`
              : "Standard multi-estate capabilities enabled without specific counts."}
          </p>
          {!canCreateEstate && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/55 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2 text-[11px] font-semibold text-amber-900 dark:text-amber-400">
              Plan limit reached. Upgrade to register additional estate profiles.
            </div>
          )}
        </section>

        {/* PROPERTY LIST */}
        <section className="space-y-3.5">
          <div className="px-1.5">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Your Property Network</h4>
          </div>

          {estatesWithQr.map((estate) => (
            <article key={estate.id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                    <CheckCircle2 size={10} /> Active Profile
                  </span>
                  <h3 className="mt-2 text-base font-black text-slate-900 dark:text-white truncate tracking-tight">{estate.name}</h3>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">ID: {estate.id}</p>
                </div>
                <button
                  onClick={() => handleGenerateSharedQr(estate)}
                  disabled={qrBusyEstateId === estate.id}
                  className="bg-slate-950 hover:bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-wide shrink-0 disabled:opacity-50 transition-all active:scale-95"
                >
                  {qrBusyEstateId === estate.id ? "..." : estate.sharedQr ? "Re-Gen" : "Generate"}
                </button>
              </div>

              {estate.sharedQr ? (
                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/20 rounded-2xl border border-slate-100/40 dark:border-slate-850 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                      <QrCode size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Access Key</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate">{estate.sharedQr.qrId}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setActiveQrData({ ...estate.sharedQr, estateName: estate.name });
                        setIsQrModalOpen(true);
                      }}
                      className="p-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm border border-slate-100/50 dark:border-slate-800 hover:bg-slate-50 transition-all"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={() => copyText(toPublicUrl(estate.sharedQr.scanUrl))}
                      className="p-2 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 rounded-xl shadow-sm border border-slate-100/50 dark:border-slate-800 hover:text-indigo-600 transition-all"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 py-2.5 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10">
                  <MapPin size={12} className="text-slate-300 shrink-0" />
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">Generate QR to assign modern entry codes.</p>
                </div>
              )}
            </article>
          ))}

          {estatesWithQr.length === 0 && (
             <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                <Building2 className="mx-auto h-10 w-10 text-slate-200 dark:text-slate-800 mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Estates Registered</p>
             </div>
          )}
        </section>
      </main>

      {/* COMPACT FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsFormOpen(true)}
        disabled={!canCreateEstate}
        className="fixed bottom-6 right-6 z-[100] w-14 h-14 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 active:scale-90 hover:bg-indigo-700 transition-all disabled:opacity-50"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* MOBILE-ERgonomic QR VIEW BOTTOM SHEET */}
      {isQrModalOpen && activeQrData && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsQrModalOpen(false)} />

          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pb-safe max-h-[92dvh]">
            {/* Grab handle indicator for mobile sheeting layout */}
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden" />
            
            <div className="px-6 pt-4 pb-2 flex justify-between items-center border-b border-slate-100/50 dark:border-slate-800/40">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-bold text-[9px] text-slate-400 uppercase tracking-widest">Master Key Live</h3>
               </div>
               <button onClick={() => setIsQrModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full hover:text-rose-500 transition-all">
                 <X size={16} />
               </button>
            </div>

            <div className="px-6 py-6 text-center overflow-y-auto">
               <div className="inline-block p-4 bg-white rounded-2xl mb-4 border border-slate-100 shadow-sm">
                 <img
                    id="active-qr-img"
                    src={buildQrImageUrl(toPublicUrl(activeQrData.scanUrl))}
                    alt="Estate QR"
                    className="w-44 h-44 mx-auto"
                 />
               </div>

               <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">{activeQrData.estateName}</h4>
               <p className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-6 bg-indigo-50/85 dark:bg-indigo-500/10 inline-block px-3 py-1 rounded-full">
                 {activeQrData.qrId}
               </p>

               <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    onClick={handlePrintQR}
                    className="flex items-center justify-center gap-1.5 py-3 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all"
                  >
                    <Printer size={14} /> Print Key
                  </button>
                  <button
                    onClick={() => handleDownloadQR(activeQrData.estateName)}
                    className="flex items-center justify-center gap-1.5 py-3 bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-all"
                  >
                    <Download size={14} /> Save Image
                  </button>
               </div>

               <button
                  onClick={() => copyText(toPublicUrl(activeQrData.scanUrl))}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
               >
                 <Copy size={14} /> Copy Access Link
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for printing */}
      <iframe id="ifmcontentstoprint" title="print-frame" style={{ height: '0px', width: '0px', position: 'absolute' }}></iframe>

      {/* BOTTOM DRAWER ESTATED SHEET */}
      <EstateCreationSheet open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Step 1: Identity</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">Create Estate Profile</h3>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 ml-0.5">Name of Estate</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sapphire Gardens"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all text-xs font-semibold text-slate-900 dark:text-slate-150"
              required
            />
          </div>
          <button type="submit" disabled={busy} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all">
            {busy ? "Syncing..." : "Launch Portfolio"} <ArrowRight size={14} />
          </button>
          {!canCreateEstate ? (
            <p className="text-center text-xs font-semibold text-amber-700">
              Estate limit reached on this plan.
            </p>
          ) : remainingEstates !== null ? (
            <p className="text-center text-[10px] text-slate-400 font-medium">
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
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close estate registration"
      />

      {/* SHEET */}
      <div className="
        relative flex w-full flex-col bg-white dark:bg-slate-900
        rounded-t-[2rem] sm:rounded-[2rem]
        shadow-2xl
        sm:max-w-md
        max-h-[85dvh] sm:max-h-[80dvh]
        overflow-hidden pb-safe
      ">
        {/* Grab handle indicator for mobile sheet style */}
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden shrink-0" />

        {/* HEADER */}
        <div className="shrink-0 flex items-start justify-between border-b border-slate-100/50 dark:border-slate-800/40 px-5 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Portfolio Control
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              Register Estate
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a new managed estate profile to trigger entry access codes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* SCROLLABLE INTERNALS */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}