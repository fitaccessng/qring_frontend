import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Copy,
  History,
  KeyRound,
  LayoutGrid,
  MessageSquare,
  PlusCircle,
  QrCode,
  User,
  Warehouse,
  X
} from "lucide-react";

// Core State & Services
import { useAuth } from '../../state/AuthContext';
import { useNotifications } from '../../state/NotificationsContext';
import { env } from "../../config/env";
import {
  createResidentDoor,
  generateDoorQr,
  getResidentDoors
} from "../../services/residentService";
import { showError, showSuccess } from "../../utils/flash";

// Components
import QrPrintDesigner from "../../components/qr/QrPrintDesigner";

export default function ResidentDoorsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { unreadCount: globalUnreadCount } = useNotifications();

  const [doors, setDoors] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDoorId, setActiveDoorId] = useState("");
  const [selectedQrId, setSelectedQrId] = useState("");
  const [newDoorName, setNewDoorName] = useState("");
  const [creatingDoor, setCreatingDoor] = useState(false);
  const [generatingQrDoorId, setGeneratingQrDoorId] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [language] = useState("English");

  const activeDoor = useMemo(() => doors.find((d) => String(d.id) === String(activeDoorId)), [doors, activeDoorId]);

  const loadInitialData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const doorData = await getResidentDoors();
      const doorList = doorData?.doors ?? [];
      setDoors(doorList);
      setSubscription(doorData?.subscription ?? null);

      if (doorList.length > 0) {
        setActiveDoorId(doorList[0].id);
        setSelectedQrId(getPrimaryQrId(doorList[0]));
      }
    } catch (err) {
      showError(err.message || "Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInitialData(); }, [token]);

  const handleCreateDoor = async (e) => {
    e.preventDefault();
    if (!newDoorName.trim()) {
      showError("Door name is required.");
      return;
    }
    setCreatingDoor(true);
    try {
      const res = await createResidentDoor({ name: newDoorName, generateQr: true, mode: "direct", plan: "single" });
      const createdDoor = res?.door ?? null;
      if (!createdDoor) {
        throw new Error("Door was created but no door data was returned.");
      }
      setDoors((prev) => [createdDoor, ...prev]);
      setActiveDoorId(createdDoor.id);
      setSelectedQrId(getPrimaryQrId(createdDoor));
      setNewDoorName("");
      showSuccess("Entry point added");
    } catch (err) {
      showError(err.message || "Failed to add entry point.");
    } finally {
      setCreatingDoor(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) {
      showError("Nothing to copy yet.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("URL copied to clipboard");
    } catch {
      showError("Unable to copy access link.");
    }
  };

  const toScanUrl = (qrId) => {
    if (!qrId) return "";
    const base = (env.publicAppUrl || window.location.origin || "").replace(/\/+$/, "");
    return `${base}/scan/${qrId}`;
  };

  const buildQrImageUrl = (value, size = 240) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  };

  const handleSelectDoor = (door) => {
    const firstQrId = getPrimaryQrId(door);
    setActiveDoorId(door.id);
    setSelectedQrId(firstQrId);
    setIsModalOpen(Boolean(firstQrId));
  };

  const refreshDoorAfterQrGeneration = (doorId, createdQrId) => {
    setDoors((prev) =>
      prev.map((door) =>
        String(door.id) === String(doorId)
          ? { ...door, qr: Array.from(new Set([...(Array.isArray(door.qr) ? door.qr : []), createdQrId])) }
          : door
      )
    );
    setSelectedQrId(createdQrId);
    setActiveDoorId(doorId);
    setSubscription((prev) =>
      prev
        ? {
            ...prev,
            usedQrCodes: Number(prev.usedQrCodes || 0) + 1,
            remainingQrCodes: Math.max(Number(prev.remainingQrCodes || 0) - 1, 0)
          }
        : prev
    );
  };

  const handleGenerateDoorQr = async (door, options = {}) => {
    if (!door?.id) return;
    setGeneratingQrDoorId(String(door.id));
    try {
      const response = await generateDoorQr(door.id, { mode: "direct", plan: "single" });
      const createdQrId = response?.qr?.qr_id;
      if (!createdQrId) {
        throw new Error("QR code was generated but no QR id was returned.");
      }
      refreshDoorAfterQrGeneration(door.id, createdQrId);
      showSuccess(`QR generated for ${door.gateLabel || door.name}.`);
      if (options.openModal) {
        setIsModalOpen(true);
      }
      return createdQrId;
    } catch (err) {
      showError(err.message || "Failed to generate QR code.");
      return "";
    } finally {
      setGeneratingQrDoorId("");
    }
  };

  const openDoorQrModal = async (door) => {
    if (!door) return;
    const currentQrId = getPrimaryQrId(door);
    setActiveDoorId(door.id);
    if (currentQrId) {
      setSelectedQrId(currentQrId);
      setIsModalOpen(true);
      return;
    }
    const generatedQrId = await handleGenerateDoorQr(door, { openModal: false });
    if (generatedQrId) {
      setSelectedQrId(generatedQrId);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-40">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">
                {language === 'French' ? 'Portes et Accès' : 'Doors & Access'}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Secure Entry Management</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 transition-all">
              <Bell size={18} />
              {globalUnreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Quick Add Section (Integrated) */}
        <section className="mt-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
               <PlusCircle className="w-5 h-5 text-indigo-600" />
               <h3 className="font-bold text-slate-800">Add Entry Point</h3>
            </div>
            <form onSubmit={handleCreateDoor} className="flex gap-2">
              <input
                value={newDoorName}
                onChange={(e) => setNewDoorName(e.target.value)}
                placeholder="e.g. Side Gate"
                className="flex-1 bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500/20 outline-none transition-all"
              />
              <button
                disabled={creatingDoor}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {creatingDoor ? "..." : "Add"}
              </button>
            </form>
          </div>
        </section>

        {/* Doors Grid/List */}
        <section className="space-y-4 mb-12">
          <div className="flex justify-between items-end px-2 mb-4">
             <div>
                <h4 className="font-black text-sm text-slate-400 uppercase tracking-[0.2em]">Active Doors</h4>
                <p className="text-[10px] font-bold text-indigo-600">{subscription?.usedDoors || 0} / {subscription?.maxDoors || 0} Slots Used</p>
             </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-400 font-bold animate-pulse">Syncing Hardware...</div>
          ) : doors.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center text-slate-500 font-bold shadow-sm">
              No doors yet. Add your first entry point above.
            </div>
          ) : doors.map((door) => {
            const isActive = String(activeDoorId) === String(door.id);
            const qrCount = Array.isArray(door.qr) ? door.qr.length : 0;
            const hasQr = qrCount > 0;
            const isGenerating = generatingQrDoorId === String(door.id);
            return (
            <section
              key={door.id}
              className={`w-full bg-white rounded-[2rem] p-5 border transition-all ${isActive ? "border-indigo-600 ring-4 ring-indigo-500/5 shadow-md" : "border-slate-100 shadow-sm"}`}
            >
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectDoor(door)}
                  className="flex min-w-0 flex-1 items-center gap-5 text-left"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"}`}>
                    {door.type === "garage" ? <Warehouse size={24} /> : <KeyRound size={24} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 truncate">{door.gateLabel || door.name}</p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{qrCount} QR Configured</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDoorQrModal(door)}
                    disabled={isGenerating}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl disabled:opacity-50"
                    aria-label={hasQr ? "Open QR code" : "Generate QR code"}
                  >
                    <QrCode size={18} />
                  </button>
                </div>
              </div>
              {!hasQr ? (
                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold text-slate-500">This door does not have a QR code yet.</p>
                  <button
                    type="button"
                    onClick={() => handleGenerateDoorQr(door)}
                    disabled={isGenerating}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    {isGenerating ? "Generating..." : "Generate QR"}
                  </button>
                </div>
              ) : null}
            </section>
          )})}
        </section>

        {/* Integrated QR Designer Section */}
        {activeDoor && (
          <section className="pb-10 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">QR Designer</h3>
                    <p className="text-xs text-slate-400 font-medium">Customize physical access tags</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(toScanUrl(selectedQrId))}
                    className="p-3 bg-slate-50 text-slate-400 rounded-full hover:text-indigo-600 transition-colors"
                  >
                    <Copy size={20} />
                  </button>
                </div>

                <div className="flex flex-col items-center py-6 bg-slate-50 rounded-[2rem] mb-8 border border-dashed border-slate-200">
                  <div className="bg-white p-4 rounded-3xl shadow-sm mb-4">
                     <img
                        src={buildQrImageUrl(toScanUrl(selectedQrId), 200)}
                        alt="Door QR"
                        className="w-32 h-32"
                      />
                  </div>
                  <code className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                    Endpoint: {selectedQrId}
                  </code>
                </div>

                <QrPrintDesigner
                  key={`${activeDoor.id}-${selectedQrId}`}
                  preview={{
                    qrId: selectedQrId,
                    doorName: activeDoor.gateLabel || activeDoor.name,
                    homeName: activeDoor.homeName,
                    scanUrl: toScanUrl(selectedQrId)
                  }}
                  defaultLabel={activeDoor.homeName || ""}
                />
             </div>
          </section>
        )}
      </main>

      {/* QR MODAL (BOTTOM SHEET) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-8 py-6 flex justify-between items-center border-b border-slate-50">
               <h3 className="font-black text-xl text-slate-900">Digital Key</h3>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-10 overflow-y-auto text-center">
               <div className="inline-block p-8 bg-slate-50 rounded-[2.5rem] mb-6">
                 <img src={buildQrImageUrl(toScanUrl(selectedQrId), 250)} alt="QR" className="w-48 h-48" />
               </div>
               <h4 className="text-lg font-black text-slate-900 mb-2">{activeDoor?.gateLabel || activeDoor?.name}</h4>
               <p className="text-slate-500 text-sm mb-8">Valid for instant scanning at this entrance.</p>
               <button type="button" onClick={() => copyToClipboard(toScanUrl(selectedQrId))} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">Copy Access Link</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <NavItem to="/dashboard/resident/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/resident/visits" icon={<History size={22} />} label="Activity" />
        <NavItem to="/dashboard/resident/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
        <NavItem to="/dashboard/resident/doors" icon={<KeyRound size={22} />} label="Access" active />
        <NavItem to="/dashboard/resident/settings" icon={<User size={22} />} label="Profile" />
      </nav>
    </div>
  );
}

function getPrimaryQrId(door) {
  return Array.isArray(door?.qr) && door.qr.length > 0 ? door.qr[0] : "";
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center justify-center min-w-[64px] active:scale-90 transition-transform ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{label}</span>
    </Link>
  );
}
