import { useEffect, useState } from "react";
import { downloadDigitalReceiptPdf, listDigitalReceipts } from "../../services/advancedService";

export default function PaymentLogsSample() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await listDigitalReceipts(100);
        if (!active) return;
        setRows(data);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message || "Unable to load receipts");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <h3 className="text-base font-black">Digital Receipts</h3>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading receipts...</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-3 space-y-2">
        {rows.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70"
          >
            <p className="text-sm font-semibold">{item.reference}</p>
            <p className="text-xs text-slate-500">
              {(item.currency || "NGN").toUpperCase()} {(Number(item.amountKobo || 0) / 100).toFixed(2)} | {item.purpose}
            </p>
            <p className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</p>
            <button
              type="button"
              onClick={() => downloadDigitalReceiptPdf(item.id).catch((err) => setError(err?.message || "Download failed"))}
              className="mt-2 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white dark:bg-slate-200 dark:text-slate-900"
            >
              Download PDF
            </button>
          </article>
        ))}
        {!loading && rows.length === 0 ? <p className="text-sm text-slate-500">No receipts yet.</p> : null}
      </div>
    </section>
  );
}
