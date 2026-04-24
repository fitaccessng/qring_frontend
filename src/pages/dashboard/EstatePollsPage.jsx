import React, { useEffect, useMemo, useState } from 'react';
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  PlusCircle,
  Trash2,
  BarChart2,
  Users,
  Lock,
  Eye,
  CheckCircle2,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Services & Hooks
import { createEstateAlert, deleteEstateAlert, listEstateAlerts, updateEstateAlert } from "../../services/estateService";
import { showError, showSuccess } from "../../utils/flash";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import useEstateOverviewState from "../../hooks/useEstateOverviewState";
import useResponsiveSheet from "../../hooks/useResponsiveSheet";

const EstatePollsPage = () => {
  const navigate = useNavigate();
  const { estateId, loading, error, setError } = useEstateOverviewState();

  const [polls, setPolls] = useState([]);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null); // For viewing detailed results
  const [pollToClose, setPollToClose] = useState(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const loadPolls = async () => {
    if (!estateId) return;
    try {
      const rows = await listEstateAlerts(estateId, "poll");
      setPolls(rows);
    } catch (err) {
      setError(err?.message || "Failed to load polls");
    }
  };

  useEffect(() => { loadPolls(); }, [estateId]);

  useSocketEvents(useMemo(() => ({
    ALERT_CREATED: loadPolls,
    ALERT_UPDATED: loadPolls,
    ALERT_DELETED: loadPolls
  }), [estateId]));

  const categorized = useMemo(() => {
    const now = Date.now();
    const active = polls.filter(p => !p.dueDate || new Date(p.dueDate).getTime() >= now);
    const closed = polls.filter(p => p.dueDate && new Date(p.dueDate).getTime() < now);
    const visible = activeTab === "active" ? active : closed;
    return { active, closed, visible };
  }, [polls, activeTab]);

  // -- Handlers --

  async function handleClosePoll(poll) {
    const pollId = poll?.id;
    if (!pollId) return;
    setBusy(true);
    try {
      // Setting due date to 1 minute ago to force immediate closure
      const pastDate = new Date(Date.now() - 60000).toISOString();
      const cleanOptions = Array.isArray(poll?.pollOptions)
        ? poll.pollOptions.map((option) => String(option || "").trim()).filter(Boolean)
        : [];
      await updateEstateAlert(pollId, {
        title: String(poll?.title || "").trim(),
        description: String(poll?.description || "").trim(),
        dueDate: pastDate,
        pollOptions: cleanOptions,
        targetHomeownerIds: Array.isArray(poll?.targetHomeownerIds) ? poll.targetHomeownerIds : []
      });
      setPolls((prev) =>
        prev.map((row) => (row.id === pollId ? { ...row, dueDate: pastDate } : row))
      );
      setPollToClose(null);
      setActiveTab("closed");
      showSuccess("Poll closed successfully.");
      await loadPolls();
    } catch (err) {
      showError(err?.message || "Failed to close poll");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this poll permanently?")) return;
    try {
      await deleteEstateAlert(id);
      showSuccess("Poll deleted");
      loadPolls();
    } catch (err) { showError(err?.message); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) { showError("Provide at least two options."); return; }
    setBusy(true);
    try {
      await createEstateAlert({ estateId, title: question.trim(), alertType: "poll", pollOptions: cleanOptions });
      showSuccess("Poll published.");
      setQuestion(""); setOptions(["", ""]); setComposeOpen(false);
      loadPolls();
    } catch (err) { showError(err?.message); } finally { setBusy(false); }
  }

  return (
    <div className="bg-[#f8f9fa] font-sans text-[#2b3437] min-h-screen flex flex-col">
      <header className="sticky top-0 w-full z-50 bg-[#f8f9fa]/90 backdrop-blur-xl flex justify-between items-center px-4 h-14">
        <button onClick={() => navigate(-1)} className="p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-[#2b3437] font-black tracking-tight text-base">Polls</h1>
        <button className="relative p-2 text-[#4955b3] active:bg-indigo-50 rounded-full">
          <Bell size={20} strokeWidth={2.5} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#f8f9fa]" />
        </button>
      </header>

      <main className="flex-1 px-5 pb-32">
        <div className="mt-6 mb-8">
          <span className="text-[#4955b3] font-bold tracking-widest text-[10px] uppercase mb-1 block">Governance Center</span>
          <h2 className="text-3xl font-black tracking-tight text-[#2b3437]">Community Voice</h2>
        </div>

        <div className="bg-slate-200/50 p-1 rounded-2xl flex mb-8">
          <button onClick={() => setActiveTab("active")} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "active" ? 'bg-white text-[#4955b3] shadow-sm' : 'text-slate-500'}`}>
            ACTIVE ({categorized.active.length})
          </button>
          <button onClick={() => setActiveTab("closed")} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === "closed" ? 'bg-white text-[#4955b3] shadow-sm' : 'text-slate-500'}`}>
            CLOSED ({categorized.closed.length})
          </button>
        </div>

        <div className="space-y-4">
          {categorized.visible.map((poll) => (
            <div key={poll.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${activeTab === 'active' ? 'bg-[#85f6e5]/40 text-[#005c53]' : 'bg-slate-100 text-slate-500'}`}>
                  {activeTab === 'active' ? 'Live' : 'Closed'}
                </span>
                <div className="flex gap-2">
                   <button onClick={() => setSelectedPoll(poll)} className="p-1 text-slate-400"><Eye size={18} /></button>
                </div>
              </div>

              <h3 className="text-lg font-black mb-4 leading-tight text-[#2b3437]">{poll.title}</h3>

              {/* Preview of Top Results */}
              <div className="space-y-3">
                {(poll.pollResults || []).slice(0, 2).map((row, rIdx) => (
                  <div key={rIdx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-slate-500 truncate pr-4">{row.option}</span>
                      <span className="text-[#4955b3]">{row.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f1f4f6] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4955b3] rounded-full" style={{ width: `${row.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Users size={12} />
                  {poll.pollResults?.reduce((a, b) => a + (b.count || 0), 0) || 0} Votes
                </div>

                <div className="flex gap-3">
                  {activeTab === 'active' && (
                    <button
                      onClick={() => setPollToClose(poll)}
                      disabled={busy}
                      className="flex items-center gap-1 text-[10px] font-black text-[#4955b3] uppercase border border-indigo-100 px-3 py-1.5 rounded-lg active:bg-indigo-50 disabled:opacity-50"
                    >
                      <Lock size={12} /> End Poll
                    </button>
                  )}
                  <button onClick={() => handleDelete(poll.id)} className="text-slate-300 active:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <button onClick={() => setComposeOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-[#4955b3] text-white rounded-2xl flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-all">
        <PlusCircle size={28} />
      </button>

      {/* View Results Detail Sheet */}
      <PollSheetFrame
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        eyebrow="Governance Center"
        title="Poll Results"
        panelClassName="md:max-w-xl"
      >
        {selectedPoll && (
          <div className="p-6 pt-1">
            <h3 className="text-xl font-black text-[#2b3437] mb-6 leading-tight">{selectedPoll.title}</h3>
            <div className="space-y-6">
              {selectedPoll.pollResults?.map((row, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">{row.option}</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-[#4955b3]">{row.percent}%</span>
                      <p className="text-[10px] text-slate-400 font-bold">{row.count} votes</p>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#4955b3] rounded-full transition-all duration-1000" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-indigo-50 rounded-2xl flex items-center gap-3">
               <CheckCircle2 className="text-[#4955b3]" />
               <p className="text-xs font-bold text-[#4955b3]">This poll is representative of {selectedPoll.pollResults?.reduce((a, b) => a + (b.count || 0), 0) || 0} residents.</p>
            </div>
          </div>
        )}
      </PollSheetFrame>

      <PollSheetFrame
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        eyebrow="Governance Center"
        title="New Community Poll"
        panelClassName="md:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 pt-1 space-y-6">
          <textarea value={question} onChange={e => setQuestion(e.target.value)} className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-800 placeholder:text-slate-400" placeholder="What's the question?" rows={3} required />
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <input key={idx} value={opt} onChange={e => setOptions(prev => prev.map((o, i) => i === idx ? e.target.value : o))} className="w-full bg-slate-100 border-none rounded-xl px-4 py-3 font-bold text-sm" placeholder={`Option ${idx + 1}`} required />
            ))}
            <button type="button" onClick={() => setOptions([...options, ""])} className="text-xs font-black text-[#4955b3] uppercase">+ Add Option</button>
          </div>
          <button type="submit" disabled={busy} className="w-full bg-[#4955b3] text-white py-4 rounded-2xl font-black uppercase shadow-lg disabled:opacity-50">
            {busy ? "Publishing..." : "Launch Poll"}
          </button>
        </form>
      </PollSheetFrame>

      <PollSheetFrame
        open={!!pollToClose}
        onClose={() => setPollToClose(null)}
        eyebrow="Governance Center"
        title="End Poll"
        panelClassName="md:max-w-lg"
      >
        {pollToClose ? (
          <div className="p-6 pt-1 space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black text-[#2b3437] leading-tight">End this poll?</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  Residents will no longer be able to vote, and this poll will move to the closed tab immediately.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poll Question</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{pollToClose.title}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPollToClose(null)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleClosePoll(pollToClose)}
                disabled={busy}
                className="flex-1 rounded-2xl bg-[#4955b3] py-4 text-sm font-black text-white shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {busy ? "Ending..." : "Yes, End Poll"}
              </button>
            </div>
          </div>
        ) : null}
      </PollSheetFrame>
    </div>
  );
};

export default EstatePollsPage;

function PollSheetFrame({ open, onClose, eyebrow, title, panelClassName = "", children }) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (!open) return null;

  if (!sheet.isMobile) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} aria-label={`Close ${title}`} />
        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`relative w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.2)] ${panelClassName}`}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">{eyebrow}</p>
              <h3 className="mt-2 text-2xl font-black text-[#2b3437]">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl bg-slate-50 p-3 text-slate-500 transition-all hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[75dvh] overflow-y-auto">{children}</div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-900/45" onClick={onClose} aria-label={`Close ${title}`} />
      <motion.section
        {...sheet.mobileSheetProps}
        className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-[0_-18px_40px_rgba(15,23,42,0.16)]"
      >
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>
        <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4955b3]">{eyebrow}</p>
            <h3 className="mt-2 text-xl font-black text-[#2b3437]">{title}</h3>
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
