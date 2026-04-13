import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  HardHat,
  Verified,
  TriangleAlert,
  Lightbulb,
  Plus,
  LayoutDashboard,
  Wallet,
  Users,
  Building2,
  Settings,
  CheckCircle2,
  Filter,
  X
} from 'lucide-react';

// Service & Hook Imports
import {
  listEstateAlerts,
  listMaintenanceAudits,
  updateEstateAlert,
  createEstateAlert
} from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import { estateFieldClassName } from "../../components/mobile/EstateManagerPageShell";

const EstateMaintenancePage = () => {
  const navigate = useNavigate();
  const { overview, estateId, setEstateId, loading, error, setError } = useEstateOverviewState();

  const [requests, setRequests] = useState([]);
  const [audits, setAudits] = useState([]);
  const [updatingId, setUpdatingId] = useState("");
  const [controlsOpen, setControlsOpen] = useState(false);

  // Form State
  const [formOpen, setFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium' });

  useEffect(() => { if (error) showError(error); }, [error]);

  const loadData = async () => {
    if (!estateId) return;
    try {
      const [rows, auditRows] = await Promise.all([
        listEstateAlerts(estateId, "maintenance_request"),
        listMaintenanceAudits(estateId)
      ]);
      setRequests(rows);
      setAudits(auditRows);
    } catch (err) {
      setError(err?.message || "Failed to load maintenance data");
    }
  };

  useEffect(() => { loadData(); }, [estateId]);

  useEffect(() => {
    if (!estateId) return;
    const socket = getDashboardSocket();
    socket.emit("dashboard.subscribe", { room: `estate:${estateId}:alerts` });
  }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: loadData,
    ALERT_UPDATED: loadData,
    ALERT_DELETED: loadData
  }), [estateId]));

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!formData.title) return showError("Title is required");

    setIsSubmitting(true);
    try {
      await createEstateAlert({
        estateId,
        title: String(formData.title || "").trim(),
        description: String(formData.description || "").trim(),
        alertType: "maintenance_request"
      });
      showSuccess("Maintenance request created");
      setFormOpen(false);
      setFormData({ title: '', description: '', priority: 'medium' });
      await loadData();
    } catch (err) {
      showError(err?.message || "Failed to create request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (item, status) => {
    if (!item?.id || updatingId) return;
    setUpdatingId(item.id);
    try {
      await updateEstateAlert(item.id, {
        title: item.title,
        description: item.description || "",
        maintenanceStatus: status
      });
      showSuccess(`Marked as ${status}`);
      await loadData();
    } catch (err) {
      showError(err?.message || "Update failed");
    } finally {
      setUpdatingId("");
    }
  };

  // --- Dynamic Calculations ---
  const pendingRequests = requests.filter(r => r.maintenanceStatus !== "solved");
  const resolvedRequests = requests.filter(r => r.maintenanceStatus === "solved");
  const pendingCount = pendingRequests.length;
  const resolvedCount = resolvedRequests.length;
  const totalCount = requests.length;
  const healthScore = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;
  const strokeDashoffset = 125.6 - (125.6 * healthScore) / 100;

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans flex flex-col selection:bg-indigo-100 pb-32">

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-16 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-lg">Maintenance Hub</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <Bell size={22} strokeWidth={2.5} />
          {pendingCount > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />}
        </button>
      </header>

      <main className="flex-1 px-5 pt-24 max-w-7xl mx-auto w-full">
        {/* Operations Header */}
        <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-[#4955b3] font-bold tracking-[0.15em] uppercase text-[10px] mb-1 block">Central Command</span>
            <h2 className="text-4xl font-black tracking-tight text-[#2b3437]">Operations</h2>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-5 flex items-center gap-4 shadow-sm">
            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle className="text-slate-100" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="4"></circle>
                <circle className="text-[#006b61] transition-all duration-1000" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeDasharray="125.6" strokeDashoffset={strokeDashoffset} strokeWidth="4" strokeLinecap="round"></circle>
              </svg>
              <div className="absolute text-[#006b61]"><CheckCircle2 size={18} /></div>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Health Score</p>
                <p className="text-xl font-black text-[#006b61]">{healthScore}%</p>
            </div>
          </div>
        </section>

        {/* Bento Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-[#dfe0ff] rounded-[2rem] p-6 flex flex-col justify-between h-40 border border-indigo-100">
            <div className="p-2 bg-white/50 w-fit rounded-xl text-[#4955b3]"><Settings size={20} /></div>
            <div>
              <h3 className="text-3xl font-black text-[#3b48a6]">{pendingCount}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#4652b0]">Open</p>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 flex flex-col justify-between h-40 border border-slate-100 shadow-sm">
            <div className="p-2 bg-slate-50 w-fit rounded-xl text-slate-400"><HardHat size={20} /></div>
            <div>
              <h3 className="text-3xl font-black text-[#2b3437]">{audits.length}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audits</p>
            </div>
          </div>
          <div className="bg-[#85f6e5]/30 rounded-[2rem] p-6 flex flex-col justify-between h-40 border border-[#85f6e5]/50">
            <div className="p-2 bg-white/50 w-fit rounded-xl text-[#006b61]"><Verified size={20} /></div>
            <div>
              <h3 className="text-3xl font-black text-[#005c53]">{resolvedCount}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#00675d]">Resolved</p>
            </div>
          </div>
          <div className="bg-rose-50 rounded-[2rem] p-6 flex flex-col justify-between h-40 border border-rose-100">
            <div className="p-2 bg-white/50 w-fit rounded-xl text-rose-500"><TriangleAlert size={20} /></div>
            <div>
              <h3 className="text-3xl font-black text-rose-600">{pendingRequests.filter(r => r.priority === 'high').length}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Critical</p>
            </div>
          </div>
        </section>

        {/* Feed */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black">Request Feed</h3>
            <button onClick={() => setControlsOpen(true)} className="p-2.5 rounded-full bg-white border border-slate-100 text-[#4955b3] shadow-sm"><Filter size={18} /></button>
          </div>

          <div className="space-y-4">
            {loading ? (
                <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Syncing...</div>
            ) : requests.length === 0 ? (
                <div className="p-10 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest bg-white rounded-[2rem] border border-dashed">No Requests Found</div>
            ) : requests.map((item) => (
              <div key={item.id} className="group bg-white border border-slate-100 p-5 rounded-[2.5rem] shadow-sm">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#4955b3]"><Lightbulb size={20} /></div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h5 className="font-black text-[#2b3437] line-clamp-1">{item.title}</h5>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap ml-2">
                        {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'NOW'}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mt-5">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.maintenanceStatus === 'solved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {item.maintenanceStatus}
                      </div>
                      {item.maintenanceStatus !== 'solved' && (
                        <button
                            onClick={() => updateStatus(item, 'solved')}
                            disabled={!!updatingId}
                            className="bg-[#4955b3] text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {updatingId === item.id ? '...' : 'Close Ticket'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setFormOpen(true)}
        className="fixed right-6 bottom-2 w-16 h-16 bg-[#4955b3] text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {/* CREATE FORM SHEET */}
      <MobileBottomSheet open={formOpen} title="New Maintenance Request" onClose={() => setFormOpen(false)}>
        <form onSubmit={handleCreateRequest} className="space-y-6 p-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Issue Title</label>
            <input
              type="text"
              placeholder="e.g., Street Light Repair"
              className={estateFieldClassName}
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFormData({...formData, priority: p})}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${formData.priority === p ? 'bg-indigo-50 border-[#4955b3] text-[#4955b3]' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Description</label>
            <textarea
              rows="3"
              placeholder="Describe the issue in detail..."
              className={`${estateFieldClassName} resize-none`}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#4955b3] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Posting...' : 'Post Request'}
          </button>
        </form>
      </MobileBottomSheet>

      {/* CONTEXT SWITCHER SHEET */}
      <MobileBottomSheet open={controlsOpen} title="Operations Management" onClose={() => setControlsOpen(false)}>
        <div className="grid gap-6 p-2">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Estate Context</span>
            <select
              value={estateId}
              onChange={(e) => { setEstateId(e.target.value); setControlsOpen(false); }}
              className={estateFieldClassName}
            >
              {(overview?.estates ?? []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <button onClick={() => setControlsOpen(false)} className="w-full bg-slate-100 text-[#2b3437] py-4 rounded-2xl font-black uppercase tracking-widest">Close</button>
        </div>
      </MobileBottomSheet>

      {/* --- BOTTOM NAV BAR --- */}

    </div>
  );
};

export default EstateMaintenancePage;