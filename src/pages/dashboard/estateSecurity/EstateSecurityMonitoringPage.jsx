import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Car, 
  Clock, 
  Package, 
  Save, 
  ShieldAlert, 
  Sliders, 
  Sparkles, 
  UserX, 
  ChevronLeft, 
  Bell, 
  Loader2, 
  Lock 
} from "lucide-react";
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
  const navigate = useNavigate();
  const {
    currentEstate,
    error,
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
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-950/40">
      
      {/* --- STICKY GLASS HEADER --- */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Monitoring & Operations</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-black text-white shadow-sm shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={16} />} 
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button 
              onClick={() => navigate("/dashboard/notifications")} 
              aria-label="Notifications"
              className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
            </button>
          </div>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        
        {/* --- TITLE & SUBTITLE --- */}
        <section className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">
            Automated Checks & Audit Logs
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {currentEstate?.name ? currentEstate.name : "Estate Monitoring"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Tune reminders, activity windows, and oversee estate operations.
          </p>
        </section>

        {/* --- STATS GRID --- */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100/50 shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{reminderFrequencyDays}d</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Reminder Cycle</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-100/50 shrink-0">
              <Sliders size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{suspiciousVisitWindowMinutes}m</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1">Visit Window</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-3xl border border-emerald-100/40 dark:border-emerald-500/10 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100/20 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white leading-none">{autoApproveTrustedVisitors ? "On" : "Off"}</h4>
              <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/50 font-bold uppercase tracking-wider mt-1">Trusted Visitors</p>
            </div>
          </div>
        </section>

        {/* --- SECONDARY STATS GRID --- */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm text-center">
            <Car size={16} className="mx-auto text-indigo-600 dark:text-indigo-400 mb-1" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{vehicles.length}</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Vehicles</p>
          </div>
          <div className="bg-rose-50/50 dark:bg-rose-500/5 p-3 rounded-2xl border border-rose-100/40 dark:border-rose-500/10 shadow-sm text-center">
            <UserX size={16} className="mx-auto text-rose-600 dark:text-rose-400 mb-1" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{blockedVisitors.length}</h4>
            <p className="text-[9px] text-rose-600/70 dark:text-rose-400/50 font-bold uppercase tracking-wider mt-0.5">Blocklist</p>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-3 rounded-2xl border border-emerald-100/40 dark:border-emerald-500/10 shadow-sm text-center">
            <Package size={16} className="mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{packages.length}</h4>
            <p className="text-[9px] text-emerald-600/70 dark:text-emerald-400/50 font-bold uppercase tracking-wider mt-0.5">Packages</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm text-center">
            <Clock size={16} className="mx-auto text-slate-500 dark:text-slate-400 mb-1" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{attendance.length}</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Attendance</p>
          </div>
          <div className="bg-rose-50/50 dark:bg-rose-500/5 p-3 rounded-2xl border border-rose-100/40 dark:border-rose-500/10 shadow-sm text-center col-span-2 sm:col-span-1">
            <ShieldAlert size={16} className="mx-auto text-rose-600 dark:text-rose-400 mb-1" />
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{incidents.length}</h4>
            <p className="text-[9px] text-rose-600/70 dark:text-rose-400/50 font-bold uppercase tracking-wider mt-0.5">Incidents</p>
          </div>
        </section>

        {/* --- AUTOMATION SETTINGS PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Automation & Guardrails</h4>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">Auto-approve trusted visitors</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Allow known trusted visitors to pass with less manual handling.</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoApproveTrustedVisitors((value) => !value)}
                aria-label="Toggle auto-approve trusted visitors"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoApproveTrustedVisitors ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  autoApproveTrustedVisitors ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <NumberSetting label="Reminder frequency" suffix="days" value={reminderFrequencyDays} onChange={setReminderFrequencyDays} />
            <NumberSetting label="Suspicious visit window" suffix="minutes" value={suspiciousVisitWindowMinutes} onChange={setSuspiciousVisitWindowMinutes} />
            <NumberSetting label="House threshold" suffix="visits" value={suspiciousHouseThreshold} onChange={setSuspiciousHouseThreshold} />
            <NumberSetting label="Rejection threshold" suffix="rejections" value={suspiciousRejectionThreshold} onChange={setSuspiciousRejectionThreshold} />
          </div>
        </section>

        {/* --- VEHICLE REGISTRY PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Vehicle Registry</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden p-4">
            {!hasFeature("vehicle_registration") ? (
              <LockedText text="Vehicle registration is available on Basic and higher plans." />
            ) : (
              <OperationsList rows={vehicles} emptyText={opsLoading ? "Loading vehicles..." : "No vehicles registered yet."} renderRow={(row) => (
                <SimpleRow key={row.id} title={row.plateNumber} subtitle={`${row.homeName || "House"} - ${row.residentName || "Resident"}`} meta={[row.color, row.makeModel, row.vehicleType].filter(Boolean).join(" - ")} />
              )} />
            )}
          </div>
        </section>

        {/* --- VISITOR BLOCKLIST PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Visitor Blocklist</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden p-4 space-y-4">
            {!hasFeature("block_unwanted_visitors") ? (
              <LockedText text="Visitor blocklist is available on Basic and higher plans." />
            ) : (
              <>
                <form onSubmit={handleBlockVisitor} className="grid gap-3 sm:grid-cols-4">
                  <PanelInput label="Visitor name" value={blockForm.visitorName} onChange={(value) => setBlockForm((prev) => ({ ...prev, visitorName: value }))} required />
                  <PanelInput label="Phone" value={blockForm.visitorPhone} onChange={(value) => setBlockForm((prev) => ({ ...prev, visitorPhone: value }))} />
                  <PanelInput label="Reason" value={blockForm.reason} onChange={(value) => setBlockForm((prev) => ({ ...prev, reason: value }))} />
                  <div className="flex items-end">
                    <button type="submit" disabled={opsLoading} className="w-full h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-xs font-black text-white disabled:opacity-60 transition-all">Add Block</button>
                  </div>
                </form>
                <OperationsList rows={blockedVisitors} emptyText={opsLoading ? "Loading blocklist..." : "No active blocked visitors."} renderRow={(row) => (
                  <SimpleRow key={row.id} title={row.visitorName || row.visitorPhone || "Blocked visitor"} subtitle={row.visitorPhone || "No phone"} meta={row.reason || "No reason recorded"} action={<button type="button" onClick={() => handleUnblock(row.id)} className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/10 dark:border-rose-500/20 px-3 py-1.5 text-[10px] font-black text-rose-700 dark:text-rose-400">Unblock</button>} />
                )} />
              </>
            )}
          </div>
        </section>

        {/* --- PACKAGES PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Packages</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden p-4">
            {!hasFeature("package_tracking") ? (
              <LockedText text="Package tracking is available on Plus and higher plans." />
            ) : (
              <OperationsList rows={packages} emptyText={opsLoading ? "Loading packages..." : "No package records yet."} renderRow={(row) => (
                <SimpleRow key={row.id} title={row.description || "Package"} subtitle={`${row.homeName || "House"} - ${row.residentName || "Resident"}`} meta={`${row.status} - ${row.arrivedAt ? new Date(row.arrivedAt).toLocaleString() : ""}`} action={row.status === "arrived" ? <button type="button" onClick={() => handlePackageCollected(row.id)} className="rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-1.5 text-[10px] font-black text-white">Collected</button> : null} />
              )} />
            )}
          </div>
        </section>

        {/* --- GUARD ATTENDANCE PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Guard Attendance</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden p-4">
            {!hasFeature("guard_attendance") ? (
              <LockedText text="Guard attendance is available on Plus and higher plans." />
            ) : (
              <OperationsList rows={attendance} emptyText={opsLoading ? "Loading attendance..." : "No guard shifts yet."} renderRow={(row) => (
                <SimpleRow key={row.id} title={row.guardName || "Guard"} subtitle={row.gateId || "Gate"} meta={`${row.status} - ${row.clockInAt ? new Date(row.clockInAt).toLocaleString() : ""}${row.clockOutAt ? ` to ${new Date(row.clockOutAt).toLocaleString()}` : ""}`} />
              )} />
            )}
          </div>
        </section>

        {/* --- SECURITY INCIDENTS PANEL --- */}
        <section className="space-y-3">
          <div className="px-1">
            <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Security Incidents</h4>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm overflow-hidden p-4">
            {!hasFeature("incident_reporting") ? (
              <LockedText text="Security incident reporting is available on Plus and higher plans." />
            ) : (
              <OperationsList rows={incidents} emptyText={opsLoading ? "Loading incidents..." : "No incidents reported yet."} renderRow={(row) => (
                <SimpleRow key={row.id} title={`${row.type} - ${row.severity}`} subtitle={row.description} meta={`${row.reportedByName || "Security"} - ${row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}`} action={<button type="button" onClick={() => openIncidentDetail(row.id)} className="rounded-xl bg-slate-900 dark:bg-slate-800 px-3 py-1.5 text-[10px] font-black text-white">{detailLoading ? "..." : "Open"}</button>} />
              )} />
            )}
          </div>
        </section>
      </main>

      {/* --- INCIDENT DETAIL MODAL --- */}
      {selectedIncident ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
          <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setSelectedIncident(null)} aria-label="Close modal" />
          <section className="relative z-10 max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Incident Detail</p>
                <h3 className="mt-1 text-base font-black text-slate-900 dark:text-white">{selectedIncident.type} - {selectedIncident.severity}</h3>
              </div>
              <button type="button" onClick={() => setSelectedIncident(null)} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400">
                Close
              </button>
            </div>
            {selectedIncident.photoUrl ? <img src={selectedIncident.photoUrl} alt="Incident attachment" className="h-48 w-full rounded-2xl object-cover border border-slate-100 dark:border-slate-800" /> : null}
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
    </div>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-850 p-3 border border-slate-100 dark:border-slate-800/60">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function LockedText({ text }) {
  return (
    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/10 px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
      <Lock size={14} className="shrink-0" />
      <span>{text}</span>
    </div>
  );
}

function OperationsList({ rows, emptyText, renderRow }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 px-4 py-8 text-center text-xs font-bold text-slate-400">{emptyText}</div>;
  }
  return <div className="divide-y divide-slate-100 dark:divide-slate-800/60">{rows.map(renderRow)}</div>;
}

function SimpleRow({ title, subtitle, meta, action }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        {meta ? <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-400">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function PanelInput({ label, value, onChange, required = false }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-3 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900" />
    </div>
  );
}

function NumberSetting({ label, value, onChange, suffix }) {
  return (
    <div className="flex items-center justify-between gap-4 pt-3 first:pt-0">
      <div className="space-y-0.5">
        <p className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">{label}</p>
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{suffix}</p>
      </div>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-2.5 text-right text-xs font-black text-slate-900 dark:text-white outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900"
      />
    </div>
  );
}