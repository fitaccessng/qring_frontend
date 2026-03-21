import { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { createEstateAlert, deleteEstateAlert, getEstateOverview, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import CardSurface from "../../components/CardSurface";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import EstateManagerPageShell, { EstateManagerSection, estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";

export default function EstateBroadcastsPage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedHomeowners, setSelectedHomeowners] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingMessage, setEditingMessage] = useState("");
  const [editingSendToAll, setEditingSendToAll] = useState(true);
  const [editingTargets, setEditingTargets] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);

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
        const rows = await listEstateAlerts(estateId, "notice");
        if (active) setAlerts(rows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load broadcasts");
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
          listEstateAlerts(estateId, "notice").then(setAlerts).catch(() => {});
        },
        ALERT_UPDATED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "notice").then(setAlerts).catch(() => {});
        },
        ALERT_DELETED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "notice").then(setAlerts).catch(() => {});
        }
      }),
      [estateId]
    )
  );

  useEffect(() => {
    if (sendToAll) {
      setSelectedHomeowners([]);
    }
  }, [sendToAll]);

  useEffect(() => {
    if (editingSendToAll) {
      setEditingTargets([]);
    }
  }, [editingSendToAll]);

  function startEdit(item) {
    const targets = Array.isArray(item?.targetHomeownerIds) ? item.targetHomeownerIds : [];
    setEditingId(item?.id || "");
    setEditingTitle(item?.title || "");
    setEditingMessage(item?.description || "");
    setEditingSendToAll(targets.length === 0);
    setEditingTargets(targets);
  }

  function closeEdit() {
    setEditingId("");
    setEditingTitle("");
    setEditingMessage("");
    setEditingSendToAll(true);
    setEditingTargets([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!estateId || !title.trim()) return false;
    setBusy(true);
    setError("");
    try {
      const created = await createEstateAlert({
        estateId,
        title: title.trim(),
        description: message.trim(),
        alertType: "notice",
        targetHomeownerIds: sendToAll ? [] : selectedHomeowners
      });
      showSuccess(sendToAll ? "Broadcast sent to all homeowners." : "Broadcast sent to selected homeowners.");
      setTitle("");
      setMessage("");
      setSelectedHomeowners([]);
      if (created) {
        setAlerts((prev) => [created, ...prev]);
      } else {
        try {
          const rows = await listEstateAlerts(estateId, "notice");
          setAlerts(rows);
        } catch {
          // Ignore refresh failure since broadcast already sent.
        }
      }
      return true;
    } catch (err) {
      setError(err?.message || "Failed to send broadcast");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingId || !editingTitle.trim()) return;
    setBusy(true);
    setError("");
    const payload = {
      title: editingTitle.trim(),
      description: editingMessage.trim(),
      alertType: "notice",
      targetHomeownerIds: editingSendToAll ? [] : editingTargets
    };
    try {
      const updated = await updateEstateAlert(editingId, payload);
      if (updated?.stale) {
        const rows = await listEstateAlerts(estateId, "notice");
        setAlerts(rows);
      } else {
        setAlerts((prev) =>
          prev.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...updated,
                  title: payload.title,
                  description: payload.description,
                  targetHomeownerIds: payload.targetHomeownerIds
                }
              : item
          )
        );
      }
      showSuccess("Broadcast updated.");
      closeEdit();
    } catch (err) {
      setError(err?.message || "Failed to update broadcast");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(alertId) {
    if (!alertId) return;
    const item = alerts.find((row) => row.id === alertId);
    setPendingDelete({ id: alertId, title: item?.title || "this broadcast" });
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setBusy(true);
    setError("");
    try {
      await deleteEstateAlert(pendingDelete.id);
      setAlerts((prev) => prev.filter((item) => item.id !== pendingDelete.id));
      showSuccess("Broadcast deleted.");
      if (editingId === pendingDelete.id) closeEdit();
      setPendingDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete broadcast");
    } finally {
      setBusy(false);
    }
  }

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((row) => ({ value: row.id, label: row.name })),
    [overview]
  );
  const homeownerOptions = useMemo(
    () =>
      (overview?.homeowners ?? []).map((row) => ({
        id: row.id,
        label: row.fullName || row.email || "Homeowner"
      })),
    [overview]
  );
  const homeownerById = useMemo(() => {
    const map = new Map();
    for (const row of overview?.homeowners ?? []) {
      map.set(row.id, row.fullName || row.email || "Homeowner");
    }
    return map;
  }, [overview]);

  return (
    <AppShell title="Broadcast Messaging">
      <EstateManagerPageShell
        eyebrow="Estate Broadcasts"
        title="Broadcasts"
        description="Send estate-wide updates with a clean mobile workflow for quick alerts and targeted notices."
        icon={<Megaphone size={22} />}
        accent="from-amber-500 to-orange-500"
        stats={[
          { label: "Messages", value: alerts.length, helper: "Recent broadcasts" },
          { label: "Audience", value: sendToAll ? "All" : selectedHomeowners.length, helper: sendToAll ? "All homeowners" : "Selected homes" }
        ]}
      >
        <EstateManagerSection title="Compose" subtitle="Keep the page focused, then open the broadcast form only when you are ready.">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
          >
            New Broadcast
          </button>
        </EstateManagerSection>

        <EstateManagerSection title="Recent broadcasts" subtitle="Review what has gone out and fine-tune follow-up messages.">
          {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          {!loading && alerts.length === 0 ? <p className="mt-3 text-sm text-slate-500">No broadcasts yet.</p> : null}
          <div className="mt-3 space-y-3">
            {alerts.map((item) => (
              <CardSurface
                as="article"
                key={item.id}
                className="rounded-[1.6rem] border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                accent="from-amber-100/80 via-white/10 to-transparent"
                glow="bg-amber-300/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">{item.title}</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                {item.targetHomeownerIds?.length ? (
                  <>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Targeted to {item.targetHomeownerIds.length} homeowners
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.targetHomeownerIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                        >
                          {homeownerById.get(id) || "Homeowner"}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-500">Sent to all homeowners</p>
                )}
              </CardSurface>
            ))}
          </div>
        </EstateManagerSection>
      </EstateManagerPageShell>

      <MobileBottomSheet open={composeOpen} title="Send Broadcast" onClose={() => setComposeOpen(false)} width="720px" height="90dvh">
        <form onSubmit={async (event) => { const ok = await handleSubmit(event); if (ok) setComposeOpen(false); }} className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estate</span>
            <select value={estateId} onChange={(event) => setEstateId(event.target.value)} className={estateFieldClassName}>
              {estateOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={estateFieldClassName} placeholder="Water maintenance tomorrow 10am-1pm." required />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className={estateTextareaClassName} placeholder="Please store water." />
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            <p className="font-semibold">Audience</p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => setSendToAll(true)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${sendToAll ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"}`}>All homeowners</button>
              <button type="button" onClick={() => setSendToAll(false)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${!sendToAll ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"}`}>Specific homeowners</button>
            </div>
            {!sendToAll ? (
              <div className="mt-3 grid gap-2">
                {homeownerOptions.length === 0 ? <p className="text-[11px] text-slate-500">No homeowners available.</p> : homeownerOptions.map((owner) => (
                  <label key={owner.id} className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={selectedHomeowners.includes(owner.id)}
                      onChange={(event) => {
                        const next = new Set(selectedHomeowners);
                        if (event.target.checked) next.add(owner.id);
                        else next.delete(owner.id);
                        setSelectedHomeowners(Array.from(next));
                      }}
                    />
                    <span>{owner.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
          <button type="submit" disabled={busy || !estateId || (!sendToAll && selectedHomeowners.length === 0)} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            {busy ? "Sending..." : "Send Broadcast"}
          </button>
        </form>
      </MobileBottomSheet>

      {editingId ? (
        <MobileBottomSheet open={!!editingId} title="Edit Broadcast" onClose={closeEdit} width="720px" height="90dvh">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit Broadcast</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Update message</h3>
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
                <textarea
                  value={editingMessage}
                  onChange={(event) => setEditingMessage(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                />
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                <p className="font-semibold">Audience</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSendToAll(true)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      editingSendToAll
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                    }`}
                  >
                    All homeowners
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSendToAll(false)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      !editingSendToAll
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                    }`}
                  >
                    Specific homeowners
                  </button>
                </div>
                {!editingSendToAll ? (
                  <div className="mt-3 grid gap-2">
                    {homeownerOptions.length === 0 ? (
                      <p className="text-[11px] text-slate-500">No homeowners available.</p>
                    ) : (
                      homeownerOptions.map((owner) => (
                        <label key={owner.id} className="flex items-center gap-2 text-[11px]">
                          <input
                            type="checkbox"
                            checked={editingTargets.includes(owner.id)}
                            onChange={(event) => {
                              const next = new Set(editingTargets);
                              if (event.target.checked) {
                                next.add(owner.id);
                              } else {
                                next.delete(owner.id);
                              }
                              setEditingTargets(Array.from(next));
                            }}
                          />
                          <span>{owner.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={busy || (!editingSendToAll && editingTargets.length === 0)}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </MobileBottomSheet>
      ) : null}

      {pendingDelete ? (
        <MobileBottomSheet open={!!pendingDelete} title="Delete Broadcast" onClose={() => setPendingDelete(null)} width="560px" height="46dvh">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm Delete</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Delete broadcast?</h3>
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
              This will permanently delete <span className="font-semibold">{pendingDelete.title}</span>. This cannot be undone.
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
        </MobileBottomSheet>
      ) : null}
    </AppShell>
  );
}
