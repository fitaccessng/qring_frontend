import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Plus, Search, 
  Building2, User2, ArrowLeft, RefreshCw, KeyRound, X,
  Briefcase, Map as MapIcon, SlidersHorizontal, Layers, Send, MessageSquare
} from "lucide-react";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficeIncomingCallModal from "../../../components/office/OfficeIncomingCallModal";
import OfficeEmployeeCard from "../../../components/office/OfficeEmployeeCard";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { createOfficeDepartment, createOfficeEmployee, acceptOfficeCall, rejectOfficeCall, sendOfficeEmployeeDetails } from "../../../services/officeService";
import { getStoredUser } from "../../../services/authStorage";
import { getDashboardSocket } from "../../../services/socketClient";

const QUERY_KEY = ["office", "employees"];

export default function OfficeEmployeesPage() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [role, setRole] = useState("");
  const [availability, setAvailability] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState("");
  const [staffCreateError, setStaffCreateError] = useState("");
  const [staffCreateSuccess, setStaffCreateSuccess] = useState("");
  const [staffInviteDetails, setStaffInviteDetails] = useState(null);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [departmentDraft, setDepartmentDraft] = useState("");
  const [showDepartmentComposer, setShowDepartmentComposer] = useState(false);
  const [departmentCountDeltas, setDepartmentCountDeltas] = useState({});
  const [activeEmployeeActionId, setActiveEmployeeActionId] = useState("");

  const [staffForm, setStaffForm] = useState({
    fullName: "",
    email: "",
    department: "",
    floor: "",
    availabilityStatus: "available",
    temporaryPassword: ""
  });

  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = String(currentUser?.id || "").trim();
  
  const config = useMemo(() => ({
    params: {
      search: search || undefined,
      department: department !== "All" ? department : undefined,
      role: role || undefined,
      availability: availability || undefined,
    }
  }), [search, department, role, availability]);

  const { data, isLoading, isError, error, refetch, isFetching } = useApiQuery({
    queryKey: [...QUERY_KEY, search, department, role, availability],
    url: endpoints.office.employees,
    config,
    refetchInterval: 30000
  });
  
  const { data: departmentsData, refetch: refetchDepartments } = useApiQuery({
    queryKey: ["office", "departments"],
    url: endpoints.office.departments,
    refetchInterval: 30000
  });
  
  const { data: departmentCountsData, refetch: refetchDepartmentCounts } = useApiQuery({
    queryKey: ["office", "departments", "staff-counts"],
    url: endpoints.office.departmentStaffCounts,
    refetchInterval: 30000
  });

  useSocketQueryInvalidation(QUERY_KEY, [
    "office.conversation.updated",
    "office.visitor_request.updated",
    "office.staff.created",
    "office.call.requested",
    "office.call.accepted",
    "office.call.rejected",
    "office.call.ended"
  ]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    const socket = getDashboardSocket();
    
    const handleRequested = (payload) => {
      const receiverId = String(payload?.receiverId || "").trim();
      if (receiverId !== currentUserId) return;
      setIncomingCall({
        callSessionId: String(payload?.callSessionId || payload?.eventId || "").trim(),
        sessionId: String(payload?.callSessionId || payload?.eventId || "").trim(),
        callerLabel: String(payload?.callerName || payload?.homeownerName || "Office").trim() || "Office",
        sourceLabel: String(payload?.callerOrigin || payload?.source || "office dashboard").trim() || "office dashboard",
        hasVideo: Boolean(payload?.hasVideo || String(payload?.type || "").toLowerCase() === "video"),
      });
    };

    const clearIfMatching = (payload) => {
      const callSessionId = String(payload?.callSessionId || payload?.eventId || "").trim();
      if (!callSessionId) return;
      setIncomingCall((current) => (current && String(current.callSessionId || "") === callSessionId ? null : current));
    };

    socket.on("office.call.requested", handleRequested);
    socket.on("office.call.accepted", clearIfMatching);
    socket.on("office.call.rejected", clearIfMatching);
    socket.on("office.call.ended", clearIfMatching);

    return () => {
      socket.off("office.call.requested", handleRequested);
      socket.off("office.call.accepted", clearIfMatching);
      socket.off("office.call.rejected", clearIfMatching);
      socket.off("office.call.ended", clearIfMatching);
    };
  }, [currentUserId]);

  const rows = data?.items || [];
  const departmentRows = Array.isArray(departmentsData?.items) ? departmentsData.items : [];
  const departmentCountsRows = Array.isArray(departmentCountsData?.items) ? departmentCountsData.items : [];
  
  const departmentOptions = useMemo(() => {
    const seen = new Set();
    const items = [];
    for (const dept of departmentRows) {
      const name = String(dept?.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(name);
    }
    return ["All", ...items];
  }, [departmentRows]);

  const departmentStaffCounts = useMemo(() => {
    const counts = new Map();
    for (const row of departmentCountsRows) {
      const name = String(row?.name || "").trim();
      if (!name) continue;
      counts.set(name.toLowerCase(), Number(row?.staffCount || 0));
    }
    Object.entries(departmentCountDeltas).forEach(([key, value]) => {
      counts.set(key, (counts.get(key) || 0) + Number(value || 0));
    });
    return counts;
  }, [departmentCountsRows, departmentCountDeltas]);

  useEffect(() => {
    if (department !== "All" && !departmentOptions.includes(department)) {
      setDepartment("All");
    }
  }, [department, departmentOptions]);

  useEffect(() => {
    setDepartmentCountDeltas({});
  }, [rows, departmentCountsRows]);

  function updateStaffForm(field, value) {
    setStaffForm((prev) => ({ ...prev, [field]: value }));
  }

  async function createDepartment(event) {
    event.preventDefault();
    const name = String(departmentDraft || "").trim();
    if (!name) return;
    try {
      await createOfficeDepartment({ name });
      setDepartment(name);
      setStaffForm((prev) => ({ ...prev, department: name }));
      setDepartmentDraft("");
      setShowDepartmentComposer(false);
      await refetchDepartments();
      await refetchDepartmentCounts();
    } catch (err) {
      setCallError(err?.message || "Unable to create the department.");
    }
  }

  async function createStaffAccount(event) {
    event.preventDefault();
    setStaffCreateError("");
    setStaffCreateSuccess("");
    setStaffInviteDetails(null);

    const fullName = String(staffForm.fullName || "").trim();
    const email = String(staffForm.email || "").trim();
    if (!fullName || !email) {
      setStaffCreateError("Please fill out the name and email fields.");
      return;
    }

    try {
      const response = await createOfficeEmployee({
        fullName,
        email,
        department: String(staffForm.department || "").trim() || undefined,
        floor: String(staffForm.floor || "").trim() || undefined,
        availabilityStatus: String(staffForm.availabilityStatus || "available").trim() || "available",
        temporaryPassword: String(staffForm.temporaryPassword || "").trim() || undefined
      });
      const createdDepartment = String(staffForm.department || "").trim();
      if (createdDepartment) {
        const key = createdDepartment.toLowerCase();
        setDepartmentCountDeltas((prev) => ({
          ...prev,
          __all: Number(prev.__all || 0) + 1,
          [key]: Number(prev[key] || 0) + 1
        }));
      } else {
        setDepartmentCountDeltas((prev) => ({
          ...prev,
          __all: Number(prev.__all || 0) + 1
        }));
      }
      const resData = response?.data ?? response;
      setStaffInviteDetails({
        name: resData?.staff?.name || fullName,
        email: resData?.user?.email || email,
        loginLink: resData?.loginLink || "",
        temporaryPassword: resData?.temporaryPassword || ""
      });
      setStaffCreateSuccess("Staff account successfully created.");
      setShowInvitePanel(false);
      setDepartmentDraft("");
      setShowDepartmentComposer(false);
      setStaffForm({
        fullName: "",
        email: "",
        department: "",
        floor: "",
        availabilityStatus: "available",
        temporaryPassword: ""
      });
      await refetch();
      await refetchDepartments();
      await refetchDepartmentCounts();
    } catch (err) {
      setStaffCreateError(err?.message || "Unable to create the staff account.");
    }
  }

  async function sendEmployeeDetails(member) {
    const targetEmployeeId = String(member?.userId || "").trim();
    if (!targetEmployeeId) return;
    setActiveEmployeeActionId(targetEmployeeId);
    try {
      await sendOfficeEmployeeDetails(targetEmployeeId);
      setCallError("");
      await refetch();
    } catch (err) {
      setCallError(err?.message || "Unable to send employee details.");
    } finally {
      setActiveEmployeeActionId("");
    }
  }

  function openEmployeeChat(member) {
    const targetEmployeeId = String(member?.userId || "").trim();
    if (!targetEmployeeId) return;
    navigate(`/dashboard/office/messages?sessionId=${encodeURIComponent(targetEmployeeId)}`);
  }

  async function acceptIncomingCall() {
    if (!incomingCall?.callSessionId) return;
    const callSessionId = incomingCall.callSessionId;
    try {
      await acceptOfficeCall(callSessionId);
      try {
        window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify({
          sessionId: callSessionId,
          callSessionId,
          visitorId: callSessionId,
          hasVideo: Boolean(incomingCall.hasVideo)
        }));
      } catch {
        // fallback
      }
      setCallError("");
      setIncomingCall(null);
      navigate(`/dashboard/office/messages?sessionId=${encodeURIComponent(callSessionId)}`);
    } catch (err) {
      setCallError(err?.message || "Error processing call connection.");
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCall?.callSessionId) return;
    const callSessionId = incomingCall.callSessionId;
    try {
      await rejectOfficeCall(callSessionId);
      setCallError("");
      setIncomingCall(null);
    } catch (err) {
      setCallError(err?.message || "Call rejection failed.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <OfficeLoadingState />
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] min-h-screen font-sans text-slate-900 antialiased pb-28">
      
      {/* HEADER SECTION */}
      <header className="w-full bg-white/70 border-b border-slate-100 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-semibold text-base text-slate-950 tracking-tight">Employees</h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {rows.length} total members
              </p>
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

      {/* SEARCH AND FILTER SEGMENT */}
      <div className="bg-white border-b border-slate-100 py-4 px-4 sm:px-6 sticky top-16 z-35">
        <div className="max-w-5xl mx-auto space-y-4">
          
          {/* Main search input bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search staff members..." 
                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:bg-white transition-all outline-none placeholder:text-slate-400" 
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2.5 rounded-xl border transition-all ${
                showAdvancedFilters 
                  ? "bg-slate-100 border-slate-300 text-slate-900" 
                  : "bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {/* Department pills scroll track */}
          <div ref={scrollContainerRef} className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-0.5 items-center">
            {departmentOptions.map((dept) => {
              const isActive = department === dept;
              const staffCount = dept === "All"
                ? rows.length + Number(departmentCountDeltas.__all || 0)
                : Number(departmentStaffCounts.get(dept.toLowerCase()) || rows.filter((member) => String(member?.department || "").trim().toLowerCase() === dept.toLowerCase()).length);
              
              return (
                <button
                  key={dept}
                  onClick={() => setDepartment(dept)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-slate-950 text-white" 
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/40"
                  }`}
                >
                  {dept} <span className={`ml-1 text-[10px] ${isActive ? "text-slate-400" : "text-slate-400"}`}>{staffCount}</span>
                </button>
              );
            })}
            
            <button
              type="button"
              onClick={() => setShowDepartmentComposer((prev) => !prev)}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 bg-white text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-800 transition"
            >
              <Plus size={12} />
              New Department
            </button>
          </div>
        
          {/* Inline department composition drawer */}
          <AnimatePresence>
            {showDepartmentComposer && (
              <motion.form
                onSubmit={createDepartment}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    value={departmentDraft}
                    onChange={(event) => setDepartmentDraft(event.target.value)}
                    placeholder="Enter department name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-300 transition"
                  />
                  <Building2 className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-900 transition"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentDraft("");
                      setShowDepartmentComposer(false);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Collapsible advanced metadata filters */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Specific Title / Role</label>
                  <input 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)} 
                    placeholder="e.g. Manager" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">System State Indicator</label>
                  <input 
                    value={availability} 
                    onChange={(e) => setAvailability(e.target.value)} 
                    placeholder="e.g. available, busy" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-300 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CORE DISPLAY STAGE */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {isError && <OfficeErrorBanner message={error?.message || "Could not synchronize directory."} onRetry={() => refetch()} />}
        {callError && <OfficeErrorBanner message={callError} onRetry={() => setCallError("")} />}
        {staffCreateError && <OfficeErrorBanner message={staffCreateError} onRetry={() => setStaffCreateError("")} />}

        {staffCreateSuccess && staffInviteDetails && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700 font-medium">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold text-emerald-900">{staffCreateSuccess}</p>
              <p className="text-slate-500 text-[11px]">
                Credentials: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">{staffInviteDetails.email}</span> 
                {" "}Password: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800 font-bold">{staffInviteDetails.temporaryPassword || "Auto-Generated"}</span>
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Bento-Style Employee Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pt-2">
          {rows.length > 0 ? (
            rows.map((member) => (
              <div 
                key={member.id} 
                className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col justify-between min-h-[160px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
              >
                {/* Employee info layout */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-semibold text-[14px] text-slate-950 truncate leading-tight">
                        {member.fullName || member.name || "Unnamed Operator"}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {member.email || "No email provided"}
                      </p>
                    </div>

                    {/* Simple status chip */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                      member.availabilityStatus === "available" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {member.availabilityStatus || "offline"}
                    </span>
                  </div>

                  {/* Operational location attributes */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {member.department && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-100">
                        <Building2 size={10} />
                        {member.department}
                      </span>
                    )}
                    {member.floor && (
                      <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-100">
                        <MapIcon size={10} />
                        Floor {member.floor}
                      </span>
                    )}
                  </div>
                </div>

                {/* Minimal card actions strip */}
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-end gap-2">
                  {member.userId ? (
                    <>
                      <button
                        onClick={() => void sendEmployeeDetails(member)}
                        disabled={activeEmployeeActionId === member.userId}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                          member.detailsSentAt 
                            ? "bg-slate-50 text-slate-400 border-slate-200" 
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                      >
                        <Send size={11} />
                        {member.detailsSentAt ? "Resend Login" : "Send Login"}
                      </button>
                      <button
                        onClick={() => openEmployeeChat(member)}
                        className="p-1.5 bg-slate-950 text-white rounded-lg hover:bg-slate-900 transition-colors"
                      >
                        <MessageSquare size={13} />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-medium italic">Pending setup</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 flex justify-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <OfficeEmptyState 
                title="No Profiles Listed" 
                description="Zero system parameters matching your directory filtering fields." 
              />
            </div>
          )}
        </div>
      </main>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowInvitePanel(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl shadow-slate-950/20 hover:scale-105 active:scale-95 transition-all"
          aria-label="Add employee"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* FLOATING SPRING-LOADED BOTTOM SHEET */}
      <AnimatePresence>
        {showInvitePanel && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            
            {/* Dark background overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInvitePanel(false)}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px]"
            />

            {/* Slide-up dialog body */}
            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-white w-full sm:max-w-md rounded-t-[1.5rem] sm:rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl overflow-hidden"
            >
              {/* Touch drag handlebar target for mobile */}
              <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />

              {/* Sheet header details */}
              <div className="px-6 pt-4 pb-3 bg-white border-b border-slate-50 shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-[15px] text-slate-950 tracking-tight">Add New Employee</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">Register a newly allocated operator file view.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowInvitePanel(false)} 
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sheet form scrolling wrapper */}
              <form onSubmit={createStaffAccount} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 no-scrollbar bg-slate-50/50">
                  <InputField 
                    label="Employee Name *" 
                    value={staffForm.fullName} 
                    onChange={(e) => updateStaffForm("fullName", e.target.value)} 
                    placeholder="e.g. Johnathan Smith" 
                    icon={<User2 size={15} />} 
                    required 
                  />

                  <InputField 
                    label="Email Address *" 
                    type="email" 
                    value={staffForm.email} 
                    onChange={(e) => updateStaffForm("email", e.target.value)} 
                    placeholder="john@firm.com" 
                    icon={<Briefcase size={15} />} 
                    required 
                  />

                  <div className="space-y-1 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">
                      Department Location
                    </label>
                    <div className="relative">
                      <select
                        value={staffForm.department}
                        onChange={(e) => updateStaffForm("department", e.target.value)}
                        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:border-slate-300 transition-all outline-none"
                      >
                        <option value="">Select a department...</option>
                        {departmentOptions.filter((dept) => dept !== "All").map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Layers size={14} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField 
                      label="Floor Level" 
                      value={staffForm.floor} 
                      onChange={(e) => updateStaffForm("floor", e.target.value)} 
                      placeholder="e.g. 2nd Floor" 
                      icon={<MapIcon size={14} />} 
                    />
                  </div>

                  <InputField 
                    label="Temporary Password" 
                    value={staffForm.temporaryPassword} 
                    onChange={(e) => updateStaffForm("temporaryPassword", e.target.value)} 
                    placeholder="Leave empty to auto-generate" 
                    icon={<KeyRound size={15} />} 
                  />
                </div>

                {/* Form actionable footer */}
                <div className="p-4 bg-white border-t border-slate-50 shrink-0">
                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs tracking-wide py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Create Profile Entry</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Incoming Call Portal Interface */}
      <OfficeIncomingCallModal
        open={Boolean(incomingCall?.callSessionId)}
        hasVideo={Boolean(incomingCall?.hasVideo)}
        callerLabel={incomingCall?.callerLabel || "Office"}
        sourceLabel={incomingCall?.sourceLabel || "office dashboard"}
        busy={false}
        onAccept={() => void acceptIncomingCall()}
        onReject={() => void rejectIncomingCall()}
      />
    </div>
  );
}

function InputField({ label, icon, ...props }) {
  return (
    <div className="space-y-1 w-full">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">
        {label}
      </label>
      <div className="relative group">
        <input
          {...props}
          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-300 transition-all outline-none placeholder:text-slate-300"
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-slate-600 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}