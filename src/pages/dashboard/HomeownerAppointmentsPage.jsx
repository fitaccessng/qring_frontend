import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Plus,
  User,
  Phone,
  CalendarOff,
  ShieldCheck,
  X,
  MapPin,
  DoorOpen,
  Clock,
  AlignLeft,
  Navigation,
  ArrowLeft,
  Mail
} from "lucide-react";
import {
  createHomeownerAppointment,
  getHomeownerAppointments,
  getHomeownerDoors
} from "../../services/homeownerService";
import { useNotifications } from "../../state/NotificationsContext";
import { showError, showSuccess } from "../../utils/flash";

export default function ResidentAppointmentsPage() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const scrollContainerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [doors, setDoors] = useState([]);
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    visitorEmail: "",
    doorId: "",
    startTime: "",
    endTime: "",
    latitude: "",
    longitude: "",
    purpose: ""
  });

  const dateTiles = useMemo(() => buildDateTiles(), []);
  const selectedAppointments = useMemo(
    () => appointments.filter((item) => toDateKey(item?.startsAt || item?.createdAt || new Date()) === selectedDate),
    [appointments, selectedDate]
  );

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const [appointmentRows, doorData] = await Promise.all([
          getHomeownerAppointments(),
          getHomeownerDoors()
        ]);
        if (!active) return;

        const nextDoors = doorData?.doors ?? [];
        setAppointments(Array.isArray(appointmentRows) ? appointmentRows : []);
        setDoors(nextDoors);
        setForm((current) => ({
          ...current,
          doorId: current.doorId || nextDoors[0]?.id || ""
        }));
      } catch (error) {
        if (!active) return;
        showError(error?.message || "Unable to load appointments.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const handleGetLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      showError("Location is not supported on this device.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setIsLocating(false);
        showSuccess("Location captured for geofence alerts.");
      },
      () => {
        showError("Location access denied.");
        setIsLocating(false);
      }
    );
  };

  const handleCreateAppointment = async (event) => {
    event.preventDefault();
    if (!form.doorId) {
      showError("Select a door first.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        doorId: form.doorId,
        visitorName: form.visitorName.trim(),
        visitorContact: form.visitorPhone.trim(),
        visitorEmail: form.visitorEmail.trim().toLowerCase(),
        purpose: form.purpose.trim(),
        startsAt: toIsoLike(form.startTime),
        endsAt: toIsoLike(form.endTime),
        geofenceLat: form.latitude ? Number(form.latitude) : null,
        geofenceLng: form.longitude ? Number(form.longitude) : null,
        geofenceRadiusMeters: form.latitude && form.longitude ? 120 : null
      };

      const created = await createHomeownerAppointment(payload);
      setAppointments((current) => [created, ...current]);
      setIsModalOpen(false);
      setForm((current) => ({
        ...current,
        visitorName: "",
        visitorPhone: "",
        visitorEmail: "",
        startTime: "",
        endTime: "",
        latitude: "",
        longitude: "",
        purpose: ""
      }));

      const emailStatus = String(created?.inviteEmailStatus || "").toLowerCase();
      if (emailStatus === "sent") {
        showSuccess("Appointment created and guest email sent automatically.");
      } else if (form.visitorEmail.trim()) {
        showSuccess("Appointment created. Guest invite email was queued but not confirmed sent.");
      } else {
        showSuccess("Appointment created.");
      }
    } catch (error) {
      showError(error?.message || "Unable to create appointment.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-32 overflow-x-hidden">
      <header className="fixed top-0 w-full z-[100] bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors text-slate-600"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Appointments</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Security Access</p>
            </div>
          </div>

          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 transition-all">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
            )}
          </Link>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight">Select Date</h2>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{formatDateHeader(selectedDate)}</span>
          </div>
          <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
            {dateTiles.map((item) => {
              const isActive = selectedDate === item.date;
              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                  className={`flex-shrink-0 w-16 h-24 flex flex-col items-center justify-center rounded-3xl transition-all snap-start ${
                    isActive ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105" : "bg-white border border-slate-100 text-slate-400"
                  }`}
                >
                  <span className="text-[9px] font-black uppercase mb-1">{item.weekday}</span>
                  <span className="text-xl font-black">{item.day}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">Scheduled Visitors</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
              {selectedAppointments.length || 0} Expected
            </span>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-20 bg-white rounded-[2rem] border border-slate-100" />)}
            </div>
          ) : selectedAppointments.length > 0 ? (
            <div className="space-y-3">
              {selectedAppointments.map((appt) => (
                <div key={appt.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center justify-between group shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><User size={22} /></div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{appt.visitorName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {appt.entryPoint || appt.doorName || "Door"} • {appt.visitorContact || appt.visitorEmail || "No contact"}
                      </p>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tight mt-1">
                        {formatDateTime(appt.startsAt)} - {formatDateTime(appt.endsAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center px-6">
              <CalendarOff size={40} className="text-slate-200 mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No scheduled visits</p>
            </div>
          )}
        </section>
      </main>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center hover:bg-indigo-700 active:scale-90 transition-all z-[90] border-4 border-white"
      >
        <Plus size={28} />
      </button>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden"
            >
              <div className="p-8 pb-4 bg-white shrink-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-black text-2xl text-slate-900 tracking-tight">Create Appointment</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Schedule access, use one of your doors, and automatically email the guest invite link.
                </p>
              </div>

              <form onSubmit={handleCreateAppointment} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6 no-scrollbar">
                  <InputField
                    label="Visitor Name"
                    name="visitorName"
                    placeholder="Full Name"
                    icon={<User size={18} />}
                    required
                    value={form.visitorName}
                    onChange={(event) => setForm((current) => ({ ...current, visitorName: event.target.value }))}
                  />
                  <InputField
                    label="Visitor Contact"
                    name="visitorPhone"
                    placeholder="+234..."
                    icon={<Phone size={18} />}
                    required
                    value={form.visitorPhone}
                    onChange={(event) => setForm((current) => ({ ...current, visitorPhone: event.target.value }))}
                  />
                  <InputField
                    label="Visitor Email"
                    name="visitorEmail"
                    type="email"
                    placeholder="guest@example.com"
                    icon={<Mail size={18} />}
                    required
                    value={form.visitorEmail}
                    onChange={(event) => setForm((current) => ({ ...current, visitorEmail: event.target.value }))}
                  />

                  <div className="h-px bg-slate-100 w-full" />

                  <SelectField
                    label="Door / Point of Entry"
                    value={form.doorId}
                    icon={<DoorOpen size={18} />}
                    onChange={(event) => setForm((current) => ({ ...current, doorId: event.target.value }))}
                    options={doors.map((door) => ({
                      value: door.id,
                      label: door.gateLabel || door.name || "Untitled Door"
                    }))}
                    placeholder={doors.length === 0 ? "Create a door first in Doors & Access" : "Select entry point"}
                    required
                    disabled={doors.length === 0}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Start Time"
                      name="startTime"
                      type="datetime-local"
                      icon={<Clock size={18} />}
                      required
                      value={form.startTime}
                      onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                    />
                    <InputField
                      label="End Time"
                      name="endTime"
                      type="datetime-local"
                      icon={<Clock size={18} />}
                      required
                      value={form.endTime}
                      onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                    />
                  </div>

                  <div className="h-px bg-slate-100 w-full" />

                  <div className="space-y-4 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location Security</label>
                      <button type="button" onClick={handleGetLocation} className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase">
                        <Navigation size={12} className={isLocating ? "animate-pulse" : ""} />
                        {isLocating ? "Locating..." : "Use My Location"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      This geofence is what lets QRing alert the homeowner when the guest is close by.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField
                        label="Latitude"
                        name="latitude"
                        placeholder="Optional"
                        icon={<MapPin size={16} />}
                        value={form.latitude}
                        onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                      />
                      <InputField
                        label="Longitude"
                        name="longitude"
                        placeholder="Optional"
                        icon={<MapPin size={16} />}
                        value={form.longitude}
                        onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
                    <div className="relative">
                      <textarea
                        name="purpose"
                        placeholder="Reason for visit..."
                        rows="3"
                        value={form.purpose}
                        onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none resize-none"
                      />
                      <div className="absolute right-5 top-4 text-slate-300"><AlignLeft size={18} /></div>
                    </div>
                  </div>
                  <div className="h-6" />
                </div>

                <div className="p-8 pt-4 bg-white border-t border-slate-100 shrink-0">
                  <button
                    type="submit"
                    disabled={creating || doors.length === 0}
                    className="w-full bg-indigo-600 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {creating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShieldCheck size={18} /> Invite Guest</>}
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

function InputField({ label, icon, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <input
          {...props}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none placeholder:text-slate-300"
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SelectField({ label, icon, options, placeholder, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <select
          {...props}
          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors pointer-events-none">
          {icon}
        </div>
      </div>
    </div>
  );
}

function toDateKey(val) {
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHeader(key) {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toIsoLike(value) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function buildDateTiles() {
  const days = [];
  const now = new Date();
  for (let i = -2; i <= 14; i++) {
    const d = new Date();
    d.setDate(now.getDate() + i);
    days.push({ date: toDateKey(d), day: d.getDate(), weekday: d.toLocaleString("en-US", { weekday: "short" }) });
  }
  return days;
}
