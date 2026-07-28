import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, User, Phone, CalendarOff, History,
  CalendarDays, MessageSquare, LayoutGrid,
  UserCircle, Trash2, ShieldCheck, X,
  MapPin, DoorOpen, Clock, AlignLeft, Navigation,
  ArrowLeft
} from "lucide-react";
import { useApiQuery, useApiMutation } from "../../hooks/useApi";
import { endpoints } from "../../services/endpoints";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import { createHomeownerAppointment } from "../../services/homeownerService";

export default function ResidentAppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const scrollContainerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const listUrl = endpoints?.homeowner?.appointments || "/homeowner/appointments";

  const { data: appointments, isLoading, refetch } = useApiQuery({
    queryKey: ["appointments", selectedDate],
    url: `${listUrl}?date=${selectedDate}`,
    enabled: !!selectedDate,
  });
  
  const { data: doorsResponse } = useApiQuery({
    queryKey: ["homeowner-doors-for-appointments"],
    url: endpoints?.homeowner?.doors || "/homeowner/doors"
  });

  const filteredAppointments = useMemo(() => {
    const rows = Array.isArray(appointments) ? appointments : [];
    return rows.filter((item) => toDateKey(item?.startsAt || item?.createdAt) === selectedDate);
  }, [appointments, selectedDate]);

  const availableDoors = useMemo(() => {
    if (Array.isArray(doorsResponse)) return doorsResponse;
    return Array.isArray(doorsResponse?.doors) ? doorsResponse.doors : [];
  }, [doorsResponse]);

  const createMutation = useApiMutation({
    mutationFn: async (_api, variables) => createHomeownerAppointment(variables),
    onSuccess: (data) => {
      setInviteResult(data || null);
      refetch();
    },
  });

  const dateTiles = useMemo(() => buildDateTiles(), []);

  const handleGetLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latInput = document.getElementsByName('latitude')[0];
          const lngInput = document.getElementsByName('longitude')[0];
          if (latInput) latInput.value = position.coords.latitude.toFixed(6);
          if (lngInput) lngInput.value = position.coords.longitude.toFixed(6);
          setIsLocating(false);
        },
        () => {
          alert("Location access denied.");
          setIsLocating(false);
        }
      );
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const startTime = String(formData.get("startTime") || "").trim();
    const endTime = String(formData.get("endTime") || "").trim();
    const startsAt = startTime ? new Date(startTime) : null;
    const endsAt = endTime ? new Date(endTime) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime()) || !endsAt || Number.isNaN(endsAt.getTime())) {
      window.alert("Enter a valid start and end time.");
      return;
    }
    if (endsAt <= startsAt) {
      window.alert("End time must be after start time.");
      return;
    }
    const payload = {
      doorId: String(formData.get("doorId") || "").trim(),
      visitorName: String(formData.get("visitorName") || "").trim(),
      visitorContact: String(formData.get("visitorContact") || "").trim(),
      visitorEmail: String(formData.get("visitorEmail") || "").trim() || undefined,
      purpose: String(formData.get("purpose") || "").trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      geofenceLat: parseOptionalNumber(formData.get("latitude")),
      geofenceLng: parseOptionalNumber(formData.get("longitude")),
      geofenceRadiusMeters: parseOptionalNumber(formData.get("geofenceRadiusMeters"))
    };
    createMutation.mutate(payload);
  };

  async function handleCopyInvite(value) {
    const raw = String(value || "").trim();
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
    } catch {
      window.prompt("Copy this invite:", raw);
    }
  }

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
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">Appointments</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Security Access Portal</p>
              </div>
            </div>
          </div>

          <Link 
            to="/dashboard/notifications" 
            className="relative p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all active:scale-95"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </Link>
        </div>
      </header>

      {/* MAIN LAYOUT CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Date Selector & Overview */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">Select Booking Date</h2>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{formatDateHeader(selectedDate)}</span>
            </div>
            
            <div ref={scrollContainerRef} className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar snap-x scroll-smooth">
              {dateTiles.map((item) => {
                const isActive = selectedDate === item.date;
                return (
                  <button
                    key={item.date}
                    onClick={() => setSelectedDate(item.date)}
                    className={`flex-shrink-0 w-14 h-20 flex flex-col items-center justify-center rounded-2xl transition-all duration-200 snap-start border ${
                      isActive 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-102 font-bold" 
                        : "bg-slate-50 border-slate-200/60 text-slate-400 hover:bg-slate-100/80 hover:text-slate-600"
                    }`}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-tight mb-1 ${isActive ? "text-indigo-200" : "text-slate-400"}`}>{item.weekday}</span>
                    <span className="text-lg font-extrabold tracking-tight">{item.day}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* VISITOR SCHEDULE CONTAINER */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">Expected Visitors</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{filteredAppointments.length || 0} Scheduled</span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200/60 animate-pulse" />
                ))}
              </div>
            ) : filteredAppointments.length > 0 ? (
              <div className="space-y-3">
                {filteredAppointments.map((appt, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/70 flex items-center justify-between group shadow-sm transition-all hover:border-slate-300">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <User size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 truncate tracking-tight">{appt.name || appt.visitorName}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5 tracking-tight">{appt.phone || appt.visitorContact}</p>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-colors active:scale-95 shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 text-slate-300">
                  <CalendarOff size={22} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Scheduled Visits for this day</p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Static Action & Prompt to trigger creation context */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl shadow-slate-950/10 text-center lg:text-left">
            <h3 className="text-lg font-bold tracking-tight">Need to bring in someone new?</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Instantly create custom entries, assign points of access, and generate invite codes or deep-links directly for your guests.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Invite New Guest</span>
            </button>
          </div>
        </div>
      </main>

      {/* FULL RESPONSIVE FORM INTERFACE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-3xl flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">Create Pass Invitation</h3>
                    <p className="text-slate-400 text-xs font-medium mt-0.5">Schedule security pre-clearance codes seamlessly.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleCreateAppointment} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 no-scrollbar bg-slate-50/50">
                  <InputField label="Visitor Full Name" name="visitorName" placeholder="John Doe" icon={<User size={16}/>} required />
                  <InputField label="Visitor Mobile Number" name="visitorContact" placeholder="+234..." icon={<Phone size={16}/>} required />
                  <InputField label="Visitor Email Address" name="visitorEmail" type="email" placeholder="visitor@email.com" icon={<MessageSquare size={16}/>} />

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Point of Entry Gateway</label>
                    <div className="relative">
                      <select
                        name="doorId"
                        required
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled>Choose point of entry...</option>
                        {availableDoors.map((door) => (
                          <option key={door.id} value={door.id}>
                            {door.gateLabel || door.name || "Access Door"}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><DoorOpen size={16}/></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Valid From" name="startTime" type="datetime-local" icon={<Clock size={16}/>} required />
                    <InputField label="Valid Until" name="endTime" type="datetime-local" icon={<Clock size={16}/>} required />
                  </div>

                  {/* Geofencing Controls Layout */}
                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center px-0.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Geofence Validation</label>
                      <button 
                        type="button" 
                        onClick={handleGetLocation} 
                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase transition-colors"
                      >
                        <Navigation size={12} className={isLocating ? "animate-pulse" : ""} />
                        {isLocating ? "Acquiring..." : "Get Live Coordinates"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Latitude" name="latitude" placeholder="Optional" icon={<MapPin size={14}/>} />
                      <InputField label="Longitude" name="longitude" placeholder="Optional" icon={<MapPin size={14}/>} />
                    </div>
                    <InputField label="Safe Radius (Meters)" name="geofenceRadiusMeters" type="number" min="30" max="2000" placeholder="e.g., 120" icon={<Navigation size={14}/>} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notes / Purpose</label>
                    <div className="relative">
                      <textarea name="purpose" placeholder="Reason for visitation request..." rows="2" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none resize-none" />
                      <div className="absolute right-4 top-4 text-slate-400"><AlignLeft size={16} /></div>
                    </div>
                  </div>

                  {inviteResult && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        {inviteResult?.inviteDelivery === "email" ? "Invitation Dispatched" : "Access Key Ready"}
                      </p>
                      {inviteResult?.shareUrl && (
                        <button type="button" onClick={() => handleCopyInvite(inviteResult.shareUrl)} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-bold text-slate-700 border border-slate-200 shadow-sm active:scale-[0.99] transition-transform">
                          Copy Access URL Link
                        </button>
                      )}
                      {inviteResult?.inviteCode && (
                        <button type="button" onClick={() => handleCopyInvite(inviteResult.inviteCode)} className="w-full rounded-xl bg-white px-3 py-2.5 text-left text-xs font-mono font-bold text-slate-700 border border-slate-200 shadow-sm active:scale-[0.99] transition-transform">
                          Code: {inviteResult.inviteCode} (Tap to copy)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Fixed Footer Action */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
                  >
                    {createMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Generate & Dispatch Pass</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function parseOptionalNumber(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function InputField({ label, icon, ...props }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative group">
        <input
          {...props}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-300"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}

function toDateKey(val) {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHeader(key) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function buildDateTiles() {
  const days = [];
  const now = new Date();
  for (let i = -2; i <= 14; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    days.push({ date: toDateKey(d), day: d.getDate(), weekday: d.toLocaleString('en-US', { weekday: 'short' }) });
  }
  return days;
}