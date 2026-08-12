import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock3,
  Phone,
  ShieldCheck,
  Video,
  XCircle,
  WifiOff,
  RefreshCw,
  X,
  Camera,
  RotateCcw,
  UserCheck,
  ArrowUpRight,
  Loader2,
  KeyRound,
  UserPlus,
  ShieldAlert,
  Search,
  MessageSquare,
  SlidersHorizontal,
  LogOut,
  Car,
  Package,
  ClipboardList,
  AlertTriangle
} from "lucide-react";

import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import {
  getSecurityDashboard,
  actOnSecurityRequest,
  getSecurityDoorOptions,
  registerSecurityVisitor,
  validateSecurityAccessPass
} from "../../services/securityService";
import {
  enqueueSecurityAction,
  flushQueuedSecurityActions,
  listQueuedSecurityActions
} from "../../services/securityOfflineQueue";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import { showSuccess } from "../../utils/flash";
import { startSessionCall } from "../../services/homeownerService";
import { useAuth } from "../../state/AuthContext";
import useSubscription from "../../hooks/useSubscription";
import {
  clockGuardAttendance,
  createEstatePackage,
  createSecurityIncident,
  listBlockedVisitors,
  listGuardAttendance,
  listResidentVehicles,
  recordVehicleGateAction,
  uploadSecurityIncidentPhoto
} from "../../services/estateOperationsService";

const SECTIONS = [
  { key: "newRequests", label: "New Requests", emptyText: "No new incoming requests." },
  { key: "waitingForHomeowner", label: "Pending Host", emptyText: "No requests waiting for homeowner approval." },
  { key: "approvedPendingEntry", label: "At Gate", emptyText: "No visitors currently waiting at the gate." },
  { key: "completed", label: "Completed Log", emptyText: "No recent security logs." }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-md relative">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full animate-ping" />
        </div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mt-2">Initializing Command Center...</p>
      </div>
    </div>
  );
}

