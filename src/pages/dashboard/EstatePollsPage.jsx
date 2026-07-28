import React, { useEffect, useMemo, useState } from 'react';
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Bell,
  Plus,
  Trash2,
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
    <div className="bg-slate-50/50 min-h-screen font-sans pb-32 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col">
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
              <h1 className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight dark:text-white leading-none">Polls</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Estate Governance</p>
            </div>
          </div>
          <button className="relative p-2 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300 rounded-full">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-slate-950" />
          </button>
        </div>
      </header>

      <main className="mt-4 px-4 max-w-2xl mx-auto w-full space-y-4 flex-1">
        <div className="px-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest text-[9px] uppercase block">Community Decisions</span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Community Voice</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1 leading-relaxed">
            Organize resident opinions, deploy voting items, and synthesize survey outputs in real time.
          </p>
        </div>

        {/* COMPACT SEGMENT SWITCHER */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex">
          <button 
            onClick={() => setActiveTab("active")} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "active" 
                ? 'bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            ACTIVE ({categorized.active.length})
          </button>
          <button 
            onClick={() => setActiveTab("closed")} 
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "closed" 
                ? 'bg-white text-slate-950 dark:bg-slate-850 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            CLOSED ({categorized.closed.length})
          </button>
        </div>

        {/* POLLS CARDS STACK */}
        <div className="space-y-3.5">
          {loading && <div className="text-center py-10 text-[10px] font-bold uppercase tracking-wider text-slate-400">Syncing Polls...</div>}

          {!loading && categorized.visible.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 text-center shadow-sm">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">No active polls found</h3>
              <p className="mt-1 text-xs text-slate-500 leading-normal">
                {activeTab === "active" ? "Create a poll and it will show up here instantly." : "Past polls will be logged here once they conclude."}
              </p>
            </div>
          ) : null}

          {categorized.visible.map((poll) => (
            <div key={poll.id} className="bg-white dark:bg-slate-900 border border-slate-100/50 dark:border-slate-800/40 p-5 rounded-3xl shadow-sm transition-all flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  activeTab === 'active' 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {activeTab === 'active' ? 'Live' : 'Closed'}
                </span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => setSelectedPoll(poll)} 
                    className="p-2 bg-slate-50 dark:bg-slate-850 text-slate-450 dark:text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">{poll.title}</h3>
              </div>

              {/* Preview of Top Results */}
              <div className="space-y-3 pt-1">
                {(poll.pollResults || []).slice(0, 2).map((row, rIdx) => (
                  <div key={rIdx} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide">
                      <span className="text-slate-500 dark:text-slate-400 truncate pr-4">{row.option}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{row.percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all" style={{ width: `${row.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-3 border-t border-slate-100/30 dark:border-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <Users size={12} />
                  {poll.pollResults?.reduce((a, b) => a + (b.count || 0), 0) || 0} Votes
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === 'active' && (
                    <button
                      onClick={() => setPollToClose(poll)}
                      disabled={busy}
                      className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-900/50 px-2.5 py-1.5 rounded-lg active:bg-indigo-50 dark:active:bg-indigo-950/20 disabled:opacity-50 transition-all"
                    >
                      <Lock size={10} /> End Poll
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(poll.id)} 
                    className="p-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-rose-50 hover:text-rose-600 text-slate-400 dark:text-slate-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* FLOATING ACTION ACTION BUTTON */}
      <button 
        onClick={() => setComposeOpen(true)} 
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 z-40 active:scale-90 hover:bg-indigo-700 transition-all"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* VIEW RESULTS DRAWER */}
      <PollSheetFrame
        open={!!selectedPoll}
        onClose={() => setSelectedPoll(null)}
        eyebrow="Governance"
        title="Poll Statistics"
        panelClassName="md:max-w-xl"
      >
        {selectedPoll && (
          <div className="pt-1 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">{selectedPoll.title}</h3>
            <div className="space-y-4">
              {selectedPoll.pollResults?.map((row, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{row.option}</span>
                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{row.percent}%</span>
                      <p className="text-[9px] text-slate-400 font-bold">{row.count} votes</p>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl flex items-center gap-3">
               <CheckCircle2 className="text-indigo-600 dark:text-indigo-450 shrink-0" size={18} />
               <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-350 leading-normal">
                 This poll represents the consolidated feedback of {selectedPoll.pollResults?.reduce((a, b) => a + (b.count || 0), 0) || 0} estate residents.
               </p>
            </div>
          </div>
        )}
      </PollSheetFrame>

      {/* COMPOSE POLL DRAWER */}
      <PollSheetFrame
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        eyebrow="Governance"
        title="Deploy Survey Room"
        panelClassName="md:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Poll Question</span>
            <textarea 
              value={question} 
              onChange={e => setQuestion(e.target.value)} 
              className="w-full bg-slate-55 dark:bg-slate-850 border border-slate-100/30 dark:border-slate-800 rounded-2xl p-4 font-semibold text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
              placeholder="What topic would you like feedback on?" 
              rows={3} 
              required 
            />
          </div>

          <div className="space-y-2.5">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-0.5">Survey Options</span>
            {options.map((opt, idx) => (
              <input 
                key={idx} 
                value={opt} 
                onChange={e => setOptions(prev => prev.map((o, i) => i === idx ? e.target.value : o))} 
                className="w-full bg-slate-55 dark:bg-slate-850 border border-slate-100/30 dark:border-slate-800 rounded-xl px-4 py-3 font-semibold text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                placeholder={`Option ${idx + 1}`} 
                required 
              />
            ))}
            <button 
              type="button" 
              onClick={() => setOptions([...options, ""])} 
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block mt-1 hover:underline"
            >
              + Add Option
            </button>
          </div>
          <button 
            type="submit" 
            disabled={busy} 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {busy ? "Publishing..." : "Launch Poll Room"}
          </button>
        </form>
      </PollSheetFrame>

      {/* CLOSE POLL DRAWER */}
      <PollSheetFrame
        open={!!pollToClose}
        onClose={() => setPollToClose(null)}
        eyebrow="Operations"
        title="Lock Poll Channel"
        panelClassName="md:max-w-lg"
      >
        {pollToClose ? (
          <div className="space-y-5 pt-1">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Close this poll?</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                  Residents will no longer be able to cast votes, and this record will transition to the closed tab immediately.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-900 px-4 py-3 border border-slate-100/30 dark:border-slate-800/40">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Target Question</p>
                <p className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{pollToClose.title}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPollToClose(null)}
                className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-850 py-3 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleClosePoll(pollToClose)}
                disabled={busy}
                className="flex-1 rounded-xl bg-indigo-600 text-white py-3 text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {busy ? "Ending..." : "End Poll Room"}
              </button>
            </div>
          </div>
        ) : null}
      </PollSheetFrame>
    </div>
  );
};

export default EstatePollsPage;

function PollSheetFrame({ open, onClose, eyebrow, title, children }) {
  const sheet = useResponsiveSheet({ open, onClose });

  if (!open) return null;

  if (!sheet.isMobile) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center px-4">
        <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label={`Close ${title}`} />
        <motion.section
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full overflow-hidden rounded-[2rem] border border-slate-100/50 dark:border-slate-800/40 bg-white dark:bg-slate-900 shadow-2xl max-w-md"
        >
          <div className="flex items-start justify-between border-b border-slate-100/50 dark:border-slate-800/40 px-5 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400 transition-all hover:bg-slate-100 dark:hover:bg-slate-750">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto px-5 py-5 overscroll-contain">{children}</div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end" style={{ height: sheet.viewportHeight || undefined }}>
      <button type="button" className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-label={`Close ${title}`} />
      <motion.section
        {...sheet.mobileSheetProps}
        className="relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-white dark:bg-slate-900 shadow-2xl max-h-[85dvh]"
      >
        <div onPointerDown={sheet.startDrag} className="flex justify-center py-3 shrink-0">
          <div className="h-1 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div onPointerDown={sheet.startDrag} className="flex items-start justify-between px-5 pb-4 border-b border-slate-100/50 dark:border-slate-800/40 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div
          ref={sheet.contentRef}
          onScroll={sheet.onContentScroll}
          onPointerDown={sheet.onContentPointerDown}
          className="flex-1 overflow-y-auto px-5 py-5 overscroll-contain"
        >
          {children}
        </div>
        <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900 shrink-0" />
      </motion.section>
    </div>
  );
}