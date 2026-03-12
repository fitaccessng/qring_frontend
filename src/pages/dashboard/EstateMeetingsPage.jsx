import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { createEstateAlert, deleteEstateAlert, getEstateOverview, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";

export default function EstateMeetingsPage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAgenda, setEditingAgenda] = useState("");
  const [editingDateTime, setEditingDateTime] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getEstateOverview();
        if (!active) return;
        setOverview(data);
        const firstId = data?.estates?.[0]?.id || "";
        setEstateId((prev) => prev || firstId);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load estate data");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    if (!estateId) return;
    let active = true;
    async function loadAlerts() {
      try {
        const rows = await listEstateAlerts(estateId, "meeting");
        if (active) setAlerts(rows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load meetings");
      }
    }
    loadAlerts();
    return () => {
      active = false;
    };
  }, [estateId]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(
    useMemo(
      () => ({
        ALERT_CREATED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "meeting").then(setAlerts).catch(() => {});
        },
        ALERT_UPDATED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "meeting").then(setAlerts).catch(() => {});
        },
        ALERT_DELETED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "meeting").then(setAlerts).catch(() => {});
        }
      }),
      [estateId]
    )
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!estateId || !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      await createEstateAlert({
        estateId,
        title: title.trim(),
        description: agenda.trim(),
        alertType: "meeting",
        dueDate: dateTime ? new Date(dateTime).toISOString() : null
      });
      showSuccess("Meeting scheduled.");
      setTitle("");
      setAgenda("");
      setDateTime("");
      const rows = await listEstateAlerts(estateId, "meeting");
      setAlerts(rows);
    } catch (err) {
      setError(err?.message || "Failed to schedule meeting");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item) {
    setEditingId(item?.id || "");
    setEditingTitle(item?.title || "");
    setEditingAgenda(item?.description || "");
    setEditingDateTime(item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : "");
  }

  function closeEdit() {
    setEditingId("");
    setEditingTitle("");
    setEditingAgenda("");
    setEditingDateTime("");
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingId || !editingTitle.trim()) return;
    setBusy(true);
    setError("");
    try {
      const payload = {
        title: editingTitle.trim(),
        description: editingAgenda.trim(),
        dueDate: editingDateTime ? new Date(editingDateTime).toISOString() : null
      };
      const updated = await updateEstateAlert(editingId, payload);
      if (updated?.stale) {
        const rows = await listEstateAlerts(estateId, "meeting");
        setAlerts(rows);
      } else {
        setAlerts((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...updated } : row)));
      }
      showSuccess("Meeting updated.");
      closeEdit();
    } catch (err) {
      setError(err?.message || "Failed to update meeting");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(alertId) {
    const item = alerts.find((row) => row.id === alertId);
    setPendingDelete({ id: alertId, title: item?.title || "this meeting" });
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setBusy(true);
    setError("");
    try {
      await deleteEstateAlert(pendingDelete.id);
      setAlerts((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      showSuccess("Meeting deleted.");
      setPendingDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete meeting");
    } finally {
      setBusy(false);
    }
  }

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((row) => ({ value: row.id, label: row.name })),
    [overview]
  );

  return (
    <AppShell title="Estate Meetings">
      <div className="mx-auto w-full max-w-4xl space-y-5">

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Schedule a meeting</h2>
          <p className="mt-1 text-xs text-slate-500">Homeowners can respond: Attending, Not attending, Maybe.</p>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estate</span>
              <select
                value={estateId}
                onChange={(event) => setEstateId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              >
                {estateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Monthly estate meeting"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</span>
              <textarea
                value={agenda}
                onChange={(event) => setAgenda(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Security updates, maintenance, dues."
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date & time</span>
              <input
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
                type="datetime-local"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !estateId}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Upcoming & past meetings</h3>
          {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          {!loading && alerts.length === 0 ? <p className="mt-3 text-sm text-slate-500">No meetings yet.</p> : null}
          <div className="mt-3 space-y-3">
            {alerts.map((item) => {
              const responses = item.meetingResponses || { attending: 0, not_attending: 0, maybe: 0 };
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">
                        {item.dueDate ? new Date(item.dueDate).toLocaleString() : "Schedule TBD"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-900/40 dark:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {item.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Attending {responses.attending}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                      Not attending {responses.not_attending}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      Maybe {responses.maybe}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {editingId ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit Meeting</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Update schedule</h3>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Meeting title</span>
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</span>
                <textarea
                  value={editingAgenda}
                  onChange={(event) => setEditingAgenda(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date & time</span>
                <input
                  value={editingDateTime}
                  onChange={(event) => setEditingDateTime(event.target.value)}
                  type="datetime-local"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm Delete</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Delete meeting?</h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              This will permanently delete <span className="font-semibold">{pendingDelete.title}</span>.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
