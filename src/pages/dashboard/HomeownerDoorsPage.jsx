import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  Copy,
  KeyRound,
  PlusCircle,
  QrCode,
  Warehouse,
  X,
  Plus
} from "lucide-react";

// Core State & Services
import { useAuth } from '../../state/AuthContext';
import { useNotifications } from '../../state/NotificationsContext';
import { env } from "../../config/env";
import {
  createHomeownerDoor,
  generateHomeownerDoorQr,
  getHomeownerDoors
} from "../../services/homeownerService";
import { showError, showSuccess } from "../../utils/flash";

// Components
import QrPrintDesigner from "../../components/qr/QrPrintDesigner";

export default function HomeownerDoorsPage() {
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
      const doorData = await getHomeownerDoors();
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
      const res = await createHomeownerDoor({ name: newDoorName, generateQr: true, mode: "direct", plan: "single" });
      const createdDoor = res?.door ?? null;
      if (!createdDoor) throw new Error("Door creation failed.");
      
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
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showSuccess("URL copied");
    } catch {
      showError("Unable to copy.");
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
  };

  const handleGenerateDoorQr = async (door) => {
    if (!door?.id) return;
    setGeneratingQrDoorId(String(door.id));
    try {
      const response = await generateHomeownerDoorQr(door.id, { mode: "direct", plan: "single" });
      const createdQrId = response?.qr?.qr_id;
      
      setDoors(prev => prev.map(d => String(d.id) === String(door.id) ? { ...d, qr: [createdQrId] } : d));
      setSelectedQrId(createdQrId);
      showSuccess(`QR generated for ${door.name}.`);
    } catch (err) {
      showError("Failed to generate QR.");
    } finally {
      setGeneratingQrDoorId("");
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-20">
      {/* HEADER - Responsive Padding */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-none">
                {language === 'French' ? 'Portes et Accès' : 'Doors & Access'}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Management</p>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2 sm:p-2.5 bg-slate-50 text-slate-600 rounded-full">
            <Bell size={18} />
            {globalUnreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
          </Link>
        </div>
      </header>

      <main className="pt-20 sm:pt-24 px-4 sm:px-6 max-w-2xl mx-auto">
        
        {/* ADD DOOR CARD - Responsive Input Group */}
        <section className="mt-4 mb-6 sm:mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
               <PlusCircle className="w-5 h-5 text-indigo-600" />
               <h3 className="font-bold text-slate-800 text-sm sm:text-base">Quick Add Door</h3>
            </div>
            <form onSubmit={handleCreateDoor} className="flex flex-row gap-2">
              <input
                value={newDoorName}
                onChange={(e) => setNewDoorName(e.target.value)}
                placeholder="Door name..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 ring-indigo-500/20 outline-none"
              />
              <button
                disabled={creatingDoor}
                className="bg-indigo-600 text-white p-3 sm:px-6 sm:py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                {creatingDoor ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus size={18} className="sm:mr-1"/><span className="hidden sm:inline">Add</span></>}
              </button>
            </form>
          </div>
        </section>

        {/* DOORS LIST */}
        <section className="space-y-3 sm:space-y-4 mb-8">
          <div className="flex justify-between items-end px-2 mb-2">
             <div>
                <h4 className="font-black text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest">Your Hardware</h4>
                <p className="text-[10px] font-bold text-indigo-600">{subscription?.usedDoors || 0} / {subscription?.maxDoors || 0} Slots</p>
             </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-400 font-bold animate-pulse text-sm">Syncing...</div>
          ) : doors.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center text-slate-400 text-sm font-bold">
              No doors found.
            </div>
          ) : doors.map((door) => {
            const isActive = String(activeDoorId) === String(door.id);
            const qrCount = Array.isArray(door.qr) ? door.qr.length : 0;
            const isGenerating = generatingQrDoorId === String(door.id);
            
            return (
              <div
                key={door.id}
                className={`w-full bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border transition-all ${isActive ? "border-indigo-600 ring-4 ring-indigo-500/5 shadow-sm" : "border-slate-100"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectDoor(door)}
                    className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5 text-left"
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${isActive ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"}`}>
                      {door.type === "garage" ? <Warehouse size={20} /> : <KeyRound size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold sm:font-black text-slate-900 text-sm sm:text-base truncate">{door.gateLabel || door.name}</p>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-400">{qrCount} QR Active</p>
                    </div>
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {qrCount > 0 && (
                      <button
                        onClick={() => { handleSelectDoor(door); setIsModalOpen(true); }}
                        className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl"
                      >
                        <QrCode size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {qrCount === 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">No QR Code assigned</p>
                    <button
                      onClick={() => handleGenerateDoorQr(door)}
                      disabled={isGenerating}
                      className="w-full sm:w-auto rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black text-white"
                    >
                      {isGenerating ? "Generating..." : "Generate QR"}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        {/* QR DESIGNER - Full Width on Mobile */}
        {activeDoor && selectedQrId && (
          <section className="pb-10 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-xl shadow-slate-200/40">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">QR Designer</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Physical access setup</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(toScanUrl(selectedQrId))}
                    className="p-2.5 bg-slate-50 text-slate-400 rounded-full hover:text-indigo-600"
                  >
                    <Copy size={18} />
                  </button>
                </div>

                <div className="flex flex-col items-center py-6 bg-slate-50 rounded-2xl sm:rounded-[2rem] mb-6 border border-dashed border-slate-200">
                  <div className="bg-white p-3 rounded-2xl shadow-sm mb-3">
                     <img
                        src={buildQrImageUrl(toScanUrl(selectedQrId), 200)}
                        alt="QR"
                        className="w-24 h-24 sm:w-32 sm:h-32"
                      />
                  </div>
                  <code className="text-[9px] text-indigo-600 font-mono bg-indigo-50 px-3 py-1 rounded-full">
                    ID: {selectedQrId.substring(0, 8)}...
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

      {/* QR MODAL - Bottom Sheet on Mobile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 flex justify-between items-center border-b border-slate-50">
               <h3 className="font-black text-lg text-slate-900">Digital Key</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-8 sm:p-10 overflow-y-auto text-center">
               <div className="inline-block p-6 sm:p-8 bg-slate-50 rounded-[2rem] sm:rounded-[2.5rem] mb-6">
                 <img src={buildQrImageUrl(toScanUrl(selectedQrId), 250)} alt="QR" className="w-40 h-40 sm:w-48 sm:h-48 mx-auto" />
               </div>
               <h4 className="text-lg font-black text-slate-900 mb-1">{activeDoor?.gateLabel || activeDoor?.name}</h4>
               <p className="text-slate-400 text-xs sm:text-sm mb-8">Scan at entrance for instant access</p>
               <button onClick={() => copyToClipboard(toScanUrl(selectedQrId))} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm">Copy Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getPrimaryQrId(door) {
  return Array.isArray(door?.qr) && door.qr.length > 0 ? door.qr[0] : "";
}