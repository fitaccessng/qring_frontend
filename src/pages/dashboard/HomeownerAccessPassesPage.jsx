import { useEffect, useMemo, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { createHomeownerAccessPass, deactivateHomeownerAccessPass, getHomeownerAccessPasses, getHomeownerDoors } from "../../services/homeownerService";
import { createResidentVehicle, listEstatePackages, listResidentVehicles, updateEstatePackageStatus } from "../../services/estateOperationsService";
import useSubscription from "../../hooks/useSubscription";
import { showError, showSuccess } from "../../utils/flash";

const PASS_PRESETS = {
  one_time_pin: {
    label: "One-Time Visitor Code",
    passType: "pin",
    validForHours: 24,
    maxUses: 1
  },
  monthly_pin: {
    label: "Monthly Visitor Code",
    passType: "pin",
    validForHours: 720,
    maxUses: 100
  },
  monthly_qr: {
    label: "Monthly Visitor QR",
    passType: "qr",
    validForHours: 720,
    maxUses: 100
  }
};

export default function HomeownerAccessPassesPage() {
  const { hasFeature } = useSubscription();
  const [passes, setPasses] = useState([]);
  const [doors, setDoors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [packageBusy, setPackageBusy] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    label: "Guest Access",
    passType: "qr",
    visitorName: "",
    doorId: "",
    validForHours: 24,
    maxUses: 1
  });
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    vehicleType: "car",
    makeModel: "",
    color: ""
  });

  async function load() {
    setLoading(true);
    try {
      const [passRows, doorData, vehicleRows, packageRows] = await Promise.all([
        getHomeownerAccessPasses(),
        getHomeownerDoors(),
        hasFeature("vehicle_registration") ? listResidentVehicles() : Promise.resolve([]),
        hasFeature("package_tracking") ? listEstatePackages() : Promise.resolve([])
      ]);
      setPasses(passRows);
      setDoors(doorData?.doors || []);
      setVehicles(vehicleRows);
      setPackages(packageRows);
      if (!form.doorId && (doorData?.doors || []).length) {
        setForm((prev) => ({ ...prev, doorId: doorData.doors[0].id }));
      }
    } catch (requestError) {
      setError(requestError?.message || "Failed to load digital access passes.");
      showError(requestError?.message || "Failed to load digital access passes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFeature]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = hasFeature("frequent_visitor_passes") ? form : { ...form, validForHours: Math.min(Number(form.validForHours) || 24, 24), maxUses: 1 };
      const created = await createHomeownerAccessPass(payload);
      setPasses((prev) => [created, ...prev]);
      showSuccess(`${String(created?.passType || "QR").toUpperCase()} pass created.`);
    } catch (requestError) {
      setError(requestError?.message || "Failed to create access pass.");
      showError(requestError?.message || "Failed to create access pass.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(accessPassId) {
    try {
      const updated = await deactivateHomeownerAccessPass(accessPassId);
      setPasses((prev) => prev.map((row) => (row.id === accessPassId ? updated : row)));
      showSuccess("Access pass deactivated.");
    } catch (requestError) {
      showError(requestError?.message || "Failed to deactivate access pass.");
    }
  }

  async function handleCreateVehicle(event) {
    event.preventDefault();
    if (!hasFeature("vehicle_registration")) {
      showError("Vehicle registration is available on Basic and higher estate plans.");
      return;
    }
    setVehicleSaving(true);
    try {
      const created = await createResidentVehicle(vehicleForm);
      setVehicles((prev) => [created, ...prev]);
      setVehicleForm({ plateNumber: "", vehicleType: "car", makeModel: "", color: "" });
      showSuccess("Vehicle registered.");
    } catch (requestError) {
      showError(requestError?.message || "Failed to register vehicle.");
    } finally {
      setVehicleSaving(false);
    }
  }

  async function handlePackageCollected(packageId) {
    setPackageBusy(packageId);
    try {
      await updateEstatePackageStatus(packageId, "collected");
      const rows = await listEstatePackages();
      setPackages(rows);
      showSuccess("Package marked collected.");
    } catch (requestError) {
      showError(requestError?.message || "Failed to update package.");
    } finally {
      setPackageBusy("");
    }
  }

  const activeCount = useMemo(() => passes.filter((row) => row.isActive).length, [passes]);

  function applyPreset(presetKey) {
    const preset = PASS_PRESETS[presetKey];
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      ...preset
    }));
  }

  return (
    <AppShell title="Digital Access">
      <div className="mx-auto max-w-4xl space-y-4 pb-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Temporary QR and PIN Access</h1>
          <p className="mt-1 text-sm text-slate-500">Issue quick guest codes for family, drivers, or scheduled deliveries. Gatemen can scan or type the code and grant access instantly.</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile label="Total" value={passes.length} />
            <StatTile label="Active" value={activeCount} />
            <StatTile label="PIN Ready" value={passes.filter((row) => row.passType === "pin").length} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset("one_time_pin")} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
              One-Time Code
            </button>
            {hasFeature("frequent_visitor_passes") ? (
              <>
                <button type="button" onClick={() => applyPreset("monthly_pin")} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  1-Month Code
                </button>
                <button type="button" onClick={() => applyPreset("monthly_qr")} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700">
                  1-Month QR
                </button>
              </>
            ) : null}
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
            <Field label="Label">
              <input value={form.label} onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </Field>
            <Field label="Visitor Name">
              <input value={form.visitorName} onChange={(event) => setForm((prev) => ({ ...prev, visitorName: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </Field>
            <Field label="Pass Type">
              <select value={form.passType} onChange={(event) => setForm((prev) => ({ ...prev, passType: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                <option value="qr">Temporary QR</option>
                <option value="pin">One-Time PIN</option>
              </select>
            </Field>
            <Field label="Door">
              <select value={form.doorId} onChange={(event) => setForm((prev) => ({ ...prev, doorId: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                {doors.map((door) => (
                  <option key={door.id} value={door.id}>{door.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Valid For (hours)">
              <input type="number" min="1" max={hasFeature("frequent_visitor_passes") ? "744" : "24"} value={form.validForHours} onChange={(event) => setForm((prev) => ({ ...prev, validForHours: Number(event.target.value) }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </Field>
            <Field label="Max Uses">
              <input type="number" min="1" max={hasFeature("frequent_visitor_passes") ? "100" : "1"} value={hasFeature("frequent_visitor_passes") ? form.maxUses : 1} onChange={(event) => setForm((prev) => ({ ...prev, maxUses: Number(event.target.value) }))} disabled={!hasFeature("frequent_visitor_passes")} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950" />
            </Field>
            <button type="submit" disabled={saving} className="md:col-span-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900">
              {saving ? "Creating..." : "Create Access Pass"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Loading passes...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {passes.map((row) => (
            <article key={row.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">{row.label}</h2>
                    <Badge label={row.passType === "pin" ? "PIN" : "QR"} tone="sky" />
                    <Badge label={row.isActive ? "Active" : "Inactive"} tone={row.isActive ? "success" : "slate"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.visitorName || "General visitor access"}</p>
                  <p className="mt-2 font-mono text-lg font-black text-slate-900 dark:text-white">{row.codeValue}</p>
                  <p className="mt-1 text-xs text-slate-500">Valid until {new Date(row.validUntil).toLocaleString()} · Remaining uses {row.remainingUses}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigator.clipboard.writeText(row.codeValue)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">Copy</button>
                  {row.isActive ? (
                    <button type="button" onClick={() => handleDeactivate(row.id)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">Deactivate</button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!loading && !passes.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">No digital access passes created yet.</div> : null}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Resident Vehicles</h2>
            <p className="mt-1 text-sm text-slate-500">Register vehicles security can identify at the gate.</p>
          </div>
          {!hasFeature("vehicle_registration") ? (
            <LockedPanel text="Vehicle registration is available on Basic and higher estate plans." />
          ) : (
            <div className="space-y-4">
              <form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreateVehicle}>
                <Field label="Plate Number">
                  <input required value={vehicleForm.plateNumber} onChange={(event) => setVehicleForm((prev) => ({ ...prev, plateNumber: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </Field>
                <Field label="Type">
                  <select value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm((prev) => ({ ...prev, vehicleType: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <option value="car">Car</option>
                    <option value="suv">SUV</option>
                    <option value="bus">Bus</option>
                    <option value="bike">Bike</option>
                  </select>
                </Field>
                <Field label="Make / Model">
                  <input value={vehicleForm.makeModel} onChange={(event) => setVehicleForm((prev) => ({ ...prev, makeModel: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </Field>
                <Field label="Color">
                  <input value={vehicleForm.color} onChange={(event) => setVehicleForm((prev) => ({ ...prev, color: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </Field>
                <button disabled={vehicleSaving} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 md:col-span-4">{vehicleSaving ? "Registering..." : "Register Vehicle"}</button>
              </form>
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <SimpleRecord key={vehicle.id} title={vehicle.plateNumber} subtitle={[vehicle.color, vehicle.makeModel, vehicle.vehicleType].filter(Boolean).join(" - ")} meta={vehicle.active ? "Active" : "Inactive"} />
                ))}
                {!vehicles.length ? <EmptyPanel text="No vehicles registered yet." /> : null}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Packages</h2>
            <p className="mt-1 text-sm text-slate-500">View package arrivals recorded by estate security.</p>
          </div>
          {!hasFeature("package_tracking") ? (
            <LockedPanel text="Package tracking is available on Plus and higher estate plans." />
          ) : (
            <div className="space-y-2">
              {packages.map((row) => (
                <SimpleRecord
                  key={row.id}
                  title={row.description || "Package"}
                  subtitle={`${row.courier || "Courier"} - ${row.status}`}
                  meta={row.arrivedAt ? new Date(row.arrivedAt).toLocaleString() : ""}
                  action={row.status === "arrived" ? <button type="button" disabled={packageBusy === row.id} onClick={() => handlePackageCollected(row.id)} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 disabled:opacity-60">Collected</button> : null}
                />
              ))}
              {!packages.length ? <EmptyPanel text="No package records yet." /> : null}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
      {children}
    </label>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-800/70">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "sky"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${toneClass}`}>{label}</span>;
}

function LockedPanel({ text }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">{text}</div>;
}

function EmptyPanel({ text }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">{text}</div>;
}

function SimpleRecord({ title, subtitle, meta, action }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-slate-900 dark:text-white">{title}</p>
        {subtitle ? <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p> : null}
        {meta ? <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  );
}
