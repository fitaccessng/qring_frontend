import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  Copy,
  KeyRound,
  PlusCircle,
  QrCode,
  Warehouse,
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
import BottomSheet from "../../components/system/BottomSheet";

function getPrimaryQrId(door) {
  return Array.isArray(door?.qr) && door.qr.length > 0 ? door.qr[0] : "";
}

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

  const loadInitialData = async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const doorData = await getHomeownerDoors();
      const doorList = doorData?.doors ?? [];
      setDoors(doorList);
      setSubscription(doorData?.subscription ?? null);

      if (doorList.length > 0) {
        setActiveDoorId((currentId) => {
          const selected = doorList.find((door) => String(door.id) === String(currentId)) || doorList[0];
          setSelectedQrId(getPrimaryQrId(selected));
          return selected.id;
        });
      }
    } catch (err) {
      showError(err.message || "Connection error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { loadInitialData(); }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const refresh = () => loadInitialData({ silent: true });
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [token]);

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
      const createdQrId = response?.qr_id;
      if (!createdQrId) {
        throw new Error("QR generation failed.");
      }
      
      setDoors(prev => prev.map(d => String(d.id) === String(door.id) ? { ...d, qr: [createdQrId] } : d));
      setSelectedQrId(createdQrId);
      showSuccess(`QR generated for ${door.name}.`);
    } catch (err) {
      showError(err?.message || "Failed to generate QR.");
    } finally {
      setGeneratingQrDoorId("");
    }
  };

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans text-slate-900 antialiased selection:bg-indigo-500/10 selection:text-indigo-600">
      
      {/* STATIC HEADER */}
      <header className="w-full bg-white border-b border-slate-200/60 sticky top-0 z-40 backdrop-blur-xl bg-white/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">
                {language === 'French' ? 'Portes et Accès' : 'Create QR Codes'}
              </h1>
            </div>
          </div>
          
          <button 
            onClick={() => navigate("/dashboard/notifications")}
            className="relative p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all active:scale-95"
          >
            <Bell size={18} />
            {globalUnreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-1 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: Controls & List */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          
          {/* QUICK ADD DOOR CARD */}
          <section>
            <div className="bg-white border border-slate-200/70 rounded-3xl p-4 sm:p-6 shadow-sm shadow-slate-100/50">
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                   <PlusCircle className="w-4 h-4" />
                 </div>
                 <h3 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight">Add New Entry Point</h3>
              </div>
              <form onSubmit={handleCreateDoor} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  value={newDoorName}
                  onChange={(e) => setNewDoorName(e.target.value)}
                  placeholder="e.g., Front Gate, Backdoor..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-indigo-500 transition-colors focus:ring-4 focus:ring-indigo-500/5 outline-none font-medium placeholder:text-slate-400"
                />
                <button
                  disabled={creatingDoor}
                  className="bg-indigo-600 text-white font-semibold text-sm px-5 py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/10 shrink-0 w-full sm:w-auto"
                >
                  {creatingDoor ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Add Entry</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* HARDWARE OVERVIEW & DOORS LIST */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
               <div>
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Active Hardware</h4>
               </div>
               <div>
                 <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full inline-block">
                   {subscription?.usedDoors || 0} / {subscription?.maxDoors || 0} Slots Filled
                 </span>
               </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="py-12 bg-white rounded-3xl border border-slate-200/60 flex items-center justify-center">
                  <div className="flex items-center gap-2.5 text-slate-400 font-semibold text-sm">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                    <span>Syncing hardware...</span>
                  </div>
                </div>
              ) : doors.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={22} />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">No doors or gates linked to this property yet.</p>
                </div>
              ) : (
                doors.map((door) => {
                  const isActive = String(activeDoorId) === String(door.id);
                  const qrCount = Array.isArray(door.qr) ? door.qr.length : 0;
                  const isGenerating = generatingQrDoorId === String(door.id);
                  
                  return (
                    <div
                      key={door.id}
                      className={`w-full bg-white rounded-2xl p-4 border transition-all duration-200 group ${
                        isActive 
                          ? "border-indigo-600 ring-4 ring-indigo-600/5 shadow-sm shadow-indigo-600/5" 
                          : "border-slate-200/70 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectDoor(door)}
                          className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 text-left"
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80"
                          }`}>
                            {door.type === "garage" ? <Warehouse size={18} /> : <KeyRound size={18} />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm sm:text-base truncate tracking-tight">
                              {door.gateLabel || door.name}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${qrCount > 0 ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                              {qrCount} {qrCount === 1 ? 'QR Pass' : 'QR Passes'} Active
                            </p>
                          </div>
                        </button>
                        
                        <div className="flex items-center gap-2">
                          {qrCount > 0 && (
                            <button
                              onClick={() => { handleSelectDoor(door); setIsModalOpen(true); }}
                              className="p-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors active:scale-95"
                              title="View Access Pass"
                            >
                              <QrCode size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {qrCount === 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                            Hardware Inactive
                          </p>
                          <button
                            onClick={() => handleGenerateDoorQr(door)}
                            disabled={isGenerating}
                            className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                          >
                            {isGenerating ? "Generating..." : "Generate Pass"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Designer sidebar (Adapts cleanly on mobile/desktop) */}
        <div className="lg:col-span-5">
          {activeDoor && selectedQrId ? (
            <section className="lg:sticky lg:top-24 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Badge Designer</h3>
                      <p className="text-xs text-slate-400 font-medium">Configure physical signage & labels</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(toScanUrl(selectedQrId))}
                      className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-colors active:scale-95"
                      title="Copy Digital URL"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-2xl mb-6">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-3">
                       <img
                          src={buildQrImageUrl(toScanUrl(selectedQrId), 200)}
                          alt="QR Code Pass"
                          className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                        />
                    </div>
                    <code className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                      ID: {selectedQrId.substring(0, 8)}
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
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-300 rounded-3xl p-6 text-center text-slate-400 lg:sticky lg:top-24">
              <QrCode size={28} className="text-slate-300 mb-2 animate-pulse" />
              <p className="text-xs font-medium">Select an active door to generate or configure your printable layout.</p>
            </div>
          )}
        </div>
      </main>

      {/* DIALOG ACCESS MODAL - Floating Bottom-Sheet on mobile, Centered Modal on Desktop */}
      <BottomSheet open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Instant Pass Code">
            <div className="text-center">
               <div className="inline-block p-4 sm:p-5 bg-slate-50 border border-slate-200/60 rounded-2xl mb-4">
                 <img 
                  src={buildQrImageUrl(toScanUrl(selectedQrId), 250)} 
                  alt="Access Pass" 
                  className="w-36 h-36 sm:w-44 sm:h-44 mx-auto object-contain" 
                 />
               </div>
               <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5">
                 {activeDoor?.gateLabel || activeDoor?.name}
               </h4>
               <p className="text-slate-400 text-xs font-medium mb-6">
                 Hold this code up to the automated reader for instantaneous access.
               </p>
               <button 
                onClick={() => copyToClipboard(toScanUrl(selectedQrId))} 
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
               >
                 Copy Link Address
               </button>
            </div>
      </BottomSheet>
    </div>
  );
}
