import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../../layouts/AppShell";
import { useApiQuery, useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficeIncomingCallModal from "../../../components/office/OfficeIncomingCallModal";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import OfficePanel from "../../../components/office/OfficePanel";
import OfficeEmployeeCard from "../../../components/office/OfficeEmployeeCard";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { requestOfficeCall, acceptOfficeCall, rejectOfficeCall } from "../../../services/officeService";
import { getStoredUser } from "../../../services/authStorage";
import { getDashboardSocket } from "../../../services/socketClient";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "employees"];

export default function OfficeEmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [availability, setAvailability] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState("");
  const currentUser = useMemo(() => getStoredUser(), []);
  const currentUserId = String(currentUser?.id || "").trim();
  const config = useMemo(() => ({
    params: {
      search: search || undefined,
      department: department || undefined,
      role: role || undefined,
      availability: availability || undefined,
    }
  }), [search, department, role, availability]);

  const { data, isLoading, isError, error, refetch } = useApiQuery({
    queryKey: [...QUERY_KEY, search, department, role, availability],
    url: endpoints.office.employees,
    config,
    refetchInterval: 30000
  });
  useSocketQueryInvalidation(QUERY_KEY, [
    "office.conversation.updated",
    "office.visitor_request.updated",
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
      if (!receiverId || receiverId !== currentUserId) return;
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

  if (isLoading) {
    return (
      <AppShell title="Office Employees" showMobileNav>
        <OfficeLoadingState />
      </AppShell>
    );
  }

  const rows = data?.items || [];

  async function launchEmployeeCall(member, mode) {
    const targetEmployeeId = String(member?.userId || "").trim();
    if (!targetEmployeeId) return;
    try {
      const response = await requestOfficeCall({
        visitorSessionId: null,
        type: mode,
        hasVideo: mode === "video",
        targetRole: "employee",
        employeeId: targetEmployeeId,
        visitorName: currentUser?.fullName || "Office"
      });
      const callSessionId = String(response?.callSessionId || response?.sessionId || "").trim();
      if (!callSessionId) {
        throw new Error("Call session was not created.");
      }
      try {
        window.sessionStorage.setItem("qring_call_start_intent", JSON.stringify({
          pending: true,
          sessionId: callSessionId,
          mode,
          callSessionId,
          visitorId: callSessionId,
          rtcConfig: response?.rtcConfig || undefined
        }));
      } catch {
        // ignore session storage failures
      }
      setCallError("");
      navigate(`/dashboard/office/messages?sessionId=${encodeURIComponent(callSessionId)}`);
    } catch (error) {
      setCallError(error?.message || "Unable to start the office call.");
    }
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
        // ignore session storage failures
      }
      setCallError("");
      setIncomingCall(null);
      navigate(`/dashboard/office/messages?sessionId=${encodeURIComponent(callSessionId)}`);
    } catch (error) {
      setCallError(error?.message || "Unable to accept the office call.");
    }
  }

  async function rejectIncomingCall() {
    if (!incomingCall?.callSessionId) return;
    const callSessionId = incomingCall.callSessionId;
    try {
      await rejectOfficeCall(callSessionId);
      setCallError("");
      setIncomingCall(null);
    } catch (error) {
      setCallError(error?.message || "Unable to reject the office call.");
    }
  }

  return (
    <AppShell title="Office Employees" showMobileNav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {isError ? <OfficeErrorBanner message={error?.message || "Unable to load employees."} onRetry={() => refetch()} /> : null}
        {callError ? <OfficeErrorBanner message={callError} onRetry={() => setCallError("")} /> : null}
        <OfficePageHeader
          title="Office Employees"
          subtitle="Employee directory, availability, and departmental presence."
          tabs={officeTabs}
        />

        <OfficePanel title="Filters" subtitle="Find a person by name, department, or availability">
          <div className="grid gap-3 md:grid-cols-4">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or role" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Department" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Role" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
            <input value={availability} onChange={(event) => setAvailability(event.target.value)} placeholder="Availability" className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
          </div>
        </OfficePanel>

        <OfficePanel title="Directory" subtitle={`${rows.length} employee${rows.length === 1 ? "" : "s"} loaded`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.length > 0 ? rows.map((member) => (
              <OfficeEmployeeCard
                key={member.id}
                member={member}
                callDisabled={!member.userId || member.userId === currentUserId}
                onVoiceCall={() => void launchEmployeeCall(member, "audio")}
                onVideoCall={() => void launchEmployeeCall(member, "video")}
              />
            )) : (
              <OfficeEmptyState title="No employees found" description="Create office employees to populate the directory." />
            )}
          </div>
        </OfficePanel>
      </div>

      <OfficeIncomingCallModal
        open={Boolean(incomingCall?.callSessionId)}
        hasVideo={Boolean(incomingCall?.hasVideo)}
        callerLabel={incomingCall?.callerLabel || "Office"}
        sourceLabel={incomingCall?.sourceLabel || "office dashboard"}
        busy={false}
        onAccept={() => void acceptIncomingCall()}
        onReject={() => void rejectIncomingCall()}
      />
    </AppShell>
  );
}