function VisitorLogRow({ row, sectionKey, busyKey, canApprove, onAction, onCall }) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const sessionId = row.sessionId || row.visitorSessionId || row.id;
  const isBusy = (action) => busyKey === `${sessionId}:${action}`;
  const isCalling = (type) => busyKey === `${sessionId}:call:${type}`;
  const isCompleted = sectionKey === "completed";

  const actionButtonClass =
    "flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 touch-manipulation";

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col gap-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {row.snapshotUrl || row.snapshotBase64 ? (
            <SecureSnapshotImage
              src={row.snapshotUrl || `data:image/jpeg;base64,${row.snapshotBase64}`}
              alt={row.visitorName || "Visitor"}
              visitorSessionId={sessionId}
              className="w-13 h-13 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-200 shadow-inner"
              fallback={
                <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                  <UserCheck className="w-6 h-6" />
                </div>
              }
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
              <UserCheck className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900 truncate">
                {row.visitorName || "Guest Visitor"}
              </h4>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                {row.purpose || row.visitorType || "Visitor"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 truncate">
              Destination: <span className="font-semibold text-slate-900">{row.homeownerName || row.doorName || "Main Gate"}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-medium">
              <Clock3 className="w-3 h-3 text-slate-400" />
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors relative"
              title="Chat with visitor"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setControlsOpen((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                controlsOpen
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Actions</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(controlsOpen || isCompleted) && (
          <motion.div
            id={`security-controls-${sessionId}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {sectionKey === "newRequests" && (
                <>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onAction(sessionId, "forward")}
                    className={`${actionButtonClass} border border-blue-200 text-blue-700 bg-blue-50/80 hover:bg-blue-100`}
                  >
                    {isBusy("forward") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    <span>Forward</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onAction(sessionId, "reject")}
                    className={`${actionButtonClass} border border-rose-200 text-rose-700 bg-rose-50/80 hover:bg-rose-100`}
                  >
                    {isBusy("reject") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Reject</span>
                  </button>
                  {canApprove && (
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => onAction(sessionId, "approve")}
                      className={`${actionButtonClass} bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm`}
                    >
                      {isBusy("approve") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Grant</span>
                    </button>
                  )}
                </>
              )}

              {(sectionKey === "waitingForHomeowner" || sectionKey === "approvedPendingEntry") && !isCompleted && (
                <>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onCall(sessionId, "audio")}
                    className="p-2.5 rounded-xl bg-slate-100 text-slate-800 active:scale-95 hover:bg-slate-200 transition-all flex items-center justify-center shrink-0 border border-slate-200"
                    title="Audio Call"
                  >
                    {isCalling("audio") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onCall(sessionId, "video")}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-700 active:scale-95 hover:bg-blue-100 transition-all flex items-center justify-center shrink-0 border border-blue-200"
                    title="Video Call"
                  >
                    {isCalling("video") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  </button>

                  {row.autoApproveSuggested && (
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => onAction(sessionId, "approve_repeat_visitor")}
                      className={`${actionButtonClass} border border-emerald-200 bg-emerald-50 text-emerald-800`}
                    >
                      {isBusy("approve_repeat_visitor") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Repeat OK</span>
                    </button>
                  )}

                  {row.visitorType === "delivery" && (
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => onAction(sessionId, "delivery_drop_off")}
                      className={`${actionButtonClass} border border-amber-200 bg-amber-50 text-amber-800`}
                    >
                      {isBusy("delivery_drop_off") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Drop-Off</span>
                    </button>
                  )}

                  {canApprove && sectionKey === "waitingForHomeowner" && (
                    <>
                      <button
                        type="button"
                        disabled={!!busyKey}
                        onClick={() => onAction(sessionId, "approve")}
                        className={`${actionButtonClass} bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm`}
                      >
                        {isBusy("approve") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        disabled={!!busyKey}
                        onClick={() => onAction(sessionId, "reject")}
                        className={`${actionButtonClass} border border-rose-200 text-rose-700 bg-rose-50`}
                      >
                        {isBusy("reject") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {sectionKey === "approvedPendingEntry" && (
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => onAction(sessionId, "confirm_entry")}
                      className={`${actionButtonClass} bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm`}
                    >
                      {isBusy("confirm_entry") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Admit Gate</span>
                    </button>
                  )}
                </>
              )}

              {sectionKey === "completed" && (
                row.gateStatus === "allowed_in" ? (
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onAction(sessionId, "checkout")}
                    className={`${actionButtonClass} bg-slate-900 hover:bg-slate-800 text-white shadow-sm`}
                  >
                    {isBusy("checkout") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Check Out</span>
                  </button>
                ) : (
                  <span className="w-full text-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 py-2 rounded-xl">
                    Entry Logged & Processed
                  </span>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PolicyPill({ active, label }) {
  return (
    <div className={`rounded-2xl border p-3 flex-1 min-w-[130px] transition-all ${active ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
        <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${active ? "text-emerald-800" : "text-slate-500"}`}>{label}</p>
      </div>
      <p className={`mt-1 text-xs font-bold ${active ? "text-emerald-700" : "text-slate-400"}`}>{active ? "Active" : "Disabled"}</p>
    </div>
  );
}

function formatDestinationOption(door) {
  const propertyUnit = String(door?.homeName || door?.unitName || "").trim();
  const residentName = String(door?.homeownerName || door?.residentName || "").trim();
  const accessPoint = String(door?.doorName || door?.name || "").trim();
  const primary = propertyUnit || accessPoint || String(door?.id || "Property Unit");
  const secondary = [residentName, accessPoint && accessPoint !== primary ? accessPoint : ""].filter(Boolean).join(" - ");
  return secondary ? `${primary} - ${secondary}` : primary;
}

export default function SecurityDashboardPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { hasFeature } = useSubscription();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [data, setData] = useState({ profile: null, queues: {}, rules: null });
  const [doorOptions, setDoorOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [queuedCount, setQueuedCount] = useState(() => listQueuedSecurityActions().length);

  const [accessCode, setAccessCode] = useState("");
  const [accessResult, setAccessResult] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));

  const [registerOpen, setRegisterOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [registeringVisitor, setRegisteringVisitor] = useState(false);
  const [opsBusy, setOpsBusy] = useState("");
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleRows, setVehicleRows] = useState([]);
  const [blockedRows, setBlockedRows] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [packageForm, setPackageForm] = useState({ homeId: "", courier: "", description: "" });
  const [incidentForm, setIncidentForm] = useState({ incidentType: "general", severity: "medium", description: "", photoUrl: "" });
  const [incidentPhotoName, setIncidentPhotoName] = useState("");

  const [registerForm, setRegisterForm] = useState({
    name: "",
    phoneNumber: "",
    doorId: "",
    purpose: "",
    visitorType: "guest",
    snapshotBase64: "",
    snapshotMime: "image/jpeg"
  });

  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [cameraState, setCameraState] = useState({ starting: false, ready: false, error: "" });
  const [activeSection, setActiveSection] = useState("newRequests");
  const [refreshing, setRefreshing] = useState(false);

  const [incomingCall, setIncomingCall] = useState(null);
  const incomingCallRef = useRef(null);

  async function loadDashboard({ background = false } = {}) {
    if (!background) { setLoading(true); setError(""); }
    try {
      const response = await getSecurityDashboard();
      setData(response || { profile: null, queues: {}, rules: null });
    } catch (e) {
      if (!background) setError(e?.message || "Failed to load security dashboard.");
    } finally {
      if (!background) setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard({ background: true });
    setRefreshing(false);
  }

  async function handleLogout() {
    if (logoutBusy) return;
    setLogoutBusy(true);
    try {
      await logout();
    } catch {
      // Local auth state is cleared by the auth provider
    } finally {
      setLogoutBusy(false);
      navigate("/login", { replace: true });
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    let active = true;
    async function loadDoors() {
      try {
        const rows = await getSecurityDoorOptions();
        if (!active) return;
        setDoorOptions(rows);
        setRegisterForm(p => ({ ...p, doorId: p.doorId || rows?.[0]?.id || "" }));
        setPackageForm(p => ({ ...p, homeId: p.homeId || rows?.[0]?.homeId || "" }));
      } catch { if (active) setDoorOptions([]); }
    }
    loadDoors();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!vehicleOpen || !hasFeature("vehicle_registration")) return;
    handleVehicleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleOpen]);

  useEffect(() => {
    if (!registerOpen || !hasFeature("block_unwanted_visitors")) return;
    listBlockedVisitors().then(setBlockedRows).catch(() => setBlockedRows([]));
  }, [registerOpen, hasFeature]);

  useEffect(() => {
    if (!attendanceOpen || !hasFeature("guard_attendance")) return;
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceOpen, hasFeature]);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (!registerOpen) { stopCamera(); setCameraState({ starting: false, ready: false, error: "" }); return; }
    if (!registerForm.snapshotBase64) startCamera(cameraFacingMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerOpen, cameraFacingMode, registerForm.snapshotBase64]);

  useEffect(() => {
    async function handleOnline() {
      setIsOffline(false);
      const result = await flushQueuedSecurityActions();
      setQueuedCount(result.remaining);
      if (result.flushed > 0) {
        showSuccess(`${result.flushed} queued action${result.flushed === 1 ? "" : "s"} synced.`);
        loadDashboard({ background: true });
      }
    }
    function handleOffline() { setIsOffline(true); setQueuedCount(listQueuedSecurityActions().length); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  useEffect(() => {
    const socket = getDashboardSocket();
    const terminalCallEvents = ["call.accepted", "call.rejected", "call.ended", "call.failed", "call.cancelled", "call.missed"];
    const terminalCallListeners = new Map();

    function handleIncomingCall(payload) {
      setIncomingCall(payload?.data ?? payload ?? null);
    }

    function handleCallTerminal(payload) {
      const nextPayload = payload?.data ?? payload ?? {};
      const nextCallId = String(nextPayload?.callSessionId || nextPayload?.eventId || "").trim();
      const nextSessionId = String(nextPayload?.sessionId || "").trim();
      const activeIncoming = incomingCallRef.current;
      const currentCallId = String(activeIncoming?.callSessionId || activeIncoming?.eventId || "").trim();
      const currentSessionId = String(activeIncoming?.sessionId || "").trim();

      if (!activeIncoming || !((currentCallId && nextCallId && currentCallId === nextCallId) || (currentSessionId && nextSessionId && currentSessionId === nextSessionId))) {
        return;
      }
      setIncomingCall(null);
    }

    socket.on("incoming-call", handleIncomingCall);
    terminalCallEvents.forEach((eventName) => {
      const listener = (payload) => handleCallTerminal(payload);
      terminalCallListeners.set(eventName, listener);
      socket.on(eventName, listener);
    });

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      terminalCallListeners.forEach((listener, eventName) => {
        socket.off(eventName, listener);
      });
    };
  }, []);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useSocketEvents(useMemo(() => ({
    new_visitor_request: () => loadDashboard({ background: true }),
    visitor_forwarded: () => loadDashboard({ background: true }),
    gate_action_completed: () => loadDashboard({ background: true }),
    call_initiated: () => loadDashboard({ background: true }),
    call_ended: () => {
      setIncomingCall(null);
      loadDashboard({ background: true });
    }
  }), []));

  async function handleAction(sessionId, action) {
    const key = `${sessionId}:${action}`;
    setBusyKey(key);
    setError("");
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const next = enqueueSecurityAction(sessionId, action);
        setQueuedCount(next.length); setIsOffline(true);
        showSuccess("Saved offline — will sync automatically.");
        return;
      }
      await actOnSecurityRequest(sessionId, action);
      await loadDashboard({ background: true });
    } catch (e) {
      if (Number(e?.status ?? 0) === 0) {
        const next = enqueueSecurityAction(sessionId, action);
        setQueuedCount(next.length); setIsOffline(true);
        showSuccess("Saved offline.");
      } else { setError(e?.message || "Unable to update request."); }
    } finally { setBusyKey(""); }
  }

  async function handleValidateAccessCode(e) {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setValidatingCode(true); setError(""); setAccessResult(null);
    try {
      const result = await validateSecurityAccessPass(accessCode);
      setAccessResult(result);
      showSuccess("Access pass verified.");
      setAccessCode("");
      await loadDashboard({ background: true });
    } catch (err) { setError(err?.message || "Invalid access pass code."); }
    finally { setValidatingCode(false); }
  }

  async function startCall(sessionId, type = "audio") {
    const key = `${sessionId}:call:${type}`;
    setBusyKey(key); setError("");
    try {
      const nextMode = type === "video" ? "video" : "audio";
      const response = await startSessionCall({ sessionId, type: nextMode, hasVideo: type === "video" });
      const responseData = response?.data ?? response ?? {};
      window.sessionStorage.setItem(
        "qring_call_start_intent",
        JSON.stringify({
          pending: true,
          sessionId,
          mode: nextMode,
          callSessionId: responseData?.callSessionId || "",
          visitorId: responseData?.visitorId || sessionId,
          rtcConfig: responseData?.rtcConfig || null
        })
      );
      navigate(`/session/${sessionId}/${nextMode}`);
    } catch (e) { setError(e?.message || "Unable to start call."); }
    finally { setBusyKey(""); }
  }

  function handleAnswerIncomingCall() {
    if (!incomingCall?.sessionId || !incomingCall?.callSessionId) return;
    window.sessionStorage.setItem(
      "qring_call_accept_intent",
      JSON.stringify({
        sessionId: incomingCall.sessionId,
        hasVideo: Boolean(incomingCall.hasVideo),
        callSessionId: incomingCall.callSessionId,
        visitorId: incomingCall.visitorId || incomingCall.sessionId
      })
    );
    setIncomingCall(null);
  }

  function getIncomingCallRoleLabel() {
    const role = String(incomingCall?.callerRole || "").trim().toLowerCase();
    if (role === "security") return "Security Desk";
    if (role === "homeowner") return "Homeowner";
    if (role === "visitor") return "Visitor Gate";
    return "Caller";
  }

  function stopCamera() {
    const stream = cameraStreamRef.current;
    cameraStreamRef.current = null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState(p => ({ ...p, starting: false, ready: false }));
  }

  async function startCamera(facingMode = cameraFacingMode) {
    if (cameraState.starting) return;
    stopCamera();
    setCameraState({ starting: true, ready: false, error: "" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraState({ starting: false, ready: true, error: "" });
    } catch (e) {
      setCameraState({ starting: false, ready: false, error: e?.message || "Camera permission denied." });
    }
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 0, h = video.videoHeight || 0;
    if (!w || !h) { setCameraState(p => ({ ...p, error: "Camera feed not ready." })); return; }
    const canvas = canvasRef.current || document.createElement("canvas");
    const scale = Math.min(1, 720 / w);
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    setRegisterForm(p => ({ ...p, snapshotBase64: dataUrl.split(",")[1] || "", snapshotMime: "image/jpeg" }));
    stopCamera();
  }

  async function handleRegisterVisitor(e) {
    e.preventDefault();
    if (!registerForm.doorId) { setError("Please select a target destination."); return; }
    if (!registerForm.snapshotBase64) { setError("A visitor photo capture is required."); return; }
    setRegisteringVisitor(true); setError("");
    try {
      const purposeText = registerForm.purpose.trim();
      const visitorType = /delivery|courier|dispatch/i.test(purposeText) ? "delivery" : "guest";
      const createdRequest = await registerSecurityVisitor({
        requestId: `sec_${Date.now().toString(36)}`,
        name: registerForm.name.trim() || undefined,
        phoneNumber: registerForm.phoneNumber.trim() || undefined,
        doorId: registerForm.doorId,
        purpose: purposeText || undefined,
        visitorType,
        snapshotBase64: registerForm.snapshotBase64,
        snapshotMime: registerForm.snapshotMime
      });
      setRegisterForm(p => ({ ...p, name: "", phoneNumber: "", purpose: "", visitorType: "guest", snapshotBase64: "", snapshotMime: "image/jpeg" }));
      setCameraState({ starting: false, ready: false, error: "" });
      showSuccess("Visitor log created & request sent.");
      setRegisterOpen(false);
      await loadDashboard({ background: true });
      const sessionId = createdRequest?.sessionId || createdRequest?.visitorSessionId || createdRequest?.id;
      if (sessionId) navigate(`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (e) {
      const message = /blocked/i.test(String(e?.message || "")) ? "This visitor is currently flagged on the estate watch list." : e?.message || "Unable to register visitor.";
      setError(message);
    }
    finally { setRegisteringVisitor(false); }
  }

  async function handleVehicleSearch(event) {
    if (event) event.preventDefault();
    if (!hasFeature("vehicle_registration")) {
      setError("Vehicle management is available on Basic and higher estate plans.");
      return;
    }
    setOpsBusy("vehicle-search");
    try {
      setVehicleRows(await listResidentVehicles(vehicleQuery));
    } catch (e) {
      setError(e?.message || "Unable to search vehicles.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handleVehicleGate(vehicleId, action) {
    if (!hasFeature("vehicle_entry_exit_records")) {
      setError("Vehicle gate records are available on Basic and higher estate plans.");
      return;
    }
    setOpsBusy(`${vehicleId}:${action}`);
    try {
      await recordVehicleGateAction(vehicleId, action);
      showSuccess(`Vehicle ${action} recorded.`);
      await handleVehicleSearch();
    } catch (e) {
      setError(e?.message || "Unable to record vehicle activity.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handlePackageArrival(event) {
    event.preventDefault();
    if (!hasFeature("package_tracking")) {
      setError("Package tracking is available on Plus and higher estate plans.");
      return;
    }
    setOpsBusy("package");
    try {
      await createEstatePackage(packageForm);
      showSuccess("Package recorded and resident notified.");
      setPackageForm((prev) => ({ ...prev, courier: "", description: "" }));
      setPackageOpen(false);
    } catch (e) {
      setError(e?.message || "Unable to save package arrival.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handleCreateIncident(e) {
    e.preventDefault();
    setOpsBusy("incident");
    try {
      await createSecurityIncident(incidentForm);
      showSuccess("Incident report logged successfully.");
      setIncidentForm({ incidentType: "general", severity: "medium", description: "", photoUrl: "" });
      setIncidentPhotoName("");
      setIncidentOpen(false);
    } catch (err) {
      setError(err?.message || "Failed to submit incident report.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handleIncidentPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpsBusy("incident-photo");
    try {
      const upload = await uploadSecurityIncidentPhoto(file);
      const photoUrl = typeof upload === "string" ? upload : upload?.photoUrl;
      if (!photoUrl) throw new Error("Incident photo upload did not return a stored URL.");
      setIncidentForm(p => ({ ...p, photoUrl }));
      setIncidentPhotoName(file.name);
      showSuccess("Photo evidence attached.");
    } catch (err) {
      setError(err?.message || "Failed to upload photo.");
    } finally {
      setOpsBusy("");
    }
  }

  async function loadAttendance() {
    setOpsBusy("attendance-load");
    try {
      const rows = await listGuardAttendance();
      setAttendanceRows(rows || []);
    } catch {
      setAttendanceRows([]);
    } finally {
      setOpsBusy("");
    }
  }

  async function handleClockGuardAttendance(type) {
    setOpsBusy(`clock-${type}`);
    try {
      await clockGuardAttendance(type);
      showSuccess(`Guard shift clocked ${type}.`);
      await loadAttendance();
    } catch (err) {
      setError(err?.message || "Unable to clock shift attendance.");
    } finally {
      setOpsBusy("");
    }
  }

  if (loading) return <LoadingState />;

  const queues = data?.queues || {};
  const currentQueueList = queues[activeSection] || [];
  const rules = data?.rules || {};
  const guardProfile = data?.profile || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Top Header Command Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm text-slate-900 tracking-wide">Qring Security</h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GATE LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {guardProfile.estateName || guardProfile.doorName || "Main Access Gate"} {guardProfile.name ? `• ${guardProfile.name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOffline && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline ({queuedCount})</span>
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              disabled={logoutBusy}
              className="p-2.5 rounded-xl bg-slate-100 text-rose-600 hover:bg-rose-50 transition-all active:scale-95 border border-slate-200"
              title="Sign Out"
            >
              {logoutBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-4 space-y-5">
        {/* Error Alert Bar */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-start justify-between gap-3 text-xs shadow-sm"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Access Pass Verification Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm">
          <form onSubmit={handleValidateAccessCode} className="flex items-center gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Visitor Pass Code (e.g., QR-8492)..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={validatingCode || !accessCode.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm active:scale-95"
            >
              {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Verify Code</span>
            </button>
          </form>

          {/* Code Result Banner */}
          {accessResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pass Valid: <strong>{accessResult.visitorName || "Guest"}</strong> → Unit {accessResult.unit || accessResult.homeName || "Approved"}</span>
              </div>
              <button onClick={() => setAccessResult(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Operational Operations Bento Grid */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold tracking-widest text-slate-500 uppercase px-1">Security Operations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <button
              onClick={() => setRegisterOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Log Visitor</span>
                <span className="block text-[10px] text-slate-500">Capture photo & entry</span>
              </div>
            </button>

            <button
              onClick={() => setValidateOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Validate Pass</span>
                <span className="block text-[10px] text-slate-500">Scan & verify code</span>
              </div>
            </button>

            <button
              onClick={() => setVehicleOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-purple-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Vehicle Access</span>
                <span className="block text-[10px] text-slate-500">Plate lookup & log</span>
              </div>
            </button>

            <button
              onClick={() => setPackageOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Parcel Arrival</span>
                <span className="block text-[10px] text-slate-500">Log delivery items</span>
              </div>
            </button>

            <button
              onClick={() => setAttendanceOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Guard Shift</span>
                <span className="block text-[10px] text-slate-500">Clock in/out log</span>
              </div>
            </button>

            <button
              onClick={() => setIncidentOpen(true)}
              className="group bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 p-3.5 rounded-2xl flex flex-col items-start gap-2.5 text-left transition-all active:scale-98 shadow-xs"
            >
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="block font-bold text-xs text-slate-900">Report Incident</span>
                <span className="block text-[10px] text-slate-500">File gate alert</span>
              </div>
            </button>
          </div>
        </section>

        {/* Security Rules Summary Bar */}
        {rules && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <PolicyPill label="Auto-Approve" active={Boolean(rules.autoApproveRepeatVisitors)} />
            <PolicyPill label="Facial Verification" active={Boolean(rules.requireFacePhoto)} />
            <PolicyPill label="Guard Forwarding" active={Boolean(rules.allowGuardDirectApproval)} />
          </div>
        )}

        {/* Visitor Requests Main Section */}
        <section className="space-y-3">
          {/* Segmented Control Navigation */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-x-auto scrollbar-none">
            {SECTIONS.map((sec) => {
              const count = (queues[sec.key] || []).length;
              const isActive = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  onClick={() => setActiveSection(sec.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{sec.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isActive ? "bg-white text-blue-700" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Visitor Cards List */}
          {currentQueueList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {SECTIONS.find((s) => s.key === activeSection)?.emptyText}
              </p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {currentQueueList.map((row) => (
                <VisitorLogRow
                  key={row.sessionId || row.visitorSessionId || row.id}
                  row={row}
                  sectionKey={activeSection}
                  busyKey={busyKey}
                  canApprove={Boolean(rules.allowGuardDirectApproval)}
                  onAction={handleAction}
                  onCall={startCall}
                />
              ))}
            </motion.div>
          )}
        </section>
      </main>

      {/* Floating Incoming Call Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-white border-2 border-blue-600 text-slate-900 rounded-3xl p-4 shadow-2xl z-50 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center animate-pulse border border-blue-200">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase">Incoming Call</span>
                <h4 className="font-bold text-sm text-slate-900">{incomingCall.callerName || "Estate Call"}</h4>
                <p className="text-[11px] text-slate-500">{getIncomingCallRoleLabel()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncomingCall(null)}
                className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 active:scale-95 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleAnswerIncomingCall}
                className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Answer</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Register Visitor */}
      <MobileBottomSheet open={registerOpen} onClose={() => setRegisterOpen(false)} title="Log New Visitor">
        <form onSubmit={handleRegisterVisitor} className="space-y-4 pt-1 text-slate-900">
          {/* Camera Viewfinder Box */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 aspect-video flex items-center justify-center">
            {registerForm.snapshotBase64 ? (
              <div className="relative w-full h-full">
                <img
                  src={`data:image/jpeg;base64,${registerForm.snapshotBase64}`}
                  alt="Visitor Snapshot"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRegisterForm(p => ({ ...p, snapshotBase64: "" }));
                    startCamera(cameraFacingMode);
                  }}
                  className="absolute bottom-3 right-3 bg-white/90 text-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-slate-200 shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {cameraState.ready && (
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 px-4">
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = cameraFacingMode === "environment" ? "user" : "environment";
                        setCameraFacingMode(nextMode);
                        startCamera(nextMode);
                      }}
                      className="p-3 rounded-2xl bg-white/90 text-slate-900 border border-slate-200 backdrop-blur-md active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={captureSnapshot}
                      className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capture Photo</span>
                    </button>
                  </div>
                )}

                {cameraState.starting && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-xs text-slate-200 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Opening Camera...</span>
                  </div>
                )}

                {cameraState.error && (
                  <div className="p-4 text-center text-xs text-rose-400">
                    <p>{cameraState.error}</p>
                    <button
                      type="button"
                      onClick={() => startCamera(cameraFacingMode)}
                      className="mt-2 px-3 py-1 bg-slate-800 text-white rounded-lg font-bold"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Resident / Unit</label>
              <select
                value={registerForm.doorId}
                onChange={(e) => setRegisterForm(p => ({ ...p, doorId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
              >
                {doorOptions.map((door) => (
                  <option key={door.id} value={door.id}>
                    {formatDestinationOption(door)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Visitor Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={registerForm.phoneNumber}
                  onChange={(e) => setRegisterForm(p => ({ ...p, phoneNumber: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose / Notes</label>
              <input
                type="text"
                placeholder="e.g. Delivery, Guest, Maintenance..."
                value={registerForm.purpose}
                onChange={(e) => setRegisterForm(p => ({ ...p, purpose: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Watchlist notice */}
          {blockedRows.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Estate Watchlist active ({blockedRows.length} blocked visitors).</span>
            </div>
          )}

          <button
            type="submit"
            disabled={registeringVisitor || !registerForm.snapshotBase64}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {registeringVisitor ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            <span>Log Visitor & Notify Host</span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* MODAL: Validate Pass */}
      <MobileBottomSheet open={validateOpen} onClose={() => setValidateOpen(false)} title="Validate Access Pass">
        <form onSubmit={handleValidateAccessCode} className="space-y-4 pt-1 text-slate-900">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Access Pass Code</label>
            <input
              type="text"
              placeholder="Enter Code (e.g., QR-9921)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 uppercase focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={validatingCode || !accessCode.trim()}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Verify Access Pass</span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* MODAL: Vehicle Access */}
      <MobileBottomSheet open={vehicleOpen} onClose={() => setVehicleOpen(false)} title="Vehicle Access Lookup">
        <div className="space-y-4 pt-1 text-slate-900">
          <form onSubmit={handleVehicleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="License plate or resident name..."
                value={vehicleQuery}
                onChange={(e) => setVehicleQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={opsBusy === "vehicle-search"}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              {opsBusy === "vehicle-search" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {vehicleRows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No matching vehicles found.</p>
            ) : (
              vehicleRows.map((veh) => (
                <div key={veh.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900">{veh.plateNumber || veh.licensePlate}</h5>
                    <p className="text-[11px] text-slate-500">{veh.makeModel || "Resident Vehicle"} • {veh.residentName || "Unit Resident"}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleVehicleGate(veh.id, "entry")}
                      disabled={!!opsBusy}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[10px] hover:bg-emerald-100"
                    >
                      Entry
                    </button>
                    <button
                      onClick={() => handleVehicleGate(veh.id, "exit")}
                      disabled={!!opsBusy}
                      className="px-2.5 py-1.5 bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-[10px] hover:bg-slate-300"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </MobileBottomSheet>

      {/* MODAL: Parcel Tracking */}
      <MobileBottomSheet open={packageOpen} onClose={() => setPackageOpen(false)} title="Log Package Arrival">
        <form onSubmit={handlePackageArrival} className="space-y-3 pt-1 text-slate-900">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination Unit</label>
            <select
              value={packageForm.homeId}
              onChange={(e) => setPackageForm((p) => ({ ...p, homeId: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
            >
              {doorOptions.map((door) => (
                <option key={door.id} value={door.homeId || door.id}>
                  {formatDestinationOption(door)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Courier / Dispatch Service</label>
            <input
              type="text"
              placeholder="e.g. DHL, FedEx, Amazon, Chowdeck..."
              value={packageForm.courier}
              onChange={(e) => setPackageForm((p) => ({ ...p, courier: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description / Waybill</label>
            <input
              type="text"
              placeholder="e.g. 2 Brown boxes, Envelope..."
              value={packageForm.description}
              onChange={(e) => setPackageForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={opsBusy === "package"}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {opsBusy === "package" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            <span>Log Delivery & Alert Resident</span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* MODAL: Guard Shift Attendance */}
      <MobileBottomSheet open={attendanceOpen} onClose={() => setAttendanceOpen(false)} title="Guard Shift Attendance">
        <div className="space-y-4 pt-1 text-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleClockGuardAttendance("in")}
              disabled={!!opsBusy}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Clock3 className="w-4 h-4" />
              <span>Clock IN Shift</span>
            </button>
            <button
              onClick={() => handleClockGuardAttendance("out")}
              disabled={!!opsBusy}
              className="py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Clock OUT Shift</span>
            </button>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            <h5 className="text-[10px] font-bold text-slate-500 uppercase">Recent Shift Clockings</h5>
            {attendanceRows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No recent shift logs.</p>
            ) : (
              attendanceRows.map((att, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 capitalize">{att.guardName || "Duty Guard"}</span>
                  <span className="text-slate-500 text-[11px]">
                    {(att.type || att.status || "shift").toUpperCase()} • {new Date(att.timestamp || att.createdAt || att.clockInAt || att.clockOutAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </MobileBottomSheet>

      {/* MODAL: Incident Report */}
      <MobileBottomSheet open={incidentOpen} onClose={() => setIncidentOpen(false)} title="Report Security Incident">
        <form onSubmit={handleCreateIncident} className="space-y-3 pt-1 text-slate-900">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
              <select
                value={incidentForm.incidentType}
                onChange={(e) => setIncidentForm(p => ({ ...p, incidentType: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="general">General Issue</option>
                <option value="unauthorized_entry">Unauthorized Entry</option>
                <option value="property_damage">Property Damage</option>
                <option value="disturbance">Noise / Disturbance</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Severity</label>
              <select
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm(p => ({ ...p, severity: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High / Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Incident Details</label>
            <textarea
              rows={3}
              placeholder="Describe what occurred at the gate..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Photo Evidence (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleIncidentPhotoUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
            />
            {incidentPhotoName && <p className="text-[10px] text-emerald-700 mt-1">Attached: {incidentPhotoName}</p>}
          </div>

          <button
            type="submit"
            disabled={opsBusy === "incident"}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {opsBusy === "incident" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            <span>File Security Incident</span>
          </button>
        </form>
      </MobileBottomSheet>
    </div>
  );
}
