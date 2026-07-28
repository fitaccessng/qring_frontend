import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Bell, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  Edit3, 
  Trash2, 
  MapPin, 
  Eye, 
  X 
} from "lucide-react";

import { createEstateAlert, deleteEstateAlert, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";

const EMPTY_FORM = { title: "", agenda: "", dateTime: "" };

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatResponseLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

function responseTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "attending") return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  if (normalized === "maybe") return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
}

const EstateMeetingsPage = () => {
  const navigate = useNavigate();
  const { estateId, loading, error, setError } = useEstateOverviewState();

  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [busy, setBusy] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function reloadMeetings() {
    if (!estateId) return;
    try {
      const rows = await listEstateAlerts(estateId, "meeting");
      setAlerts(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || "Failed to load meetings");
    }
  }

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    reloadMeetings();
  }, [estateId]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(
    useMemo(
      () => ({
        ALERT_CREATED: reloadMeetings,
        ALERT_UPDATED: reloadMeetings,
        ALERT_DELETED: reloadMeetings,
      }),
      [estateId]
    )
  );

  const sortedMeetings = useMemo(
    () => [...alerts].sort((a, b) => new Date(a?.dueDate || 0).getTime() - new Date(b?.dueDate || 0).getTime()),
    [alerts]
  );

  const now = Date.now();
  const upcomingMeetings = sortedMeetings.filter((m) => !m?.dueDate || new Date(m.dueDate).getTime() >= now);
  const pastMeetings = sortedMeetings.filter((m) => m?.dueDate && new Date(m.dueDate).getTime() < now);
  const visibleMeetings = activeTab === "upcoming" ? upcomingMeetings : pastMeetings;
  const featuredMeeting = visibleMeetings[0] || null;
  const listMeetings = visibleMeetings.slice(1);

  const attendeeSummary = selectedMeeting?.meetingResponses || { attending: 0, maybe: 0, not_attending: 0 };
  const attendees = Array.isArray(selectedMeeting?.meetingAttendees) ? selectedMeeting.meetingAttendees : [];

  function openCreateSheet() {
    setEditingId("");
    setFormData(EMPTY_FORM);
    setComposeOpen(true);
  }

  function openEditSheet(meeting) {
    setEditingId(meeting?.id || "");
    setFormData({
      title: String(meeting?.title || ""),
      agenda: String(meeting?.description || ""),
      dateTime: toDateTimeLocal(meeting?.dueDate),
    });
    setComposeOpen(true);
  }

  function openDetails(meeting) {
    setSelectedMeeting(meeting);
    setDetailsOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        estateId,
        title: String(formData.title || "").trim(),
        description: String(formData.agenda || "").trim(),
        alertType: "meeting",
        dueDate: formData.dateTime ? new Date(formData.dateTime).toISOString() : null,
      };

      if (editingId) {
        await updateEstateAlert(editingId, payload);
        showSuccess("Meeting updated");
      } else {
        await createEstateAlert(payload);
        showSuccess("Meeting scheduled");
      }

      setFormData(EMPTY_FORM);
      setEditingId("");
      setComposeOpen(false);
      await reloadMeetings();
      setActiveTab("upcoming");
    } catch (err) {
      showError(err?.message || "Unable to save meeting");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setBusy(true);
    try {
      await deleteEstateAlert(pendingDelete.id);
      if (selectedMeeting?.id === pendingDelete.id) {
        setSelectedMeeting(null);
        setDetailsOpen(false);
      }
      setPendingDelete(null);
      showSuccess("Meeting removed");
      await reloadMeetings();
    } catch (err) {
      showError(err?.message || "Unable to delete meeting");
    } finally {
      setBusy(false);
    }
  }

  function MeetingCard({ item, featured = false }) {
    const responses = item?.meetingResponses || { attending: 0, maybe: 0, not_attending: 0 };
    const totalReplies = Number(responses.attending || 0) + Number(responses.maybe || 0) + Number(responses.not_attending || 0);

    return (
      <article
        className={`bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 p-5 rounded-3xl shadow-sm transition-all relative overflow-hidden flex flex-col gap-4`}
      >
        <div className="flex justify-between items-center">
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              item?.dueDate && new Date(item.dueDate).getTime() < Date.now()
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            }`}
          >
            {item?.dueDate && new Date(item.dueDate).getTime() < Date.now() ? "Past" : "Upcoming"}
          </span>
          <div className="flex gap-1.5">
            <button 
              onClick={() => openDetails(item)} 
              className="p-2 bg-slate-50 dark:bg-slate-850 text-slate-450 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
            >
              <Eye size={14} />
            </button>
            <button 
              onClick={() => openEditSheet(item)} 
              className="p-2 bg-slate-50 dark:bg-slate-850 text-slate-450 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
            >
              <Edit3 size={14} />
            </button>
            <button 
              onClick={() => setPendingDelete(item)} 
              className="p-2 bg-slate-50 dark:bg-slate-850 text-slate-450 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">{item?.title}</h3>
          <p className="text-slate-500 dark:text-slate-450 text-xs mt-1 leading-relaxed line-clamp-2">{item?.description || "No agenda provided."}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100/30 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Calendar size={14} />
            </div>
            <div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Date</p>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">{item?.dueDate ? new Date(item.dueDate).toLocaleDateString() : "TBD"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Clock size={14} />
            </div>
            <div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Time</p>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {item?.dueDate ? new Date(item.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100/30 dark:border-slate-800/50">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
            <span>Feedback Responses</span>
            <span className="text-slate-700 dark:text-slate-350">{totalReplies} replies</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[9px] font-extrabold uppercase tracking-wider">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Going {responses.attending || 0}</span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Maybe {responses.maybe || 0}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">No {responses.not_attending || 0}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col">
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Meetings</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Community Governance</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        <div className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Operations Hub</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Resident Assemblies</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Configure estate-wide assemblies, synchronize boardrooms and compile attendee feedback.
          </p>
        </div>

        {/* COMPACT SEGMENT SWITCHER */}
        <section className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "upcoming"
                ? "bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Upcoming ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "past"
                ? "bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Past Assemblies ({pastMeetings.length})
          </button>
        </section>

        {/* FEEDBACK STATUS / LIST */}
        <div className="space-y-3.5">
          {loading && <div className="text-center py-10 text-[10px] font-bold uppercase tracking-wider text-slate-400">Syncing Assemblies...</div>}
          
          {!loading && visibleMeetings.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 text-center shadow-sm">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">No active assemblies configured</h3>
              <p className="mt-1 text-xs text-slate-500 leading-normal">
                {activeTab === "upcoming" ? "Once you construct a meeting, it will render within this view instantly." : "Past records will catalog here automatically once they conclude."}
              </p>
            </div>
          ) : null}

          {/* RENDERS DIRECT TIMELINE */}
          <div className="grid grid-cols-1 gap-3">
            {visibleMeetings.map((item) => (
              <MeetingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </main>

      {/* FLOATING ACTION ACTION SHORTCUT */}
      <button 
        onClick={openCreateSheet} 
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 z-40 active:scale-90 hover:bg-indigo-700 transition-all"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* MODAL BOTTOM DRAWERS */}
      <MeetingSheetFrame
        open={composeOpen}
        onClose={() => {
          setComposeOpen(false);
          setEditingId("");
          setFormData(EMPTY_FORM);
        }}
        eyebrow="Governance"
        title={editingId ? "Modify Assembly" : "Schedule Assembly"}
        footer={(
          <button
            type="submit"
            form="estate-meeting-form"
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {busy ? "Saving..." : editingId ? "Update Assembly" : "Deploy Assembly Room"}
          </button>
        )}
      >
        <form id="estate-meeting-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Meeting Title</span>
            <input
              className={`${estateFieldClassName} text-xs font-semibold`}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Annual General Assembly Meeting"
              required
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Agenda Description</span>
            <textarea
              className={`${estateTextareaClassName} text-xs font-semibold`}
              rows={4}
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              placeholder="Configure agenda protocols here..."
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Date & Time</span>
            <input
              type="datetime-local"
              className={`${estateFieldClassName} text-xs font-semibold`}
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            />
          </div>
        </form>
      </MeetingSheetFrame>

      {/* MEETING DETAILS DRAWER */}
      <MeetingSheetFrame
        open={detailsOpen}
        title="Assembly Feedback"
        eyebrow="Statistics Room"
        onClose={() => setDetailsOpen(false)}
      >
        {selectedMeeting ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-3xl bg-slate-50/50 dark:bg-slate-900 border border-slate-100/60 dark:border-slate-800 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">{selectedMeeting.title}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">{selectedMeeting.description || "No agenda provided."}</p>
                </div>
                <button onClick={() => openEditSheet(selectedMeeting)} className="p-1.5 bg-white dark:bg-slate-850 hover:bg-slate-100 text-slate-450 dark:text-slate-400 hover:text-indigo-600 rounded-lg transition-all">
                  <Edit3 size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-white dark:bg-slate-850 p-3 border border-slate-100/50 dark:border-slate-800/30">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Scheduled Date</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    {selectedMeeting.dueDate ? new Date(selectedMeeting.dueDate).toLocaleDateString() : "TBD"}
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-850 p-3 border border-slate-100/50 dark:border-slate-800/30">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Scheduled Time</p>
                  <p className="mt-0.5 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    {selectedMeeting.dueDate ? new Date(selectedMeeting.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-3 flex flex-col items-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Going</p>
                <p className="mt-1 text-sm font-black text-emerald-700 dark:text-white">{attendeeSummary.attending || 0}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 flex flex-col items-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Maybe</p>
                <p className="mt-1 text-sm font-black text-amber-700 dark:text-white">{attendeeSummary.maybe || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-3 flex flex-col items-center">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">No</p>
                <p className="mt-1 text-sm font-black text-slate-700 dark:text-white">{attendeeSummary.not_attending || 0}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100/50 dark:border-slate-800/60">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Resident Status</h4>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{attendees.length} replies</span>
              </div>
              {attendees.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4 italic">No residents have registered their responses yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {attendees.map((attendee) => (
                    <div key={`${attendee.homeownerId}-${attendee.response}`} className="rounded-xl bg-slate-50/50 dark:bg-slate-850/40 p-2.5 flex items-center justify-between gap-3 border border-slate-100/30 dark:border-slate-800/40">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">{attendee.name}</p>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 truncate mt-0.5">
                          {attendee.homeName ? `${attendee.homeName} • ` : ""}{attendee.email || "No email"}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider shrink-0 ${responseTone(attendee.response)}`}>
                        {formatResponseLabel(attendee.response)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </MeetingSheetFrame>

      {/* CONFIRM DELETE MODAL */}
      <MeetingSheetFrame
        open={!!pendingDelete}
        title="Remove Assembly"
        eyebrow="Danger Operations"
        onClose={() => setPendingDelete(null)}
        footer={(
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPendingDelete(null)} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-600 dark:text-slate-350 uppercase text-[10px] tracking-wider">
              Cancel
            </button>
            <button onClick={confirmDelete} disabled={busy} className="py-3 bg-rose-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
              {busy ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        )}
      >
        <div className="pt-1">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold leading-relaxed">
            Confirm permanent deletion of assembly room: <span className="text-slate-900 dark:text-white font-extrabold">"{pendingDelete?.title}"</span>? This operations protocol cannot be undone.
          </p>
        </div>
      </MeetingSheetFrame>
    </div>
  );
};

export default EstateMeetingsPage;

function MeetingSheetFrame({ open, onClose, eyebrow, title, footer = null, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-end sm:items-center sm:justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL SHEET */}
      <div
        className="
          relative flex w-full flex-col bg-white dark:bg-slate-900
          rounded-t-[2rem] sm:rounded-[2rem]
          shadow-2xl
          sm:max-w-md
          max-h-[85dvh] sm:max-h-[80dvh]
          overflow-hidden pb-safe
        "
      >
        {/* Mobile touch indicator */}
        <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden shrink-0" />

        {/* HEADER */}
        <div className="shrink-0 flex items-start justify-between border-b border-slate-100/50 dark:border-slate-800/40 px-5 py-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* SCROLLABLE INTERNALS */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 overscroll-contain">
          <div className="space-y-4">
            {children}
          </div>
          {footer && (
            <div className="mt-5 pt-4 border-t border-slate-100/50 dark:border-slate-800/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}