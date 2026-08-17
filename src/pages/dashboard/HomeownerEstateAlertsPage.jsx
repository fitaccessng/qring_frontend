import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyEstateAlerts } from "../../hooks/useMyEstateAlerts";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill
} from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateAlertsPage() {
  const navigate = useNavigate();
  const { rows: items, loading } = useMyEstateAlerts();

  return (
    <EstateMobilePage title="Estate Alerts" subtitle="Notices from your estate" icon={Bell} iconClassName="text-rose-600" onBack={() => navigate(-1)}>
      {loading ? (
        <p className="py-14 text-center text-sm font-bold text-slate-400">Loading alerts...</p>
      ) : items.length ? (
        <section>
          <EstateSectionHeader label="Latest" count={items.length} />
          <EstateList>
            {items.map((item) => (
              <EstateListItem key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-black">{item.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                  </div>
                  <EstateStatusPill tone={item.alertType === "emergency" ? "rose" : "cyan"}>{String(item.alertType || "alert").replaceAll("_", " ")}</EstateStatusPill>
                </div>
              </EstateListItem>
            ))}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={Bell} title="No estate alerts" message="Important estate notices will show up here." />
      )}
    </EstateMobilePage>
  );
}
