import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { listMyEstateAlerts, payEstateAlert } from "../../services/estateService";

export default function HomeownerAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingAlertId, setPayingAlertId] = useState("");
  const [error, setError] = useState("");

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

  async function handlePayNow(alertId) {
    if (payingAlertId) return;
    setPayingAlertId(alertId);
    setError("");
    try {
      const data = await payEstateAlert(alertId, { paymentMethod: "paystack" });
      if (data?.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
        return;
      }
      await load();
    } catch (requestError) {
      setError(requestError?.message ?? "Unable to initialize payment");
    } finally {
      setPayingAlertId("");
    }
  }

  return (
    <AppShell title="My Alerts">
      <div className="mx-auto max-w-4xl space-y-3">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}
        {loading ? <p className="text-sm text-slate-500">Loading alerts...</p> : null}
        {!loading && alerts.length === 0 ? <p className="text-sm text-slate-500">No alerts yet.</p> : null}
        {alerts.map((item) => {
          const paymentStatus = item?.myPayment?.status ?? "pending";
          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">{item.title}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {item.alertType}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              {item.amountDue ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-sm font-semibold">
                    Amount due: NGN {Number(item.amountDue).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Status: {paymentStatus} {item.myPayment?.paidAt ? `| Paid at ${new Date(item.myPayment.paidAt).toLocaleString()}` : ""}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {paymentStatus !== "paid" ? (
                      <button
                        type="button"
                        onClick={() => handlePayNow(item.id)}
                        disabled={payingAlertId === item.id}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {payingAlertId === item.id ? "Redirecting..." : "Pay Now"}
                      </button>
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
