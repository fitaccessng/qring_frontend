import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Group, Settings, Bell, ShieldAlert,
  ChevronLeft, LayoutGrid,
  History, KeyRound, Radio, Check,
  User as UserIcon
} from 'lucide-react';

// Backend & State Imports
import { useAuth } from '../../state/AuthContext';
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { showError, showSuccess } from "../../utils/flash";
import { getHomeownerContext, getHomeownerVisits } from "../../services/homeownerService";
import { getHomeownerSettings } from "../../services/homeownerSettingsService";
import { getActivePanicAlerts, resolvePanicAlert, triggerPanicAlert } from "../../services/safetyService";
import { getCurrentDeviceLocation } from "../../utils/locationService";
import PanicAudioPanel from "../../components/panic/PanicAudioPanel";

export default function ResidentSafetyPage() {
  const navigate = useNavigate();
  const { user, language = 'English', globalUnreadCount = 0 } = useAuth();

  // Logic States
  const [loading, setLoading] = useState(true);
  const [transmissionStatus, setTransmissionStatus] = useState("idle");
  const [homeownerContext, setHomeownerContext] = useState({ managedByEstate: false, estateName: "" });
  const [settings, setSettings] = useState({ knownContacts: [], smsFallbackEnabled: false });
  const [visits, setVisits] = useState([]);
  const [panicAlerts, setPanicAlerts] = useState([]);

  // Interaction & Real-Time Timer States
  const [isHolding, setIsHolding] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [endingAlert, setEndingAlert] = useState(false);
  const holdStartRef = useRef(0);
  const frameRef = useRef(0);
  const activationLockRef = useRef(false);
  const pointerActiveRef = useRef(false);

  // Constants for precision
  const SECURITY_THRESHOLD_MS = 3000; // 3 Seconds
  const CRITICAL_THRESHOLD_MS = 5000; // 5 Seconds

  // Calculations for UI
  const progress = Math.min((elapsedMs / CRITICAL_THRESHOLD_MS) * 100, 100);
  const displaySeconds = (elapsedMs / 1000).toFixed(1);

  // Plan-based messaging
  const planActionLabel = homeownerContext.managedByEstate
    ? "Hold 3s for Guard | 5s for SOS"
    : "Hold 3s for emergency contact | 5s for SOS";

  const securityLabel = homeownerContext.managedByEstate ? "Guard Alert" : "Emergency Contact";

  // Derived State
  const activeAlert = useMemo(() => (panicAlerts || []).find((item) => item.status === "active"), [panicAlerts]);
  const isPanicActive = Boolean(activeAlert);

  async function loadData(background = false) {
    if (!background) setLoading(true);
    try {
      const [vRows, ctx, sett, alerts] = await Promise.all([
        getHomeownerVisits(),
        getHomeownerContext(),
        getHomeownerSettings(),
        getActivePanicAlerts()
      ]);
      setVisits(vRows || []);
      setHomeownerContext(ctx || {});
      setSettings({ knownContacts: sett?.knownContacts || [], smsFallbackEnabled: !!sett?.smsFallbackEnabled });
      setPanicAlerts(alerts || []);
    } catch (err) {
      if (err.status !== 401) console.error("Safety sync failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useSocketEvents(useMemo(() => ({
    panic_alert: () => loadData(true),
    panic_alert_update: () => loadData(true)
  }), []));

  useEffect(() => {
    if (!isHolding || isPanicActive || transmissionStatus !== "idle") {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      return () => {};
    }

    const update = (now) => {
      const delta = now - holdStartRef.current;
      if (delta >= CRITICAL_THRESHOLD_MS) {
        setElapsedMs(CRITICAL_THRESHOLD_MS);
        handlePanicActivation("critical");
        return;
      }
      setElapsedMs(delta);
      frameRef.current = requestAnimationFrame(update);
    };

    frameRef.current = requestAnimationFrame(update);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [isHolding, isPanicActive, transmissionStatus]);

  function beginHold() {
    if (isPanicActive || transmissionStatus !== "idle" || activationLockRef.current || pointerActiveRef.current) return;
    pointerActiveRef.current = true;
    holdStartRef.current = performance.now();
    setElapsedMs(0);
    setIsHolding(true);
  }

  function endHold() {
    if (!pointerActiveRef.current && !isHolding) return;
    pointerActiveRef.current = false;
    const heldForMs = Math.max(performance.now() - holdStartRef.current, elapsedMs);
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    setIsHolding(false);
    setElapsedMs(0);
    holdStartRef.current = 0;

    if (heldForMs >= SECURITY_THRESHOLD_MS && heldForMs < CRITICAL_THRESHOLD_MS) {
      handlePanicActivation("security");
    }
  }

  const handlePanicActivation = async (severity) => {
    if (activationLockRef.current) return;
    activationLockRef.current = true;
    setIsHolding(false);
    setElapsedMs(0);
    holdStartRef.current = 0;
    pointerActiveRef.current = false;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }

    if (!homeownerContext.managedByEstate && !settings.knownContacts.length) {
      activationLockRef.current = false;
      showError("Please add emergency contacts first.");
      return navigate("/dashboard/homeowner/emergency-contacts");
    }

    setTransmissionStatus("sending");

    try {
      let location = null;
      try {
        const geo = await getCurrentDeviceLocation({ enableHighAccuracy: true });
        if (geo?.ok && geo?.coords) {
          location = {
            lat: Number(geo.coords.latitude),
            lng: Number(geo.coords.longitude),
            source: "device_gps"
          };
        }
      } catch {
        // Best-effort location for emergency routing.
      }
      navigator.vibrate?.(severity === 'critical' ? [200, 100, 200, 100, 500] : [100, 50, 100]);
      await triggerPanicAlert({
        userId: user?.id,
        triggerMode: severity === "critical" ? "hold-critical" : "hold-security",
        location
      });
      setTransmissionStatus("success");
      showSuccess(severity === "critical" ? "Critical SOS sent." : `${securityLabel} alert sent.`);
      setTimeout(() => {
        activationLockRef.current = false;
        setTransmissionStatus("idle");
        loadData(true);
      }, 3000);
    } catch (err) {
      activationLockRef.current = false;
      showError(err?.message || "Transmission failed.");
      setTransmissionStatus("idle");
    }
  };

  async function handleEndAlert() {
    if (!activeAlert?.id || endingAlert) return;
    setEndingAlert(true);
    try {
      await resolvePanicAlert(activeAlert.id);
      showSuccess("Alert ended.");
      await loadData(true);
    } catch (err) {
      showError(err?.message || "Failed to end alert.");
    } finally {
      setEndingAlert(false);
    }
  }

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-700 ${isPanicActive ? 'bg-rose-50' : 'bg-[#fcfcfd]'}`}>

      {/* Header */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Safety Center</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {isPanicActive ? '🔴 Emergency Active' : '🟢 System Armed'}
              </p>
            </div>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full">
            <Bell size={18} />
            {globalUnreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />}
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-40 px-6 max-w-2xl mx-auto space-y-6">

        {/* Panic Button Area */}
        <section className={`relative py-12 flex flex-col items-center justify-center rounded-[3.5rem] transition-all duration-700 overflow-hidden border ${
          isPanicActive ? 'bg-rose-600 border-rose-500 shadow-2xl shadow-rose-200' : 'bg-white border-slate-100 shadow-sm'
        }`}>

          {/* Overlays */}
          {transmissionStatus === "sending" && (
            <div className="absolute inset-0 z-50 bg-white/95 flex flex-col items-center justify-center animate-in fade-in">
              <Radio className="text-indigo-600 animate-ping mb-4" size={60} />
              <p className="font-black text-indigo-900 uppercase tracking-[0.2em] text-xs text-center">Broadcasting Signal...</p>
            </div>
          )}

          {transmissionStatus === "success" && (
            <div className="absolute inset-0 z-50 bg-emerald-500 flex flex-col items-center justify-center animate-in zoom-in">
              <Check className="text-white" size={32} strokeWidth={3} />
              <p className="font-black text-white uppercase tracking-widest text-sm mt-4">Signal Confirmed</p>
            </div>
          )}

          {/* Precision Button */}
          <div
            className={`relative touch-none mb-10 ${isPanicActive ? 'cursor-default' : 'cursor-pointer'}`}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              beginHold();
            }}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
          >
            {isHolding && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white text-[11px] font-black px-4 py-1.5 rounded-full border-2 border-white shadow-xl tabular-nums">
                    {displaySeconds}s
                </div>
            )}

            <div className={`w-64 h-64 rounded-full border-[12px] flex items-center justify-center relative transition-all duration-300 ${
              isHolding ? 'scale-95 border-slate-100' : 'border-slate-50 shadow-inner'
            }`}>
              {/* Radial Progress */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                {!isPanicActive && (
                  <circle
                    cx="50%" cy="50%" r="120"
                    stroke={elapsedMs >= SECURITY_THRESHOLD_MS ? (elapsedMs >= 4500 ? "#e11d48" : "#f59e0b") : "#4f46e5"}
                    strokeWidth="12" fill="transparent" strokeDasharray="753"
                    strokeDashoffset={753 - (753 * progress) / 100} strokeLinecap="round"
                    className="transition-all duration-75 ease-linear"
                  />
                )}
              </svg>

              <div className={`w-48 h-48 rounded-full flex flex-col items-center justify-center text-white p-6 shadow-2xl transition-all duration-500 ${
                isPanicActive ? 'bg-white !text-rose-600' : isHolding ? 'bg-slate-900' : 'bg-indigo-600'
              }`}>
                {isPanicActive ? <ShieldAlert size={56} className="animate-bounce" /> : <Shield size={56} fill="currentColor" />}
                <span className="font-black text-2xl uppercase tracking-tighter mt-2">{isPanicActive ? "SOS" : "Panic"}</span>
              </div>
            </div>
          </div>

          {/* Segmented Progress Bar & Plan Labels */}
          <div className="w-full px-12 text-center">
            <div className="h-3 w-full bg-slate-50 rounded-full flex gap-1 p-1 border border-slate-100 mb-6">
                <div className="h-full rounded-l-full bg-indigo-500 transition-all duration-75" style={{ width: `${Math.min(progress, 60)}%` }} />
                <div className="h-full bg-amber-500 transition-all duration-75" style={{ width: `${progress > 60 ? Math.min(progress - 60, 35) : 0}%` }} />
                <div className="h-full rounded-r-full bg-rose-500 transition-all duration-75" style={{ width: `${progress > 95 ? progress - 95 : 0}%` }} />
            </div>

            <div className="space-y-1">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isPanicActive ? 'text-rose-100' : 'text-slate-900'}`}>
                    {isHolding
                        ? (elapsedMs >= 4500 ? 'READY: CRITICAL SOS' : elapsedMs >= 3000 ? `READY: ${securityLabel.toUpperCase()}` : 'KEEP HOLDING...')
                        : isPanicActive ? 'HELP IS ON THE WAY' : securityLabel}
                </p>
                <p className={`text-[9px] font-bold ${isPanicActive ? 'text-rose-200' : 'text-slate-400'}`}>
                    {isPanicActive ? "Estate Security and Emergency Services notified." : planActionLabel}
                </p>
            </div>

            {isPanicActive ? (
              <div className="mt-6 space-y-4">
                <PanicAudioPanel alert={activeAlert} canEnd compact />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleEndAlert}
                    disabled={endingAlert}
                    className="rounded-full bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 shadow-lg disabled:opacity-60"
                  >
                    {endingAlert ? "Ending..." : "End Alert"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Action Grid */}
        <section className="grid grid-cols-2 gap-4">
          <BentoSmall icon={<Group size={20} />} label="Rescue Circle" value={`${settings.knownContacts.length} Contacts`} onClick={() => navigate("/dashboard/homeowner/emergency-contacts")} />
          <BentoSmall icon={<Settings size={20} />} label="Panic Settings" value="SMS & GPS" onClick={() => navigate("/dashboard/homeowner/settings")} />
        </section>
      </main>

      {/* Navigation */}
     
    </div>
  );
}

function ProgressStep({ label, active }) {
  return (
    <div className="flex flex-col items-center gap-2 relative z-10">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] border-2 ${active ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-100 text-rose-200'}`}>
        {active ? <CheckCircle2 size={14} /> : '•'}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </div>
  );
}

function BentoSmall({ icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 text-left shadow-sm">
      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">{icon}</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className="text-xs font-bold text-slate-900">{value}</p>
    </button>
  );
}

function NavItem({ to, icon, label, active = false }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`${active ? 'bg-indigo-50 p-2 rounded-xl' : 'p-2'}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase mt-0.5 tracking-tight">{label}</span>
    </Link>
  );
}
