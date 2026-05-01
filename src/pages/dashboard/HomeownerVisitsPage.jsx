import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid, History, CalendarDays, MessageSquare, User,
  ChevronLeft, Bell, Clock3, UserCircle2, CalendarOff,
  ShieldCheck, Phone, Video, MessageCircle, LogOut,
  Search
} from "lucide-react";

import { decideVisit, endHomeownerSession, getHomeownerAppointments, getHomeownerVisits } from "../../services/homeownerService";
import { useNotifications } from "../../state/NotificationsContext";
import NavItem from "../../components/system/NavItem";

export default function HomeownerVisitsPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

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
    if (activeTab === "scheduled") return dateScopedAppointments;
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

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans pb-32 overflow-x-hidden">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-none">Activity Log</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Resident Timeline</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <Bell size={18} />
              {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 px-6 max-w-4xl mx-auto space-y-8">
        {/* Horizontal Calendar Section */}
        <section className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <h2 className="font-extrabold text-2xl text-slate-900 tracking-tight">Timeline</h2>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{formatDateHeader(selectedDate)}</span>
          </div>

          <div className="bg-white rounded-[2.5rem] p-4 border border-slate-100 shadow-sm">
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x scroll-smooth"
            >
                {dateTiles.map((item) => {
                  const isToday = item.date === toDateKey(new Date());
                  const isActive = selectedDate === item.date;
                  return (
                    <button
                        key={item.date}
                        onClick={() => setSelectedDate(item.date)}
                        className={`flex-shrink-0 w-14 h-20 flex flex-col items-center justify-center rounded-2xl transition-all snap-start relative ${
                        isActive
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105 z-10"
                            : "bg-slate-50 text-slate-400"
                        }`}
                    >
                        {isToday && !isActive && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
                        <span className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${isActive ? 'text-indigo-100' : ''}`}>{item.month}</span>
                        <span className="text-lg font-black">{item.day}</span>
                        <span className={`text-[8px] font-bold opacity-60 mt-0.5 uppercase ${isActive ? 'text-indigo-200' : ''}`}>{item.weekday}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-3 gap-4">
          <StatBox label="Scheduled" value={stats.scheduled} color="text-indigo-600" bg="bg-indigo-50" />
          <StatBox label="Active" value={stats.inprogress} color="text-amber-600" bg="bg-amber-50" />
          <StatBox label="Completed" value={stats.accepted} color="text-emerald-600" bg="bg-emerald-50" />
        </section>

        {/* Filters */}
        <section className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {["all", "scheduled", "inprogress", "accepted"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"
              }`}
            >
              {tab === 'inprogress' ? 'In Progress' : tab}
            </button>
          ))}
        </section>

        {/* Activity List */}
        <section className="space-y-4 pb-12">
          {loading ? (
             <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Updating Records</p>
             </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
               <CalendarOff size={40} className="mx-auto text-slate-300 mb-4" />
               <p className="text-sm text-slate-400 font-bold uppercase tracking-tight">No activity found</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                isAppt={activeTab === 'scheduled'}
                busyId={busyId}
                endingId={endingId}
                onApprove={() => handleDecision(item.id, "approve")}
                onReject={() => handleDecision(item.id, "reject")}
                onEnd={() => handleEndSession(item.id)}
                onChat={() => navigate(`/dashboard/homeowner/messages?sessionId=${item.id}`)}
              />
            ))
          )}
        </section>
      </main>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white border-t border-slate-100 z-[9999] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] hidden lg:flex">
        <NavItem to="/dashboard/homeowner/overview" icon={<LayoutGrid size={22} />} label="Home" />
        <NavItem to="/dashboard/homeowner/visits" icon={<History size={22} />} label="Activity" active />
        <NavItem to="/dashboard/homeowner/appointments" icon={<CalendarDays size={22} />} label="Schedule" />
        <NavItem to="/dashboard/homeowner/messages" icon={<MessageSquare size={22} />} label="Inbox" />
        <NavItem to="/dashboard/homeowner/settings" icon={<User size={22} />} label="Profile" />
      </nav>    </div>
  );
}

// --- Internal Components ---

function StatBox({ label, value, color, bg }) {
    return (
        <div className="bg-white p-4 rounded-[1.8rem] border border-slate-100 flex flex-col items-center shadow-sm">
            <span className={`text-2xl font-black ${color}`}>{value < 10 ? `0${value}` : value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{label}</span>
        </div>
    );
}

function ActivityCard({ item, isAppt, busyId, endingId, onApprove, onReject, onEnd, onChat }) {
    const status = normalizeVisitState(item);
    const isBusy = busyId === item.id || endingId === item.id;

    return (
      <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.2rem] bg-slate-900 flex items-center justify-center text-white">
               <UserCircle2 size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 tracking-tight">{item.visitor || item.visitorName || "Guest"}</h4>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{item.door || item.doorName || "Main Gate"}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
            status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
            status === 'reject' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {status === 'inprogress' ? 'Active' : status}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
            <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
              "{item.purpose || item.reason || "Verification requested for residential entry."}"
            </p>
          </div>

          <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><Clock3 size={14} className="text-indigo-500"/> {formatTime(item.time || item.startedAt || item.startsAt)}</div>
            <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-indigo-500"/> SECURE_LINK</div>
          </div>
        </div>

        <div className="mt-6 flex gap-2 pt-5 border-t border-slate-50">
          {status === 'inprogress' && !isAppt && (
            <>
              <button onClick={onApprove} disabled={isBusy} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100">
                {busyId === item.id ? "..." : "Approve Access"}
              </button>
              <button onClick={onReject} disabled={isBusy} className="flex-1 bg-white text-rose-600 border border-rose-100 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Deny
              </button>
            </>
          )}

          {status === 'accepted' && (
            <>
              <button onClick={onChat} className="p-3 bg-slate-900 text-white rounded-xl active:scale-95 transition-all"><MessageCircle size={18}/></button>
              <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-95 transition-all"><Phone size={18}/></button>
              <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl active:scale-95 transition-all"><Video size={18}/></button>
              <button onClick={onEnd} disabled={isBusy} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <LogOut size={14}/> {endingId === item.id ? "Closing..." : "End Session"}
              </button>
            </>
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
    const now = new Date();
    for (let i = -7; i <= 21; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        days.push({
            date: toDateKey(d),
            day: d.getDate(),
            month: d.toLocaleString('en-US', { month: 'short' }),
            weekday: d.toLocaleString('en-US', { weekday: 'short' })
        });
    }
    return days;
}