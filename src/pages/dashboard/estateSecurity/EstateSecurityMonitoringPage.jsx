import { useEffect, useState } from "react";
import { Car, Clock, ClipboardList, Package, Save, ShieldAlert, Sliders, Sparkles, UserX } from "lucide-react";
import { EstateSecurityShell, SecurityPanel, SecurityStatCard, SecurityToggleRow } from "./EstateSecurityShell";
import { useEstateSecurityState } from "./useEstateSecurityState";
import { showError, showSuccess } from "../../../utils/flash";
import useSubscription from "../../../hooks/useSubscription";
import {
  createBlockedVisitor,
  deactivateBlockedVisitor,
  getSecurityIncident,
  listBlockedVisitors,
  listEstatePackages,
  listGuardAttendance,
  listResidentVehicles,
  listSecurityIncidents,
  updateEstatePackageStatus
} from "../../../services/estateOperationsService";

export default function EstateSecurityMonitoringPage() {
  const {
    currentEstate,
    error,
    estateId,
    estates,
    setEstateId,
    securityRules,
    reminderFrequencyDays,
    setReminderFrequencyDays,
    autoApproveTrustedVisitors,
    setAutoApproveTrustedVisitors,
    suspiciousVisitWindowMinutes,
    setSuspiciousVisitWindowMinutes,
    suspiciousHouseThreshold,
    setSuspiciousHouseThreshold,
    suspiciousRejectionThreshold,
    setSuspiciousRejectionThreshold,
    saveSettings
  } = useEstateSecurityState();
  const { hasFeature } = useSubscription();
  const [saving, setSaving] = useState(false);
  const [opsLoading, setOpsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [blockedVisitors, setBlockedVisitors] = useState([]);
  const [packages, setPackages] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [blockForm, setBlockForm] = useState({ visitorName: "", visitorPhone: "", reason: "" });

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSettings({
        rules: securityRules,
        reminderFrequencyDays,
        autoApproveTrustedVisitors,
        suspiciousVisitWindowMinutes,
        suspiciousHouseThreshold,
        suspiciousRejectionThreshold
      });
      showSuccess("Monitoring settings saved");
    } catch (requestError) {
      showError(requestError?.message || "Unable to save monitoring settings");
    } finally {
      setSaving(false);
    }
  }

  async function loadOperations() {
    setOpsLoading(true);
    try {
      const [vehicleRows, blockRows, packageRows, attendanceRows, incidentRows] = await Promise.all([
        hasFeature("vehicle_registration") ? listResidentVehicles() : Promise.resolve([]),
        hasFeature("block_unwanted_visitors") ? listBlockedVisitors() : Promise.resolve([]),
        hasFeature("package_tracking") ? listEstatePackages() : Promise.resolve([]),
        hasFeature("guard_attendance") ? listGuardAttendance() : Promise.resolve([]),
        hasFeature("incident_reporting") ? listSecurityIncidents() : Promise.resolve([])
      ]);
      setVehicles(vehicleRows);
      setBlockedVisitors(blockRows);
      setPackages(packageRows);
      setAttendance(attendanceRows);
      setIncidents(incidentRows);
    } catch (requestError) {
      showError(requestError?.message || "Unable to load estate operations.");
    } finally {
      setOpsLoading(false);
    }
  }

  useEffect(() => {
    loadOperations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFeature]);

  async function handleBlockVisitor(event) {
    event.preventDefault();
    if (!hasFeature("block_unwanted_visitors")) {
      showError("Visitor blocklist is available on Basic and higher estate plans.");
      return;
    }
    setOpsLoading(true);
    try {
      await createBlockedVisitor(blockForm);
      setBlockForm({ visitorName: "", visitorPhone: "", reason: "" });
      showSuccess("Blocked visitor saved.");
      await loadOperations();
    } catch (requestError) {
      showError(requestError?.message || "Unable to save blocked visitor.");
    } finally {
      setOpsLoading(false);
    }
  }

  async function handleUnblock(entryId) {
    setOpsLoading(true);
    try {
      await deactivateBlockedVisitor(entryId);
      showSuccess("Blocked visitor deactivated.");
      await loadOperations();
    } catch (requestError) {
      showError(requestError?.message || "Unable to deactivate blocked visitor.");
    } finally {
      setOpsLoading(false);
    }
  }

  async function handlePackageCollected(packageId) {
    setOpsLoading(true);
    try {
      await updateEstatePackageStatus(packageId, "collected");
      showSuccess("Package marked collected.");
      await loadOperations();
    } catch (requestError) {
      showError(requestError?.message || "Unable to update package.");
    } finally {
      setOpsLoading(false);
    }
  }

  async function openIncidentDetail(incidentId) {
    setDetailLoading(true);
    try {
      setSelectedIncident(await getSecurityIncident(incidentId));
    } catch (requestError) {
      showError(requestError?.message || "Unable to open incident.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <EstateSecurityShell
      title="Monitoring"
      subtitle={`Tune reminders and suspicious visit detection${currentEstate?.name ? ` for ${currentEstate.name}` : ""}.`}
      estates={estates}
      estateId={estateId}
      onEstateChange={setEstateId}
      action={
        <button onClick={handleSave} disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#4955b3] px-5 text-sm font-black text-white shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-60">
          <Save size={18} /> {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SecurityStatCard icon={Clock} label="Reminder Cycle" value={`${reminderFrequencyDays}d`} helper="Resident reminder frequency" />
        <SecurityStatCard icon={Sliders} label="Visit Window" value={`${suspiciousVisitWindowMinutes}m`} helper="Suspicious activity interval" />
        <SecurityStatCard icon={Sparkles} label="Trusted Visitors" value={autoApproveTrustedVisitors ? "On" : "Off"} helper="Automatic trusted approval" tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <SecurityStatCard icon={Car} label="Vehicles" value={vehicles.length} helper={hasFeature("vehicle_registration") ? "Registered vehicles" : "Basic locked"} />
        <SecurityStatCard icon={UserX} label="Blocklist" value={blockedVisitors.length} helper={hasFeature("block_unwanted_visitors") ? "Active entries" : "Basic locked"} tone="rose" />
        <SecurityStatCard icon={Package} label="Packages" value={packages.length} helper={hasFeature("package_tracking") ? "Package records" : "Plus locked"} tone="emerald" />
        <SecurityStatCard icon={Clock} label="Attendance" value={attendance.length} helper={hasFeature("guard_attendance") ? "Guard shifts" : "Plus locked"} />
        <SecurityStatCard icon={ShieldAlert} label="Incidents" value={incidents.length} helper={hasFeature("incident_reporting") ? "Security reports" : "Plus locked"} tone="rose" />
      </div>

      <SecurityPanel title="Automation" subtitle="Set the guardrails used by estate security automation.">
        <SecurityToggleRow
          title="Auto-approve trusted visitors"
          subtitle="Allow known trusted visitors to pass with less manual handling."
          active={Boolean(autoApproveTrustedVisitors)}
          onToggle={() => setAutoApproveTrustedVisitors((value) => !value)}
        />
        <NumberSetting label="Reminder frequency" suffix="days" value={reminderFrequencyDays} onChange={setReminderFrequencyDays} />
        <NumberSetting label="Suspicious visit window" suffix="minutes" value={suspiciousVisitWindowMinutes} onChange={setSuspiciousVisitWindowMinutes} />
        <NumberSetting label="House threshold" suffix="visits" value={suspiciousHouseThreshold} onChange={setSuspiciousHouseThreshold} />
        <NumberSetting label="Rejection threshold" suffix="rejections" value={suspiciousRejectionThreshold} onChange={setSuspiciousRejectionThreshold} />
      </SecurityPanel>

      <SecurityPanel title="Vehicle Registry" subtitle="Estate-wide vehicle lookup for Basic plan estates.">
        {!hasFeature("vehicle_registration") ? <LockedText text="Vehicle registration is available on Basic and higher plans." /> : (
          <OperationsList rows={vehicles} emptyText={opsLoading ? "Loading vehicles..." : "No vehicles registered yet."} renderRow={(row) => (
            <SimpleRow key={row.id} title={row.plateNumber} subtitle={`${row.homeName || "House"} - ${row.residentName || "Resident"}`} meta={[row.color, row.makeModel, row.vehicleType].filter(Boolean).join(" - ")} />
          )} />
        )}
      </SecurityPanel>

      <SecurityPanel title="Visitor Blocklist" subtitle="Manage visitors that should be stopped by gate security.">
        {!hasFeature("block_unwanted_visitors") ? <LockedText text="Visitor blocklist is available on Basic and higher plans." /> : (
          <div className="space-y-4">
            <form onSubmit={handleBlockVisitor} className="grid gap-3 md:grid-cols-4">
              <PanelInput label="Visitor name" value={blockForm.visitorName} onChange={(value) => setBlockForm((prev) => ({ ...prev, visitorName: value }))} required />
              <PanelInput label="Phone" value={blockForm.visitorPhone} onChange={(value) => setBlockForm((prev) => ({ ...prev, visitorPhone: value }))} />
              <PanelInput label="Reason" value={blockForm.reason} onChange={(value) => setBlockForm((prev) => ({ ...prev, reason: value }))} />
              <button disabled={opsLoading} className="min-h-11 rounded-2xl bg-[#4955b3] px-4 text-xs font-black text-white disabled:opacity-60">Add Block</button>
            </form>
            <OperationsList rows={blockedVisitors} emptyText={opsLoading ? "Loading blocklist..." : "No active blocked visitors."} renderRow={(row) => (
              <SimpleRow key={row.id} title={row.visitorName || row.visitorPhone || "Blocked visitor"} subtitle={row.visitorPhone || "No phone"} meta={row.reason || "No reason recorded"} action={<button type="button" onClick={() => handleUnblock(row.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700">Unblock</button>} />
            )} />
          </div>
        )}
      </SecurityPanel>

      <SecurityPanel title="Packages" subtitle="Package history and collection state for Plus plan estates.">
        {!hasFeature("package_tracking") ? <LockedText text="Package tracking is available on Plus and higher plans." /> : (
          <OperationsList rows={packages} emptyText={opsLoading ? "Loading packages..." : "No package records yet."} renderRow={(row) => (
            <SimpleRow key={row.id} title={row.description || "Package"} subtitle={`${row.homeName || "House"} - ${row.residentName || "Resident"}`} meta={`${row.status} - ${row.arrivedAt ? new Date(row.arrivedAt).toLocaleString() : ""}`} action={row.status === "arrived" ? <button type="button" onClick={() => handlePackageCollected(row.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white">Collected</button> : null} />
          )} />
        )}
      </SecurityPanel>

      <SecurityPanel title="Guard Attendance" subtitle="Clock-in and clock-out history for Plus plan estates.">
        {!hasFeature("guard_attendance") ? <LockedText text="Guard attendance is available on Plus and higher plans." /> : (
          <OperationsList rows={attendance} emptyText={opsLoading ? "Loading attendance..." : "No guard shifts yet."} renderRow={(row) => (
            <SimpleRow key={row.id} title={row.guardName || "Guard"} subtitle={row.gateId || "Gate"} meta={`${row.status} - ${row.clockInAt ? new Date(row.clockInAt).toLocaleString() : ""}${row.clockOutAt ? ` to ${new Date(row.clockOutAt).toLocaleString()}` : ""}`} />
          )} />
        )}
      </SecurityPanel>

      <SecurityPanel title="Security Incidents" subtitle="Incident history submitted by estate security.">
        {!hasFeature("incident_reporting") ? <LockedText text="Security incident reporting is available on Plus and higher plans." /> : (
          <OperationsList rows={incidents} emptyText={opsLoading ? "Loading incidents..." : "No incidents reported yet."} renderRow={(row) => (
            <SimpleRow key={row.id} title={`${row.type} - ${row.severity}`} subtitle={row.description} meta={`${row.reportedByName || "Security"} - ${row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}`} action={<button type="button" onClick={() => openIncidentDetail(row.id)} className="rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-black text-white">{detailLoading ? "..." : "Open"}</button>} />
          )} />
        )}
      </SecurityPanel>

      {selectedIncident ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/50 px-3 pb-3 md:items-center md:justify-center md:p-6">
          <section className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#4955b3]">Incident Detail</p>
                <h3 className="mt-1 text-xl font-black text-[#2b3437]">{selectedIncident.type} - {selectedIncident.severity}</h3>
              </div>
              <button type="button" onClick={() => setSelectedIncident(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Close</button>
            </div>
            {selectedIncident.photoUrl ? <img src={selectedIncident.photoUrl} alt="Incident attachment" className="mb-4 h-52 w-full rounded-2xl object-cover" /> : null}
            <div className="space-y-3">
              <DetailLine label="Description" value={selectedIncident.description} />
              <DetailLine label="Status" value={selectedIncident.status} />
              <DetailLine label="Reported by" value={selectedIncident.reportedByName || "Security"} />
              <DetailLine label="Gate" value={selectedIncident.gateId || "Not recorded"} />
              <DetailLine label="Related visitor" value={selectedIncident.relatedVisitorSessionId || "None"} />
              <DetailLine label="Created" value={selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString() : "Not recorded"} />
            </div>
          </section>
        </div>
      ) : null}
    </EstateSecurityShell>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-[#2b3437]">{value}</p>
    </div>
  );
}

function LockedText({ text }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">{text}</div>;
}

function OperationsList({ rows, emptyText, renderRow }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-xs font-bold text-slate-500">{emptyText}</div>;
  }
  return <div className="divide-y divide-slate-100">{rows.map(renderRow)}</div>;
}

function SimpleRow({ title, subtitle, meta, action }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#2b3437]">{title}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p>
        {meta ? <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-400">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function PanelInput({ label, value, onChange, required = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black text-slate-600">{label}</span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#2b3437] outline-none focus:border-[#4955b3] focus:bg-white" />
    </label>
  );
}

function NumberSetting({ label, value, onChange, suffix }) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div>
        <p className="text-sm font-black text-[#2b3437]">{label}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{suffix}</p>
      </div>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-right text-sm font-black text-[#2b3437] outline-none focus:border-[#4955b3] focus:bg-white"
      />
    </label>
  );
}
