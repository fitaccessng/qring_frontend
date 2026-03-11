import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Clock3 } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import SessionModePickerModal from "../../components/SessionModePickerModal";
import { decideVisit, endHomeownerSession, getHomeownerAppointments, getHomeownerVisits } from "../../services/homeownerService";
import { markVisitRequestNotificationsRead } from "../../services/notificationService";

const tabs = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled" },
  { key: "inprogress", label: "Progress" },
  { key: "accepted", label: "Accepted" },
  { key: "reject", label: "Reject" }
];

export default function HomeownerVisitsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [endingId, setEndingId] = useState("");
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [sessionForPicker, setSessionForPicker] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const inFlightRef = useRef(false);
  const approvedSessionIdsRef = useRef(new Set());

  const loadVisits = useCallback(async ({ background = false, force = false } = {}) => {
    if (inFlightRef.current && !force) return;
    inFlightRef.current = true;
    if (!background) {
      setLoading(true);
      setError("");
    }
    try {
      const [visitData, appointmentData] = await Promise.all([
        getHomeownerVisits(),
        getHomeownerAppointments()
      ]);
      const approvedIds = approvedSessionIdsRef.current;
      const normalized = (visitData || []).map((row) => {
        const status = String(row?.status || "").toLowerCase();
        const sessionStatus = String(row?.sessionStatus || "").toLowerCase();
        const isApproved =
          ["approved", "active", "accepted"].includes(sessionStatus) ||
          ["approved", "active", "accepted"].includes(status);
        const isClosed = ["closed", "completed"].includes(sessionStatus) || status === "completed";
        if (isApproved) approvedIds.add(row.id);
        if (isClosed) approvedIds.delete(row.id);
        if (approvedIds.has(row.id)) {
          return {
            ...row,
            status: row.status || "Approved",
            sessionStatus: sessionStatus || "approved",
            canDecide: false
          };
        }
        return row;
      });
      setRows(normalized);
      setAppointments(appointmentData);
    } catch (requestError) {
      if (!background) {
        setError(requestError.message ?? "Failed to load visits");
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadVisits({ force: true });
  }, [loadVisits]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      loadVisits({ background: true });
    };
    const id = setInterval(refresh, 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        loadVisits({ background: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadVisits]);

  const dateScopedRows = useMemo(
    () => rows.filter((row) => toDateKey(row?.time || row?.startedAt || row?.createdAt) === selectedDate),
    [rows, selectedDate]
  );
  const dateScopedAppointments = useMemo(
    () => appointments.filter((row) => toDateKey(row?.startsAt) === selectedDate),
    [appointments, selectedDate]
  );

  const stats = useMemo(
    () => ({
      inprogress: dateScopedRows.filter((row) => normalizeVisitState(row) === "inprogress").length,
      accepted: dateScopedRows.filter((row) => normalizeVisitState(row) === "accepted").length,
      reject: dateScopedRows.filter((row) => normalizeVisitState(row) === "reject").length,
      scheduled: dateScopedAppointments.length
    }),
    [dateScopedAppointments, dateScopedRows]
  );

  const filteredRows = useMemo(() => {
    if (activeTab === "scheduled") return [];
    if (activeTab === "all") return dateScopedRows;
    return dateScopedRows.filter((row) => normalizeVisitState(row) === activeTab);
  }, [dateScopedRows, activeTab]);

  const dateTiles = useMemo(() => buildMonthDateTiles(rows, appointments), [rows, appointments]);
  const selectedDateLabel = useMemo(() => formatDateHeader(selectedDate), [selectedDate]);

  async function handleDecision(sessionId, action) {
    setBusyId(sessionId);
    setError("");
    try {
      window.dispatchEvent(new Event("qring:mute-visit-ring"));
    } catch {
      // Keep decision flow non-blocking.
    }
    try {
      const updated = await decideVisit(sessionId, action);
      await markVisitRequestNotificationsRead(sessionId);
      try {
        window.dispatchEvent(new Event("qring:notifications-updated"));
      } catch {
        // Keep decision flow non-blocking.
      }
      if (action === "approve") {
        approvedSessionIdsRef.current.add(sessionId);
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === sessionId
            ? {
                ...row,
                status: updated?.status === "approved" ? "Approved" : "Rejected",
                sessionStatus: updated?.status ?? row.sessionStatus,
                canDecide: false
              }
            : row
        )
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to update visit");
    } finally {
      setBusyId("");
    }
  }

  async function handleEndSession(sessionId) {
    setEndingId(sessionId);
    setError("");
    try {
      window.dispatchEvent(new Event("qring:mute-visit-ring"));
    } catch {
      // Keep end flow non-blocking.
    }
    try {
      await endHomeownerSession(sessionId);
      setRows((prev) =>
        prev.map((row) =>
          row.id === sessionId
            ? {
                ...row,
                status: "Completed",
                sessionStatus: "closed",
                canDecide: false
              }
            : row
        )
      );
    } catch (requestError) {
      setError(requestError.message ?? "Failed to end session");
    } finally {
      setEndingId("");
    }
  }

  function handleOpenSession(sessionId) {
    setSessionForPicker(sessionId);
    setModePickerOpen(true);
  }

  function handleSelectMode(mode) {
    if (!sessionForPicker) return;
    setModePickerOpen(false);
    navigate(`/session/${sessionForPicker}/${mode}`);
  }

  return (
    <AppShell title="Today's Visits">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-1 pb-14 sm:space-y-6 sm:px-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
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
                <div className="flex flex-col items-center justify-center leading-none">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${item.date === selectedDate ? "text-violet-100" : "text-slate-500"}`}>{item.month}</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">{item.day}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${item.date === selectedDate ? "text-violet-100" : "text-slate-500"}`}>{item.weekday}</p>
                </div>
                <p className={`mt-1 text-[10px] font-semibold ${item.date === selectedDate ? "text-violet-200" : "text-slate-400"}`}>{item.count}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-w-[7rem] snap-start rounded-xl px-4 py-2 text-sm font-semibold transition-all sm:min-w-[7.6rem] sm:text-[15px] ${
                activeTab === tab.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:space-y-4 sm:p-5">
          <div className="px-1">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{activeTab === "scheduled" ? "Scheduled" : "History"}</h3>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">{selectedDateLabel}</p>
          </div>
          {loading ? (
            <p className="py-2 text-sm text-slate-500 sm:text-base">Loading visits...</p>
          ) : activeTab === "scheduled" ? (
            dateScopedAppointments.length === 0 ? (
              <p className="py-2 text-sm text-slate-500 sm:text-base">No scheduled appointments for this date.</p>
            ) : (
              dateScopedAppointments.map((item) => (
                <article key={`appt-${item.id}`} className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 dark:border-slate-700 dark:bg-slate-800/80 sm:p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-[11px] text-slate-500 sm:text-xs">{item.purpose || "Scheduled appointment"}</p>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 sm:text-[11px] dark:bg-indigo-900/30 dark:text-indigo-300">
                      Scheduled
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{item.visitorName || "Visitor"}</h3>
                  <p className="text-xs text-slate-500 sm:text-sm">{item.doorName || "Door"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
                    <span className="inline-flex items-center gap-1.5 leading-none">
                      <Clock3 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      {formatDateTime(item.startsAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 leading-none">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      {item.statusLabel || item.status || "Created"}
                    </span>
                  </div>
                </article>
              ))
            )
          ) : filteredRows.length === 0 ? (
            <p className="py-2 text-sm text-slate-500 sm:text-base">No visit records for this date.</p>
          ) : (
            filteredRows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 dark:border-slate-700 dark:bg-slate-800/80 sm:p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <p className="text-[11px] text-slate-500 sm:text-xs">{row.reason || "Visitor request"}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-[11px] ${statusClass(statusLabel(row))}`}>{statusLabel(row)}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">{row.visitor || "Unknown visitor"}</h3>
                <p className="text-xs text-slate-500 sm:text-sm">{row.door}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 sm:text-xs">
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                    {formatTime(row.time || row.startedAt || row.createdAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                    {statusLabel(row)}
                  </span>
                </div>
                <ActionRow
                  row={row}
                  busyId={busyId}
                  endingId={endingId}
                  onApprove={() => handleDecision(row.id, "approve")}
                  onReject={() => handleDecision(row.id, "reject")}
                  onOpen={() => handleOpenSession(row.id)}
                  onEnd={() => handleEndSession(row.id)}
                />
              </article>
            ))
          )}
        </section>

        <section className="grid grid-cols-3 gap-2 rounded-2xl bg-violet-50 p-3 text-center dark:bg-violet-900/20 sm:gap-3 sm:p-4">
          <MiniStat label="Scheduled" value={stats.scheduled} />
          <MiniStat label="Progress" value={stats.inprogress} />
          <MiniStat label="Accepted" value={stats.accepted} />
        </section>
      </div>

      <SessionModePickerModal
        open={modePickerOpen}
        sessionId={sessionForPicker}
        onClose={() => setModePickerOpen(false)}
        onSelect={handleSelectMode}
      />
    </AppShell>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white px-2 py-2 dark:bg-slate-900/70 sm:px-3 sm:py-3">
      <p className="text-lg font-black text-slate-900 dark:text-slate-100 sm:text-xl">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</p>
    </div>
  );
}

function ActionRow({ row, busyId, endingId, onApprove, onReject, onOpen, onEnd }) {
  const btn = "rounded-lg px-3 py-1.5 text-[11px] sm:text-xs";
  const status = String(row?.status || "").toLowerCase();
  const sessionStatus = String(row?.sessionStatus || "").toLowerCase();
  const isApproved =
    ["approved", "active", "accepted"].includes(sessionStatus) ||
    ["approved", "active", "accepted"].includes(status);
  const isClosed = ["closed", "completed"].includes(sessionStatus) || status === "completed";
  const decisionAllowed = Boolean(row?.canDecide) && !isApproved && !isClosed;
  const canOpenSession = isApproved && !isClosed;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {decisionAllowed ? (
        <>
          <button type="button" disabled={busyId === row.id} onClick={onApprove} className={`${btn} bg-success font-semibold text-white disabled:opacity-50`}>
            Approve
          </button>
          <button type="button" disabled={busyId === row.id} onClick={onReject} className={`${btn} bg-danger font-semibold text-white disabled:opacity-50`}>
            Reject
          </button>
        </>
      ) : canOpenSession ? (
        <>
          <button type="button" onClick={onOpen} className={`${btn} bg-brand-500 font-semibold text-white`}>
            Open Session
          </button>
          <button type="button" disabled={endingId === row.id} onClick={onEnd} className={`${btn} bg-danger font-semibold text-white disabled:opacity-50`}>
            {endingId === row.id ? "Ending..." : "End Session"}
          </button>
        </>
      ) : (
        <span className="text-xs text-slate-500">No action</span>
      )}
    </div>
  );
}

function normalizeVisitState(row) {
  const status = String(row?.status || "").toLowerCase();
  const sessionStatus = String(row?.sessionStatus || "").toLowerCase();
  if (status === "rejected") return "reject";
  if (status === "completed" || status === "approved" || sessionStatus === "closed" || sessionStatus === "completed" || sessionStatus === "approved") {
    return "accepted";
  }
  if (status === "pending" || status === "active" || sessionStatus === "pending" || sessionStatus === "active") {
    return "inprogress";
  }
  return "inprogress";
}

function statusLabel(row) {
  const state = normalizeVisitState(row);
  if (state === "reject") return "Reject";
  if (state === "accepted") return "Accepted";
  return "In Progress";
}

function statusClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved" || value === "completed" || value === "active" || value === "accepted") {
    return "bg-success/15 text-success";
  }
  if (value === "pending" || value === "todo" || value === "in progress" || value === "inprogress") {
    return "bg-warning/20 text-warning";
  }
  if (value === "rejected" || value === "reject") {
    return "bg-danger/15 text-danger";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateHeader(dateKey) {
  if (!dateKey) return "";
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function buildMonthDateTiles(rows, appointments) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const counts = rows.reduce((acc, row) => {
    const key = toDateKey(row?.time || row?.startedAt || row?.createdAt);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const appointmentCounts = appointments.reduce((acc, row) => {
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
      count: (counts[key] ?? 0) + (appointmentCounts[key] ?? 0)
    };
  });
}
