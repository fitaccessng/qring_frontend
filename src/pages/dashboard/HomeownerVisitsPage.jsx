import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft, Bell, Clock3, UserCircle2, CalendarOff,
  ShieldCheck, Phone, Video, MessageCircle, LogOut
} from "lucide-react";

import { decideVisit, endHomeownerSession, getHomeownerAppointments, getHomeownerVisits, startSessionCall } from "../../services/homeownerService";
import { useNotifications } from "../../state/NotificationsContext";

export default function HomeownerVisitsPage() {
  const navigate = useNavigate();
  const { refresh, syncVisitRequestNotifications, unreadCount } = useNotifications();

  // --- Refs & State ---
  const scrollContainerRef = useRef(null);
  const inFlightRef = useRef(false);

  const [rows, setRows] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [endingId, setEndingId] = useState("");
  const [callBusyId, setCallBusyId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  // --- Force Top of Page on Mount ---
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- Data Loading ---
  const loadVisits = useCallback(async ({ background = false, force = false } = {}) => {
    if (inFlightRef.current && !force) return;
    inFlightRef.current = true;
    if (!background) { setLoading(true); setError(""); }
    try {
      const [visitData, appointmentData] = await Promise.all([
        getHomeownerVisits(),
        getHomeownerAppointments()
      ]);
      setRows(visitData || []);
      setAppointments(appointmentData || []);
    } catch (err) {
      if (!background) setError(err.message ?? "Failed to load visits");
    } finally {
      if (!background) setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => { loadVisits({ force: true }); }, [loadVisits]);

  // --- Auto-Scroll to Today ---
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('.bg-indigo-600');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
      }
    }
  }, [loading]);

  // --- Filtering & Logic ---
  const dateScopedRows = useMemo(() => rows.filter((r) => toDateKey(r?.time || r?.startedAt) === selectedDate), [rows, selectedDate]);
  const dateScopedAppointments = useMemo(() => appointments.filter((a) => toDateKey(a?.startsAt) === selectedDate), [appointments, selectedDate]);

  const filteredItems = useMemo(() => {
    if (activeTab === "scheduled") return dateScopedAppointments.map(item => ({ ...item, __isAppt: true }));
    if (activeTab === "all") return dateScopedRows;
    return dateScopedRows.filter((row) => normalizeVisitState(row) === activeTab);
  }, [dateScopedRows, dateScopedAppointments, activeTab]);

  const stats = useMemo(() => ({
    scheduled: dateScopedAppointments.length,
    inprogress: dateScopedRows.filter(r => normalizeVisitState(r) === 'inprogress').length,
    accepted: dateScopedRows.filter(r => normalizeVisitState(r) === 'accepted').length
  }), [dateScopedAppointments, dateScopedRows]);

  const dateTiles = useMemo(() => buildMonthDateTiles(), []);

  // --- Handlers ---
  async function handleDecision(sessionId, action) {
    setBusyId(sessionId);
    try {
      await decideVisit(sessionId, action);
      await syncVisitRequestNotifications(sessionId);
      await refresh();
      loadVisits({ background: true });
    } catch (err) { setError(err.message); } finally { setBusyId(""); }
  }

  async function handleEndSession(sessionId) {
    setEndingId(sessionId);
    try {
      await endHomeownerSession(sessionId);
      loadVisits({ background: true });
    } catch (err) { setError(err.message); } finally { setEndingId(""); }
  }

  async function handleStartCall(sessionId, type) {
    const nextType = type === "video" ? "video" : "audio";
    const busyKey = `${sessionId}:${nextType}`;
    setCallBusyId(busyKey);
    try {
      const response = await startSessionCall({
        sessionId,
        type: nextType,
        hasVideo: nextType === "video"
      });
      const data = response?.data ?? response ?? {};
      window.sessionStorage.setItem(
        "qring_call_start_intent",
        JSON.stringify({
          pending: true,
          sessionId,
          mode: nextType,
          callSessionId: data?.callSessionId || "",
          visitorId: data?.visitorId || sessionId,
          rtcConfig: data?.rtcConfig || null
        })
      );
      navigate(`/session/${sessionId}/${nextType}`);
    } catch (err) {
      setError(err?.message || `Unable to start ${nextType} call.`);
    } finally {
      setCallBusyId("");
    }
  }

  return (
    <div className="bg-slate-50/60 min-h-screen font-sans pb-24 overflow-x-hidden flex flex-col antialiased">
      
      {/* FIXED STATIC HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 px-4 py-3.5 sm:py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight">Activity Log</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link 
              to="/dashboard/notifications" 
              className="relative p-2 sm:p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-all"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Structural Content Flex Container */}
      <main className="px-4 sm:px-6 py-6 max-w-4xl w-full mx-auto space-y-6 sm:space-y-8 flex-1">
        
        {/* Horizontal Calendar Section */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex justify-between items-baseline px-1">
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">Timeline</h2>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{formatDateHeader(selectedDate)}</span>
          </div>

          <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-100/50">
            <div
              ref={scrollContainerRef}
              className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar snap-x scroll-smooth"
            >
                {dateTiles.map((item) => {
                  const isToday = item.date === toDateKey(new Date());
                  const isActive = selectedDate === item.date;
                  return (
                    <button
                        key={item.date}
                        onClick={() => setSelectedDate(item.date)}
                        className={`flex-shrink-0 w-12 sm:w-14 h-16 sm:h-20 flex flex-col items-center justify-center rounded-2xl transition-all snap-start relative ${
                        isActive
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-100 z-10"
                            : "bg-slate-50/60 text-slate-400 hover:bg-slate-100/80"
                        }`}
                    >
                        {isToday && !isActive && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tight mb-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>{item.month}</span>
                        <span className="text-sm sm:text-lg font-black leading-tight">{item.day}</span>
                        <span className={`text-[7px] sm:text-[8px] font-bold opacity-75 uppercase ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{item.weekday}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </section>

        {/* Optimized Grid Layout for Stats Panel */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <StatBox label="Scheduled" value={stats.scheduled} color="text-indigo-600" bgColor="bg-indigo-50/30" />
          <StatBox label="Active" value={stats.inprogress} color="text-amber-600" bgColor="bg-amber-50/30" />
          <StatBox label="Completed" value={stats.accepted} color="text-emerald-600" bgColor="bg-emerald-50/30" />
        </section>

        {/* Tab Selection Filter Controls */}
        <section className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {["all", "scheduled", "inprogress", "accepted"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-sm" 
                  : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab === 'inprogress' ? 'In Progress' : tab}
            </button>
          ))}
        </section>

        {/* Activity Streams Output Wrapper */}
        <section className="space-y-4 pb-12">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 uppercase tracking-tight">
              {error}
            </div>
          )}

          {loading ? (
             <div className="py-20 text-center space-y-4">
                <div className="w-10 h-10 border-3 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updating Records</p>
             </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-[2rem] bg-white border border-slate-100">
               <CalendarOff size={36} className="mx-auto text-slate-300 mb-3" />
               <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">No activity found</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ActivityCard
                key={`${item.__isAppt ? 'appt' : 'visit'}-${item.id}`}
                item={item}
                isAppt={!!item.__isAppt || activeTab === 'scheduled'}
                busyId={busyId}
                endingId={endingId}
                onApprove={() => handleDecision(item.id, "approve")}
                onReject={() => handleDecision(item.id, "reject")}
                onEnd={() => handleEndSession(item.id)}
                onChat={() => navigate(`/dashboard/homeowner/messages?sessionId=${item.id}`)}
                onAudioCall={() => handleStartCall(item.id, "audio")}
                onVideoCall={() => handleStartCall(item.id, "video")}
                callBusyId={callBusyId}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

// --- Internal Components ---

function StatBox({ label, value, color, bgColor }) {
    return (
        <div className={`bg-white border border-slate-100/60 p-3 sm:p-4 rounded-2xl sm:rounded-[1.8rem] flex flex-col items-center shadow-sm w-full`}>
            <span className={`text-xl sm:text-2xl font-black ${color} flex items-center justify-center ${bgColor} w-9 h-9 sm:w-11 sm:h-11 rounded-xl mb-1`}>{value}</span>
            <span className="text-[8px] sm:text-[9px] font-extrabold text-slate-400 uppercase tracking-tight text-center">{label}</span>
        </div>
    );
}

function ActivityCard({ item, isAppt, busyId, endingId, callBusyId, onApprove, onReject, onEnd, onChat, onAudioCall, onVideoCall }) {
    const status = normalizeVisitState(item);
    const isBusy = busyId === item.id || endingId === item.id;
    const audioBusy = callBusyId === `${item.id}:audio`;
    const videoBusy = callBusyId === `${item.id}:video`;

    return (
      <div className="bg-white border border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-sm relative overflow-hidden group">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-[1.2rem] bg-slate-950 flex items-center justify-center text-white shrink-0">
               <UserCircle2 size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate">{item.visitor || item.visitorName || "Guest"}</h4>
              <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">{item.door || item.doorName || "Main Gate"}</p>
            </div>
          </div>
          <div className={`self-start xs:self-auto px-2.5 py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
            isAppt ? 'bg-indigo-50 text-indigo-600' :
            status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
            status === 'reject' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {isAppt ? 'Scheduled' : status === 'inprogress' ? 'Active' : status}
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100/55">
            <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
              "{item.purpose || item.reason || "Verification requested for residential entry."}"
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><Clock3 size={13} className="text-indigo-500"/> {formatTime(item.time || item.startedAt || item.startsAt)}</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-indigo-500"/> SECURE_LINK</div>
          </div>
        </div>

        {/* Dynamic Mobile-First Action Area */}
        <div className="mt-4 sm:mt-5 pt-4 border-t border-slate-50 flex flex-col sm:flex-row gap-2">
          {status === 'inprogress' && !isAppt && (
            <div className="flex gap-2 w-full">
              <button onClick={onApprove} disabled={isBusy} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-600/10 active:scale-95">
                {busyId === item.id ? "..." : "Approve Access"}
              </button>
              <button onClick={onReject} disabled={isBusy} className="flex-1 bg-slate-50 hover:bg-slate-100 text-rose-600 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                Deny
              </button>
            </div>
          )}

          {status === 'accepted' && !isAppt && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={onChat} className="flex-1 sm:flex-none p-3 bg-slate-900 text-white rounded-xl active:scale-95 transition-all flex justify-center items-center"><MessageCircle size={18}/></button>
                <button onClick={onAudioCall} disabled={audioBusy || videoBusy} className="flex-1 sm:flex-none p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl active:scale-95 transition-all disabled:opacity-60 flex justify-center items-center"><Phone size={18}/></button>
                <button onClick={onVideoCall} disabled={audioBusy || videoBusy} className="flex-1 sm:flex-none p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl active:scale-95 transition-all disabled:opacity-60 flex justify-center items-center"><Video size={18}/></button>
              </div>
              <button onClick={onEnd} disabled={isBusy} className="w-full sm:flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors active:scale-95">
                <LogOut size={14}/> {endingId === item.id ? "Closing..." : "End Session"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
}

// --- Helpers ---
function normalizeVisitState(row) {
    const status = String(row?.status || "").toLowerCase();
    const sessionStatus = String(row?.sessionStatus || "").toLowerCase();
    if (status === "rejected" || status === "reject") return "reject";
    if (["completed", "approved", "closed", "accepted"].some(s => [status, sessionStatus].includes(s))) return "accepted";
    return "inprogress";
}

function formatTime(val) {
    if (!val) return "Live";
    return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toDateKey(val) {
    const d = new Date(val);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateHeader(key) {
    const d = new Date(`${key}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
}

function buildMonthDateTiles() {
    const days = [];
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0); // Strip time anomalies
    
    for (let i = -7; i <= 21; i++) {
        const d = new Date(baseDate.getTime());
        d.setDate(baseDate.getDate() + i);
        days.push({
            date: toDateKey(d),
            day: d.getDate(),
            month: d.toLocaleString('en-US', { month: 'short' }),
            weekday: d.toLocaleString('en-US', { weekday: 'short' })
        });
    }
    return days;
}