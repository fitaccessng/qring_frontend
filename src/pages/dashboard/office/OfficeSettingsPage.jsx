import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "overview"];

export default function OfficeSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: QUERY_KEY,
    url: endpoints.office.overview,
    refetchInterval: 30000
  });
  useSocketQueryInvalidation(QUERY_KEY, ["office.visitor_request.updated"]);

  if (isLoading) {
    return (
      <AppShell title="Office Settings" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  const office = data?.office;

  return (
    <AppShell title="Office Settings" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load office settings."} onRetry={() => refetch()} /> : null}
        <OfficePageHeader
          title="Office Settings"
          subtitle="Company profile, contact details, and office metadata."
          tabs={officeTabs}
        />

        <OfficePanel title="Office Profile" subtitle="Read-only profile data from the backend">
          {office ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField label="Company" value={office.companyName} />
              <ProfileField label="Email" value={office.businessEmail} />
              <ProfileField label="Phone" value={office.phoneNumber || "Not set"} />
              <ProfileField label="Timezone" value={office.timezone || "Not set"} />
              <ProfileField label="Location" value={[office.city, office.state, office.country].filter(Boolean).join(", ") || "Not set"} />
              <ProfileField label="Employees" value={String(office.employeeCount ?? 0)} />
            </div>
          ) : (
            <OfficeEmptyState title="Office profile missing" description="Complete office signup to create this profile." />
          )}
        </OfficePanel>
      </div>
    </AppShell>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
