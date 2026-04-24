import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  UserPlus,
  Send,
  Mail,
  ShieldCheck,
  Filter,
  LayoutDashboard,
  Wallet,
  Users,
  Building2,
  Settings,
  RefreshCw
} from 'lucide-react';

import { createEstateHomeowner, inviteHomeowner } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";

const EstateInvitesPage = () => {
  const navigate = useNavigate();
  const { overview, setOverview, loading, refresh } = useEstateOverviewState();

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", unitNumber: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [resendingId, setResendingId] = useState(null); // Track which specific item is resending

  useEffect(() => {
    if (overview?.error) showError(overview.error);
  }, [overview?.error]);

  const homeowners = useMemo(() => overview?.homeowners ?? [], [overview]);

  const buildTemporaryPassword = (formData) => {
    const safeName = (formData?.fullName || "resident").replace(/\s+/g, "").slice(0, 6) || "resident";
    return `${safeName}#Qring2026`;
  };
  const invitePreviewPassword = form.password || buildTemporaryPassword(form);

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
      showSuccess(`Invite resent to ${person.fullName}. They should sign in with ${person.email} and the new password from the email.`);
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
          throw new Error("That email is already registered. If this resident already has an account, resend their invite from the resident list.");
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

      showSuccess(`Invite sent to ${form.fullName}. Login email: ${cleanEmail}. Password: ${temporaryPassword}`);

      setForm({ fullName: "", email: "", phone: "", unitNumber: "", password: "" });
      refresh().catch(() => {});
    } catch (err) {
      showError(err.message ?? "Failed to send invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-body selection:bg-indigo-100 pb-32">
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-headline font-black tracking-tight text-lg">Invite Residents</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <Bell size={22} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="pt-24 px-5 max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-headline font-black tracking-tight text-[#2b3437]">Invite Residents</h2>
          <p className="text-slate-500 font-medium">Securely onboard your community members.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-[#4955b3]">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#2b3437]">New Invitation</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Encrypted Delivery</p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Resident Name</label>
                    <input
                      required
                      value={form.fullName}
                      onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                      placeholder="Johnathan Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Property Unit</label>
                    <input
                      required
                      value={form.unitNumber}
                      onChange={(e) => setForm(p => ({ ...p, unitNumber: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                      placeholder="Suite 201"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Method</label>
                  <div className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-[#dfe0ff] text-[#3b48a6]">
                    <Mail size={16} strokeWidth={3} /> Email
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Detail</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                    placeholder="resident@domain.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Homeowner Password</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    This becomes the resident&apos;s login password. If you leave it blank, Qring generates one automatically.
                  </p>
                </div>



                <button
                  disabled={busy}
                  className="w-full py-5 bg-[#4955b3] text-white rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Send Invitation"}
                  {!busy && <Send size={18} />}
                </button>
              </form>
            </section>
          </div>

          {/* Activity Column */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-50">
              <div className="flex items-center justify-between mb-8 px-2">
                <h3 className="text-sm font-black text-[#2b3437] uppercase tracking-wider">Recent Activity</h3>
                <Filter size={18} className="text-slate-300 cursor-pointer" />
              </div>

              <div className="space-y-4">
                {loading ? (
                  <p className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">Loading residents...</p>
                ) : homeowners.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-300">
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#2b3437] truncate max-w-[120px]">{person.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {person.roleLabel || "Estate Homeowner"}{person.unitNumber ? ` · Unit ${person.unitNumber}` : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleResend(person)}
                      disabled={resendingId === person.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50"
                    >
                      {resendingId === person.id ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : 'Resend'}
                    </button>
                  </div>
                ))}
                {!loading && homeowners.length === 0 && (
                  <p className="text-center py-10 text-slate-400 font-bold text-xs uppercase tracking-widest">No residents found</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EstateInvitesPage;
