import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { listMyEstateAlerts, payEstateAlert, respondEstateMeeting, voteEstatePoll } from "../../services/estateService";
import { uploadPaymentProof } from "../../services/homeownerService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";

export default function HomeownerAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingAlertId, setPayingAlertId] = useState("");
  const [respondingAlertId, setRespondingAlertId] = useState("");
  const [votingAlertId, setVotingAlertId] = useState("");
  const [error, setError] = useState("");
  const [paymentMethodByAlert, setPaymentMethodByAlert] = useState({});
  const [bankRefByAlert, setBankRefByAlert] = useState({});
  const [proofUploadingId, setProofUploadingId] = useState("");
  const [proofFileByAlert, setProofFileByAlert] = useState({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const rows = await listMyEstateAlerts();
      setAlerts(rows);
    } catch (requestError) {
      setError(requestError?.message ?? "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  
  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useSocketEvents(
    useMemo(
      () => ({
        ALERT_CREATED: () => load(),
        ALERT_UPDATED: () => load(),
        ALERT_DELETED: () => load(),
        PAYMENT_STATUS_UPDATED: () => load()
      }),
      []
    )
  );

  async function handlePayNow(alertId, method = "paystack", reference) {
    if (payingAlertId) return;
    setPayingAlertId(alertId);
    setError("");
    try {
      const payload = { paymentMethod: method };
      if (reference) payload.reference = reference;
      const data = await payEstateAlert(alertId, payload);
      if (data?.stale) {
        await load();
        return;
      }
      if (data?.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
        return;
      }
      if (data?.message) {
        showSuccess(data.message);
      } else if (method === "bank_transfer") {
        showSuccess("Bank transfer reference submitted. Awaiting verification.");
      } else if (method === "wallet") {
        showSuccess("Wallet payment requested. Awaiting verification.");
      }
      await load();
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to initialize payment");
    } finally {
      setPayingAlertId("");
    }
  }

  async function handleProofUpload(alertId) {
    const file = proofFileByAlert[alertId];
    if (!alertId || !file) return;
    setProofUploadingId(alertId);
    setError("");
    try {
      await uploadPaymentProof(alertId, file);
      showSuccess("Payment proof uploaded.");
      await load();
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to upload proof");
    } finally {
      setProofUploadingId("");
    }
  }

  async function handleMeetingResponse(alertId, response) {
    if (respondingAlertId) return;
    setRespondingAlertId(alertId);
    setError("");
    try {
      const res = await respondEstateMeeting(alertId, response);
      if (res?.stale) {
        await load();
        return;
      }
      await load();
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to submit response");
    } finally {
      setRespondingAlertId("");
    }
  }

  async function handlePollVote(alertId, optionIndex) {
    if (votingAlertId) return;
    setVotingAlertId(alertId);
    setError("");
    try {
      const res = await voteEstatePoll(alertId, optionIndex);
      if (res?.stale) {
        await load();
        return;
      }
      await load();
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to vote");
    } finally {
      setVotingAlertId("");
    }
  }

  return (
    <AppShell title="My Alerts">
      <div className="mx-auto max-w-4xl space-y-3">
        {loading ? <p className="text-sm text-slate-500">Loading alerts...</p> : null}
        {!loading && alerts.length === 0 ? <p className="text-sm text-slate-500">No alerts yet.</p> : null}
        {alerts.map((item) => {
          const paymentStatus = item?.myPayment?.status ?? "pending";
          const meetingResponse = item?.myMeetingResponse || "";
          const isMeeting = item?.alertType === "meeting";
          const isPoll = item?.alertType === "poll";
          const selectedMethod = paymentMethodByAlert[item.id] || "paystack";
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold">{item.title}</h2>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {item.alertType}
                  </span>
                  {item.alertType === "maintenance_request" ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.maintenanceStatus === "solved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {item.maintenanceStatus === "solved" ? "Solved" : "Pending"}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              {isMeeting ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                  <p className="font-semibold">Meeting attendance</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {item.dueDate ? `Scheduled: ${new Date(item.dueDate).toLocaleString()}` : "Schedule TBD"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["attending", "not_attending", "maybe"].map((response) => (
                      <button
                        key={`${item.id}-${response}`}
                        type="button"
                        onClick={() => handleMeetingResponse(item.id, response)}
                        disabled={respondingAlertId === item.id}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                          meetingResponse === response
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200"
                        }`}
                      >
                        {response.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {isPoll ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                  <p className="font-semibold">Vote</p>
                  <div className="mt-2 grid gap-2">
                    {(item.pollOptions || []).map((option, idx) => (
                      <button
                        key={`${item.id}-option-${idx}`}
                        type="button"
                        onClick={() => handlePollVote(item.id, idx)}
                        disabled={votingAlertId === item.id}
                        className={`rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition ${
                          item.myPollVote === idx
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.amountDue ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-sm font-semibold">
                    Amount due: NGN {Number(item.amountDue).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Status: {paymentStatus} {item.myPayment?.paidAt ? `| Paid at ${new Date(item.myPayment.paidAt).toLocaleString()}` : ""}
                  </p>
                  {item.myPayment?.note ? (
                    <p className="mt-1 text-xs text-slate-500">{item.myPayment.note}</p>
                  ) : null}
                  {item.myPayment?.proofUrl ? (
                    <a
                      href={item.myPayment.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-xs font-semibold text-indigo-600"
                    >
                      View payment proof
                    </a>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    {paymentStatus !== "paid" ? (
                      <div className="w-full space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: "paystack", label: "Paystack" },
                            { value: "bank_transfer", label: "Bank transfer" },
                            { value: "wallet", label: "Wallet" }
                          ].map((method) => (
                            <button
                              key={`${item.id}-${method.value}`}
                              type="button"
                              onClick={() =>
                                setPaymentMethodByAlert((prev) => ({
                                  ...prev,
                                  [item.id]: method.value
                                }))
                              }
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                selectedMethod === method.value
                                  ? "border-indigo-500 bg-indigo-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200"
                              }`}
                            >
                              {method.label}
                            </button>
                          ))}
                        </div>
                        {selectedMethod === "bank_transfer" ? (
                          <div className="flex flex-wrap gap-2">
                            <input
                              value={bankRefByAlert[item.id] || ""}
                              onChange={(event) =>
                                setBankRefByAlert((prev) => ({
                                  ...prev,
                                  [item.id]: event.target.value
                                }))
                              }
                              placeholder="Bank transfer reference"
                              className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handlePayNow(item.id, "bank_transfer", bankRefByAlert[item.id])}
                              disabled={payingAlertId === item.id}
                              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {payingAlertId === item.id ? "Submitting..." : "Submit Reference"}
                            </button>
                            <div className="flex w-full flex-wrap items-center gap-2">
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.pdf"
                                onChange={(event) =>
                                  setProofFileByAlert((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.files?.[0] || null
                                  }))
                                }
                                className="w-full max-w-xs text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleProofUpload(item.id)}
                                disabled={proofUploadingId === item.id || !proofFileByAlert[item.id]}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
                              >
                                {proofUploadingId === item.id ? "Uploading..." : "Upload Proof"}
                              </button>
                            </div>
                            <p className="w-full text-[11px] text-slate-500">
                              Use the estate bank details shared by your admin, then submit the transfer reference.
                            </p>
                          </div>
                        ) : null}
                        {selectedMethod === "wallet" ? (
                          <button
                            type="button"
                            onClick={() => handlePayNow(item.id, "wallet")}
                            disabled={payingAlertId === item.id}
                            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {payingAlertId === item.id ? "Requesting..." : "Use Wallet"}
                          </button>
                        ) : null}
                        {selectedMethod === "paystack" ? (
                          <button
                            type="button"
                            onClick={() => handlePayNow(item.id, "paystack")}
                            disabled={payingAlertId === item.id}
                            className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {payingAlertId === item.id ? "Redirecting..." : "Pay Now"}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {item.myPayment?.receiptUrl ? (
                      <a
                        href={item.myPayment.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
                      >
                        Download receipt
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
