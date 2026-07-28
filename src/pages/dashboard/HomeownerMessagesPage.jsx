import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Plus, User, ArrowLeft, Send, Search,
  MessageSquare, LayoutGrid, Trash2, X,
  ShieldAlert, SendHorizontal, MessageCircle, AlertTriangle,
  MailWarning, CheckCheck, Sparkles, Megaphone, HelpCircle,
  CheckCircle2, XCircle
} from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import { useAuth } from "../../state/AuthContext";
import { useNotifications } from "../../state/NotificationsContext";
import {
  decideVisit,
  getHomeownerContext,
  getHomeownerMessages,
  getHomeownerSessionMessages,
  sendHomeownerSessionMessage,
} from "../../services/homeownerService";
import { resolveSnapshotUrl } from "../../services/mediaUrl";

export default function HomeownerMessagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const messageEndRef = useRef(null);
  const preferredSessionId = String(searchParams.get("sessionId") || "").trim();
  
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messagesByThread, setMessagesByThread] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sendPending, setSendPending] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState("");
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  const [homeownerContext, setHomeownerContext] = useState({ managedByEstate: false, estateName: "" });
  const [threads, setThreads] = useState([]);

  async function loadThreads({ keepSelection = false } = {}) {
    setIsLoading(true);
    setError("");
    try {
      const rows = await getHomeownerMessages();
      setThreads(rows);
      const selected = preferredSessionId && rows.some((row) => row.id === preferredSessionId)
        ? preferredSessionId
        : rows[0]?.id || null;
      if (!keepSelection || !activeThreadId) setActiveThreadId(selected);
    } catch (requestError) {
      setError(requestError?.message || "Unable to load messages.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preferredSessionId || !threads.length) return;
    if (!threads.some((row) => row.id === preferredSessionId)) return;
    setActiveThreadId(preferredSessionId);
    setSearchParams((curr) => {
      const next = new URLSearchParams(curr);
      next.delete("sessionId");
      return next;
    }, { replace: true });
  }, [preferredSessionId, setSearchParams, threads]);

  useEffect(() => {
    if (!activeThreadId) return;
    let active = true;
    async function loadConversation() {
      setConversationLoading(true);
      setError("");
      try {
        const rows = await getHomeownerSessionMessages(activeThreadId);
        if (!active) return;
        setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: rows }));
      } catch (requestError) {
        if (active) setError(requestError?.message || "Unable to load conversation.");
      } finally {
        if (active) setConversationLoading(false);
      }
    }
    loadConversation();
    return () => {
      active = false;
    };
  }, [activeThreadId]);

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    return threads.filter(t => 
      [t.name, t.visitorName, t.last, t.door, t.homeName, t.unitName].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [threads, searchQuery]);

  // Get current selected thread details
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId) || null;
  }, [threads, activeThreadId]);
  const activeMessages = useMemo(() => messagesByThread[activeThreadId] || [], [activeThreadId, messagesByThread]);
  const canDecideActiveThread = useMemo(() => {
    const status = String(activeThread?.sessionStatus || "").toLowerCase();
    return Boolean(activeThreadId) && !["approved", "rejected", "closed", "completed"].includes(status);
  }, [activeThread?.sessionStatus, activeThreadId]);

  // Handle setting default selected thread
  useEffect(() => {
    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  // Scroll active conversation down to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  useEffect(() => {
    let active = true;
    async function loadHomeownerContext() {
      if (user?.role !== "homeowner") {
        if (active) setHomeownerContext({ managedByEstate: false, estateName: "" });
        return;
      }
      try {
        const data = await getHomeownerContext();
        if (active) setHomeownerContext(data ?? { managedByEstate: false, estateName: "" });
      } catch {
        if (active) setHomeownerContext({ managedByEstate: false, estateName: "" });
      }
    }
    loadHomeownerContext();
    return () => {
      active = false;
    };
  }, [user?.role]);

  const canCreateTicket = Boolean(homeownerContext?.managedByEstate);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeThreadId) return;
    const text = typedMessage.trim();
    setSendPending(true);
    setError("");
    try {
      const saved = await sendHomeownerSessionMessage(activeThreadId, text);
      const message = saved || {
        id: `local-${Date.now()}`,
        sessionId: activeThreadId,
        text,
        senderType: "homeowner",
        at: new Date().toISOString(),
      };
      setMessagesByThread((prev) => ({ ...prev, [activeThreadId]: [...(prev[activeThreadId] || []), message] }));
      setTypedMessage("");
      loadThreads({ keepSelection: true });
    } catch (requestError) {
      setError(requestError?.message || "Unable to send message.");
    } finally {
      setSendPending(false);
    }
  };

  const handleDecision = async (action) => {
    if (!activeThreadId || decisionBusy) return;
    setDecisionBusy(action);
    setError("");
    try {
      const result = await decideVisit(activeThreadId, action, {
        communicationChannel: "chat",
        communicationTarget: "gateman",
      });
      const nextStatus = result?.status || (action === "approve" ? "approved" : "rejected");
      setThreads((prev) => prev.map((thread) => (
        thread.id === activeThreadId ? { ...thread, sessionStatus: nextStatus } : thread
      )));
      loadThreads({ keepSelection: true });
    } catch (requestError) {
      setError(requestError?.message || `Unable to ${action === "approve" ? "approve" : "reject"} this pass.`);
    } finally {
      setDecisionBusy("");
    }
  };

  const handleCreateThread = (e) => {
    e.preventDefault();
    if (!canCreateTicket) return;
    const formData = new FormData(e.target);
    const payload = {
      type: String(formData.get("type")), // 'management' | 'security' | 'broadcast'
      subject: String(formData.get("subject")).trim(),
      message: String(formData.get("message")).trim(),
      urgency: String(formData.get("urgency") || "normal")
    };
    setError("New estate support tickets are not connected yet. Use an active visitor conversation for now.");
  };

  return (
    <div className="bg-[#f8f9fa] min-h-screen font-sans text-slate-900 antialiased selection:bg-indigo-500/10 selection:text-indigo-600">
      
      {/* STATIC HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-all active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">Messages</h1>
              
            </div>
          </div>

          <Link 
            to="/dashboard/notifications" 
            className="relative p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl transition-all active:scale-95"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Conversation Switcher Thread List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center">
              <h2 className="font-extrabold text-slate-900 tracking-tight text-sm">Inbox Threads</h2>
              {canCreateTicket ? (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  <span>New Ticket</span>
                </button>
              ) : null}
            </div>

            {/* Live Thread Search Input Container */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 transition-all outline-none placeholder:text-slate-400"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Scrollable List Body Container */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-0.5">
              {isLoading ? (
                [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />)
              ) : filteredThreads.length > 0 ? (
                filteredThreads.map((thread) => {
                  const isActive = activeThreadId === thread.id;
                  const urgencyColors = thread.urgency === "high" ? "bg-rose-500" : "bg-emerald-500";
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setActiveThreadId(thread.id)}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all relative ${
                        isActive 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                          : "bg-white border-slate-200/70 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${urgencyColors}`} />
                          <p className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                            {thread.visitorName || thread.name || "Visitor"}
                          </p>
                        </div>
                        <p className={`text-[11px] font-medium truncate mt-1 ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                          {thread.last || "No messages inside thread."}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold whitespace-nowrap uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isActive ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500"
                      }`}>
                        {thread.door || "Visit"}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No active threads found.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realtime Selected Interactive Chat Pane */}
        <div className="lg:col-span-7">
          {activeThread ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col h-[70vh] overflow-hidden">
              
              {/* Active Conversation Banner Area */}
              <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                    {(activeThread.visitorName || activeThread.name || "M").charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900">{activeThread.visitorName || activeThread.name || "Visitor"}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                      {activeThread.unitName || activeThread.homeName || "Property Unit"} · {activeThread.door || activeThread.doorName || "Gate"}
                    </p>
                  </div>
                </div>
                {activeThread.unread > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase">
                    <ShieldAlert size={12} />
                    <span>{activeThread.unread} New</span>
                  </div>
                )}
              </div>

              {error ? (
                <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-[11px] font-bold text-rose-700">
                  {error}
                </div>
              ) : null}

              {canDecideActiveThread ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Review this access request
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecision("approve")}
                      disabled={Boolean(decisionBusy)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Approve Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision("reject")}
                      disabled={Boolean(decisionBusy)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-[11px] font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject Pass
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Scrollable Real-time Bubbles Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 no-scrollbar">
                {conversationLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
                  </div>
                ) : Array.isArray(activeMessages) && activeMessages.length > 0 ? (
                  activeMessages.map((msg, index) => {
                    const senderType = String(msg.senderType || msg.senderRole || "").toLowerCase();
                    const snapshotUrl = resolveSnapshotUrl(msg.snapshotUrl || msg.photoUrl || msg.imageUrl || msg.fileUrl || msg.url);
                    const isSnapshotMessage = msg.messageType === "visitor_snapshot" || Boolean(snapshotUrl);
                    const isMe = senderType === "homeowner" || msg.senderId === user?.id || msg.isHomeownerSender;
                    if (isSnapshotMessage) {
                      return (
                        <div key={msg.id || index} className="flex justify-start">
                          <div className="w-full max-w-[28rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {snapshotUrl ? (
                              <SecureSnapshotImage
                                src={snapshotUrl}
                                alt={msg.visitorName || "Visitor snapshot"}
                                className="aspect-video w-full bg-slate-100 object-cover"
                                fallback={
                                  <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-400">
                                    Snapshot unavailable
                                  </div>
                                }
                              />
                            ) : (
                              <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-xs font-bold text-slate-400">
                                Snapshot unavailable
                              </div>
                            )}
                            <div className="space-y-3 p-3.5">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Gate Visitor Intake</p>
                                <p className="mt-1 text-sm font-black text-slate-950">{msg.visitorName || activeThread.visitorName || activeThread.name || "Visitor"}</p>
                                <p className="text-[10px] font-semibold text-slate-400">{formatClockTime(msg.at || msg.timestamp)}</p>
                              </div>
                              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                                <IntakeDetail label="Phone" value={msg.phoneNumber || msg.visitorPhone || activeThread.visitorPhone} />
                                <IntakeDetail label="Purpose" value={msg.purpose || activeThread.purpose} />
                                <IntakeDetail label="Property Unit" value={activeThread.unitName || activeThread.homeName} />
                                <IntakeDetail label="Door" value={msg.doorName || activeThread.doorName || activeThread.door} />
                                <IntakeDetail label="Security Officer" value={msg.securityOfficerName || msg.handledBySecurityName} />
                                <IntakeDetail label="Officer ID" value={msg.securityOfficerId || msg.handledBySecurityId} />
                              </div>
                              {msg.text ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{msg.text}</p> : null}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id || index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs font-semibold leading-relaxed shadow-sm tracking-tight ${
                          isMe 
                            ? "bg-indigo-600 text-white rounded-tr-none" 
                            : "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none"
                        }`}>
                          <p>{msg.text || msg.content}</p>
                          <div className={`text-[9px] font-medium mt-1 text-right flex items-center justify-end gap-1 ${
                            isMe ? "text-indigo-200" : "text-slate-400"
                          }`}>
                            <span>{formatClockTime(msg.at || msg.timestamp)}</span>
                            {isMe && <CheckCheck size={11} />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                    <MessageCircle size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold tracking-wide uppercase text-slate-400">Direct thread stream opened</p>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Message Typing Submission Form Panel */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white shrink-0 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message reply..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 transition-all outline-none"
                />
                <button
                  type="submit"
                  disabled={sendPending || !typedMessage.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <SendHorizontal size={16} />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-center px-6 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3 text-slate-300">
                <MessageSquare size={22} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select a conversation thread to review streams</p>
            </div>
          )}
        </div>
      </main>

      {/* NEW DISPATCH CONVERSATION MODAL INTERFACE */}
      <AnimatePresence>
        {isModalOpen && canCreateTicket && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-3xl flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] shadow-2xl overflow-hidden"
            >
              {/* Modal Banner Header */}
              <div className="px-6 pt-6 pb-4 bg-white border-b border-slate-100 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 tracking-tight">Open Support Desk Ticket</h3>
                    <p className="text-slate-400 text-xs font-medium mt-0.5">Contact gate control personnel or compound management instantly.</p>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Interactive Submission Form Body */}
              <form onSubmit={handleCreateThread} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 no-scrollbar bg-slate-50/50">
                  
                  {/* Recipient Channel Selector Layout */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Target Department Channel</label>
                    <div className="relative">
                      <select
                        name="type"
                        required
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none"
                        defaultValue="management"
                      >
                        <option value="management">Estate Management Office</option>
                        <option value="security">Main Security Gate Patrol</option>
                        <option value="broadcast">Community Broadcast Alert</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Megaphone size={16}/></div>
                    </div>
                  </div>

                  {/* Priority Selector Layout */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Ticket Urgency Flag</label>
                    <div className="relative">
                      <select
                        name="urgency"
                        required
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none"
                        defaultValue="normal"
                      >
                        <option value="normal">Normal Inquiry / Notice</option>
                        <option value="high">Critical Escalation / Operational Fault</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><HelpCircle size={16}/></div>
                    </div>
                  </div>

                  <InputField label="Subject Topic Head" name="subject" placeholder="e.g., Damaged boundary lighting line" icon={<Sparkles size={16}/>} required />

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Detailed Message Statement</label>
                    <div className="relative">
                      <textarea 
                        name="message" 
                        required
                        placeholder="Provide deep descriptions detailing observations..." 
                        rows="4" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none resize-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* Fixed Action Footer Bar */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <button
                    type="submit"
                    disabled
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
                  >
                    <Send size={16} />
                    <span>Send Ticket</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatClockTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function IntakeDetail({ label, value }) {
  const displayValue = String(value || "").trim();
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-xs font-bold text-slate-800">{displayValue || "Not provided"}</p>
    </div>
  );
}

// Reusable Custom Input Field Wrapper
function InputField({ label, icon, ...props }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
      <div className="relative group">
        <input
          {...props}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 transition-all outline-none placeholder:text-slate-300"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}
