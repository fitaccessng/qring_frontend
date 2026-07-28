import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, SendHorizontal, MessageSquare, Search, 
  RefreshCw, CheckCheck, ShieldCheck, Building2, User2 
} from "lucide-react";
import { useApiMutation, useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { api } from "../../../services/api";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";

const CONVERSATION_KEY = ["office", "conversations"];

export default function OfficeMessagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Track previous navigation footprint to solve history loop bugs
  const [initialHistoryLength] = useState(window.history.length);

  const preferredConversationId = String(searchParams.get("sessionId") || "").trim();
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useApiQuery({
    queryKey: CONVERSATION_KEY,
    url: endpoints.office.conversations,
    refetchInterval: 15000
  });

  useSocketQueryInvalidation(CONVERSATION_KEY, ["office.message.created", "office.visitor_request.assigned"]);

  const conversations = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    if (conversations.length > 0 && !preferredConversationId) {
      const defaultId = String(conversations[0].id || conversations[0].sessionId);
      // Use replace: true so default selection doesn't clutter history stack
      setSearchParams({ sessionId: defaultId }, { replace: true });
    }
  }, [conversations, preferredConversationId, setSearchParams]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((item) =>
        [item.id, item.sessionId, item.staffUserId, item.userId].some((value) => String(value || "") === preferredConversationId)
      ) || null,
    [conversations, preferredConversationId]
  );

  const selectedId = String(selectedConversation?.id || selectedConversation?.sessionId || preferredConversationId || "");

  const messagesQuery = useApiQuery({
    queryKey: ["office", "conversation-messages", selectedId],
    url: selectedId ? endpoints.office.conversationMessages(selectedId) : null,
    enabled: Boolean(selectedId),
    refetchInterval: selectedId ? 8000 : false
  });

  useSocketQueryInvalidation(["office", "conversation-messages", selectedId], ["office.message.created"]);

  const sendMessageMutation = useApiMutation({
    mutationFn: async (_api, { conversationId, text }) =>
      api.post(`/office/conversations/${encodeURIComponent(conversationId)}/messages`, { text }),
    onSuccess: () => {
      setDraft("");
      void messagesQuery.refetch?.();
      void refetch();
    }
  });

  const messages = messagesQuery.data?.items || [];

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      String(c.displayName || c.name || c.department || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Break out of search param history trap entirely
  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = String(draft || "").trim();
    if (!selectedId || !text) return;
    sendMessageMutation.mutate({ conversationId: selectedId, text });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <OfficeLoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-slate-900 antialiased font-sans pb-16 selection:bg-slate-100">
      
      {/* Top Application Header */}
      <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-40 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 text-slate-800 transition hover:bg-slate-200/80 active:scale-95 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900">Messages</h1>
            </div>
          </div>

          <button 
            onClick={() => refetch()} 
            className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-600 transition active:scale-95"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout (Bento Stacking) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {isError && (
          <OfficeErrorBanner message={error?.message || "Failed to update channel context."} onRetry={() => refetch()} />
        )}

        {/* Dynamic Horizontal Quick-Picker Grid */}
        {conversations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {conversations.map((thread) => {
              const id = String(thread.id || thread.sessionId);
              const isActive = id === selectedId;
              return (
                <button
                  key={id}
                  onClick={() => setSearchParams({ sessionId: id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isActive 
                      ? "border-slate-900 bg-slate-950 text-white shadow-sm" 
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                  }`}
                >
                  <p className="text-[11px] font-bold truncate">{thread.displayName || thread.name || "Staff"}</p>
                  <p className={`text-[9px] font-semibold tracking-wider uppercase mt-0.5 truncate ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                    {thread.department || "Office"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Master Bento Container Splitting Feed / Interaction */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Bento Block 1: Channels Navigation Subsystem */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search active channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/70 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-900 transition-all outline-none"
              />
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="space-y-1 max-h-[50vh] overflow-y-auto no-scrollbar">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((thread) => {
                  const id = String(thread.id || thread.sessionId);
                  const isActive = id === selectedId;
                  return (
                    <button
                      key={id}
                      onClick={() => setSearchParams({ sessionId: id })}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        isActive 
                          ? "bg-slate-50 font-medium text-slate-900" 
                          : "hover:bg-slate-50/50 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{thread.displayName || thread.name || "Staff Account"}</p>
                        <span className="text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0">
                          {thread.department || "Desk"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {thread.lastMessage || "No thread preview text."}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">No channels found</div>
              )}
            </div>
          </div>

          {/* Bento Block 2: Live Message Interactive Canvas */}
          <div className="lg:col-span-8 space-y-6">
            {selectedConversation ? (
              <div className="space-y-6">
                
                {/* Chat Feed Capsule */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm flex flex-col h-[52vh] overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-bold text-slate-900">
                        {selectedConversation.displayName || selectedConversation.name || "Staff Operator"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {selectedConversation.availability || "Online"}
                    </span>
                  </div>

                  {/* Bubble Stream Layout */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 no-scrollbar">
                    {messagesQuery.isLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((msg, index) => {
                        const isOutgoingMessage = msg.senderType === "office" || msg.isMe;
                        return (
                          <div key={index} className={`flex ${isOutgoingMessage ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs tracking-tight shadow-sm leading-relaxed ${
                              isOutgoingMessage 
                                ? "bg-slate-900 text-white rounded-tr-none font-medium" 
                                : "bg-white text-slate-800 border border-slate-200/70 rounded-tl-none font-medium"
                            }`}>
                              <p>{msg.text || msg.content}</p>
                              <div className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                                isOutgoingMessage ? "text-slate-400" : "text-slate-400"
                              }`}>
                                <span>{msg.timestamp || "Just Now"}</span>
                                {isOutgoingMessage && <CheckCheck size={11} className="text-slate-400" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={18} className="text-slate-300 mb-1" />
                        <p className="text-[11px] font-bold tracking-wide uppercase">Channel Clear</p>
                      </div>
                    )}
                    <div ref={messageEndRef} />
                  </div>

                  {/* Submission Form */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white shrink-0 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type message dispatch to operator..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 transition-all outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendMessageMutation.isPending || !draft.trim()}
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all disabled:opacity-40 shrink-0"
                    >
                      <SendHorizontal size={14} />
                    </button>
                  </form>
                </div>

                {/* Grid-based Infrastructure Context Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ContextBlock 
                    title="Assigned Operator" 
                    value={selectedConversation.displayName || selectedConversation.name || "Unknown"} 
                    icon={<User2 size={13} className="text-slate-500" />} 
                  />
                  <ContextBlock 
                    title="Department Sector" 
                    value={selectedConversation.department || "General Office"} 
                    icon={<Building2 size={13} className="text-slate-500" />} 
                  />
                  <ContextBlock 
                    title="Status Validation" 
                    value={selectedConversation.availability || "Clear Track"} 
                    icon={<ShieldCheck size={13} className="text-slate-500" />} 
                  />
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 text-center px-4 shadow-sm">
                <Inbox size={20} className="text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No Channel Open</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

function ContextBlock({ title, value, icon }) {
  return (
    <div className="bg-white border border-slate-200/70 p-4 rounded-xl flex gap-3 items-center shadow-sm">
      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}