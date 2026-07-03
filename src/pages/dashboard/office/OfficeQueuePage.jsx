import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, PhoneCall, RefreshCw, Video } from "lucide-react";
import AppShell from "../../../layouts/AppShell";
import { useApiMutation, useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { api } from "../../../services/api";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import OfficeQueueRow from "../../../components/office/OfficeQueueRow";
import OfficeApprovalActions from "../../../components/office/OfficeApprovalActions";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "queue"];

export default function OfficeQueuePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");

  const queryConfig = useMemo(() => ({
    params: {
      search: search || undefined,
      status: status || undefined,
      department: department || undefined,
      employee: employee || undefined,
    }
  }), [search, status, department, employee]);

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: [...QUERY_KEY, search, status, department, employee],
    url: endpoints.office.queue,
    config: queryConfig,
    refetchInterval: 15000
  });
  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visitor_request.approved",
    "office.visitor_request.rejected"
  ]);

  const approveMutation = useApiMutation({
    mutationFn: async (_api, { id }) => api.post(`/office/visitor-requests/${id}/approve`),
    onSuccess: () => refetch()
  });
  const rejectMutation = useApiMutation({
    mutationFn: async (_api, { id }) => api.post(`/office/visitor-requests/${id}/reject`),
    onSuccess: () => refetch()
  });
  const assignMutation = useApiMutation({
    mutationFn: async (_api, { id, assigneeName, assigneeDepartment }) =>
      api.post(`/office/visitor-requests/${id}/assign`, {
        assigneeName,
        assigneeDepartment
      }),
    onSuccess: () => refetch()
  });

  if (isLoading) {
    return (
      <AppShell title="Office Queue" showMobileNav>
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
      // ignore storage failures; the call page will still be able to start manually
    }
    navigate(`/session/${encodeURIComponent(sessionId)}/${mode}`);
  }

  return (
    <AppShell title="Office Queue" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load the office queue."} onRetry={() => refetch()} /> : null}
        <OfficePageHeader
          title="Office Queue"
          subtitle="Live visitor requests waiting for approval or reception handoff."
          tabs={officeTabs}
          actions={[
            <button key="refresh" type="button" onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          ]}
        />

        <OfficePanel title="Filters" subtitle="Search and narrow the current queue">
          <div className="grid gap-3 md:grid-cols-4">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search visitor, company, purpose" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <input value={employee} onChange={(event) => setEmployee(event.target.value)} placeholder="Employee" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>
        </OfficePanel>

        <OfficePanel title="Waiting Visitors" subtitle={`${rows.length} live request${rows.length === 1 ? "" : "s"}`}>
          <div className="grid gap-3">
            {rows.length > 0 ? rows.map((item) => (
              <OfficeQueueRow
                key={item.id}
                item={item}
                  actions={(
                    <div className="flex flex-wrap items-center gap-2">
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
                      <Link to={`/dashboard/office/messages?sessionId=${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-brand-600">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message
                    </Link>
                    <OfficeApprovalActions
                      busy={approveMutation.isPending || rejectMutation.isPending || assignMutation.isPending}
                      onApprove={() => approveMutation.mutate({ id: item.id })}
                      onReject={() => rejectMutation.mutate({ id: item.id })}
                      onAssign={() => {
                        const assigneeName = window.prompt("Assign to which person or reception?", item.hostName || "Reception");
                        if (assigneeName === null) return;
                        const assigneeDepartment = window.prompt("Department or note?", item.department || "");
                        assignMutation.mutate({
                          id: item.id,
                          assigneeName: String(assigneeName || "").trim() || "Reception",
                          assigneeDepartment: String(assigneeDepartment || "").trim() || undefined
                        });
                      }}
                    />
                  </div>
                )}
              />
            )) : (
              <OfficeEmptyState title="Queue is empty" description="New visitor requests will appear here as they arrive." />
            )}
          </div>
        </OfficePanel>
      </div>
    </AppShell>
  );
}
