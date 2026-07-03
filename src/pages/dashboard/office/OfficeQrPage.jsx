import { ScanLine } from "lucide-react";
import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "overview"];

export default function OfficeQrPage() {
  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: QUERY_KEY,
    url: endpoints.office.overview,
    refetchInterval: 30000
  });
  useSocketQueryInvalidation(QUERY_KEY, ["office.visitor_request.created", "office.visitor_request.updated"]);

  if (isLoading) {
    return (
      <AppShell title="Office QR" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  const office = data?.office;

  return (
    <AppShell title="Office QR" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load office QR details."} onRetry={() => refetch()} /> : null}
        <OfficePageHeader
          title="Office QR"
          subtitle="The live QR entry code for company, reception, and office access."
          tabs={officeTabs}
        />

        <OfficePanel title="QR Entry" subtitle="Share this code for office check-in">
          {office ? (
            <div className="space-y-4">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">QR ID</p>
                    <p className="mt-1 text-lg font-bold">{office.qrId}</p>
                    <p className="mt-2 text-sm text-slate-400">{office.scanUrl}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-brand-300">
                    <ScanLine className="h-6 w-6" />
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Keep this code linked to the persistent uploads folder on the backend so snapshots remain fetchable.
              </p>
            </div>
          ) : (
            <OfficeEmptyState title="Office profile missing" description="Complete office signup or link an office profile first." />
          )}
        </OfficePanel>
      </div>
    </AppShell>
  );
}
