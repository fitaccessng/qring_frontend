import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  HeartHandshake,
  HomeIcon,
  Info,
  ShieldAlert,
  Trash2,
  UserPlus
} from "lucide-react";
import { useNotifications } from "../../state/NotificationsContext";
import {
  buildHomeownerSettingsPayload,
  getHomeownerSettings,
  normalizeHomeownerSettings,
  searchHomeownerEmergencyContactByEmail,
  updateHomeownerSettings
} from "../../services/homeownerSettingsService";
import { showError, showSuccess } from "../../utils/flash";
import { formatEmergencyContact, parseEmergencyContact } from "../../utils/emergencyContacts";

const EMPTY_FORM = {
  name: "",
  email: "",
  relationship: ""
};

export default function HomeownerEmergencyContactsPage() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadContacts() {
      setLoading(true);
      try {
        const data = await getHomeownerSettings();
        if (!active) return;
        const normalized = normalizeHomeownerSettings(data);
        const knownContacts = Array.isArray(normalized.knownContacts) ? normalized.knownContacts : [];
        setSettings(normalized);
        setContacts(knownContacts.map((item, index) => parseEmergencyContact(item, index)));
      } catch (error) {
        if (!active) return;
        showError(error?.message || "Failed to load emergency contacts.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadContacts();
    return () => {
      active = false;
    };
  }, []);

  const isPanicActive = false;
  const canAdd = form.email.trim() && !saving;
  const autoEscalationLabel = useMemo(() => {
    if (!contacts.length) return "Add at least one contact so alerts have someone to reach.";
    return `QRing will notify ${contacts.length} configured contact${contacts.length === 1 ? "" : "s"} during escalation.`;
  }, [contacts.length]);

  async function persistContacts(nextContacts, successMessage) {
    if (!settings) return;
    if (isMountedRef.current) setSaving(true);
    try {
      const nextSettings = normalizeHomeownerSettings({
        ...settings,
        knownContacts: nextContacts.map((item) => formatEmergencyContact(item))
      });
      const updated = await updateHomeownerSettings(buildHomeownerSettingsPayload(nextSettings), { retryCount: 1 });
      if (!isMountedRef.current) return;
      setSettings(normalizeHomeownerSettings({ ...nextSettings, ...(updated || {}) }));
      setContacts(nextContacts);
      showSuccess(successMessage);
    } catch (error) {
      showError(error?.message || "Failed to save emergency contacts.");
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }

  async function handleAddContact() {
    if (!canAdd || saving) return;
    try {
      const matchedUser = await searchHomeownerEmergencyContactByEmail(form.email);
      const exists = contacts.some(
        (contact) => String(contact.email || "").trim().toLowerCase() === String(matchedUser?.email || "").trim().toLowerCase()
      );
      if (exists) {
        throw new Error("This QRing user is already in your emergency contact list.");
      }
      const nextContact = {
        id: `contact_${matchedUser?.id || Date.now()}`,
        name: matchedUser?.fullName || form.name.trim() || "Emergency Contact",
        email: matchedUser?.email || form.email.trim().toLowerCase(),
        phone: matchedUser?.phone || "",
        relationship: form.relationship.trim() || "Emergency Contact"
      };
      await persistContacts([...contacts, nextContact], "Emergency contact added.");
      setForm(EMPTY_FORM);
    } catch (error) {
      showError(error?.message || "Could not add that QRing user as an emergency contact.");
    }
  }

  async function handleRemoveContact(contactId) {
    if (saving) return;
    const nextContacts = contacts.filter((contact) => contact.id !== contactId);
    await persistContacts(nextContacts, "Emergency contact removed.");
  }

  function iconForRelationship(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized.includes("family")) return <HeartHandshake className="text-indigo-600" size={28} />;
    if (normalized.includes("neighbor")) return <HomeIcon className="text-emerald-600" size={28} />;
    return <ShieldAlert className="text-rose-600" size={28} />;
  }

  function colorForRelationship(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized.includes("family")) return "bg-indigo-50";
    if (normalized.includes("neighbor")) return "bg-emerald-50";
    return "bg-rose-50";
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-900 antialiased flex flex-col">
      {/* Static Header Layout */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">Emergency Contacts</h1>
          </div>
          <Link to="/dashboard/notifications" className="relative p-2.5 bg-slate-50 text-slate-600 rounded-full">
            <Bell size={18} />
            {unreadCount > 0 ? <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" /> : null}
          </Link>
        </div>
      </header>

      {/* Main Structural Layout Content Framework */}
      <main className="flex-grow py-8 sm:py-12 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <section className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Emergency Contacts</h2>
          <p className="text-slate-500 text-base sm:text-lg leading-relaxed">Add verified QRing users by email so panic alerts reach real accounts.</p>
        </section>

        <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-slate-100 shadow-sm mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus size={20} className="text-indigo-600" />
            <h3 className="font-bold text-slate-900">Add New Contact</h3>
          </div>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <input
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="QRing user email"
              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <input
              value={form.relationship}
              onChange={(event) => setForm((prev) => ({ ...prev, relationship: event.target.value }))}
              placeholder="Relationship"
              className="w-full rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 flex items-center">
              The user must already have a verified QRing account.
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddContact}
            disabled={!canAdd || saving}
            className="mt-4 w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-60"
          >
            <UserPlus size={20} />
            <span>{saving ? "Saving..." : "Add New Contact"}</span>
          </button>
        </section>

        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm text-center text-slate-500 font-bold">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-sm text-center text-slate-500 font-bold">
              No emergency contacts saved yet.
            </div>
          ) : (
            contacts.map((contact) => (
              <div key={contact.id} className="group bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 ${colorForRelationship(contact.relationship)} flex items-center justify-center`}>
                    {iconForRelationship(contact.relationship)}
                  </div>
                  <div className="flex-1 w-full min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-500 truncate">
                        {contact.relationship || "Emergency Contact"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.id)}
                        disabled={saving}
                        className="text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-60 shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{contact.name}</h3>
                    <p className="text-slate-500 text-sm font-medium truncate">{contact.email || contact.phone || "No contact saved"}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 sm:mt-12 bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-100 flex flex-col md:flex-row gap-4 sm:gap-6 items-center">
          <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
            <Info size={24} />
          </div>
          <div className="text-center md:text-left">
            <h4 className="font-bold text-slate-900 mb-1">Automatic Escalation</h4>
            <p className="text-slate-500 text-sm leading-relaxed">{autoEscalationLabel}</p>
          </div>
        </div>
      </main>

      <div className="fixed top-0 right-0 -z-10 w-1/2 h-full opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-indigo-100/50 via-transparent to-transparent blur-3xl" />
      </div>
    </div>
  );
}
