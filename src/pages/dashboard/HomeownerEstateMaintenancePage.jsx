import { useEffect, useState } from "react";
import { Plus, Wrench, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createMaintenanceRequest } from "../../services/homeownerService";
import { useMyEstateAlerts } from "../../hooks/useMyEstateAlerts";
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
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { rows: items, refetch } = useMyEstateAlerts("maintenance_request");

  useEffect(() => {
    if (selectedItem) {
      const updated = items.find((i) => i.id === selectedItem.id);
      if (updated) setSelectedItem(updated);
    }
  }, [items, selectedItem]);

  async function submit(event) {
    event.preventDefault();
    try {
      await createMaintenanceRequest({ title, description });
      setTitle("");
      setDescription("");
      setOpen(false);
      showSuccess("Maintenance request sent");
      refetch({ force: true });
    } catch (error) {
      showError(error?.message || "Unable to submit request");
    }
  }

  return (
    <EstateMobilePage
      title="Maintenance"
      iconClassName="text-orange-600"
      onBack={() => navigate(-1)}
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white active:scale-95 dark:bg-white dark:text-slate-950"
          aria-label="Report an issue"
        >
          <Plus className="h-5 w-5" />
        </button>
      }
    >
      {items.length ? (
        <section>
          <EstateSectionHeader label="Requests" count={items.length} />
          <EstateList>
            {items.map((item) => {
              const solved = item.maintenanceStatus === "solved" || item.status === "solved";
              return (
                <EstateListItem key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-black">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                        {item.description || "Maintenance request"}
                      </p>
                    </div>
                    <EstateStatusPill tone={solved ? "emerald" : "amber"}>
                      {solved ? "Resolved" : "Pending"}
                    </EstateStatusPill>
                  </div>
                </EstateListItem>
              );
            })}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={Wrench} title="No maintenance requests" message="Tap the plus button to report an estate issue." />
      )}

      {/* Form BottomSheet */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Report maintenance">
        <form onSubmit={submit} className="space-y-4">
          <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Issue title" className={estateFieldClassName} />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue" className={estateTextareaClassName} />
          <button className={`w-full ${estatePrimaryButtonClass}`}>Submit Report</button>
        </form>
      </BottomSheet>

      {/* Request Details BottomSheet */}
      <BottomSheet open={Boolean(selectedItem)} onClose={() => setSelectedItem(null)} title="Request details">
        {selectedItem && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status Update</span>
              <EstateStatusPill tone={selectedItem.maintenanceStatus === "solved" || selectedItem.status === "solved" ? "emerald" : "amber"}>
                {selectedItem.maintenanceStatus === "solved" || selectedItem.status === "solved" ? "Resolved" : "Pending"}
              </EstateStatusPill>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedItem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {selectedItem.description || "No additional details provided."}
              </p>
            </div>

            {selectedItem.resolutionNote && (
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Estate Note:</span>
                {selectedItem.resolutionNote}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Clock className="h-4 w-4" />
              <span>
                Reported on {new Date(selectedItem.createdAt || selectedItem.timestamp || Date.now()).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        )}
      </BottomSheet>
    </EstateMobilePage>
  );
}
