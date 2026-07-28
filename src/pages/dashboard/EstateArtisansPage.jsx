import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, HardHat, Phone, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { getEstateOverview, listEstateArtisans, saveEstateArtisans } from "../../services/estateService";
import { listHomeownerArtisans } from "../../services/homeownerService";
import BottomSheet from "../../components/system/BottomSheet";
import { estateFieldClassName } from "../../components/mobile/EstateManagerPageShell";
import { showError, showSuccess } from "../../utils/flash";

export default function EstateArtisansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === "estate" || user?.role === "admin";
  const [estateId, setEstateId] = useState("");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", trade: "", phone: "", note: "" });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      if (canManage) {
        const overview = await getEstateOverview({ force: true });
        const id = estateId || overview?.estates?.[0]?.id || "";
        setEstateId(id);
        setContacts(id ? await listEstateArtisans(id) : []);
      } else {
        setContacts(await listHomeownerArtisans());
      }
    } catch (error) { showError(error?.message || "Unable to load contacts"); }
    finally { if (!silent) setLoading(false); }
  }, [canManage, estateId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const refresh = () => load({ silent: true });
    const id = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(id); window.removeEventListener("focus", refresh); };
  }, [load]);

  async function addContact(event) {
    event.preventDefault();
    try {
      const next = await saveEstateArtisans(estateId, [...contacts, form]);
      setContacts(next); setForm({ name: "", trade: "", phone: "", note: "" }); setOpen(false);
      showSuccess("Artisan contact added");
    } catch (error) { showError(error?.message || "Unable to save contact"); }
  }

  async function removeContact(id) {
    try { setContacts(await saveEstateArtisans(estateId, contacts.filter((row) => row.id !== id))); }
    catch (error) { showError(error?.message || "Unable to remove contact"); }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <button type="button" onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 dark:bg-slate-800" aria-label="Go back"><ArrowLeft size={20} /></button>
        <div><h1 className="font-black">Trusted Artisans</h1><p className="text-xs text-slate-500">Estate-approved service contacts</p></div>
      </header>
      <main className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        {canManage && <button type="button" onClick={() => setOpen(true)} className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-bold text-white"><Plus size={18} /> Add artisan</button>}
        {loading ? <p className="py-16 text-center text-sm text-slate-400">Loading contacts…</p> : contacts.map((contact) => (
          <article key={contact.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><HardHat size={20} /></span><div><h2 className="font-black">{contact.name}</h2><p className="text-sm font-semibold text-indigo-600">{contact.trade}</p></div></div>{canManage && <button type="button" onClick={() => removeContact(contact.id)} className="grid h-11 w-11 place-items-center rounded-xl text-rose-600" aria-label={`Remove ${contact.name}`}><Trash2 size={18} /></button>}</div>
            {contact.note && <p className="mt-3 text-sm text-slate-500">{contact.note}</p>}
            <a href={`tel:${contact.phone}`} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-emerald-50 px-4 font-bold text-emerald-700"><Phone size={17} /> {contact.phone}</a>
          </article>
        ))}
        {!loading && contacts.length === 0 && <p className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">No artisan contacts have been added yet.</p>}
      </main>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Add artisan contact">
        <form onSubmit={addContact} className="space-y-4">
          {[['name','Full name'],['trade','Trade or specialty'],['phone','Phone number'],['note','Optional note']].map(([key,label]) => <label key={key} className="block text-xs font-bold text-slate-500">{label}<input required={key !== 'note'} value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} className={`${estateFieldClassName} mt-1.5`} /></label>)}
          <button className="min-h-12 w-full rounded-2xl bg-indigo-600 font-bold text-white">Save contact</button>
        </form>
      </BottomSheet>
    </div>
  );
}
