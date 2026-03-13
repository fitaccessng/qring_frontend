import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getEstateOverview, listEstateAlerts, listMaintenanceAudits, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";

export default function EstateMaintenancePage() {
  const [overview, setOverview] = useState(null);
  const [estateId, setEstateId] = useState("");
  const [requests, setRequests] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [auditHomeownerFilter, setAuditHomeownerFilter] = useState("");

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
    if (!estateId) return;
    let active = true;
    async function loadRequests() {
      try {
        const [rows, auditRows] = await Promise.all([
          listEstateAlerts(estateId, "maintenance_request"),
          listMaintenanceAudits(estateId)
        ]);
        if (!active) return;
        setRequests(rows);
        setAudits(auditRows);
      } catch (err) {
        if (active) setError(err?.message || "Failed to load maintenance requests");
      }
    }
    loadRequests();
    return () => {
      active = false;
    };
  }, [estateId]);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function updateStatus(item, status) {
    if (!item?.id || updatingId) return;
    setUpdatingId(item.id);
    setError("");
    try {
      const updated = await updateEstateAlert(item.id, {
        title: item.title,
        description: item.description || "",
        maintenanceStatus: status
      });
      if (updated?.stale) {
        const [rows, auditRows] = await Promise.all([
          listEstateAlerts(estateId, "maintenance_request"),
          listMaintenanceAudits(estateId)
        ]);
        setRequests(rows);
        setAudits(auditRows);
      } else {
        setRequests((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...updated } : row)));
      }
      showSuccess(`Marked as ${status}.`);
    } catch (err) {
      setError(err?.message || "Failed to update status");
    } finally {
      setUpdatingId("");
    }
  }

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
          Promise.all([listEstateAlerts(estateId, "maintenance_request"), listMaintenanceAudits(estateId)])
            .then(([rows, auditRows]) => {
              setRequests(rows);
              setAudits(auditRows);
            })
            .catch(() => {});
        },
        ALERT_UPDATED: () => {
          if (!estateId) return;
          Promise.all([listEstateAlerts(estateId, "maintenance_request"), listMaintenanceAudits(estateId)])
            .then(([rows, auditRows]) => {
              setRequests(rows);
              setAudits(auditRows);
            })
            .catch(() => {});
        },
        ALERT_DELETED: () => {
          if (!estateId) return;
          Promise.all([listEstateAlerts(estateId, "maintenance_request"), listMaintenanceAudits(estateId)])
            .then(([rows, auditRows]) => {
              setRequests(rows);
              setAudits(auditRows);
            })
            .catch(() => {});
        }
      }),
      [estateId]
    )
  );

  const estateOptions = useMemo(
    () => (overview?.estates ?? []).map((row) => ({ value: row.id, label: row.name })),
    [overview]
  );

  const auditByAlert = useMemo(() => {
    const map = new Map();
    audits.forEach((row) => {
      const list = map.get(row.alertId) ?? [];
      list.push(row);
      map.set(row.alertId, list);
    });
    return map;
  }, [audits]);

  const requestById = useMemo(() => {
    const map = new Map();
    requests.forEach((row) => map.set(row.id, row));
    return map;
  }, [requests]);

  const auditHomeownerOptions = useMemo(() => {
    const map = new Map();
    audits.forEach((row) => {
      const label = row.changedByName || row.changedByEmail || "Estate Admin";
      const key = row.changedById || label;
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [audits]);

  const filteredAudits = useMemo(() => {
    return audits.filter((row) => {
      if (auditStatusFilter !== "all" && row.toStatus !== auditStatusFilter) return false;
      if (auditHomeownerFilter) {
        const key = row.changedById || row.changedByName || row.changedByEmail || "";
        if (String(key) !== String(auditHomeownerFilter)) return false;
      }
      return true;
    });
  }, [audits, auditStatusFilter, auditHomeownerFilter]);

  return (
    <AppShell title="Maintenance Requests">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Maintenance inbox</h2>
              <p className="mt-1 text-xs text-slate-500">Requests submitted by homeowners.</p>
            </div>
            <select
              value={estateId}
              onChange={(event) => setEstateId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
            >
              {estateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {["requests", "audits"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
                }`}
              >
                {tab === "requests" ? "Requests" : "Audit Trail"}
              </button>
            ))}
          </div>
          {activeTab === "audits" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={auditStatusFilter}
                onChange={(event) => setAuditStatusFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending only</option>
                <option value="solved">Solved only</option>
              </select>
              <select
                value={auditHomeownerFilter}
                onChange={(event) => setAuditHomeownerFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
              >
                <option value="">All admins</option>
                {auditHomeownerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {activeTab === "requests" ? (
            <>
              {!loading && requests.length === 0 ? <p className="text-sm text-slate-500">No maintenance requests yet.</p> : null}
              <div className="space-y-3">
                {requests.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold">{item.title}</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.maintenanceStatus === "solved"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {item.maintenanceStatus === "solved" ? "Solved" : "Pending"}
                    </span>
                  </div>
                </div>
                    {item.description ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(item, "pending")}
                        disabled={updatingId === item.id}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
                      >
                        {updatingId === item.id ? "Updating..." : "Mark Pending"}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(item, "solved")}
                        disabled={updatingId === item.id}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
                      >
                        {updatingId === item.id ? "Updating..." : "Mark Solved"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              {!loading && filteredAudits.length === 0 ? <p className="text-sm text-slate-500">No audit history yet.</p> : null}
              <div className="space-y-2">
                {filteredAudits.map((row) => {
                  const request = requestById.get(row.alertId);
                  return (
                    <div key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {request?.title || "Maintenance Request"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {row.fromStatus} → {row.toStatus}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.changedAt ? new Date(row.changedAt).toLocaleString() : ""}
                        </div>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {row.changedByName} {row.changedByEmail ? `(${row.changedByEmail})` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
