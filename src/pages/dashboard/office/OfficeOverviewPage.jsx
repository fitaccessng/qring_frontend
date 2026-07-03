import { Activity, BadgeCheck, ChevronRight, ScanLine, ShieldAlert, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import OfficeStatCard from "../../../components/office/OfficeStatCard";
import OfficeMessageRow from "../../../components/office/OfficeMessageRow";
import OfficeVisitorRow from "../../../components/office/OfficeVisitorRow";
import OfficeEmployeeCard from "../../../components/office/OfficeEmployeeCard";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "overview"];

export default function OfficeOverviewPage() {
  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: QUERY_KEY,
    url: endpoints.office.overview,
    refetchInterval: 30000
  });
  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visitor_request.approved",
    "office.visitor_request.rejected",
    "office.message.created"
  ]);

  if (isLoading) {
    return (
      <AppShell title="Office Overview" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  const overview = data ?? {};
  const office = overview.office;

  return (
    <AppShell title={office?.companyName || "Office Overview"} showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load the office overview."} onRetry={() => refetch()} /> : null}

        <OfficePageHeader
          title={office?.companyName || "Office Overview"}
          subtitle="A focused snapshot of the live queue, recent activity, and office health."
          tabs={officeTabs}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OfficeStatCard icon={Users} label="Live Queue" value={overview.metrics?.liveQueue ?? 0} />
          <OfficeStatCard icon={BadgeCheck} label="Pending Approvals" value={overview.metrics?.pendingApprovals ?? 0} />
          <OfficeStatCard icon={UserRound} label="Visitors Inside" value={overview.metrics?.visitorsInside ?? 0} />
          <OfficeStatCard icon={Activity} label="Employees Online" value={overview.metrics?.employeesOnline ?? 0} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <OfficePanel title="Recent Queue" subtitle="The latest visitor requests waiting for action">
              <div className="grid gap-3">
                {(overview.recentQueue || []).length > 0 ? (
                  overview.recentQueue.map((item) => <OfficeVisitorRow key={item.id} item={item} />)
                ) : (
                  <OfficeEmptyState title="No active requests" description="New visitor requests will show here in real time." />
                )}
              </div>
            </OfficePanel>

            <OfficePanel title="Recent Messages" subtitle="A quick look at current office conversations">
              <div className="grid gap-3">
                {(overview.recentMessages || []).length > 0 ? (
                  overview.recentMessages.map((message) => <OfficeMessageRow key={message.id} message={message} />)
                ) : (
                  <OfficeEmptyState title="No recent messages" description="Office conversations will appear once people start chatting." />
                )}
              </div>
            </OfficePanel>

            <OfficePanel title="Employee Snapshot" subtitle="Who’s available right now">
              <div className="grid gap-3 md:grid-cols-2">
                {(overview.employees || []).length > 0 ? (
                  overview.employees.map((member) => <OfficeEmployeeCard key={member.id} member={member} />)
                ) : (
                  <OfficeEmptyState title="No employees found" description="Your office directory will appear here once members are created." />
                )}
              </div>
            </OfficePanel>
          </div>

          <div className="space-y-6">
            <OfficePanel title="Security Alerts" subtitle="Watchlist and incident highlights">
              <div className="grid gap-3">
                {(overview.securityAlerts || []).length > 0 ? (
                  overview.securityAlerts.map((item) => <SecurityAlertRow key={item.id} item={item} />)
                ) : (
                  <OfficeEmptyState title="No alerts" description="Security incidents will surface here when needed." />
                )}
              </div>
            </OfficePanel>

            <OfficePanel title="Quick Actions" subtitle="Jump to the most used office screens">
              <div className="grid gap-3">
                {(overview.quickActions || []).length > 0 ? (
                  overview.quickActions.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="group rounded-[1.4rem] border border-slate-200 bg-white p-4 text-left transition hover:border-brand-500/25 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white">{action.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open section</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-brand-500 transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <OfficeEmptyState title="No quick actions" description="Office shortcuts will appear after the backend fills them in." />
                )}
              </div>
            </OfficePanel>

            <OfficePanel title="Office QR" subtitle="The company entry code and scan link">
              {office ? (
                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">QR ID</p>
                        <p className="mt-1 text-sm font-semibold">{office.qrId}</p>
                        <p className="mt-2 text-xs text-slate-400">{office.scanUrl}</p>
                      </div>
                      <div className="rounded-2xl bg-white/10 p-3 text-brand-300">
                        <ScanLine className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This QR uses the same local uploads and realtime visitor flow as the rest of Qring.
                  </p>
                </div>
              ) : (
                <OfficeEmptyState title="Office profile missing" description="Complete office signup or link this user to an office record." />
              )}
            </OfficePanel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function SecurityAlertRow({ item }) {
  return (
    <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4" />
        <p className="font-black">{item.event || "Security alert"}</p>
      </div>
      <p className="mt-2 text-sm">{item.details || "Office security event"}</p>
    </div>
  );
}
