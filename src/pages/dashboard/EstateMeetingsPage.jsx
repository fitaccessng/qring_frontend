import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Plus, Calendar, Clock, Users, Edit3, Trash2, MapPin, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { createEstateAlert, deleteEstateAlert, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
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
  if (normalized === "attending") return "bg-emerald-50 text-emerald-700";
  if (normalized === "maybe") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
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
        className={`bg-white border border-slate-100 shadow-sm ${featured ? "rounded-[2.5rem] p-6 sm:p-8" : "rounded-[2rem] p-6"} relative overflow-hidden`}
      >
        {featured ? <div className="absolute top-0 right-0 w-64 h-64 bg-[#4955b3]/5 rounded-full -mr-20 -mt-20 blur-3xl" /> : null}
        <div className="relative z-10">
          <div className="flex justify-between items-start gap-3 mb-5">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                item?.dueDate && new Date(item.dueDate).getTime() < Date.now()
                  ? "bg-slate-100 text-slate-500"
                  : "bg-[#85f6e5]/40 text-[#005c53]"
              }`}
            >
              {item?.dueDate && new Date(item.dueDate).getTime() < Date.now() ? "Past" : "Upcoming"}
            </span>
            <div className="flex gap-1">
              <button onClick={() => openDetails(item)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                <Eye size={18} />
              </button>
              <button onClick={() => openEditSheet(item)} className="p-2 text-[#4955b3] hover:bg-indigo-50 rounded-xl transition-all">
                <Edit3 size={18} />
              </button>
              <button onClick={() => setPendingDelete(item)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <h3 className={`${featured ? "text-2xl" : "text-lg"} font-black text-[#2b3437] mb-2`}>{item?.title}</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{item?.description || "No agenda provided."}</p>

          <div className={`grid gap-4 ${featured ? "grid-cols-1 sm:grid-cols-3 mb-8" : "grid-cols-1 sm:grid-cols-2 mb-5"}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[#4955b3]">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Date</p>
                <p className="text-sm font-bold">{item?.dueDate ? new Date(item.dueDate).toLocaleDateString() : "TBD"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[#4955b3]">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Time</p>
                <p className="text-sm font-bold">
                  {item?.dueDate ? new Date(item.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                </p>
              </div>
            </div>
            {featured ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-[#4955b3]">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Location</p>
                  <p className="text-sm font-bold">Main Boardroom</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              <Users size={16} className="text-[#4955b3]" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Responses</p>
                <p className="text-sm font-bold text-slate-700">{totalReplies} residents</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Going {responses.attending || 0}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Maybe {responses.maybe || 0}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">Not Going {responses.not_attending || 0}</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans flex flex-col">
      <header className="sticky top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-lg font-headline">Meetings</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <Bell size={22} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="flex-1 px-5 pt-6 pb-32 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-[#4955b3] font-bold tracking-[0.15em] uppercase text-[10px] mb-1 block">Governance</span>
            <h2 className="text-4xl font-black tracking-tight text-[#2b3437] font-headline">Meetings</h2>
          </div>
          <button
            onClick={openCreateSheet}
            className="bg-[#4955b3] text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all w-full md:w-auto"
          >
            <Plus size={20} strokeWidth={3} /> Schedule Meeting
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-8 space-y-8">
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex gap-1 w-full sm:w-fit">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "upcoming" ? "bg-white text-[#4955b3] shadow-sm" : "text-slate-500"}`}
              >
                Upcoming ({upcomingMeetings.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "past" ? "bg-white text-[#4955b3] shadow-sm" : "text-slate-500"}`}
              >
                Past ({pastMeetings.length})
              </button>
            </div>

            {loading ? <div className="text-center py-10 text-slate-400 font-medium">Syncing meetings...</div> : null}
            {!loading && visibleMeetings.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-[2rem] p-8 text-center shadow-sm">
                <h3 className="text-xl font-black text-[#2b3437]">No meetings here yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {activeTab === "upcoming" ? "Create a meeting and it will appear here immediately." : "Past meetings will move here automatically after their scheduled time."}
                </p>
              </div>
            ) : null}

            {featuredMeeting ? <MeetingCard item={featuredMeeting} featured /> : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listMeetings.map((item) => (
                <MeetingCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <h4 className="font-headline font-black text-lg mb-6">Overview</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-600">Active Meetings</span>
                  <span className="font-black text-xl">{upcomingMeetings.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-600">Past Meetings</span>
                  <span className="font-black text-xl">{pastMeetings.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <span className="text-sm font-bold text-slate-600">Resident Replies</span>
                  <span className="font-black text-xl">
                    {alerts.reduce((sum, item) => {
                      const responses = item?.meetingResponses || {};
                      return sum + Number(responses.attending || 0) + Number(responses.maybe || 0) + Number(responses.not_attending || 0);
                    }, 0)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <MobileBottomSheet
        open={composeOpen}
        title={editingId ? "Edit Meeting" : "Schedule Meeting"}
        onClose={() => {
          setComposeOpen(false);
          setEditingId("");
          setFormData(EMPTY_FORM);
        }}
        height="88dvh"
      >
        <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase text-slate-400">Meeting Title</span>
            <input
              className={estateFieldClassName}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase text-slate-400">Agenda</span>
            <textarea
              className={estateTextareaClassName}
              rows={4}
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-black uppercase text-slate-400">Date & Time</span>
            <input
              type="datetime-local"
              className={estateFieldClassName}
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            />
          </label>
          <button type="submit" disabled={busy} className="bg-[#4955b3] text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50">
            {busy ? (editingId ? "Saving..." : "Scheduling...") : editingId ? "Save Changes" : "Create Meeting"}
          </button>
        </form>
      </MobileBottomSheet>

      <MobileBottomSheet open={detailsOpen} title="Meeting Details" onClose={() => setDetailsOpen(false)} height="88dvh">
        {selectedMeeting ? (
          <div className="space-y-6 p-1">
            <div className="rounded-[2rem] bg-white border border-slate-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#2b3437]">{selectedMeeting.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{selectedMeeting.description || "No agenda provided."}</p>
                </div>
                <button onClick={() => openEditSheet(selectedMeeting)} className="p-2 text-[#4955b3] hover:bg-indigo-50 rounded-xl transition-all">
                  <Edit3 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {selectedMeeting.dueDate ? new Date(selectedMeeting.dueDate).toLocaleDateString() : "TBD"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {selectedMeeting.dueDate ? new Date(selectedMeeting.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "TBD"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Going</p>
                <p className="mt-1 text-xl font-black text-emerald-700">{attendeeSummary.attending || 0}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Maybe</p>
                <p className="mt-1 text-xl font-black text-amber-700">{attendeeSummary.maybe || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Not Going</p>
                <p className="mt-1 text-xl font-black text-slate-700">{attendeeSummary.not_attending || 0}</p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white border border-slate-100 p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="text-lg font-black text-[#2b3437]">Residents</h4>
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{attendees.length} replies</span>
              </div>
              {attendees.length === 0 ? (
                <p className="text-sm text-slate-500">No residents have responded to this meeting yet.</p>
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <div key={`${attendee.homeownerId}-${attendee.response}`} className="rounded-2xl bg-slate-50 p-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{attendee.name}</p>
                        <p className="text-xs text-slate-500">
                          {attendee.homeName ? `${attendee.homeName} • ` : ""}{attendee.email || "No email"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {attendee.respondedAt ? `Responded ${new Date(attendee.respondedAt).toLocaleString()}` : "Response recorded"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${responseTone(attendee.response)}`}>
                        {formatResponseLabel(attendee.response)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </MobileBottomSheet>

      <MobileBottomSheet open={!!pendingDelete} title="Delete Meeting" onClose={() => setPendingDelete(null)} height="35dvh">
        <div className="p-2">
          <p className="text-slate-500 font-medium mb-6">
            Are you sure you want to delete <span className="text-slate-900 font-bold">"{pendingDelete?.title}"</span>? This action cannot be undone.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setPendingDelete(null)} className="py-4 bg-slate-100 rounded-2xl font-bold text-slate-600 uppercase text-xs tracking-widest">
              Cancel
            </button>
            <button onClick={confirmDelete} disabled={busy} className="py-4 bg-rose-500 rounded-2xl font-bold text-white uppercase text-xs tracking-widest shadow-lg shadow-rose-100">
              {busy ? "Deleting..." : "Confirm"}
            </button>
          </div>
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default EstateMeetingsPage;
