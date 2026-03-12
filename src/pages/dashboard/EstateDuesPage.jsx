import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import {
  createEstateAlert,
  deleteEstateAlert,
  getEstateOverview,
  listEstateAlertPayments,
  listEstateAlerts,
  sendEstateAlertReminder,
  updateEstateAlert,
  verifyEstateAlertPayment
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";

export default function EstateDuesPage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [remindingId, setRemindingId] = useState("");
  const [verifyingKey, setVerifyingKey] = useState("");
  const [error, setError] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewReference, setReviewReference] = useState("");
  const [reviewMethod, setReviewMethod] = useState("");
  const [reviewReceiptUrl, setReviewReceiptUrl] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingAmountDue, setEditingAmountDue] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
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
        const [rows, paymentRows] = await Promise.all([
          listEstateAlerts(estateId, "payment_request"),
          listEstateAlertPayments(estateId)
        ]);
        if (!active) return;
        setAlerts(rows);
        setPayments(paymentRows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load dues");
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
          Promise.all([listEstateAlerts(estateId, "payment_request"), listEstateAlertPayments(estateId)])
            .then(([rows, paymentRows]) => {
              setAlerts(rows);
              setPayments(paymentRows);
            })
            .catch(() => {});
        },
        ALERT_UPDATED: () => {
          if (!estateId) return;
          Promise.all([listEstateAlerts(estateId, "payment_request"), listEstateAlertPayments(estateId)])
            .then(([rows, paymentRows]) => {
              setAlerts(rows);
              setPayments(paymentRows);
            })
            .catch(() => {});
        },
        ALERT_DELETED: () => {
          if (!estateId) return;
          Promise.all([listEstateAlerts(estateId, "payment_request"), listEstateAlertPayments(estateId)])
            .then(([rows, paymentRows]) => {
              setAlerts(rows);
              setPayments(paymentRows);
            })
            .catch(() => {});
        },
        PAYMENT_STATUS_UPDATED: () => {
          if (!estateId) return;
          Promise.all([listEstateAlerts(estateId, "payment_request"), listEstateAlertPayments(estateId)])
            .then(([rows, paymentRows]) => {
              setAlerts(rows);
              setPayments(paymentRows);
            })
            .catch(() => {});
        }
      }),
      [estateId]
    )
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (!estateId || !title.trim()) return;
    const value = Number(amountDue);
    if (!value || value <= 0) {
      setError("Amount is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createEstateAlert({
        estateId,
        title: title.trim(),
        description: description.trim(),
        alertType: "payment_request",
        amountDue: value,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null
      });
      showSuccess("Payment request sent.");
      setTitle("");
      setDescription("");
      setAmountDue("");
      setDueDate("");
      const [rows, paymentRows] = await Promise.all([
        listEstateAlerts(estateId, "payment_request"),
        listEstateAlertPayments(estateId)
      ]);
      setAlerts(rows);
      setPayments(paymentRows);
    } catch (err) {
      setError(err?.message || "Failed to create dues request");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(alert) {
    setEditingId(alert?.id || "");
    setEditingTitle(alert?.title || "");
    setEditingDescription(alert?.description || "");
    setEditingAmountDue(alert?.amountDue ? String(alert.amountDue) : "");
    setEditingDueDate(alert?.dueDate ? new Date(alert.dueDate).toISOString().slice(0, 10) : "");
  }

  function closeEdit() {
    setEditingId("");
    setEditingTitle("");
    setEditingDescription("");
    setEditingAmountDue("");
    setEditingDueDate("");
  }

  async function handleUpdate(event) {
    event.preventDefault();
    if (!editingId || !editingTitle.trim()) return;
    const value = Number(editingAmountDue);
    if (!value || value <= 0) {
      setError("Amount is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await updateEstateAlert(editingId, {
        title: editingTitle.trim(),
        description: editingDescription.trim(),
        amountDue: value,
        dueDate: editingDueDate ? new Date(editingDueDate).toISOString() : null
      });
      if (updated?.stale) {
        const [rows, paymentRows] = await Promise.all([
          listEstateAlerts(estateId, "payment_request"),
          listEstateAlertPayments(estateId)
        ]);
        setAlerts(rows);
        setPayments(paymentRows);
      } else {
        setAlerts((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...updated } : row)));
      }
      showSuccess("Payment request updated.");
      closeEdit();
    } catch (err) {
      setError(err?.message || "Failed to update payment request");
    } finally {
      setBusy(false);
    }
  }

  function handleDelete(alertId) {
    const item = alerts.find((row) => row.id === alertId);
    setPendingDelete({ id: alertId, title: item?.title || "this payment request" });
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setBusy(true);
    setError("");
    try {
      await deleteEstateAlert(pendingDelete.id);
      setAlerts((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      setPayments((prev) => prev.filter((row) => row.id !== pendingDelete.id));
      showSuccess("Payment request deleted.");
      setPendingDelete(null);
    } catch (err) {
      setError(err?.message || "Failed to delete payment request");
    } finally {
      setBusy(false);
    }
  }

  async function handleReminder(alertId) {
    if (remindingId) return;
    setRemindingId(alertId);
    setError("");
    try {
      const res = await sendEstateAlertReminder(alertId);
      if (res?.stale) {
        const [rows, paymentRows] = await Promise.all([
          listEstateAlerts(estateId, "payment_request"),
          listEstateAlertPayments(estateId)
        ]);
        setAlerts(rows);
        setPayments(paymentRows);
        return;
      }
      showSuccess(`Reminder sent to ${res?.reminded ?? 0} homeowners.`);
    } catch (err) {
      setError(err?.message || "Failed to send reminders");
    } finally {
      setRemindingId("");
    }
  }

  async function handleVerify(alertId, homeowner) {
    if (!alertId || !homeowner?.homeownerId || verifyingKey) return;
    const key = `${alertId}:${homeowner.homeownerId}`;
    setVerifyingKey(key);
    setError("");
    try {
      const res = await verifyEstateAlertPayment(alertId, {
        homeownerId: homeowner.homeownerId,
        paymentMethod: homeowner.paymentMethod,
        reference: homeowner.reference,
        receiptUrl: homeowner.receiptUrl
      });
      if (res?.stale) {
        const [rows, paymentRows] = await Promise.all([
          listEstateAlerts(estateId, "payment_request"),
          listEstateAlertPayments(estateId)
        ]);
        setAlerts(rows);
        setPayments(paymentRows);
        closeReview();
        return;
      }
      showSuccess(`Marked payment as paid for ${homeowner.homeownerName || "Homeowner"}.`);
      const [rows, paymentRows] = await Promise.all([
        listEstateAlerts(estateId, "payment_request"),
        listEstateAlertPayments(estateId)
      ]);
      setAlerts(rows);
      setPayments(paymentRows);
      closeReview();
    } catch (err) {
      setError(err?.message || "Failed to verify payment");
    } finally {
      setVerifyingKey("");
    }
  }

  function openReview(alertId, homeowner) {
    setReviewTarget({ alertId, homeowner });
    setReviewReference(homeowner?.reference || "");
    setReviewMethod(homeowner?.paymentMethod || "bank_transfer");
    setReviewReceiptUrl(homeowner?.receiptUrl || "");
  }

  function closeReview() {
    setReviewTarget(null);
    setReviewReference("");
    setReviewMethod("");
    setReviewReceiptUrl("");
  }

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((row) => ({ value: row.id, label: row.name })),
    [overview]
  );

  const paymentMap = useMemo(() => {
    const map = new Map();
    payments.forEach((alert) => map.set(alert.id, alert));
    return map;
  }, [payments]);

  return (
    <AppShell title="Estate Dues & Payments">
      <div className="mx-auto w-full max-w-4xl space-y-5">

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create payment request</h2>
          <p className="mt-1 text-xs text-slate-500">Homeowners can pay via Paystack, bank transfer reference, or wallet balance.</p>
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
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="January security levy"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Amount (NGN)</span>
              <input
                value={amountDue}
                onChange={(event) => setAmountDue(event.target.value)}
                type="number"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="5000"
                min="0"
                step="0.01"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due date</span>
              <input
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                placeholder="Payment covers security, waste, and generator upkeep."
              />
            </label>
            <button
              type="submit"
              disabled={busy || !estateId}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {busy ? "Creating..." : "Create Payment Request"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment status</h3>
          {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          {!loading && alerts.length === 0 ? <p className="mt-3 text-sm text-slate-500">No payment requests yet.</p> : null}
          <div className="mt-3 space-y-4">
            {alerts.map((alert) => {
              const summary = paymentMap.get(alert.id);
              return (
                <article key={alert.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold">{alert.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{alert.dueDate ? new Date(alert.dueDate).toLocaleDateString() : "No due date"}</span>
                      <button
                        type="button"
                        onClick={() => startEdit(alert)}
                        className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(alert.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-900/40 dark:text-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Amount: NGN {Number(alert.amountDue || 0).toLocaleString()}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 dark:text-slate-300">
                    {(summary?.homeowners ?? []).map((row) => (
                      <div key={`${alert.id}-${row.homeownerId}`} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-slate-900/70">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {row.homeownerName || "Homeowner"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.paymentMethod ? `Method: ${row.paymentMethod.replace("_", " ")}` : "Method: pending"}
                            {row.reference ? ` • Ref: ${row.reference}` : ""}
                          </p>
                          {row.note ? <p className="text-[10px] text-slate-400">{row.note}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide">{row.status}</span>
                            <div className="flex items-center gap-1">
                              {row.proofUrl ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                  Proof
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                  No proof
                                </span>
                              )}
                              {row.status === "paid" ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Paid
                                </span>
                              ) : (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                          {row.status !== "paid" ? (
                            <button
                              type="button"
                              onClick={() => openReview(alert.id, row)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                            >
                              Review
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleReminder(alert.id)}
                      disabled={remindingId === alert.id}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    >
                      {remindingId === alert.id ? "Sending..." : "Send reminder"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      {reviewTarget ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-4 pb-6 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Manual Review</p>
              <button
                type="button"
                onClick={closeReview}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Homeowner</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {reviewTarget.homeowner?.homeownerName || "Homeowner"}
                </p>
                <p className="text-[11px] text-slate-500">{reviewTarget.homeowner?.homeownerEmail || ""}</p>
              </div>
              {reviewTarget.homeowner?.proofUrl ? (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Proof</p>
                  {reviewTarget.homeowner.proofUrl.endsWith(".pdf") ? (
                    <a
                      href={reviewTarget.homeowner.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        PDF
                      </span>
                      View PDF proof
                    </a>
                  ) : (
                    <a href={reviewTarget.homeowner.proofUrl} target="_blank" rel="noreferrer">
                      <img
                        src={reviewTarget.homeowner.proofUrl}
                        alt="Payment proof"
                        className="mt-2 max-h-48 w-full rounded-xl border border-slate-200 object-contain"
                      />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No proof uploaded.</p>
              )}
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Payment method
                </span>
                <select
                  value={reviewMethod}
                  onChange={(event) => setReviewMethod(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                >
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="paystack">Paystack</option>
                  <option value="wallet">Wallet</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Reference
                </span>
                <input
                  value={reviewReference}
                  onChange={(event) => setReviewReference(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                  placeholder="Reference"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Receipt URL (optional)
                </span>
                <input
                  value={reviewReceiptUrl}
                  onChange={(event) => setReviewReceiptUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                  placeholder="https://..."
                />
              </label>
              <button
                type="button"
                onClick={() => handleVerify(reviewTarget.alertId, { ...reviewTarget.homeowner, reference: reviewReference, paymentMethod: reviewMethod, receiptUrl: reviewReceiptUrl })}
                disabled={verifyingKey === `${reviewTarget.alertId}:${reviewTarget.homeowner?.homeownerId}`}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {verifyingKey === `${reviewTarget.alertId}:${reviewTarget.homeowner?.homeownerId}` ? "Verifying..." : "Mark as Paid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editingId ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-4 pb-6 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Edit Payment Request</p>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</span>
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount (NGN)</span>
                <input
                  value={editingAmountDue}
                  onChange={(event) => setEditingAmountDue(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due date</span>
                <input
                  value={editingDueDate}
                  onChange={(event) => setEditingDueDate(event.target.value)}
                  type="date"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</span>
                <textarea
                  value={editingDescription}
                  onChange={(event) => setEditingDescription(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {pendingDelete ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 px-4 pb-6 pt-10 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Delete Payment Request</p>
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This will permanently delete <span className="font-semibold">{pendingDelete.title}</span>.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
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
