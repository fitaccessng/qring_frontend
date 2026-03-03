import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  acceptVisitorAppointment,
  resolveVisitorAppointment,
  signalVisitorAppointmentArrival
} from "../../services/homeownerService";
import {
  checkLocationPermission,
  getCurrentDeviceLocation,
  openLocationSettings,
  requestLocationPermission
} from "../../utils/locationService";

const DEVICE_STORAGE_KEY = "qring_visitor_device_id";
const ARRIVAL_QUEUE_STORAGE_KEY = "qring_arrival_retry_queue";

function getOrCreateVisitorDeviceId() {
  const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (existing) return existing;
  const next = `visitor-device-${Math.random().toString(36).slice(2, 11)}`;
  localStorage.setItem(DEVICE_STORAGE_KEY, next);
  return next;
}

function readArrivalQueue() {
  try {
    const raw = localStorage.getItem(ARRIVAL_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArrivalQueue(queue) {
  try {
    localStorage.setItem(ARRIVAL_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Best effort only.
  }
}

function pushArrivalQueue(item) {
  const queue = readArrivalQueue();
  queue.push(item);
  writeArrivalQueue(queue.slice(-30));
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const earth = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getNativeGeolocation() {
  try {
    const moduleName = "@capacitor/geolocation";
    const mod = await import(/* @vite-ignore */ moduleName);
    return mod?.Geolocation ?? null;
  } catch {
    return null;
  }
}

async function ensureLocationPermission() {
  const permission = await requestLocationPermission();
  return permission.granted;
}

export default function AppointmentPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointment, setAppointment] = useState(null);
  const [visitorName, setVisitorName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [arrivalArmed, setArrivalArmed] = useState(false);
  const [arrivalStatus, setArrivalStatus] = useState("");
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [openingLocationSettings, setOpeningLocationSettings] = useState(false);
  const watchRef = useRef({ type: null, id: null });
  const pollTimerRef = useRef(null);
  const arrivedRef = useRef(false);
  const deviceId = useMemo(() => getOrCreateVisitorDeviceId(), []);

  async function flushQueuedArrivals() {
    const queue = readArrivalQueue();
    if (queue.length === 0) return;
    const pending = [];
    for (const item of queue) {
      try {
        await signalVisitorAppointmentArrival(item.appointmentId, item.payload);
      } catch {
        pending.push(item);
      }
    }
    writeArrivalQueue(pending);
  }

  function stopGeofenceWatch() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    const watch = watchRef.current;
    if (watch?.id == null) return;
    if (watch.type === "browser" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watch.id);
    }
    if (watch.type === "capacitor") {
      getNativeGeolocation().then((plugin) => plugin?.clearWatch?.({ id: watch.id }).catch(() => {}));
    }
    watchRef.current = { type: null, id: null };
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await resolveVisitorAppointment(shareToken);
        if (!active) return;
        setAppointment(data);
        setVisitorName(data?.visitorName || "");
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || "Unable to resolve appointment link.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [shareToken]);

  useEffect(
    () => () => {
      stopGeofenceWatch();
    },
    []
  );

  useEffect(() => {
    let active = true;
    async function checkLocationAccess() {
      try {
        const permission = await checkLocationPermission();
        if (!active) return;
        if (permission.granted) return;
        setLocationBlocked(true);
        setArrivalStatus("Location is currently off. Enable it before continuing.");
      } catch {
        // Non-blocking; location flow still handles this during acceptance.
      }
    }
    checkLocationAccess();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    flushQueuedArrivals();
    const handleOnline = () => {
      flushQueuedArrivals();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        flushQueuedArrivals();
      }
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  async function armGeofenceAndSignal(arrivalConfig, appointmentId) {
    if (!arrivalConfig) return;
    const { lat, lng, radiusMeters } = arrivalConfig;
    if (typeof lat !== "number" || typeof lng !== "number") return;
    const radius = Number(radiusMeters || 120);
    setArrivalArmed(true);
    setLocationBlocked(false);
    setArrivalStatus("Geofence armed. Monitoring arrival...");
    await flushQueuedArrivals();

    const sendArrivalSignal = async (currentLat, currentLng) => {
      let batteryPct = null;
      try {
        if (typeof navigator.getBattery === "function") {
          const battery = await navigator.getBattery();
          batteryPct = Math.round((battery?.level || 0) * 100);
        }
      } catch {
        batteryPct = null;
      }
      const payload = {
        shareToken,
        deviceId,
        lat: currentLat,
        lng: currentLng,
        batteryPct
      };
      try {
        await signalVisitorAppointmentArrival(appointmentId, payload);
        setArrivalStatus("Arrival detected and sent to homeowner.");
      } catch (requestError) {
        pushArrivalQueue({
          appointmentId,
          payload,
          createdAt: new Date().toISOString()
        });
        setArrivalStatus(requestError.message || "Arrival queued. Will retry when network improves.");
      }
    };

    const onPosition = async (coords) => {
      if (arrivedRef.current) return;
      const currentLat = coords?.latitude;
      const currentLng = coords?.longitude;
      if (typeof currentLat !== "number" || typeof currentLng !== "number") return;
      const d = distanceMeters(currentLat, currentLng, lat, lng);
      setArrivalStatus(`Distance to property: ${Math.round(d)}m`);
      if (d > radius) return;
      arrivedRef.current = true;
      stopGeofenceWatch();
      await sendArrivalSignal(currentLat, currentLng);
    };

    const geolocationPlugin = await getNativeGeolocation();
    if (geolocationPlugin) {
      try {
        const permission = await requestLocationPermission();
        if (!permission.granted) {
          setLocationBlocked(true);
          setArrivalStatus("Location permission is off. Turn on location to continue.");
          return;
        }
        const nativeWatchId = await geolocationPlugin.watchPosition(
          {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 45000
          },
          (position, nativeError) => {
            if (nativeError) {
              setLocationBlocked(true);
              setArrivalStatus("Location is unavailable. Please enable device location.");
              return;
            }
            onPosition(position?.coords);
          }
        );
        watchRef.current = { type: "capacitor", id: nativeWatchId };
      } catch {
        // Fallback to browser geolocation below.
      }
    }

    if (watchRef.current.id == null && navigator.geolocation) {
      const browserWatchId = navigator.geolocation.watchPosition(
        (position) => onPosition(position?.coords),
        (browserError) => {
          setLocationBlocked(true);
          if (Number(browserError?.code) === 1) {
            setArrivalStatus("Location permission denied. Enable location access to continue.");
            return;
          }
          setArrivalStatus("Location is unavailable. Please enable device location.");
        },
        {
          enableHighAccuracy: false,
          maximumAge: 45000,
          timeout: 20000
        }
      );
      watchRef.current = { type: "browser", id: browserWatchId };
    }

    if (watchRef.current.id == null) {
      setLocationBlocked(true);
      setArrivalStatus("Location service unavailable on this device.");
      return;
    }

    const pollPosition = async () => {
      if (arrivedRef.current || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) => onPosition(position?.coords),
        () => {},
        {
          enableHighAccuracy: false,
          maximumAge: 60000,
          timeout: 15000
        }
      );
    };
    pollTimerRef.current = setInterval(pollPosition, 45000);
    pollPosition();
  }

  async function handleOpenLocationSettings() {
    setOpeningLocationSettings(true);
    const opened = await openLocationSettings();
    setOpeningLocationSettings(false);
    if (!opened) {
      setArrivalStatus("Unable to open settings automatically. Open your device settings and enable location.");
    }
  }

  async function handleAccept() {
    if (!appointment?.id) return;
    setAccepting(true);
    setError("");
    try {
      const hasLocationPermission = await ensureLocationPermission();
      if (!hasLocationPermission) {
        setLocationBlocked(true);
        setArrivalStatus("Location is required before accepting this appointment.");
        return;
      }
      const quickLocationCheck = await getCurrentDeviceLocation({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 120000,
        maxCachedAgeMs: 10 * 60 * 1000
      });
      if (!quickLocationCheck.ok && quickLocationCheck.reason === "service_off") {
        setLocationBlocked(true);
        setArrivalStatus("Location service is off. Please turn it on before accepting.");
        return;
      }
      const data = await acceptVisitorAppointment(appointment.id, {
        shareToken,
        deviceId,
        visitorName: visitorName.trim() || appointment.visitorName
      });
      await armGeofenceAndSignal(data?.geofence, appointment.id);
      if (data?.scanQrToken) {
        navigate(`/scan/${data.scanQrToken}`);
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to accept appointment.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <article className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-soft dark:border-slate-800 dark:bg-slate-900/85">
        <h1 className="font-heading text-3xl font-bold">Appointment Access</h1>
        {loading ? <p className="mt-4 text-sm text-slate-500">Loading appointment...</p> : null}
        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
        {!loading && appointment ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-wide text-slate-500">Purpose</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {appointment.purpose || "Scheduled visit"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Window: {new Date(appointment.startsAt).toLocaleString()} - {new Date(appointment.endsAt).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">Status: {appointment.status}</p>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Your Name</span>
              <input
                value={visitorName}
                onChange={(event) => setVisitorName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Enter your name"
                required
              />
            </label>

            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {accepting ? "Accepting..." : "Accept Appointment and Continue"}
            </button>

            {locationBlocked && !arrivalArmed ? (
              <button
                type="button"
                onClick={handleOpenLocationSettings}
                disabled={openingLocationSettings}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {openingLocationSettings ? "Opening Settings..." : "Turn On Location"}
              </button>
            ) : null}

            {arrivalArmed ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{arrivalStatus}</p>
                {locationBlocked ? (
                  <button
                    type="button"
                    onClick={handleOpenLocationSettings}
                    disabled={openingLocationSettings}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {openingLocationSettings ? "Opening Settings..." : "Turn On Location"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}
