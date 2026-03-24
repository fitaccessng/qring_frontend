import { useEffect, useState } from "react";
import { ChevronLeft, Phone, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import { getHomeownerSettings, updateHomeownerSettings } from "../../services/homeownerSettingsService";
import { showError, showSuccess } from "../../utils/flash";

export default function HomeownerEmergencyContactsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    pushAlerts: true,
    soundAlerts: true,
    autoRejectUnknownVisitors: false,
    autoApproveTrustedVisitors: false,
    autoApproveKnownContacts: false,
    knownContacts: [],
    allowDeliveryDropAtGate: true,
    smsFallbackEnabled: true
  });
  const [contactsInput, setContactsInput] = useState("");

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
        setContactsInput(next.knownContacts.join("\n"));
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message || "Failed to load emergency contacts.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (error) showError(error);
  }, [error]);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...settings,
        knownContacts: contactsInput
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      };
      const updated = await updateHomeownerSettings(payload);
      const nextContacts = Array.isArray(updated?.knownContacts) ? updated.knownContacts : payload.knownContacts;
      setSettings((prev) => ({
        ...prev,
        ...updated,
        knownContacts: nextContacts
      }));
      setContactsInput(nextContacts.join("\n"));
      showSuccess("Emergency contacts saved.");
      navigate("/dashboard/homeowner/safety");
    } catch (requestError) {
      setError(requestError?.message || "Failed to save emergency contacts.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Emergency Contacts">
      <div className="mx-auto max-w-md space-y-4 px-1 pb-24">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#fff7ed_0%,#fff1f2_44%,#ffffff_100%)] px-5 pb-5 pt-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => navigate("/dashboard/homeowner/safety")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="mt-4 flex items-start gap-3">
            <div className="grid h-10 w-20 place-items-center px-1 py-2  rounded-[2rem] bg-rose-600 text-white shadow-lg">
              <Phone size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-600">Emergency Contacts</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                Add the people QRing should escalate to.
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                For independent homeowners, panic alerts route to these personal emergency contacts first. For estate homeowners, these become part of later escalation.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200">
          {loading ? <p className="text-sm text-slate-500">Loading contacts...</p> : null}
          {!loading ? (
            <div className="space-y-4">
              <div className="rounded-[1.35rem] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-600" />
                  <p className="text-sm font-semibold text-slate-900">Personal Emergency Contacts</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Add one contact per line. Include names and numbers so responders can identify the person quickly.
                </p>
                <textarea
                  value={contactsInput}
                  onChange={(event) => setContactsInput(event.target.value)}
                  rows={8}
                  className="mt-3 w-full rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder={"Mum - 0803 000 0000\nBrother - 0805 111 1111\nFamily Doctor - 0703 222 2222"}
                />
              </div>

              <div className="flex items-center justify-between rounded-[1.35rem] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable SMS fallback</p>
                  <p className="mt-1 text-xs text-slate-500">Use SMS as a backup when internet delivery is weak.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.smsFallbackEnabled}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      smsFallbackEnabled: !prev.smsFallbackEnabled
                    }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    settings.smsFallbackEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                      settings.smsFallbackEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white"
              >
                {saving ? "Saving..." : "Save Emergency Contacts"}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
