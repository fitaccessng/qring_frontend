import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Bell,
  UserPlus,
  Send,
  Mail,
  Users,
  RefreshCw,
  Plus,
  ArrowRight
} from 'lucide-react';

import { createEstateHomeowner, inviteHomeowner } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

const EstateInvitesPage = () => {
  const navigate = useNavigate();
  const { overview, setOverview, loading, refresh } = useEstateOverviewState();

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", unitNumber: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  
  // Mobile Tab State (Allows switching between the Invite Form and Resident List views)
  const [activeTab, setActiveTab] = useState("invite"); // "invite" | "residents"

  useEffect(() => {
    if (overview?.error) showError(overview.error);
  }, [overview?.error]);

  const homeowners = useMemo(() => overview?.homeowners ?? [], [overview]);

  const buildTemporaryPassword = (formData) => {
    const safeName = (formData?.fullName || "resident").replace(/\s+/g, "").slice(0, 6) || "resident";
    return `${safeName}#Qring2026`;
  };

  async function handleResend(person) {
    if (resendingId) return;
    setResendingId(person.id);
    try {
      const temporaryPassword = buildTemporaryPassword(person);
      const result = await inviteHomeowner(person.id, {
        temporaryPassword,
        unitName: person.unitNumber || "Unassigned"
      });
      const emailStatus = String(result?.emailStatus || "").toLowerCase();
      const emailReason = String(result?.emailReason || "").trim();
      if (emailStatus !== "sent") {
        throw new Error(
          emailReason
            ? `Invite email was not sent (${result?.emailStatus || "unknown"}: ${emailReason}).`
            : `Invite email was not sent (${result?.emailStatus || "unknown"}).`
        );
      }
      showSuccess(`Invite resent to ${person.fullName}. They should sign in with ${person.email} and the temporary password.`);
    } catch (err) {
      showError(err.message || "Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const estateId = overview?.estates?.[0]?.id;
      if (!estateId) throw new Error("Create an estate first before inviting residents");

      const temporaryPassword = String(form.password || buildTemporaryPassword(form)).trim();
      const cleanEmail = form.email.trim().toLowerCase();
      let created = null;
      try {
        created = await createEstateHomeowner({
          estateId,
          fullName: form.fullName.trim(),
          email: cleanEmail,
          password: temporaryPassword,
          unitName: form.unitNumber.trim(),
          doorName: "Main Door"
        });
      } catch (err) {
        if (Number(err?.status) !== 409) throw err;
        const existingHomeowner = homeowners.find(
          (person) => String(person?.email || "").trim().toLowerCase() === cleanEmail
        );
        if (!existingHomeowner?.id) {
          throw new Error("That email is already registered. Resend invite from the resident list.");
        }
        created = existingHomeowner;
      }

      const inviteResult = created?.id
        ? await inviteHomeowner(created.id, {
            temporaryPassword,
            unitName: form.unitNumber.trim()
          })
        : null;

      const emailStatus = String(inviteResult?.emailStatus || "").toLowerCase();
      const emailReason = String(inviteResult?.emailReason || "").trim();
      if (inviteResult && emailStatus !== "sent") {
        throw new Error(
          emailReason
            ? `Resident account was created, but invite email was not sent (${inviteResult?.emailStatus || "unknown"}: ${emailReason}).`
            : `Resident account was created, but invite email was not sent (${inviteResult?.emailStatus || "unknown"}).`
        );
      }

      showSuccess(`Invite sent to ${form.fullName}. Temporary Password: ${temporaryPassword}`);
      setForm({ fullName: "", email: "", phone: "", unitNumber: "", password: "" });
      refresh().catch(() => {});
      setActiveTab("residents"); // Auto-switch tab to resident view on success
    } catch (err) {
      showError(err.message ?? "Failed to send invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* STATIC STICKY HEADER */}
      <header className="sticky top-0 z-[100] w-full border-b border-slate-100/80 bg-white/90 px-4 py-3.5 backdrop-blur-md dark:bg-slate-950/90 dark:border-slate-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 bg-slate-50 text-slate-600 rounded-full hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Invite Residents</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Access Onboarding</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto space-y-4">
        
        {/* SEGMENT CONTROLLER (Perfect for single-handed mobile navigation) */}
        <section className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex">
          <button
            onClick={() => setActiveTab("invite")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "invite"
                ? "bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            New Invite
          </button>
          <button
            onClick={() => setActiveTab("residents")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "residents"
                ? "bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Resident List ({homeowners.length})
          </button>
        </section>

        {/* INVITE FORM VIEW */}
        {activeTab === "invite" && (
          <section className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <UserPlus size={20} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Step 1: Identity</p>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-1">Account Creation</h3>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Resident Name</label>
                  <input
                    required
                    value={form.fullName}
                    onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all text-xs font-semibold text-slate-900 dark:text-slate-150"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Property Unit</label>
                  <input
                    required
                    value={form.unitNumber}
                    onChange={(e) => setForm(p => ({ ...p, unitNumber: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all text-xs font-semibold text-slate-900 dark:text-slate-150"
                    placeholder="e.g. Suite 201"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Delivery Method</label>
                <div className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-450 text-[10px] font-bold uppercase tracking-wider">
                  <Mail size={14} /> Encrypted Email Delivery
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Contact Detail</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all text-xs font-semibold text-slate-900 dark:text-slate-150"
                  placeholder="resident@domain.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Homeowner Password (Optional)</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-transparent focus:border-slate-200 focus:bg-white focus:outline-none transition-all text-xs font-semibold text-slate-900 dark:text-slate-150"
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-relaxed italic ml-0.5">
                  If left blank, Qring automatically generates a high-entropy secret key.
                </p>
              </div>

              <button
                disabled={busy}
                type="submit"
                className="w-full py-3.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {busy ? "Sending Invitation..." : "Send Invitation"}
                {!busy && <ArrowRight size={14} />}
              </button>
            </form>
          </section>
        )}

        {/* ACTIVE RESIDENTS LIST VIEW */}
        {activeTab === "residents" && (
          <section className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-800/40 shadow-sm space-y-3">
            <div className="px-1.5 pb-1">
              <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Active Residents</h4>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-12 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider flex flex-col items-center gap-2">
                  <RefreshCw size={18} className="animate-spin text-indigo-500" />
                  Loading residents...
                </div>
              ) : homeowners.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-850/30 rounded-2xl border border-slate-100/30 dark:border-slate-800/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0 border border-slate-100/80 dark:border-slate-800/55">
                      <Users size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">{person.fullName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                        {person.roleLabel || "Resident"}{person.unitNumber ? ` · Unit ${person.unitNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResend(person)}
                    disabled={resendingId === person.id}
                    className="p-2.5 bg-white dark:bg-slate-900 text-slate-600 hover:text-indigo-600 dark:text-slate-350 dark:hover:text-indigo-400 rounded-xl shadow-sm border border-slate-100/50 dark:border-slate-800 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                    title="Resend Invite"
                  >
                    {resendingId === person.id ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              ))}

              {!loading && homeowners.length === 0 && (
                <div className="py-16 text-center bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Users className="mx-auto h-8 w-8 text-slate-350 dark:text-slate-800 mb-2" />
                  <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest">No active Residents Onboarded</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* PERSISTENT QUICK FLOATING ACTION BUTTON (Mobile shortcut to return to form) */}
      {activeTab === "residents" && (
        <button
          onClick={() => setActiveTab("invite")}
          className="fixed bottom-6 right-6 z-[100] w-14 h-14 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 active:scale-90 hover:bg-indigo-700 transition-all"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
};

export default EstateInvitesPage;