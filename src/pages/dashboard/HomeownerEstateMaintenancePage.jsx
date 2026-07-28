import { useCallback, useEffect, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listMyEstateAlerts } from "../../services/estateService";
import { createMaintenanceRequest } from "../../services/homeownerService";
import BottomSheet from "../../components/system/BottomSheet";
import { estateFieldClassName, estateTextareaClassName } from "../../components/mobile/EstateManagerPageShell";
import { showError, showSuccess } from "../../utils/flash";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill,
  estatePrimaryButtonClass
} from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateMaintenancePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    try {
      setItems((await listMyEstateAlerts()).filter((item) => item.alertType === "maintenance_request"));
    } catch (error) {
      showError(error?.message || "Unable to load maintenance");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    try {
      await createMaintenanceRequest({ title, description });
      setTitle("");
      setDescription("");
      setOpen(false);
      showSuccess("Maintenance request sent");
      load();
    } catch (error) {
      showError(error?.message || "Unable to submit request");
    }
  }

  return (
    <EstateMobilePage
      title="Maintenance"
      subtitle="Report and track estate facility issues"
      icon={Wrench}
      iconClassName="text-orange-600"
      onBack={() => navigate(-1)}
      action={
        <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white active:scale-95 dark:bg-white dark:text-slate-950" aria-label="Report an issue">
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      {items.length ? (
        <section>
          <EstateSectionHeader label="Requests" count={items.length} />
          <EstateList>
            {items.map((item) => {
              const solved = item.maintenanceStatus === "solved";
              return (
                <EstateListItem key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-black">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description || "Maintenance request"}</p>
                    </div>
                    <EstateStatusPill tone={solved ? "emerald" : "amber"}>{solved ? "Resolved" : "Pending"}</EstateStatusPill>
                  </div>
                </EstateListItem>
              );
            })}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={Wrench} title="No maintenance requests" message="Tap the plus button to report an estate issue." />
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Report maintenance">
        <form onSubmit={submit} className="space-y-4">
          <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Issue title" className={estateFieldClassName} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue" className={estateTextareaClassName} />
          <button className={`w-full ${estatePrimaryButtonClass}`}>Submit Report</button>
        </form>
      </BottomSheet>
    </EstateMobilePage>
  );
}
