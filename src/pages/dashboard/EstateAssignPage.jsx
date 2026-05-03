import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DoorClosed, Link2, Search, UserRound } from "lucide-react";
import AppShell from "../../layouts/AppShell";
import { assignDoorToHomeowner } from "../../services/estateService";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import { showError, showSuccess } from "../../utils/flash";
import EstateManagerPageShell, {
  EstateBadge,
  EstateEmptyState,
  EstateManagerSection,
  EstateMetricStrip,
  estateFieldClassName,
  estatePrimaryButtonClassName,
  estateSecondaryButtonClassName
} from "../../components/mobile/EstateManagerPageShell";

export default function EstateAssignPage() {
  const { overview, setOverview, error, setError, refresh } = useEstateOverviewState();
  const [form, setForm] = useState({ doorId: "", homeownerId: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  useEffect(() => {
    setForm((prev) => ({
      doorId:
        (overview?.doors ?? []).some((door) => String(door.id) === String(prev.doorId))
          ? prev.doorId
          : overview?.doors?.[0]?.id || "",
      homeownerId:
        (overview?.homeowners ?? []).some((homeowner) => String(homeowner.id) === String(prev.homeownerId))
          ? prev.homeownerId
          : overview?.homeowners?.[0]?.id || ""
    }));
  }, [overview]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await assignDoorToHomeowner(form.doorId, form.homeownerId);
      const selectedHomeowner = (overview?.homeowners ?? []).find((row) => String(row.id) === String(form.homeownerId));
      setOverview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          doors: (prev.doors ?? []).map((door) =>
            String(door.id) === String(form.doorId)
              ? {
                  ...door,
                  homeownerId: selectedHomeowner?.id || door.homeownerId,
                  homeownerName: selectedHomeowner?.fullName || door.homeownerName,
                  homeownerEmail: selectedHomeowner?.email || door.homeownerEmail
                }
              : door
          )
        };
      });
      showSuccess("Door assigned to homeowner.");
      await refresh();
    } catch (requestError) {
      setError(requestError.message ?? "Failed to assign door");
    } finally {
      setBusy(false);
    }
  }

  const hasHomeowners = (overview?.homeowners?.length ?? 0) > 0;
  const hasDoors = (overview?.doors?.length ?? 0) > 0;
  const selectedDoor = (overview?.doors ?? []).find((door) => String(door.id) === String(form.doorId));
  const selectedHomeowner = (overview?.homeowners ?? []).find((homeowner) => String(homeowner.id) === String(form.homeownerId));
  const assignmentCards = useMemo(
    () => (overview?.doors ?? []).map((door) => ({ ...door, linked: Boolean(door.homeownerName || door.homeownerId) })),
    [overview]
  );

  return (
    <AppShell title="Assign Doors">
      <EstateManagerPageShell
        eyebrow="Estate Setup"
        title="Assign Doors"
        description="Securely map hardware identifiers to the right residents with a cleaner mobile-first assignment flow."
        stats={[
          { label: "Doors", value: overview?.doors?.length ?? 0, helper: "Available to assign" },
          { label: "Residents", value: overview?.homeowners?.length ?? 0, helper: "Ready for linking" }
        ]}
      >
        <EstateMetricStrip
          items={[
            { label: "Doors", value: overview?.doors?.length ?? 0, helper: "Assignable entries" },
            { label: "Residents", value: overview?.homeowners?.length ?? 0, helper: "Selectable homeowners" },
            { label: "Linked", value: assignmentCards.filter((door) => door.linked).length, helper: "Completed mappings" }
          ]}
        />

        {!hasHomeowners || !hasDoors ? (
          <EstateManagerSection>
            <EstateEmptyState
              icon={<Link2 className="h-6 w-6" />}
              title="Assignment flow needs both sides"
              description="Create at least one homeowner and one door before linking access to a resident."
              action={
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  {!hasHomeowners ? (
                    <Link to="/dashboard/estate/invites" className={estatePrimaryButtonClassName}>
                      Create Homeowner
                    </Link>
                  ) : null}
                  {!hasDoors ? (
                    <Link to="/dashboard/estate/doors" className={estateSecondaryButtonClassName}>
                      Open Estate Doors
                    </Link>
                  ) : null}
                </div>
              }
            />
          </EstateManagerSection>
        ) : null}

        <EstateManagerSection title="Two-step assignment" subtitle="This JSX version follows your reference layout but stays wired to the live estate data.">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)]">
            <div className="space-y-4">
              <section className="rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70">
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00346f] text-sm font-bold text-white">1</span>
                  <div>
                    <p className="font-heading text-xl font-extrabold tracking-tight text-[#00346f]">Select Entry Hardware</p>
                    <p className="text-sm text-slate-500">Pick the door you want to attach to a resident account.</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(overview?.doors ?? []).map((door) => (
                    <button
                      key={door.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, doorId: door.id }))}
                      className={`rounded-[1.3rem] p-4 text-left transition ${
                        String(form.doorId) === String(door.id)
                          ? "bg-[#eef4ff] ring-2 ring-[#00346f]"
                          : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <DoorClosed className={`h-5 w-5 ${String(form.doorId) === String(door.id) ? "text-[#00346f]" : "text-slate-400"}`} />
                        {String(form.doorId) === String(door.id) ? <EstateBadge tone="blue">Selected</EstateBadge> : null}
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{door.id}</p>
                      <p className="mt-1 font-heading text-lg font-bold text-slate-900">{door.name}</p>
                      <p className="text-xs text-slate-500">{door.homeName || "Unmapped home"}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.8rem] border border-white/70 bg-white/92 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70">
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-900">2</span>
                  <div>
                    <p className="font-heading text-xl font-extrabold tracking-tight text-[#00346f]">Assign Resident Unit</p>
                    <p className="text-sm text-slate-500">Choose the resident who should control this entry point.</p>
                  </div>
                </div>
                <div className="relative mb-4">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <div className="w-full rounded-[1.2rem] bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-500">Pick from the resident list below</div>
                </div>
                <div className="grid gap-3">
                  {(overview?.homeowners ?? []).map((homeowner) => (
                    <button
                      key={homeowner.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, homeownerId: homeowner.id }))}
                      className={`flex items-center justify-between rounded-[1.3rem] p-4 text-left transition ${
                        String(form.homeownerId) === String(homeowner.id)
                          ? "bg-emerald-50 ring-2 ring-emerald-500"
                          : "bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white font-heading text-sm font-bold text-[#00346f] shadow-sm">
                          {(homeowner.fullName || "H").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{homeowner.fullName}</p>
                          <p className="text-xs text-slate-500">{homeowner.email}</p>
                        </div>
                      </div>
                      {String(form.homeownerId) === String(homeowner.id) ? <EstateBadge tone="green">Linked</EstateBadge> : null}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="space-y-4">
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] p-6 text-white shadow-[0_18px_40px_rgba(0,52,111,0.2)]">
                <div className="mb-10 flex items-start justify-between gap-3">
                  <Link2 className="h-9 w-9" />
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100">Security Protocol</p>
                    <p className="text-xs font-bold">QR-AES-256</p>
                  </div>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100">Current Hardware</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold tracking-tight">{selectedDoor?.name || "Select Door..."}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link2 className="h-4 w-4" />
                    <div className="h-px flex-1 bg-white/20" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100">Resident Assignment</p>
                    <p className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-emerald-100">
                      {selectedHomeowner?.fullName || "Select Unit..."}
                    </p>
                  </div>
                </div>
                <form onSubmit={onSubmit} className="mt-8">
                  <input type="hidden" value={form.doorId} readOnly />
                  <input type="hidden" value={form.homeownerId} readOnly />
                  <button type="submit" disabled={busy || !hasHomeowners || !hasDoors} className={`w-full bg-white text-[#00346f] ${estatePrimaryButtonClassName.replace("text-white", "text-[#00346f]").replace("bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)]", "bg-white")}`}>
                    {busy ? "Assigning..." : "Confirm Assignment"}
                  </button>
                </form>
              </div>

              <div className="rounded-[1.8rem] bg-slate-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Best Practices</p>
                <div className="mt-4 space-y-4 text-sm text-slate-600">
                  <p>Ensure the selected door name matches the physical QR sticker before confirming the link.</p>
                  <p>Assignments can be updated later from this page if homes or residents change.</p>
                </div>
              </div>
            </section>
          </div>
        </EstateManagerSection>

        <EstateManagerSection title="Door assignments" subtitle="A running list of the current mappings in your estate.">
          <div className="grid gap-3 sm:grid-cols-2">
            {assignmentCards.map((door) => (
              <div
                key={door.id}
                className="rounded-[1.5rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(243,244,245,0.92))] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-100/70"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{door.name}</p>
                    <p className="text-xs text-slate-500">{door.homeName || "Home"} · {door.homeownerName || "Unassigned"}</p>
                  </div>
                  <EstateBadge tone={door.linked ? "green" : "amber"}>{door.linked ? "Linked" : "Open"}</EstateBadge>
                </div>
              </div>
            ))}
            {assignmentCards.length === 0 ? <p className="text-sm text-slate-500">No doors assigned yet.</p> : null}
          </div>
        </EstateManagerSection>
      </EstateManagerPageShell>
    </AppShell>
  );
}
