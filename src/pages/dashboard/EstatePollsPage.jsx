import { useEffect, useMemo, useState } from "react";
import { Vote } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { createEstateAlert, deleteEstateAlert, getEstateOverview, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import CardSurface from "../../components/CardSurface";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import EstateManagerPageShell, { EstateManagerSection, estateFieldClassName } from "../../components/mobile/EstateManagerPageShell";

export default function EstatePollsPage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingQuestion, setEditingQuestion] = useState("");
  const [editingOptions, setEditingOptions] = useState(["", ""]);
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
    async function loadPolls() {
      try {
        const rows = await listEstateAlerts(estateId, "poll");
        if (active) setPolls(rows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load polls");
      }
    }
    loadPolls();
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
          listEstateAlerts(estateId, "poll").then(setPolls).catch(() => {});
        },
        ALERT_UPDATED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "poll").then(setPolls).catch(() => {});
        },
        ALERT_DELETED: () => {
          if (!estateId) return;
          listEstateAlerts(estateId, "poll").then(setPolls).catch(() => {});
        }
      }),
      [estateId]
    )
  );

  function updateOption(index, value) {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index) {
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!estateId || !question.trim()) return false;
    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("Provide at least two options.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      await createEstateAlert({
        estateId,
        title: question.trim(),
        description: "",
        alertType: "poll",
        pollOptions: cleanOptions
      });
      showSuccess("Poll created.");
      setQuestion("");
      setOptions(["", ""]);
      const rows = await listEstateAlerts(estateId, "poll");
      setPolls(rows);
      return true;
    } catch (err) {
      setError(err?.message || "Failed to create poll");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit(poll) {
    setEditingId(poll?.id || "");
    setEditingQuestion(poll?.title || "");
    const nextOptions = (poll?.pollOptions ?? []).map((opt) => String(opt ?? ""));
    setEditingOptions(nextOptions.length >= 2 ? nextOptions : ["", ""]);
  }

  function closeEdit() {
    setEditingId("");
    setEditingQuestion("");
    setEditingOptions(["", ""]);
  }

  function updateEditingOption(index, value) {
    setEditingOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  }

  function addEditingOption() {
    setEditingOptions((prev) => [...prev, ""]);
  }

  function removeEditingOption(index) {
    setEditingOptions((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingId || !editingQuestion.trim()) return;
    const cleanOptions = editingOptions.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("Provide at least two options.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await updateEstateAlert(editingId, {
        title: editingQuestion.trim(),
        description: "",
        pollOptions: cleanOptions
      });
      if (updated?.stale) {
        const rows = await listEstateAlerts(estateId, "poll");
        setPolls(rows);
      } else {
        setPolls((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...updated } : row)));
      }
      showSuccess("Poll updated.");
      closeEdit();
    } catch (err) {
      setError(err?.message || "Failed to update poll");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(alertId) {
    const item = polls.find((row) => row.id === alertId);
    setPendingDelete({ id: alertId, title: item?.title || "this poll" });
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setBusy(true);
    setError("");
    try {
      await deleteEstateAlert(pendingDelete.id);
      setPolls((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      showSuccess("Poll deleted.");
      setPendingDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete poll");
    } finally {
      setBusy(false);
    }
  }

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((row) => ({ value: row.id, label: row.name })),
    [overview]
  );

  return (
    <AppShell title="Estate Polls">
      <EstateManagerPageShell
        eyebrow="Estate Polls"
        title="Polls"
        description="Launch votes that are easy to create, edit, and track from a phone-first estate manager flow."
        icon={<Vote size={22} />}
        accent="from-rose-500 to-pink-500"
        stats={[
          { label: "Polls", value: polls.length, helper: "Published votes" },
          {
            label: "Options",
            value: Math.max(...[2, ...polls.map((poll) => (poll.pollOptions || []).length)]),
            helper: "Largest poll size"
          }
        ]}
      >

        <EstateManagerSection title="Create a poll" subtitle="Keep results visible on the page, then open the poll composer only when needed.">
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 dark:bg-white dark:text-slate-900"
          >
            New Poll
          </button>
        </EstateManagerSection>

        <EstateManagerSection title="Poll results" subtitle="Monitor how each vote is landing without losing mobile readability.">
          {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          {!loading && polls.length === 0 ? <p className="mt-3 text-sm text-slate-500">No polls yet.</p> : null}
          <div className="mt-3 space-y-4">
            {polls.map((poll) => (
              <CardSurface
                as="article"
                key={poll.id}
                className="rounded-[1.6rem] border-slate-200/80 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                accent="from-rose-100/80 via-white/10 to-transparent"
                glow="bg-rose-300/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">{poll.title}</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {poll.createdAt ? new Date(poll.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(poll)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(poll.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-900/40 dark:text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {(poll.pollResults || []).map((row) => (
                    <div key={`${poll.id}-${row.index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/60">
                      <div className="flex items-center justify-between">
                        <span>{row.option}</span>
                        <span className="font-semibold">{row.count} votes</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${row.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardSurface>
            ))}
          </div>
        </EstateManagerSection>
      </EstateManagerPageShell>

      <MobileBottomSheet open={composeOpen} title="Create Poll" onClose={() => setComposeOpen(false)} width="720px" height="90dvh">
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
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Question</span>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} className={estateFieldClassName} placeholder="Should we repaint the gate?" required />
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Options</p>
            {options.map((opt, idx) => (
              <div key={`poll-option-${idx}`} className="flex items-center gap-2">
                <input value={opt} onChange={(event) => updateOption(idx, event.target.value)} className={estateFieldClassName} placeholder={`Option ${idx + 1}`} />
                {options.length > 2 ? <button type="button" onClick={() => removeOption(idx)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700">Remove</button> : null}
              </div>
            ))}
            <button type="button" onClick={addOption} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              Add option
            </button>
          </div>
          <button type="submit" disabled={busy || !estateId} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900">
            {busy ? "Publishing..." : "Publish Poll"}
          </button>
        </form>
      </MobileBottomSheet>

      {editingId ? (
        <MobileBottomSheet open={!!editingId} title="Edit Poll" onClose={closeEdit} width="720px" height="90dvh">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Edit Poll</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Update question</h3>
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Question</span>
                <input
                  value={editingQuestion}
                  onChange={(event) => setEditingQuestion(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Options</p>
                {editingOptions.map((opt, idx) => (
                  <div key={`edit-poll-option-${idx}`} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(event) => updateEditingOption(idx, event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                      placeholder={`Option ${idx + 1}`}
                    />
                    {editingOptions.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => removeEditingOption(idx)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:border-slate-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addEditingOption}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Add option
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </MobileBottomSheet>
      ) : null}

      {pendingDelete ? (
        <MobileBottomSheet open={!!pendingDelete} title="Delete Poll" onClose={() => setPendingDelete(null)} width="560px" height="46dvh">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirm Delete</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Delete poll?</h3>
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
        </MobileBottomSheet>
      ) : null}
    </AppShell>
  );
}
