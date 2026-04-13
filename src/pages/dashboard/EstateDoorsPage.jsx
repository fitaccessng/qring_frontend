import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  DoorOpen,
  QrCode,
  Plus,
  ChevronRight,
  GitBranch,
  ShieldCheck,
  Settings,
  ChevronDown,
  Check,
  X
} from 'lucide-react';

// Service & Utility Imports
import { addEstateDoor } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

const EstateDoorsPage = () => {
  const navigate = useNavigate();
  const { overview, estateId, error, refresh } = useEstateOverviewState();

  const [busy, setBusy] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [form, setForm] = useState({
    estateId: estateId || "",
    homeownerId: "",
    name: ""
  });
  const planRestrictions = overview?.planRestrictions ?? {};

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isSheetOpen]);

  useEffect(() => {
    if (estateId && !form.estateId) {
      setForm((prev) => ({ ...prev, estateId }));
    }
  }, [estateId, form.estateId]);

  useEffect(() => { if (error) showError(error); }, [error]);

  const homesByEstate = useMemo(
    () => (overview?.homes ?? []).filter((home) => !form.estateId || home.estateId === form.estateId),
    [overview, form.estateId]
  );

  const homeownerOptions = useMemo(() => {
    const byHomeowner = new Map();
    homesByEstate.forEach((home) => {
      if (!home?.homeownerId) return;
      if (!byHomeowner.has(home.homeownerId)) {
        byHomeowner.set(home.homeownerId, {
          homeownerId: home.homeownerId,
          homeownerName: home.homeownerName || "Homeowner",
          homeName: home.name || "Home",
          homeId: home.id,
        });
      }
    });
    return Array.from(byHomeowner.values());
  }, [homesByEstate]);

  const doors = useMemo(() => overview?.doors ?? [], [overview]);
  const maxDoors = Number(planRestrictions.maxDoors ?? 0);
  const usedDoors = Number(planRestrictions.usedDoors ?? doors.length ?? 0);
  const canAddDoor = !maxDoors || usedDoors < maxDoors;

  const selectedResident = useMemo(() =>
    homeownerOptions.find(opt => opt.homeownerId === form.homeownerId),
    [homeownerOptions, form.homeownerId]
  );

  async function onSubmit(event) {
    event.preventDefault();
    if (!canAddDoor) {
      showError("Door limit reached for your current estate plan.");
      return;
    }
    if (!form.homeownerId || !form.name) {
        showError("Please select a resident and name the door.");
        return;
    }
    setBusy(true);
    try {
      const selectedHomeowner = homeownerOptions.find((row) => row.homeownerId === form.homeownerId);
      await addEstateDoor({
        estateId: form.estateId,
        homeId: selectedHomeowner.homeId,
        name: form.name,
        generateQr: true,
        mode: "direct",
        plan: "single"
      });
      showSuccess("Door created successfully.");
      setForm((prev) => ({ ...prev, name: "", homeownerId: "" }));
      await refresh();
    } catch (requestError) {
      showError(requestError.message ?? "Failed to create door");
    } finally {
      setBusy(false);
    }
  }

  const inputBaseClass = "w-full bg-[#f1f3f5] border-2 border-transparent focus:border-[#4955b3] focus:bg-white rounded-2xl px-4 py-4 text-[16px] font-bold text-[#2b3437] transition-all outline-none placeholder:text-slate-400 min-h-[58px]";

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans pb-32 overflow-x-hidden">

      {/* Top Nav */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl flex items-center justify-between px-4 h-16 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-xl">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-sm font-black tracking-widest uppercase">Estate Doors</h1>
        <div className="relative">
          <button className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-xl">
            <Bell size={22} />
          </button>
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        </div>
      </header>

      <main className="pt-20 px-4 max-w-md mx-auto">
        <section className="mb-6">
          <span className="text-[#4955b3] font-black tracking-widest uppercase text-[10px] mb-1 block">Access Management</span>
          <h2 className="text-3xl font-black text-[#2b3437] leading-tight">Digital Perimeter</h2>
          <p className="text-slate-500 font-medium text-base mt-1">Setup door access for your residents.</p>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Structure Sync</p>
              <h3 className="mt-2 text-lg font-black text-[#2b3437]">Doors now follow your mapped homes</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a resident-linked home first, then add the access point. Review the full relationship on the mappings page instead of managing a separate duplicate structure.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/estate/mappings")}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white"
            >
              Mappings
            </button>
          </div>
        </section>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <DoorOpen className="text-[#4955b3] mb-2" size={24} />
            <h3 className="text-2xl font-black text-[#2b3437]">{usedDoors}{maxDoors ? ` / ${maxDoors}` : ""}</h3>
            <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">Active Doors</p>
          </div>
          <div className="bg-[#4955b3] p-5 rounded-[2rem] text-white shadow-lg shadow-indigo-100">
            <QrCode className="text-white/60 mb-2" size={24} />
            <h3 className="text-2xl font-black leading-none uppercase">Ready</h3>
            <p className="text-white/40 font-black text-[9px] uppercase tracking-widest">QR System</p>
          </div>
        </div>

        {/* Input Card */}
        <section className="bg-white rounded-[2.2rem] border border-slate-100 p-6 shadow-sm mb-8">
            <h3 className="text-lg font-black text-[#2b3437] mb-5">Create Entry Point</h3>

            <form onSubmit={onSubmit} className="space-y-4">
                <div className="relative">
                    <label className="text-[10px] font-black uppercase text-[#4955b3] ml-2 mb-1.5 block tracking-widest">Resident / Home</label>
                    <button
                      type="button"
                      onClick={() => setIsSheetOpen(true)}
                      className="w-full bg-[#f1f3f5] rounded-2xl px-4 py-4 text-left flex justify-between items-center min-h-[58px] active:scale-[0.98] transition-all"
                    >
                      <span className={`text-[16px] font-bold truncate ${selectedResident ? 'text-[#2b3437]' : 'text-slate-400'}`}>
                        {selectedResident ? `${selectedResident.homeownerName} — ${selectedResident.homeName}` : "Choose resident..."}
                      </span>
                      <ChevronDown size={18} className="text-slate-400" />
                    </button>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-[#4955b3] ml-2 mb-1.5 block tracking-widest">Door Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Lobby Entrance"
                        className={inputBaseClass}
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                    />
                </div>

                <button
                    disabled={busy || !canAddDoor}
                    className="w-full bg-[#4955b3] hover:bg-[#3c49a7] text-white py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-base transition-all active:scale-[0.98] shadow-lg shadow-indigo-50 mt-2"
                >
                    {busy ? "Creating..." : <><Plus size={20} strokeWidth={3} /> Add Door</>}
                </button>
                {!canAddDoor ? (
                  <p className="text-center text-sm font-semibold text-amber-700">
                    Upgrade your plan to add more doors.
                  </p>
                ) : null}
            </form>
        </section>

        {/* Active List */}
        <div className="space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2">Recent Setup</h4>
            {doors.length > 0 ? doors.slice(0, 5).map(door => (
                <div key={door.id} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center justify-between shadow-sm active:bg-slate-50">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#4955b3]">
                            <DoorOpen size={20} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-black text-[#2b3437] truncate">{door.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase truncate tracking-tight">{door.homeName}</p>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 flex-shrink-0 ml-2" />
                </div>
            )) : (
              <p className="text-center py-8 text-slate-400 font-bold text-xs italic">No doors configured yet.</p>
            )}
        </div>
      </main>

      {/* RESPONSIVE BOTTOM SHEET */}
      {isSheetOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSheetOpen(false)}
          />

          {/* Sheet Body */}
          <div className="relative bg-white rounded-t-[2.5rem] w-full max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">

            {/* Fixed Header Area */}
            <div className="flex-shrink-0 pt-4 px-6 pb-2">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-black text-[#2b3437]">Select Resident</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Homes</p>
                </div>
                <button
                  onClick={() => setIsSheetOpen(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl active:scale-90 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-12 custom-scrollbar">
              <div className="space-y-3">
                {homeownerOptions.length > 0 ? homeownerOptions.map((opt) => {
                  const isSelected = opt.homeownerId === form.homeownerId;
                  return (
                    <button
                      key={opt.homeownerId}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, homeownerId: opt.homeownerId });
                        setIsSheetOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-indigo-50 border-2 border-[#4955b3]'
                          : 'bg-[#f8f9fa] border-2 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-left overflow-hidden mr-4">
                        <p className={`font-black text-[17px] truncate ${isSelected ? 'text-[#4955b3]' : 'text-[#2b3437]'}`}>
                          {opt.homeownerName}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                          {opt.homeName}
                        </p>
                      </div>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#4955b3] text-white' : 'bg-slate-200'}`}>
                        {isSelected ? <Check size={14} strokeWidth={4} /> : null}
                      </div>
                    </button>
                  );
                }) : (
                    <div className="py-20 text-center">
                        <p className="text-slate-400 font-bold">No residents found</p>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}

    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all active:scale-90 ${active ? 'bg-indigo-50 text-[#4955b3]' : 'text-slate-300'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-tight">{label}</span>
  </button>
);

export default EstateDoorsPage;
