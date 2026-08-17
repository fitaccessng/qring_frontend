import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, DoorOpen, ShieldCheck, UserCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getHomeownerVisits } from "../../services/homeownerService";
import { showError } from "../../utils/flash";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateLoadingState,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill
} from "../../components/homeowner/HomeownerEstateMobileUI";

const LOG_STATUSES = new Set(["approved", "accepted", "completed", "closed", "rejected", "reject", "denied"]);

export default function HomeownerEstateApprovalsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async ({ background = false } = {}) => {
      if (!background) setLoading(true);
      try {
        const data = await getHomeownerVisits();
        if (active) setRows(Array.isArray(data) ? data : []);
      } catch (error) {
        if (active) showError(error?.message || "Unable to load approval logs");
      } finally {
        if (active && !background) setLoading(false);
      }
    };

    load();
    const id = window.setInterval(() => load({ background: true }), 15000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const logs = useMemo(() => {
    return rows
      .filter((row) => {
        const status = normalizeStatus(row);
        return LOG_STATUSES.has(status) || row?.canDecide === false;
      })
      .sort((a, b) => new Date(b?.time || b?.timestamp || b?.startedAt || 0) - new Date(a?.time || a?.timestamp || a?.startedAt || 0));
  }, [rows]);

  return (
    <EstateMobilePage title="Approval Logs"  onBack={() => navigate(-1)}>
      {loading ? (
        <EstateLoadingState label="Approval Logs" />
      ) : logs.length ? (
        <section>
          <EstateSectionHeader label="Recent Decisions" count={logs.length} />
          <EstateList>
            {logs.map((row) => <ApprovalLogCard key={row.id} row={row} onOpen={() => navigate(`/dashboard/homeowner/messages?sessionId=${row.id}`)} />)}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={ClipboardList} title="No approval logs yet" message="Visitor decisions will appear after a request is approved or rejected." />
      )}
    </EstateMobilePage>
  );
}

function ApprovalLogCard({ row, onOpen }) {
  const status = normalizeStatus(row);
  const approved = ["approved", "accepted", "completed", "closed"].includes(status);
  const rejected = ["rejected", "reject", "denied"].includes(status);
  const Icon = approved ? ShieldCheck : rejected ? XCircle : Clock3;

  return (
    <EstateListItem onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black">{row.visitor || row.visitorName || row.visitorFullName || "Visitor"}</h2>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-bold uppercase tracking-wide text-slate-500">
              <DoorOpen className="h-3.5 w-3.5" />
              {row.door || row.doorName || "Assigned door"}
            </p>
          </div>
        </div>
        <EstateStatusPill tone={approved ? "emerald" : rejected ? "rose" : "amber"}>
          <Icon className="h-3.5 w-3.5" />
          {approved ? "Approved" : rejected ? "Rejected" : "Logged"}
        </EstateStatusPill>
      </div>
      <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
        {row.purpose || row.reason || "Visitor access request"}
      </p>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTime(row.time || row.timestamp || row.startedAt)}</p>
    </EstateListItem>
  );
}

function normalizeStatus(row) {
  return String(row?.sessionStatus || row?.status || "").toLowerCase();
}

function formatDateTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
