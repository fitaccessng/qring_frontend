import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Bell, PlusCircle, Hash, UserSearch, ChevronDown,
  Save, FileUp, CheckCircle2, Lightbulb, LayoutDashboard,
  Wallet, Users, Settings, Home, HomeIcon, X, Check
} from 'lucide-react';

// Service & Hook Imports
import { addEstateHome } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import PageSkeleton from "../../components/PageSkeleton";

const EstateHomesPage = () => {
  const navigate = useNavigate();
  const { overview, setOverview, estateId, loading, error, setError } = useEstateOverviewState();

  const [form, setForm] = useState({ estateId: "", name: "", homeownerId: "" });
  const [busy, setBusy] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const planRestrictions = overview?.planRestrictions ?? {};

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    if (!form.estateId && (estateId || overview?.estates?.length)) {
      setForm((prev) => ({ ...prev, estateId: prev.estateId || estateId || overview?.estates?.[0]?.id || "" }));
    }
  }, [estateId, overview]);

  // Handle background scroll lock
  useEffect(() => {
    document.body.style.overflow = isSheetOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSheetOpen]);

  // Derived Stats
  const homes = overview?.homes ?? [];
  const maxHomes = Number(planRestrictions.maxHomes ?? 0);
  const usedHomes = Number(planRestrictions.usedHomes ?? homes.length ?? 0);
  const canAddHome = !maxHomes || usedHomes < maxHomes;
  const homeStats = {
    total: homes.length,
    occupancy: homes.length > 0 ? Math.round((homes.filter((home) => home.homeownerId).length / homes.length) * 100) : 0
  };

  const selectedHomeowner = useMemo(() =>
    (overview?.homeowners ?? []).find(h => String(h.id) === String(form.homeownerId)),
    [overview, form.homeownerId]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canAddHome) return showError("Home limit reached for your current estate plan.");
    if (!form.homeownerId) return showError("Please select a homeowner");
    setBusy(true);
    try {
      const created = await addEstateHome(form);
      showSuccess("Home added successfully.");
      if (created?.id) {
        setOverview((prev) => {
          if (!prev) return prev;
          const homeowner = (prev.homeowners ?? []).find((row) => String(row.id) === String(form.homeownerId));
          return {
            ...prev,
            homes: [{
              id: created.id,
              name: created.name ?? form.name,
              estateId: form.estateId,
              homeownerId: form.homeownerId,
              homeownerName: homeowner?.fullName || "",
              homeownerEmail: homeowner?.email || ""
            }, ...(prev.homes ?? [])]
          };
        });
      }
      setForm((prev) => ({ ...prev, name: "" }));
    } catch (err) {
      showError(err.message ?? "Failed to add home");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-32 overflow-x-hidden">

      {/* Header */}
      <header className="fixed top-0 w-full z-[60] bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-lg">Homes</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <Bell size={22} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="pt-24 px-5 max-w-5xl mx-auto space-y-8">

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-[#4955b3] text-white p-8 shadow-xl shadow-indigo-100">
          <div className="relative z-10 flex flex-col gap-4">
            <span className="bg-white/10 text-white text-[10px] uppercase tracking-[0.2em] font-black px-3 py-1 rounded-full w-fit">Estate Support</span>
            <h2 className="text-3xl font-black leading-tight">Property Management</h2>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/5 w-fit">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#4955b3]">
                 <Home size={20} strokeWidth={3} />
               </div>
               <div>
                 <p className="text-[10px] uppercase font-black opacity-70 tracking-tighter">Total Homes</p>
                 <p className="text-xl font-black">{homeStats.total} Units</p>
               </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Estate Structure</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Homes and mappings stay in one flow</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Register units here, then review the full home-to-door relationship from the mappings page. This keeps homes as the source of truth instead of duplicating setup across pages.
              </p>
            </div>
            <Link to="/dashboard/estate/mappings" className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-100">
              Open Mappings
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Homes</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{usedHomes}{maxHomes ? ` / ${maxHomes}` : ""}</p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Occupancy</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{homeStats.occupancy}%</p>
            </div>
            <div className="rounded-[1.4rem] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Remaining</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{maxHomes ? Math.max(maxHomes - usedHomes, 0) : "∞"}</p>
            </div>
          </div>
          {!canAddHome ? (
            <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Your current estate plan has reached its home limit. Upgrade before adding another unit.
            </div>
          ) : null}
        </section>

        {/* Empty State Warning */}
        {!loading && (overview?.homeowners?.length ?? 0) === 0 && (
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-[2rem] text-amber-800 text-sm font-bold flex items-center gap-3">
            <Lightbulb className="text-amber-500" />
            <span>You need at least one homeowner. <Link to="/dashboard/estate/invites" className="underline decoration-2">Invite Residents</Link></span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <h3 className="text-xl font-black text-[#2b3437] mb-8 flex items-center gap-3">
                <PlusCircle className="text-indigo-100" /> Register Home
              </h3>

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Property Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm(p => ({...p, name: e.target.value}))}
                    placeholder="e.g. Block B, Penthouse"
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 font-bold text-sm focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Homeowner</label>
                  <button
                    type="button"
                    onClick={() => setIsSheetOpen(true)}
                    className="w-full bg-slate-50 rounded-2xl py-4 px-4 flex items-center justify-between active:scale-[0.98] transition-all"
                  >
                    <span className={`text-sm font-bold truncate ${selectedHomeowner ? 'text-[#2b3437]' : 'text-slate-400'}`}>
                      {selectedHomeowner ? selectedHomeowner.fullName : "Choose Resident..."}
                    </span>
                    <ChevronDown size={18} className="text-slate-300" />
                  </button>
                </div>

                <button
                  disabled={busy || (overview?.homeowners?.length ?? 0) === 0 || !canAddHome}
                  className="w-full py-5 bg-[#4955b3] text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Add Home"}
                </button>
              </form>
            </div>
          </div>

          {/* List Column */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-6">Recently Added</h4>
              <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
                {overview?.homes?.map((home) => (
                  <div key={home.id} className="bg-slate-50/50 p-4 rounded-2xl flex items-center justify-between transition-all">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#4955b3] shadow-sm">
                        <HomeIcon size={18} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-[#2b3437] truncate">{home.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                          {home.homeownerName || "Unassigned"}
                        </p>
                      </div>
                    </div>
                    {home.homeownerName && <CheckCircle2 size={16} className="text-emerald-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM SHEET */}
      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white rounded-t-[2.5rem] w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex-shrink-0 pt-4 px-6 pb-2">
                <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6" />
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xl font-black text-[#2b3437]">Assign Resident</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Ownership</p>
                  </div>
                  <button onClick={() => setIsSheetOpen(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl active:scale-90 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-12 custom-scrollbar">
                <div className="space-y-3">
                  {(overview?.homeowners ?? []).map((h) => {
                    const isSelected = String(h.id) === String(form.homeownerId);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setForm(p => ({ ...p, homeownerId: h.id }));
                          setIsSheetOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${
                          isSelected ? 'bg-indigo-50 border-2 border-[#4955b3]' : 'bg-[#f8f9fa] border-2 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-left overflow-hidden mr-4">
                          <p className={`font-black text-base truncate ${isSelected ? 'text-[#4955b3]' : 'text-[#2b3437]'}`}>
                            {h.fullName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                            {h.email}
                          </p>
                        </div>
                        {isSelected && <Check size={20} className="text-[#4955b3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation */}

    </div>
  );
};

export default EstateHomesPage;
