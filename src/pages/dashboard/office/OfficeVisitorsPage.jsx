import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneCall, Video } from "lucide-react";
import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import OfficeVisitorRow from "../../../components/office/OfficeVisitorRow";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "visitors"];

export default function OfficeVisitorsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const config = useMemo(() => ({ params: { search: search || undefined, status: status || undefined } }), [search, status]);
  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: [...QUERY_KEY, search, status],
    url: endpoints.office.visitors,
    config,
    refetchInterval: 20000
  });
  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visit.checked_in",
    "office.visit.checked_out"
  ]);

  if (isLoading) {
    return (
      <AppShell title="Office Visitors" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  const rows = data?.items || [];

  function launchCall(sessionId, mode) {
    if (!sessionId) return;
    try {
      window.sessionStorage.setItem("qring_call_start_intent", JSON.stringify({
        pending: true,
        sessionId,
        mode,
        callSessionId: "",
        visitorId: sessionId
      }));
    } catch {
      // ignore storage failures
    }
    navigate(`/session/${encodeURIComponent(sessionId)}/${mode}`);
  }

  return (
    <AppShell title="Office Visitors" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load visitor records."} onRetry={() => refetch()} /> : null}
        <OfficePageHeader
          title="Office Visitors"
          subtitle="A full visitor logbook with current visits, completed visits, and outcomes."
          tabs={officeTabs}
        />

        <OfficePanel title="Filters" subtitle="Search across the visitor logbook">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitor, phone, purpose" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
            </select>
          </div>
        </OfficePanel>

        <OfficePanel title="Visitor History" subtitle={`${rows.length} visit${rows.length === 1 ? "" : "s"} loaded`}>
          <div className="grid gap-3">
            {rows.length > 0 ? rows.map((item) => (
              <div key={item.id} className="space-y-2">
                <OfficeVisitorRow item={item} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => launchCall(item.id, "audio")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Voice
                  </button>
                  <button
                    type="button"
                    onClick={() => launchCall(item.id, "video")}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Video
                  </button>
                </div>
              </div>
            )) : (
              <OfficeEmptyState title="No visitor records" description="All visit history will appear here once there is office traffic." />
            )}
          </div>
        </OfficePanel>
      </div>
    </AppShell>
  );
}
