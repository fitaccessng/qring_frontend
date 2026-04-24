import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  MapPin,
  ArrowRight,
  Building2,
  Plus,
  Copy,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Layers,
  LayoutGrid,
  History,
  CalendarDays,
  User,
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
import useResponsiveSheet from "../../hooks/useResponsiveSheet";

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
    setQrBusyEstateId(estate.id);
    try {
      await createEstateSharedQr(estate.id);
      const rows = await listEstateSharedQrs(estate.id);
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
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-36">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-indigo-600 rounded-full hover:bg-indigo-50 transition-all active:scale-90">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-black text-lg text-slate-900 leading-none tracking-tight">Manage Estates</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Portfolio Control</p>
            </div>
          </div>
          <button className="relative p-2.5 bg-slate-50 text-slate-500 rounded-full">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* STATS BENTO */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
              <Layers size={22} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Estates</p>
            <h4 className="text-3xl font-black text-slate-900">{stats.totalEstates}</h4>
            <Layers className="absolute -right-4 -bottom-4 opacity-[0.03] text-indigo-900" size={100} />
          </div>

          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200 relative overflow-hidden group">
            <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-400 mb-4">
              <QrCode size={22} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active QRs</p>
            <h4 className="text-3xl font-black text-white">{stats.activeQrs}</h4>
            <QrCode className="absolute -right-4 -bottom-4 opacity-10 text-white" size={100} />
          </div>
        </div>

        <div className="mb-10 rounded-[2.2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Plan Guardrail</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Estate portfolio capacity</h3>
              <p className="mt-1 text-sm text-slate-500">
                {maxEstates
                  ? `You are using ${usedEstates} of ${maxEstates} estate slot${maxEstates === 1 ? "" : "s"} on your current plan.`
                  : "Your current plan supports multiple estates without a hard estate-count limit."}
              </p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-50 px-4 py-3 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Homes</p>
              <p className="mt-1 text-lg font-black text-slate-900">{stats.totalHomes}</p>
            </div>
          </div>
          {!canCreateEstate ? (
            <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Your current plan has reached its estate limit. Upgrade before adding another estate profile.
            </div>
          ) : null}
        </div>

        {/* ESTATE LIST */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2 mb-2">
            <h4 className="font-black text-sm text-slate-400 uppercase tracking-widest tracking-[0.2em]">Your Property Network</h4>
          </div>

          {estatesWithQr.map((estate) => (
            <article key={estate.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1 w-fit">
                    <CheckCircle2 size={10} /> Active Profile
                  </span>
                  <h3 className="mt-3 text-xl font-black text-slate-900 truncate tracking-tight">{estate.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {estate.id}</p>
                </div>
                <button
                  onClick={() => handleGenerateSharedQr(estate)}
                  disabled={qrBusyEstateId === estate.id}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {qrBusyEstateId === estate.id ? "..." : estate.sharedQr ? "Regenerate" : "Generate QR"}
                </button>
              </div>

              {estate.sharedQr ? (
                <div className="mt-6 p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <QrCode size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Access Key</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{estate.sharedQr.qrId}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveQrData({ ...estate.sharedQr, estateName: estate.name });
                        setIsQrModalOpen(true);
                      }}
                      className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 transition-all active:scale-90"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => copyText(toPublicUrl(estate.sharedQr.scanUrl))}
                      className="p-3 bg-white text-slate-400 rounded-xl shadow-sm hover:text-indigo-600 transition-all active:scale-90"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex items-center gap-3 py-3 px-4 border border-dashed border-slate-200 rounded-2xl">
                  <MapPin size={14} className="text-slate-300" />
                  <p className="text-[11px] font-bold text-slate-400 italic">Generate a QR to enable digital security access.</p>
                </div>
              )}
            </article>
          ))}

          {estatesWithQr.length === 0 && (
             <div className="py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <Building2 className="mx-auto h-12 w-12 text-slate-200 mb-2" />
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Estates Registered</p>
             </div>
          )}
        </div>
      </main>

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsFormOpen(true)}
        disabled={!canCreateEstate}
        className="fixed bottom-28 right-6 z-[100] w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-300 active:scale-90 hover:bg-indigo-700 transition-all"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* QR VIEW MODAL (PRINT & DOWNLOAD) */}
      {isQrModalOpen && activeQrData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-in fade-in" onClick={() => setIsQrModalOpen(false)} />

          <div className="relative bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">

            <div className="px-8 pt-8 pb-4 flex justify-between items-center">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">Master Key Live</h3>
               </div>
               <button onClick={() => setIsQrModalOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all">
                 <X size={20} />
               </button>
            </div>

            <div className="px-10 pb-10 text-center">
               <div className="inline-block p-6 bg-white rounded-[3rem] mb-6 border-4 border-slate-50 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                 <img
                    id="active-qr-img"
                    src={buildQrImageUrl(toPublicUrl(activeQrData.scanUrl))}
                    alt="Estate QR"
                    className="w-56 h-56"
                 />
               </div>

               <h4 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">{activeQrData.estateName}</h4>
               <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-8 bg-indigo-50 inline-block px-4 py-1.5 rounded-full">
                 {activeQrData.qrId}
               </p>

               <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={handlePrintQR}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    <Printer size={16} /> Print Key
                  </button>
                  <button
                    onClick={() => handleDownloadQR(activeQrData.estateName)}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                  >
                    <Download size={16} /> Save Image
                  </button>
               </div>

               <button
                  onClick={() => copyText(toPublicUrl(activeQrData.scanUrl))}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
               >
                 <Copy size={18} /> Copy Access Link
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for printing */}
      <iframe id="ifmcontentstoprint" title="print-frame" style={{ height: '0px', width: '0px', position: 'absolute' }}></iframe>

      {/* REGISTER ESTATE SHEET */}
      <EstateCreationSheet open={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <form className="space-y-8" onSubmit={onSubmit}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Identity</p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Create Estate Profile</h3>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Name of Estate</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sapphire Gardens"
              className="w-full px-6 py-5 rounded-[2rem] bg-slate-50 border-none focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold text-slate-900"
              required
            />
          </div>
          <button type="submit" disabled={busy} className="w-full py-5 bg-indigo-600 text-white font-black text-lg rounded-[2.5rem] shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all">
            {busy ? "Syncing..." : "Launch Portfolio"} <ArrowRight size={20} />
          </button>
          {!canCreateEstate ? (
            <p className="text-center text-sm font-semibold text-amber-700">
              Estate limit reached on this plan.
            </p>
          ) : remainingEstates !== null ? (
            <p className="text-center text-sm text-slate-500">
              {remainingEstates} estate slot{remainingEstates === 1 ? "" : "s"} remaining.
            </p>
          ) : null}
        </form>
      </EstateCreationSheet>


    </div>
  );
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] transition-all ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-400'}`}>
      <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">{label}</span>
    </Link>
  );
}

function EstateCreationSheet({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end md:items-center md:justify-center">
      {/* Overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        aria-label="Close estate registration"
      />

      {/* SHEET */}
      <div className="
        relative flex w-full flex-col bg-white
        rounded-t-[2rem] md:rounded-[2rem]
        shadow-[0_-18px_40px_rgba(15,23,42,0.16)]
        md:max-w-xl
        h-[85dvh] md:h-auto md:max-h-[80dvh]
        overflow-hidden
      ">

        {/* HEADER (fixed, not draggable) */}
        <div className="shrink-0 flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600">
              Portfolio Control
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Register Estate
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Add a new managed estate profile and unlock its shared QR flow.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-50 p-3 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* SCROLL AREA (ONLY SCROLL CONTAINER) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* safe area */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </div>
    </div>
  );
}

