import { useCallback, useEffect, useState } from "react";
import { Bell, Calendar, Megaphone, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listMyEstateAlerts } from "../../services/estateService";
import { getHomeownerContext } from "../../services/homeownerService";
import BottomSheet from "../../components/system/BottomSheet";
import { showError, showSuccess } from "../../utils/flash";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateLoadingState,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill,
  estateSecondaryButtonClass
} from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateBroadcastsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unit, setUnit] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("qring_hidden_estate_broadcasts") || "[]");
    } catch {
      return [];
    }
  });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [alerts, context] = await Promise.all([listMyEstateAlerts(), getHomeownerContext()]);
      setItems(alerts.filter((item) => item.alertType === "notice"));
      setUnit(context?.unitLabel || context?.home?.name || "Your home");
    } catch (error) {
      showError(error?.message || "Unable to load announcements");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  const visible = items.filter((item) => !hidden.includes(String(item.id)));

  function dismiss(item) {
    const next = [...new Set([...hidden, String(item.id)])];
    setHidden(next);
    localStorage.setItem("qring_hidden_estate_broadcasts", JSON.stringify(next));
    setSelected(null);
    showSuccess("Announcement archived");
  }

  return (
    <EstateMobilePage
      title="Broadcasts"
      subtitle={unit ? `For ${unit}` : "Estate announcements"}
      icon={Megaphone}
      iconClassName="text-cyan-600"
      onBack={() => navigate(-1)}
      action={
        <button type="button" onClick={() => navigate("/dashboard/notifications")} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </button>
      }
    >
      {loading ? (
        <EstateLoadingState label="Announcements" />
      ) : visible.length ? (
        <section>
          <EstateSectionHeader label="Announcements" count={visible.length} />
          <EstateList>
            {visible.map((item) => (
              <EstateListItem key={item.id} onClick={() => setSelected(item)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-black">{item.title}</h2>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <EstateStatusPill tone="cyan">Notice</EstateStatusPill>
                </div>
              </EstateListItem>
            ))}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={Megaphone} title="No announcements" message="Estate broadcasts for your home will appear here." />
      )}

      <BottomSheet open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || "Announcement"}>
        <div className="space-y-4">
          {selected?.createdAt ? (
            <p className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="h-4 w-4" />
              {new Date(selected.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">{selected?.description}</p>
          <button type="button" onClick={() => selected && dismiss(selected)} className={`w-full ${estateSecondaryButtonClass}`}>
            <Trash2 className="h-4 w-4 text-rose-600" />
            Archive Announcement
          </button>
        </div>
      </BottomSheet>
    </EstateMobilePage>
  );
}

function formatDate(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}
