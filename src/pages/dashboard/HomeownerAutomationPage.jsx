import { useEffect, useState } from "react";
import AppShell from "../../layouts/AppShell";
import { getHomeownerSettings, updateHomeownerSettings } from "../../services/homeownerSettingsService";
import { showError, showSuccess } from "../../utils/flash";

export default function HomeownerAutomationPage() {
  const [settings, setSettings] = useState({
    pushAlerts: true,
    soundAlerts: true,
    autoRejectUnknownVisitors: false,
    autoApproveTrustedVisitors: false,
    autoApproveKnownContacts: false,
    knownContacts: [],
    allowDeliveryDropAtGate: true,
    smsFallbackEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [knownContactsInput, setKnownContactsInput] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getHomeownerSettings();
        if (!active) return;
        const next = {
          pushAlerts: Boolean(data?.pushAlerts),
          soundAlerts: Boolean(data?.soundAlerts),
          autoRejectUnknownVisitors: Boolean(data?.autoRejectUnknownVisitors),
          autoApproveTrustedVisitors: Boolean(data?.autoApproveTrustedVisitors),
          autoApproveKnownContacts: Boolean(data?.autoApproveKnownContacts),
          knownContacts: Array.isArray(data?.knownContacts) ? data.knownContacts : [],
          allowDeliveryDropAtGate: Boolean(data?.allowDeliveryDropAtGate),
          smsFallbackEnabled: Boolean(data?.smsFallbackEnabled)
        };
        setSettings(next);
        setKnownContactsInput(next.knownContacts.join("\n"));
      } catch (requestError) {
        if (active) {
          setError(requestError?.message || "Failed to load automation settings.");
          showError(requestError?.message || "Failed to load automation settings.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...settings,
        knownContacts: knownContactsInput
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      };
      const updated = await updateHomeownerSettings(payload);
      setSettings((prev) => ({
        ...prev,
        ...updated,
        knownContacts: Array.isArray(updated?.knownContacts) ? updated.knownContacts : payload.knownContacts
      }));
      setKnownContactsInput((Array.isArray(updated?.knownContacts) ? updated.knownContacts : payload.knownContacts).join("\n"));
      showSuccess("Automation rules saved.");
    } catch (requestError) {
      setError(requestError?.message || "Failed to save automation rules.");
      showError(requestError?.message || "Failed to save automation rules.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Automation Rules">
      <div className="mx-auto max-w-3xl space-y-4 pb-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Smart Visitor Rules</h1>
          <p className="mt-1 text-sm text-slate-500">Choose what can be approved automatically, how deliveries are handled, and when fallback alerts should be used.</p>
        </section>

        <section className="space-y-3 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          {loading ? <div className="text-sm text-slate-500">Loading automation settings...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {!loading ? (
            <>
              <ToggleRow label="Auto-approve trusted visitors" checked={settings.autoApproveTrustedVisitors} onChange={(value) => setSettings((prev) => ({ ...prev, autoApproveTrustedVisitors: value }))} />
              <ToggleRow label="Auto-approve known contacts" checked={settings.autoApproveKnownContacts} onChange={(value) => setSettings((prev) => ({ ...prev, autoApproveKnownContacts: value }))} />
              <ToggleRow label="Allow delivery drop at gate" checked={settings.allowDeliveryDropAtGate} onChange={(value) => setSettings((prev) => ({ ...prev, allowDeliveryDropAtGate: value }))} />
              <ToggleRow label="Enable SMS fallback" checked={settings.smsFallbackEnabled} onChange={(value) => setSettings((prev) => ({ ...prev, smsFallbackEnabled: value }))} />
              <ToggleRow label="Auto-reject unknown visitors" checked={settings.autoRejectUnknownVisitors} onChange={(value) => setSettings((prev) => ({ ...prev, autoRejectUnknownVisitors: value }))} />
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-900 dark:text-white">Known Contacts</span>
                <textarea
                  value={knownContactsInput}
                  onChange={(event) => setKnownContactsInput(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  placeholder={"One contact per line\nFamily Driver\nSchool Pickup"}
                />
                <span className="mt-2 block text-xs text-slate-500">Use names, phones, or simple labels that your gate team will recognize.</span>
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
              >
                {saving ? "Saving..." : "Save Automation Rules"}
              </button>
            </>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
