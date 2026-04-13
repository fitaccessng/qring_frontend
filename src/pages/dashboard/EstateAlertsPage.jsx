import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { BellRing } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import EstateManagerPageShell, {
  EstateManagerSection,
  estateFieldClassName,
  estateTextareaClassName
} from "../../components/mobile/EstateManagerPageShell";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import {
  createEstateAlert,
  getEstateOverview,
  listEstateAlertPayments,
  listEstateAlerts
} from "../../services/estateService";

const ALERT_TYPES = [
  { label: "Notice", value: "notice" },
  { label: "Payment Request", value: "payment_request" },
  { label: "Meeting", value: "meeting" },
  { label: "Maintenance", value: "maintenance_request" }
];

export default function EstateAlertsPage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    alertType: "notice",
    amountDue: "",
    dueDate: ""
  });
  const token = localStorage.getItem("qring_access_token");

  useEffect(() => {
    let active = true;
    async function run() {
      setLoading(true);
      try {
        const data = await getEstateOverview();
        if (!active) return;
        setOverview(data);
        const firstEstateId = data?.estates?.[0]?.id ?? "";
        setEstateId(firstEstateId);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message ?? "Failed to load estate data");
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  async function loadAlertsData(nextEstateId = estateId, nextFilter = filter) {
    if (!nextEstateId) return;
    const [alertRows, paymentRows] = await Promise.all([
      listEstateAlerts(nextEstateId, nextFilter),
      listEstateAlertPayments(nextEstateId)
    ]);
    setAlerts(alertRows);
    setPayments(paymentRows);
  }

  useEffect(() => {
    let active = true;
    async function run() {
      if (!estateId) return;
      try {
        await loadAlertsData(estateId, filter);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message ?? "Failed to load alerts");
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [estateId, filter]);

  useEffect(() => {
    if (!token || !estateId) return () => {};
    const socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      ...realtimeTransportOptions,
      auth: { token }
    });
    socket.on("connect", () => {
      socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
    });
    const reload = () => {
      loadAlertsData(estateId, filter).catch(() => {});
    };
    socket.on("ALERT_CREATED", reload);
    socket.on("PAYMENT_STATUS_UPDATED", reload);
    return () => {
      socket.disconnect();
    };
  }, [token, estateId, filter]);

  const estateOptions = useMemo(() => overview?.estates ?? [], [overview]);

  async function handleCreateAlert(event) {
    event.preventDefault();
    if (!estateId || saving) return;
    setError("");
    setSaving(true);
    try {
      const payload = {
        estateId,
        title: form.title,
        description: form.description,
        alertType: form.alertType,
        amountDue:
          form.alertType === "payment_request" && form.amountDue !== ""
            ? Number(form.amountDue)
            : null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null
      };
      await createEstateAlert(payload);
      setForm({ title: "", description: "", alertType: "notice", amountDue: "", dueDate: "" });
      await loadAlertsData(estateId, filter);
    } catch (requestError) {
      setError(requestError?.message ?? "Failed to create alert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Estate Alerts">
      <EstateManagerPageShell
        eyebrow="Communication"
        title="Estate Alerts"
        description="Send simple notices, requests, and meetings in the same clean flow used across the estate dashboard."
        icon={<BellRing className="h-5 w-5" />}
        accent="from-[#4f8cff] to-[#00346f]"
        stats={[
          { label: "Alerts", value: String(alerts.length), helper: "Current feed" },
          { label: "Payments", value: String(payments.length), helper: "Tracked requests" }
        ]}
      >
        <EstateManagerSection title="Create Alert" subtitle="Create one clear update for homeowners.">
          <form onSubmit={handleCreateAlert} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className={estateFieldClassName}
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <select
              className={estateFieldClassName}
              value={form.alertType}
              onChange={(event) => setForm((prev) => ({ ...prev, alertType: event.target.value }))}
            >
              {ALERT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <textarea
              className={`${estateTextareaClassName} sm:col-span-2`}
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
            />
            {form.alertType === "payment_request" ? (
              <input
                className={estateFieldClassName}
                placeholder="Amount due (NGN)"
                type="number"
                min="1"
                value={form.amountDue}
                onChange={(event) => setForm((prev) => ({ ...prev, amountDue: event.target.value }))}
                required
              />
            ) : (
              <div />
            )}
            <input
              className={estateFieldClassName}
              type="datetime-local"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
            <button
              type="submit"
              className="rounded-[1.15rem] bg-[#00346f] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
              disabled={saving || loading || !estateId}
            >
              {saving ? "Creating..." : "Create Alert"}
            </button>
          </form>
        </EstateManagerSection>

        <EstateManagerSection title="Alert Feed" subtitle="Filter what is live in the estate right now.">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              className={estateFieldClassName}
              value={estateId}
              onChange={(event) => setEstateId(event.target.value)}
            >
              {estateOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className={estateFieldClassName}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">All types</option>
              {ALERT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          <div className="space-y-2">
            {alerts.map((item) => (
              <article key={item.id} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <span className="rounded-full bg-[#d7e2ff] px-2 py-0.5 text-xs font-semibold text-[#00346f] dark:bg-indigo-900/40 dark:text-indigo-300">
                    {item.alertType}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Due: {item.amountDue ? `NGN ${Number(item.amountDue).toLocaleString()}` : "N/A"} | Paid: {item.paymentSummary?.paid ?? 0} | Pending: {item.paymentSummary?.pending ?? 0}
                </p>
              </article>
            ))}
            {alerts.length === 0 ? <p className="text-sm text-slate-500">No alerts found.</p> : null}
          </div>
        </EstateManagerSection>

        <EstateManagerSection title="Payments Overview" subtitle="Track what has been paid and what is still pending.">
          <div className="space-y-2">
            {payments.map((item) => (
              <article key={`payment-${item.id}`} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <h3 className="text-sm font-bold">{item.title}</h3>
                <p className="text-xs text-slate-500">{item.homeowners?.filter((row) => row.status === "paid").length ?? 0} paid / {item.homeowners?.length ?? 0} homeowners</p>
              </article>
            ))}
            {payments.length === 0 ? <p className="text-sm text-slate-500">No payment records yet.</p> : null}
          </div>
        </EstateManagerSection>
      </EstateManagerPageShell>
    </AppShell>
  );
}
