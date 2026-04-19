import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  Plus, 
  Megaphone, 
  TrendingUp, 
  Calendar, 
  Wallet, 
  Wrench, 
  DoorOpen, 
  ShieldAlert, 
  BarChart3,
  ChevronRight,
  Clock,
  Info,
  X
} from 'lucide-react';

// Services & Hooks
import { 
  listMyEstateAlerts, 
  payEstateAlert, 
  respondEstateMeeting 
} from "../../services/estateService";
import { 
  getHomeownerContext, 
  getHomeownerDoors, 
  createMaintenanceRequest 
} from "../../services/homeownerService";
import { showError, showSuccess } from "../../utils/flash";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";
import { 
  estateFieldClassName, 
  estatePrimaryButtonClassName, 
  estateTextareaClassName 
} from "../../components/mobile/EstateManagerPageShell";

// --- DYNAMIC MODULE CONFIG ---
const moduleConfig = {
  "estate-broadcasts": {
    title: "Broadcasts",
    eyebrow: "Estate Channel",
    subtitle: "Official announcements from management.",
    icon: Megaphone,
    accent: "bg-[#dfe0ff] text-[#3b48a6]",
    kind: "alerts",
    filter: (item) => item?.alertType === "notice"
  },
  "estate-meetings": {
    title: "Meetings",
    eyebrow: "Town Hall",
    subtitle: "Upcoming resident assemblies.",
    icon: Calendar,
    accent: "bg-[#e0f2fe] text-[#0369a1]",
    kind: "alerts",
    filter: (item) => item?.alertType === "meeting"
  },
  "estate-dues": {
    title: "Payments",
    eyebrow: "Finance Desk",
    subtitle: "Track your levies and subscriptions.",
    icon: Wallet,
    accent: "bg-[#fef3c7] text-[#92400e]",
    kind: "alerts",
    filter: (item) => item?.alertType === "payment_request"
  },
  "estate-maintenance": {
    title: "Maintenance",
    eyebrow: "Unit Operations",
    subtitle: "Report and track repairs.",
    icon: Wrench,
    accent: "bg-[#ffedd5] text-[#9a3412]",
    kind: "maintenance",
    filter: (item) => item?.alertType === "maintenance_request"
  },
  "estate-doors": {
    title: "Access",
    eyebrow: "Security Gate",
    subtitle: "Your assigned entry points.",
    icon: DoorOpen,
    accent: "bg-slate-100 text-slate-800",
    kind: "doors"
  },
  "estate-alerts": {
    title: "All Alerts",
    eyebrow: "Notification Center",
    subtitle: "Everything happening in your estate.",
    icon: Bell,
    accent: "bg-rose-50 text-rose-700",
    kind: "alerts",
    filter: () => true
  }
};

const redirectBySlug = {
  "estate-panic": "/dashboard/homeowner/safety",
  "estate-approvals": "/dashboard/homeowner/messages?filter=approvals",
  "estate-messages": "/dashboard/homeowner/messages",
  "estate-video-calls": "/dashboard/homeowner/messages",
  "estate-audio-calls": "/dashboard/homeowner/messages"
};

const EstateManagedHomeownerModulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- SAFE SLUG RESOLUTION ---
  const slug = location.pathname.split("/").filter(Boolean).pop();
  const redirectTarget = redirectBySlug[slug] || "";
  const config = useMemo(() => moduleConfig[slug] || moduleConfig["estate-alerts"], [slug]);
  const Icon = config.icon || Bell;

  if (redirectTarget) {
    return <Navigate to={redirectTarget} replace />;
  }

  // --- STATE ---
  const [items, setItems] = useState([]);
  const [context, setContext] = useState({ estateName: "Estate", home: { name: "Unit" } });
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Maintenance Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextContext, nextData] = await Promise.all([
        getHomeownerContext().catch(() => ({ estateName: "Estate", home: { name: "Unit" } })),
        config.kind === "doors" 
          ? getHomeownerDoors().then(res => res.doors || [])
          : listMyEstateAlerts().then(res => (Array.isArray(res) ? res : []))
      ]);

      setContext(nextContext);
      
      if (config.kind === "doors") {
        setItems(nextData);
      } else {
        setItems(nextData.filter(config.filter || (() => true)));
      }
    } catch (err) {
      showError(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  // --- ACTIONS ---
  async function handleMaintenanceSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createMaintenanceRequest({ title: title.trim(), description: message.trim() });
      showSuccess("Reported successfully");
      setComposeOpen(false);
      setTitle(""); setMessage("");
      loadData();
    } catch (err) { showError(err.message); } finally { setBusy(false); }
  }

  const handleMeetingResponse = async (id, res) => {
    try { 
      await respondEstateMeeting(id, res); 
      showSuccess("Response recorded");
      loadData();
    } catch (e) { showError(e.message); }
  };

  return (
    <div className="bg-[#f8f9fa] text-[#2b3437] min-h-screen font-sans flex flex-col">
      {/* Header - Matching Broadcasts Page */}
      <header className="sticky top-0 w-full z-50 bg-[#f8f9fa]/80 backdrop-blur-xl flex justify-between items-center px-4 h-14 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-base">{config.title}</h1>
        <button onClick={() => navigate("/dashboard/notifications")} className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full transition-all">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="flex-1 px-5 pt-6 pb-32 max-w-lg mx-auto w-full">
        {/* Title Section */}
        <div className="mb-8">
          <span className="text-[#4955b3] font-bold tracking-widest text-[10px] uppercase mb-1 block">
            {config.eyebrow}
          </span>
          <h2 className="text-3xl font-black tracking-tight text-[#2b3437]">{config.title}</h2>
          <p className="text-slate-500 text-sm font-medium mt-2 leading-relaxed">
            {config.subtitle}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Total Items</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#2b3437]">{items.length}</span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className={`${config.accent} p-5 rounded-[2rem] flex flex-col justify-between h-32`}>
            <span className="opacity-60 text-[10px] font-black uppercase tracking-wider">Property</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black leading-tight truncate">
                {context?.home?.name || "My Unit"}
              </span>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-4">
          <h3 className="font-black text-lg text-[#2b3437] mb-2">History</h3>
          
          {loading ? (
            <div className="py-20 text-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : items.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 ${config.accent} text-[9px] font-black rounded uppercase tracking-tighter`}>
                  {item?.alertType?.replace('_', ' ') || "ACTIVE"}
                </span>
                <span className="text-slate-400 text-[10px] font-bold">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Recently"}
                </span>
              </div>
              
              <h4 className="text-base font-black text-[#2b3437] leading-tight mb-2">{item.title || item.name}</h4>
              <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed font-medium">
                {item.description || "Operational status active for this item."}
              </p>
              
              {/* Interaction Layer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                {item.alertType === "payment_request" ? (
                   <button onClick={() => payEstateAlert(item.id)} className="flex items-center gap-2 text-[#4955b3] font-black text-[10px] uppercase tracking-widest">
                     Make Payment <ChevronRight size={14} />
                   </button>
                ) : item.alertType === "meeting" ? (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMeetingResponse(item.id, "attending")}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${item.myMeetingResponse === "attending" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      Attending
                    </button>
                    <button 
                      onClick={() => handleMeetingResponse(item.id, "not_attending")}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all ${item.myMeetingResponse === "not_attending" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"}`}
                    >
                      Not Attending
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> Verified by Estate
                  </span>
                )}
              </div>
            </div>
          ))}

          {!loading && items.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
               <Icon className="mx-auto text-slate-200 mb-2" size={32} />
               <p className="text-slate-400 font-bold text-sm">No {config.title.toLowerCase()} yet</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button - Only for Maintenance */}
      {config.kind === "maintenance" && (
        <button onClick={() => setComposeOpen(true)} className="fixed bottom-12 right-6 w-14 h-14 bg-[#4955b3] text-white rounded-2xl flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-all">
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* Maintenance Bottom Sheet */}
      <ResidentMaintenanceSheet open={composeOpen} onClose={() => setComposeOpen(false)}>
        <form onSubmit={handleMaintenanceSubmit} className="space-y-6 p-5 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Issue Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={estateFieldClassName} placeholder="e.g., Leaking kitchen pipe" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Context / Room</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className={estateTextareaClassName} placeholder="Tell management more..." />
          </div>
          <button type="submit" disabled={busy} className={`${estatePrimaryButtonClassName} w-full py-4 text-xs font-black uppercase tracking-widest`}>
            {busy ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </ResidentMaintenanceSheet>
    </div>
  );
};

export default EstateManagedHomeownerModulePage;

function ResidentMaintenanceSheet({ open, onClose, children }) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (!open) return null;

  if (!sheet.isMobile) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} aria-label="Close maintenance report" />
        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.2)]"
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">Unit Operations</p>
              <h3 className="mt-2 text-2xl font-black text-[#2b3437]">Report Maintenance</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-50 p-3 text-slate-500 transition-all hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[72dvh] overflow-y-auto">{children}</div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={onClose} aria-label="Close maintenance report" />
      <motion.section
        {...sheet.mobileSheetProps}
        className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.16)]"
      >
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">Unit Operations</p>
            <h3 className="mt-2 text-xl font-black text-[#2b3437]">Report Maintenance</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-slate-50 p-3 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div
          ref={sheet.contentRef}
          onScroll={sheet.onContentScroll}
          onPointerDown={sheet.onContentPointerDown}
          className="flex-1 overflow-y-auto"
        >
          {children}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </motion.section>
    </div>
  );
}
