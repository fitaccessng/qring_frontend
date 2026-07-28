import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, Check, ChevronDown, MessageSquare, RefreshCw, 
  Search, SlidersHorizontal, Users, Clock, CheckCircle, X, 
  Building2, User2, MapPin, Hash, ShieldAlert
} from "lucide-react";
import { useApiMutation, useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import { api } from "../../../services/api";
import OfficeQueueRow from "../../../components/office/OfficeQueueRow";
import OfficeApprovalActions from "../../../components/office/OfficeApprovalActions";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";

const QUERY_KEY = ["office", "queue"];

export default function OfficeQueuePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "active" | "history"
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [employee, setEmployee] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [assignPicker, setAssignPicker] = useState({
    open: false,
    requestId: "",
    selectedUserId: "",
    selectedName: "",
    selectedDepartment: ""
  });
  const [assignSearch, setAssignSearch] = useState("");

  const apiStatus = useMemo(() => {
    if (activeTab === "pending") return "pending";
    if (activeTab === "active") return "assigned_to_staff";
    if (activeTab === "history") return "rejected"; 
    return undefined;
  }, [activeTab]);

  const queryConfig = useMemo(() => ({
    params: {
      search: search || undefined,
      status: apiStatus || undefined,
      department: department || undefined,
      employee: employee || undefined,
    }
  }), [search, apiStatus, department, employee]);

  const { data, isLoading, isError, error, refetch, isFetching } = useApiQuery({
    queryKey: [...QUERY_KEY, search, apiStatus, department, employee],
    url: endpoints.office.queue,
    config: queryConfig,
    refetchInterval: 15000
  });

  const { data: employeesData } = useApiQuery({
    queryKey: ["office", "employees"],
    url: endpoints.office.employees,
    refetchInterval: 30000
  });

  useSocketQueryInvalidation(QUERY_KEY, [
    "office.visitor_request.created",
    "office.visitor_request.updated",
    "office.visitor_request.assigned",
    "office.visitor_request.approved",
    "office.visitor_request.rejected"
  ]);

  const approveMutation = useApiMutation({
    mutationFn: async (_api, { id }) => api.post(`/office/visitor-requests/${id}/approve`),
    onSuccess: () => refetch()
  });
  const rejectMutation = useApiMutation({
    mutationFn: async (_api, { id }) => api.post(`/office/visitor-requests/${id}/reject`),
    onSuccess: () => refetch()
  });
  const assignMutation = useApiMutation({
    mutationFn: async (_api, { id, assigneeUserId, assigneeName, assigneeDepartment }) =>
      api.post(`/office/visitor-requests/${id}/assign`, {
        assigneeUserId,
        assigneeName,
        assigneeDepartment
      }),
    onSuccess: () => refetch()
  });

  const rows = data?.items || [];
  const officeEmployees = Array.isArray(employeesData?.items) ? employeesData.items : [];
  const filteredOfficeEmployees = useMemo(() => {
    const term = String(assignSearch || "").trim().toLowerCase();
    if (!term) return officeEmployees;
    return officeEmployees.filter((member) => {
      const fields = [
        member.name,
        member.department,
        member.role,
        member.floor,
        member.extension,
        member.availability
      ].map((value) => String(value || "").toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [assignSearch, officeEmployees]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter(r => r.status === "pending" || !r.status).length,
      approved: rows.filter(r => r.status === "approved").length
    };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <OfficeLoadingState />
      </div>
    );
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  }

  function openAssignPicker(item) {
    const nextSelected = officeEmployees.find((member) =>
      String(member.userId || member.id || "").trim() && (
        String(member.name || "").trim().toLowerCase() === String(item.requestedStaffName || item.employeeToVisit || "").trim().toLowerCase()
      )
    ) || officeEmployees[0] || null;
    setAssignPicker({
      open: true,
      requestId: item.id,
      selectedUserId: String(nextSelected?.userId || nextSelected?.id || "").trim(),
      selectedName: String(nextSelected?.name || "").trim(),
      selectedDepartment: String(nextSelected?.department || "").trim()
    });
    setAssignSearch("");
  }

  function confirmAssign() {
    if (!assignPicker.requestId || !assignPicker.selectedUserId) return;
    const selected = officeEmployees.find((member) => String(member.userId || member.id || "") === assignPicker.selectedUserId);
    assignMutation.mutate({
      id: assignPicker.requestId,
      assigneeUserId: assignPicker.selectedUserId,
      assigneeName: String(selected?.name || assignPicker.selectedName || "").trim(),
      assigneeDepartment: String(selected?.department || assignPicker.selectedDepartment || "").trim() || undefined
    });
    setAssignPicker({
      open: false,
      requestId: "",
      selectedUserId: "",
      selectedName: "",
      selectedDepartment: ""
    });
    setAssignSearch("");
  }

  return (
    <div className="bg-[#fafafa] min-h-screen font-sans text-slate-900 antialiased pb-28">
      
      {/* HEADER SECTION */}
      <header className="w-full bg-white/70 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base text-slate-950 tracking-tight">Reception Queue</h1>
              <p className="text-[11px] text-slate-400 font-medium">Live Concierge Environment</p>
            </div>
          </div>

          <button 
            onClick={() => refetch()} 
            className="p-2 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* CORE KPI SUMMARY GRID */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <Users size={12} className="text-slate-500" /> Active
            </span>
            <span className="text-xl font-bold text-slate-950 block mt-1 text-center">{stats.total}</span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <Clock size={12} className="text-amber-500" /> Attention
            </span>
            <span className="text-xl font-bold text-slate-950 block mt-1 text-center">{stats.pending}</span>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              <CheckCircle size={12} className="text-emerald-500" /> Cleared
            </span>
            <span className="text-xl font-bold text-slate-950 block mt-1 text-center">{stats.approved}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER SEGMENT */}
      <div className="bg-white border-b border-t border-slate-100 mt-6 py-4 px-4 sm:px-6 sticky top-16 z-30">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Segmented Native Toggle */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {["pending", "active", "history"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg py-2 text-xs font-semibold tracking-tight transition-all active:scale-[0.99] capitalize ${
                  activeTab === tab
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "active" ? "Routed" : tab}
              </button>
            ))}
          </div>

          {/* Search Input Control */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder={`Search ${activeTab}...`} 
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white transition-all outline-none placeholder:text-slate-400" 
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2.5 rounded-xl border transition-all ${
                showAdvanced 
                  ? "bg-slate-100 border-slate-300 text-slate-900" 
                  : "bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Collapsible advanced meta fields */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Target Department</label>
                  <input 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                    placeholder="e.g. Engineering" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Requested Host</label>
                  <input 
                    value={employee} 
                    onChange={(e) => setEmployee(e.target.value)} 
                    placeholder="Staff name" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DYNAMIC LIST STAGE */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {isError && <OfficeErrorBanner message={error?.message || "Lobby tracking offline."} onRetry={() => refetch()} />}

        <div className="space-y-3">
          {rows.length > 0 ? (
            rows.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <OfficeQueueRow item={item} />
                </div>

                <div className="flex items-center gap-2 border-t border-slate-50 pt-3 sm:pt-0 sm:border-t-0 shrink-0">
                  <Link 
                    to={item.assignedStaffUserId ? `/dashboard/office/messages?sessionId=${encodeURIComponent(item.assignedStaffUserId)}` : "/dashboard/office/messages"} 
                    className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-900 border border-slate-200/50 transition-all inline-flex items-center"
                    title="Send Message"
                  >
                    <MessageSquare size={14} />
                  </Link>

                  <OfficeApprovalActions
                    busy={approveMutation.isPending || rejectMutation.isPending || assignMutation.isPending}
                    onApprove={() => approveMutation.mutate({ id: item.id })}
                    onReject={() => rejectMutation.mutate({ id: item.id })}
                    onAssign={() => openAssignPicker(item)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 flex justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <OfficeEmptyState 
                title="Lobby Stream Clear" 
                description="New dynamic visitor entries will be routed immediately into this stream." 
              />
            </div>
          )}
        </div>
      </main>

      {/* COMPACT ASSIGNMENT SPRING-LOADED BOTTOM SHEET */}
      <AnimatePresence>
        {assignPicker.open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Background Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAssignPicker({ open: false, requestId: "", selectedUserId: "", selectedName: "", selectedDepartment: "" })}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
            />

            {/* Tactile sheet box */}
            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-white w-full sm:max-w-lg rounded-t-[1.5rem] sm:rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl overflow-hidden"
            >
              {/* Touch handle accent for mobile platforms */}
              <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

              {/* Sheet header details */}
              <div className="px-6 pt-4 pb-3 bg-white border-b border-slate-50 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-[15px] text-slate-950 tracking-tight">Assign Staff Member</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">Route this dynamic visitor record into the appropriate queue.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAssignPicker({ open: false, requestId: "", selectedUserId: "", selectedName: "", selectedDepartment: "" })} 
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Filter and selector scroll box */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                  <div className="relative">
                    <input
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder="Search directory by name, role or department..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 outline-none focus:border-slate-300 transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 no-scrollbar bg-slate-50/20">
                  {filteredOfficeEmployees.length > 0 ? (
                    filteredOfficeEmployees.map((member) => {
                      const memberId = String(member.userId || member.id || "");
                      const isActive = memberId === assignPicker.selectedUserId;
                      return (
                        <button
                          key={memberId}
                          type="button"
                          onClick={() => setAssignPicker((prev) => ({
                            ...prev,
                            selectedUserId: memberId,
                            selectedName: String(member.name || "").trim(),
                            selectedDepartment: String(member.department || "").trim()
                          }))}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                            isActive
                              ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                              : "bg-white border-slate-100 hover:border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="font-semibold text-xs truncate">
                              {renderHighlightedText(member.name || "Staff member", assignSearch)}
                            </p>
                            <div className={`flex flex-wrap gap-1.5 text-[9px] font-medium ${isActive ? "text-slate-400" : "text-slate-400"}`}>
                              <span className="inline-flex items-center gap-0.5">
                                <User2 size={10} />
                                {member.role || "Operator"}
                              </span>
                              {member.department && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Building2 size={10} />
                                  {renderHighlightedText(member.department, assignSearch)}
                                </span>
                              )}
                              {member.floor && (
                                <span className="inline-flex items-center gap-0.5">
                                  <MapPin size={10} />
                                  Floor {member.floor}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <span className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 ${
                            isActive 
                              ? "bg-white text-slate-950 border-white" 
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          }`}>
                            {isActive ? <Check size={12} strokeWidth={2.5} /> : <ChevronDown size={12} className="-rotate-90" />}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      <ShieldAlert size={20} className="text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-500">No matching operators found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment controller submission base */}
              <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Hand-off</p>
                  <p className="font-semibold text-xs text-slate-950 truncate mt-0.5">
                    {assignPicker.selectedName || "No Operator Selected"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!assignPicker.selectedUserId || assignMutation.isPending}
                  onClick={() => confirmAssign()}
                  className="bg-slate-950 hover:bg-slate-900 disabled:opacity-40 text-white font-semibold text-xs tracking-wide px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0"
                >
                  {assignMutation.isPending ? "Routing..." : "Confirm Assign"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function renderHighlightedText(value, term) {
  const text = String(value || "");
  const query = String(term || "").trim();
  if (!text || !query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const matchIndex = lowerText.indexOf(lowerQuery, startIndex);
    if (matchIndex === -1) {
      parts.push(text.slice(startIndex));
      break;
    }

    if (matchIndex > startIndex) {
      parts.push(text.slice(startIndex, matchIndex));
    }

    const matchText = text.slice(matchIndex, matchIndex + query.length);
    parts.push(
      <span key={`${matchIndex}-${matchText}`} className="bg-slate-950/10 text-slate-950 font-bold px-0.5 rounded">
        {matchText}
      </span>
    );
    startIndex = matchIndex + query.length;
  }

  return parts;
}