import { useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import {
  createHomeownerAppointment,
  getHomeownerAppointments,
  getHomeownerDoors,
  shareHomeownerAppointment
} from "../../services/homeownerService";
import { getCurrentDeviceLocation, openLocationSettings } from "../../utils/locationService";

export default function HomeownerAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [doorOptions, setDoorOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [sharingId, setSharingId] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [openingLocationSettings, setOpeningLocationSettings] = useState(false);
  const autoLocateAttemptedRef = useRef(false);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [form, setForm] = useState(() => {
    const start = new Date(Date.now() + 20 * 60 * 1000);
    const end = new Date(Date.now() + 80 * 60 * 1000);
    return {
      doorId: "",
      visitorName: "",
      visitorContact: "",
      purpose: "",
      startsAt: toLocalInputValue(start),
      endsAt: toLocalInputValue(end),
      geofenceLat: "",
      geofenceLng: "",
      geofenceRadiusMeters: "50"
    };
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [appointmentsData, doorsData] = await Promise.all([
        getHomeownerAppointments(),
        getHomeownerDoors()
      ]);
      const rows = Array.isArray(appointmentsData) ? appointmentsData : [];
      const doors = Array.isArray(doorsData?.doors) ? doorsData.doors : [];
      setAppointments(rows);
      setDoorOptions(doors);
      setForm((prev) => ({ ...prev, doorId: prev.doorId || doors?.[0]?.id || "" }));
    } catch (requestError) {
      setError(requestError.message ?? "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoLocateAttemptedRef.current) return;
    autoLocateAttemptedRef.current = true;
    handleUseCurrentLocation();
  }, []);

  const dateTiles = useMemo(() => buildMonthDateTiles(appointments), [appointments]);
  const selectedRows = useMemo(
    () => appointments.filter((row) => toDateKey(row?.startsAt) === selectedDate),
    [appointments, selectedDate]
  );
  const shareHistory = useMemo(
    () =>
      appointments
        .filter((row) => row?.shareTokenCreatedAt)
        .sort((a, b) => new Date(b.shareTokenCreatedAt).getTime() - new Date(a.shareTokenCreatedAt).getTime())
        .slice(0, 8),
    [appointments]
  );

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const created = await createHomeownerAppointment({
        doorId: form.doorId,
        visitorName: form.visitorName,
        visitorContact: form.visitorContact,
        purpose: form.purpose,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        geofenceLat: form.geofenceLat ? Number(form.geofenceLat) : null,
        geofenceLng: form.geofenceLng ? Number(form.geofenceLng) : null,
        geofenceRadiusMeters: form.geofenceRadiusMeters ? Number(form.geofenceRadiusMeters) : 50
      });
      if (created?.id) {
        setAppointments((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
        if (created?.startsAt) {
          setSelectedDate(toDateKey(created.startsAt));
        }
      }
      setForm((prev) => ({
        ...prev,
        visitorName: "",
        visitorContact: "",
        purpose: ""
      }));
    } catch (requestError) {
      setError(requestError.message ?? "Failed to create appointment.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUseCurrentLocation() {
    setLocating(true);
    setError("");
    try {
      const location = await getCurrentDeviceLocation({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
        maxCachedAgeMs: 10 * 60 * 1000
      });
      if (!location.ok) {
        setLocationBlocked(true);
        if (location.reason === "permission_denied") {
          setError("Location permission denied. Please enable location in settings.");
        } else if (location.reason === "service_off") {
          setError("Location service is off. Please turn it on and try again.");
        } else {
          setError("Unable to read current location.");
        }
        return;
      }

      const lat = Number(location?.coords?.latitude);
      const lng = Number(location?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setLocationBlocked(true);
        setError("Unable to read current location.");
        return;
      }

      setLocationBlocked(false);
      setForm((prev) => ({
        ...prev,
        geofenceLat: lat.toFixed(6),
        geofenceLng: lng.toFixed(6)
      }));
    } finally {
      setLocating(false);
    }
  }

  async function handleOpenLocationSettings() {
    setOpeningLocationSettings(true);
    const opened = await openLocationSettings();
    if (!opened) {
      setError("Unable to open settings automatically. Enable location from device settings.");
    }
    setOpeningLocationSettings(false);
  }

  async function handleShare(appointmentId) {
    setSharingId(appointmentId);
    setError("");
    try {
      const data = await shareHomeownerAppointment(appointmentId);
      const shareUrl = String(data?.shareUrl || "").trim();
      if (!shareUrl) throw new Error("Share link unavailable.");
      const shareMode = await shareAppointmentLink(shareUrl);
      if (shareMode === "clipboard") {
        window.dispatchEvent(
          new CustomEvent("qring:flash", {
            detail: {
              type: "success",
              title: "Copied",
              message: "Appointment link copied to clipboard."
            }
          })
        );
      }
      await loadData();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to share appointment.");
    } finally {
      setSharingId("");
    }
  }

  return (
    <AppShell title="Appointments">
      <div className="mx-auto w-full max-w-4xl space-y-5 px-1 pb-14 sm:space-y-6 sm:px-2">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

          <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Calendar</h3>
          <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
            {dateTiles.map((item) => (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDate(item.date)}
                className={`min-w-[4.6rem] snap-start rounded-2xl px-2.5 py-2.5 text-center transition-all sm:min-w-[5rem] sm:px-3 sm:py-3 ${
                  item.date === selectedDate
                    ? "bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)]"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${item.date === selectedDate ? "text-violet-100" : "text-slate-500"}`}>{item.month}</p>
                <p className="mt-1 text-2xl font-black sm:text-3xl">{item.day}</p>
                <p className={`mt-1 text-[11px] font-semibold ${item.date === selectedDate ? "text-violet-100" : "text-slate-500"}`}>{item.weekday}</p>
                <p className={`mt-1 text-[10px] font-semibold ${item.date === selectedDate ? "text-violet-200" : "text-slate-400"}`}>{item.count}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {loading ? <p className="text-sm text-slate-500">Loading appointments...</p> : null}
            {!loading && selectedRows.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments for selected date.</p>
            ) : null}
            {selectedRows.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{appt.visitorName}</p>
                  <p className="text-xs text-slate-500">{new Date(appt.startsAt).toLocaleString()} - {appt.statusLabel || appt.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleShare(appt.id)}
                  disabled={sharingId === appt.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {sharingId === appt.id ? "Sharing..." : "Share"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Create Appointment</h3>
          <p className="mt-1 text-xs text-slate-500">Generate scheduled access and share a secure link with visitor.</p>
          <form onSubmit={handleCreate} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Visitor Name</span>
              <input
                value={form.visitorName}
                onChange={(event) => setForm((prev) => ({ ...prev, visitorName: event.target.value }))}
                placeholder="Visitor name"
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Visitor Contact</span>
              <input
                value={form.visitorContact}
                onChange={(event) => setForm((prev) => ({ ...prev, visitorContact: event.target.value }))}
                placeholder="Phone or email"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Door</span>
              <select
                value={form.doorId}
                onChange={(event) => setForm((prev) => ({ ...prev, doorId: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              >
                {doorOptions.map((door) => (
                  <option key={door.id} value={door.id}>
                    {door.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start Time</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">End Time</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Latitude (optional)</span>
              <input
                value={form.geofenceLat}
                onChange={(event) => setForm((prev) => ({ ...prev, geofenceLat: event.target.value }))}
                placeholder="e.g. 6.524379"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Longitude (optional)</span>
              <input
                value={form.geofenceLng}
                onChange={(event) => setForm((prev) => ({ ...prev, geofenceLng: event.target.value }))}
                placeholder="e.g. 3.379206"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition-all active:scale-95 disabled:opacity-50 dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300"
              >
                {locating ? "Capturing location..." : "Use current location"}
              </button>
              {locationBlocked ? (
                <button
                  type="button"
                  onClick={handleOpenLocationSettings}
                  disabled={openingLocationSettings}
                  className="ml-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-all active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {openingLocationSettings ? "Opening Settings..." : "Turn On Location"}
                </button>
              ) : null}
            </div>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Purpose</span>
              <textarea
                value={form.purpose}
                onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                placeholder="Reason for appointment"
                rows={2}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="sm:col-span-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Appointment"}
            </button>
          </form>
        </section>

      

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Share History</h3>
          <div className="mt-3 space-y-2">
            {shareHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No shares yet.</p>
            ) : (
              shareHistory.map((row) => (
                <div
                  key={`share-${row.id}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{row.visitorName}</p>
                  <p className="text-xs text-slate-500">
                    Shared: {new Date(row.shareTokenCreatedAt).toLocaleString()} | Status: {row.statusLabel || row.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthDateTiles(rows) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const counts = rows.reduce((acc, row) => {
    const key = toDateKey(row?.startsAt);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Array.from({ length: daysInMonth }).map((_, idx) => {
    const date = new Date(year, month, idx + 1);
    const key = toDateKey(date);
    return {
      date: key,
      day: date.getDate(),
      month: date.toLocaleString(undefined, { month: "short" }),
      weekday: date.toLocaleString(undefined, { weekday: "short" }),
      count: counts[key] ?? 0
    };
  });
}

function toLocalInputValue(date) {
  const dt = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dt.getTime())) return "";
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function shareAppointmentLink(shareUrl) {
  const payload = {
    title: "Qring Secure Appointment Invitation",
    text: "You are invited for a scheduled visit. Open this secure link to confirm your appointment and receive QR access.",
    url: shareUrl
  };

  const nativeShare = globalThis?.Capacitor?.Plugins?.Share;
  if (nativeShare?.share) {
    await nativeShare.share({
      ...payload,
      dialogTitle: "Share appointment"
    });
    return "native";
  }

  if (navigator.share) {
    await navigator.share(payload);
    return "web";
  }

  await navigator.clipboard.writeText(shareUrl);
  return "clipboard";
}
