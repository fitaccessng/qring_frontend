import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { env } from "../../config/env";
import { realtimeTransportOptions } from "../../services/socketConfig";
import { getLiveVisitorQueue } from "../../services/advancedService";

export default function LiveVisitorFeedSample() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQueue() {
    try {
      const data = await getLiveVisitorQueue(60);
      setRows(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.message || "Unable to load visitor queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
    const socket = io(`${env.socketUrl}${env.dashboardNamespace}`, {
      path: env.socketPath,
      ...realtimeTransportOptions
    });
    const onPatch = () => loadQueue();
    socket.on("dashboard.patch", onPatch);
    socket.on("visitor.snapshot", onPatch);
    return () => {
      socket.off("dashboard.patch", onPatch);
      socket.off("visitor.snapshot", onPatch);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedRows = useMemo(
    () =>
      [...rows].sort((a, b) => new Date(b.arrivalTime || 0).getTime() - new Date(a.arrivalTime || 0).getTime()),
    [rows]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <h3 className="text-base font-black">Live Queue Board</h3>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading visitor queue...</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-3 space-y-2">
        {orderedRows.map((item) => (
          <article
            key={item.sessionId}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70"
          >
            <p className="text-sm font-semibold">{item.visitorName}</p>
            <p className="text-xs text-slate-500">
              Arrival: {item.arrivalTime ? new Date(item.arrivalTime).toLocaleString() : "-"} | Status:{" "}
              {item.approvalStatus || "pending"}
            </p>
          </article>
        ))}
        {!loading && orderedRows.length === 0 ? <p className="text-sm text-slate-500">No active visitor queue.</p> : null}
      </div>
    </section>
  );
}
