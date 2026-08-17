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
  AlertTriangle,
  Shield
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
  { key: "newRequests", label: "New Requests", emptyText: "No incoming visitor requests at this moment." },
  { key: "waitingForHomeowner", label: "Pending Host", emptyText: "No requests waiting for resident approval." },
  { key: "approvedPendingEntry", label: "At Gate", emptyText: "No visitors currently waiting at the gate." },
  { key: "completed", label: "Completed Log", emptyText: "No recent security logs recorded today." }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm relative">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full animate-ping" />
      </div>
      <p className="text-xs font-bold tracking-wider uppercase text-slate-500 mt-4">Loading Security Station...</p>
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
      className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {row.snapshotUrl || row.snapshotBase64 ? (
            <SecureSnapshotImage
              src={row.snapshotUrl || `data:image/jpeg;base64,${row.snapshotBase64}`}
              alt={row.visitorName || "Visitor"}
              visitorSessionId={sessionId}
              className="w-14 h-14 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-200 shadow-inner"
              fallback={
                <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                  <UserCheck className="w-6 h-6" />
                </div>
              }
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
              <UserCheck className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900 truncate">
                {row.visitorName || "Guest Visitor"}
              </h4>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                {row.purpose || row.visitorType || "Visitor"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 truncate">
              Destination: <span className="font-semibold text-slate-900">{row.homeownerName || row.doorName || "Main Gate"}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
              <Clock3 className="w-3.5 h-3.5 text-slate-400" />
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
      // Local auth state cleared by provider
    } finally {
      setLogoutBusy(false);
      navigate("/login", { replace: true });
    }
  }

  async function loadAttendance() {
    try {
      const rows = await listGuardAttendance();
      setAttendanceRows(rows);
    } catch {
      setAttendanceRows([]);
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
    navigate(`/session/${incomingCall.sessionId}/${incomingCall.hasVideo ? "video" : "audio"}`);
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

  async function handleClockGuard(type) {
    setOpsBusy(`clock-${type}`);
    try {
      await clockGuardAttendance(type);
      showSuccess(`Guard clock ${type} logged.`);
      await loadAttendance();
    } catch (e) {
      setError(e?.message || "Unable to log guard clocking.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handleIncidentPhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpsBusy("incident-photo");
    try {
      const url = await uploadSecurityIncidentPhoto(file);
      setIncidentForm(p => ({ ...p, photoUrl: url }));
      setIncidentPhotoName(file.name);
      showSuccess("Incident image attached.");
    } catch (err) {
      setError(err?.message || "Failed to upload incident photo.");
    } finally {
      setOpsBusy("");
    }
  }

  async function handleReportIncident(e) {
    e.preventDefault();
    setOpsBusy("incident");
    try {
      await createSecurityIncident(incidentForm);
      showSuccess("Security incident report submitted.");
      setIncidentForm({ incidentType: "general", severity: "medium", description: "", photoUrl: "" });
      setIncidentPhotoName("");
      setIncidentOpen(false);
    } catch (err) {
      setError(err?.message || "Unable to submit incident report.");
    } finally {
      setOpsBusy("");
    }
  }

  if (loading) return <LoadingState />;

  const profile = data?.profile;
  const queues = data?.queues || {};
  const canApprove = Boolean(data?.rules?.canApprove ?? profile?.canApproveDirectly);
  const activeList = queues[activeSection] || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Streamlined Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Gate Identification */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {profile?.estateName || "Security Station"}
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                {profile?.doorName || "Main Gate Station"}
              </p>
            </div>
          </div>

          {/* Direct Messages & Actions */}
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/security/messages"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200/80 active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Messages</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 active:scale-95"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutBusy}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
              title="Sign Out"
            >
              {logoutBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Offline / Queued Actions Banner */}
      <AnimatePresence>
        {(isOffline || queuedCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-between gap-2 shadow-inner"
          >
            <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                {isOffline ? "Offline Mode active." : "Network reconnected."}{" "}
                {queuedCount > 0 && `${queuedCount} action(s) saved locally pending sync.`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Call Alert Bar */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="bg-indigo-600 text-white p-4 shadow-xl border-b border-indigo-700 relative z-40"
          >
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">
                    Incoming Call
                  </div>
                  <div className="font-bold text-sm">
                    {incomingCall.callerName || "Estate Resident"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAnswerIncomingCall}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs flex items-center gap-2 text-white shadow-sm transition-all active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>Answer Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIncomingCall(null)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-6xl mx-auto px-4 pt-5 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")} className="p-1 text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Gate Action Toolbar */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => setValidateOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Validate Code</span>
          </button>

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Log Visitor</span>
          </button>

          <button
            type="button"
            onClick={() => setVehicleOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Vehicles</span>
          </button>

          <button
            type="button"
            onClick={() => setPackageOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-amber-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Deliveries</span>
          </button>

          <button
            type="button"
            onClick={() => setAttendanceOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Guard Shift</span>
          </button>

          <button
            type="button"
            onClick={() => setIncidentOpen(true)}
            className="p-3.5 bg-white rounded-2xl border border-slate-200/80 hover:border-rose-300 shadow-2xs hover:shadow-xs transition-all flex flex-col items-center text-center gap-2 group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Incident</span>
          </button>
        </section>

        {/* Section Navigation Tabs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SECTIONS.map((sec) => {
              const count = (queues[sec.key] || []).length;
              const isActive = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setActiveSection(sec.key)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 hover:text-slate-900 border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <span>{sec.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Visitor Queue Listing */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={activeSection}
            className="space-y-3"
          >
            {activeList.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center flex flex-col items-center justify-center shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {SECTIONS.find((s) => s.key === activeSection)?.emptyText}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  New activities and visitor requests will appear here dynamically.
                </p>
              </div>
            ) : (
              activeList.map((row) => (
                <VisitorLogRow
                  key={row.sessionId || row.visitorSessionId || row.id}
                  row={row}
                  sectionKey={activeSection}
                  busyKey={busyKey}
                  canApprove={canApprove}
                  onAction={handleAction}
                  onCall={startCall}
                />
              ))
            )}
          </motion.div>
        </section>
      </main>

      {/* Validate Pass Sheet */}
      <MobileBottomSheet
        isOpen={validateOpen}
        onClose={() => { setValidateOpen(false); setAccessResult(null); }}
        title="Verify Access Pass Code"
      >
        <div className="p-4 space-y-4">
          <form onSubmit={handleValidateAccessCode} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Entry Pass Code
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PASS-8920"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={validatingCode || !accessCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </button>
              </div>
            </div>
          </form>

          {accessResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Valid Pass Code</span>
              </div>
              <div className="text-xs space-y-1 text-emerald-800">
                <p>Visitor: <span className="font-semibold">{accessResult.visitorName || accessResult.name || "Guest"}</span></p>
                <p>Host: <span className="font-semibold">{accessResult.homeownerName || accessResult.host || "Resident"}</span></p>
                <p>Destination: <span className="font-semibold">{accessResult.unitName || accessResult.doorName || "Estate Unit"}</span></p>
              </div>
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* Log Visitor Sheet */}
      <MobileBottomSheet
        isOpen={registerOpen}
        onClose={() => { setRegisterOpen(false); stopCamera(); }}
        title="Log Visitor Entry Request"
      >
        <form onSubmit={handleRegisterVisitor} className="p-4 space-y-4">
          {/* Watch list warning if blocked rows match */}
          {blockedRows.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Estate Watch List active: {blockedRows.length} blocked visitor records logged.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Destination <span className="text-rose-500">*</span>
            </label>
            <select
              value={registerForm.doorId}
              onChange={(e) => setRegisterForm((p) => ({ ...p, doorId: e.target.value }))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Select Property Unit / Access Point</option>
              {doorOptions.map((door) => (
                <option key={door.id} value={door.id}>
                  {formatDestinationOption(door)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Visitor Name
              </label>
              <input
                type="text"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={registerForm.phoneNumber}
                onChange={(e) => setRegisterForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="08012345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Purpose / Visitor Type
            </label>
            <input
              type="text"
              value={registerForm.purpose}
              onChange={(e) => setRegisterForm((p) => ({ ...p, purpose: e.target.value }))}
              placeholder="e.g. Guest visit, Courier Delivery, Maintenance"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Photo Capture Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Visitor Photo Capture <span className="text-rose-500">*</span>
            </label>
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[200px] flex items-center justify-center border border-slate-200">
              {registerForm.snapshotBase64 ? (
                <div className="relative w-full h-52">
                  <img
                    src={`data:image/jpeg;base64,${registerForm.snapshotBase64}`}
                    alt="Captured Visitor"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterForm((p) => ({ ...p, snapshotBase64: "" }));
                      startCamera(cameraFacingMode);
                    }}
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake</span>
                  </button>
                </div>
              ) : (
                <div className="w-full h-52 relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {cameraState.ready && (
                    <div className="absolute bottom-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextMode = cameraFacingMode === "user" ? "environment" : "user";
                          setCameraFacingMode(nextMode);
                          startCamera(nextMode);
                        }}
                        className="p-2 rounded-xl bg-slate-900/70 text-white hover:bg-slate-900 backdrop-blur-xs"
                        title="Switch Camera"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {cameraState.starting && (
                    <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-xs font-bold gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      <span>Starting Camera...</span>
                    </div>
                  )}

                  {cameraState.error && (
                    <div className="p-4 text-center text-rose-300 text-xs">
                      <p>{cameraState.error}</p>
                      <button
                        type="button"
                        onClick={() => startCamera(cameraFacingMode)}
                        className="mt-2 text-white font-bold underline"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={registeringVisitor || !registerForm.snapshotBase64}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {registeringVisitor ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Submit Visitor Request</span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* Vehicle Gate Log Sheet */}
      <MobileBottomSheet
        isOpen={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title="Vehicle Entry & Exit Log"
      >
        <div className="p-4 space-y-4">
          <form onSubmit={handleVehicleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={vehicleQuery}
                onChange={(e) => setVehicleQuery(e.target.value)}
                placeholder="Search License Plate or Resident Name"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={opsBusy === "vehicle-search"}
              className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              Search
            </button>
          </form>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {vehicleRows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No vehicles matched search criteria.</p>
            ) : (
              vehicleRows.map((veh) => (
                <div
                  key={veh.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 uppercase font-mono">{veh.plateNumber || veh.licensePlate}</div>
                    <div className="text-[11px] text-slate-500">{veh.makeModel || "Resident Vehicle"} - {veh.homeownerName || "Resident"}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!!opsBusy}
                      onClick={() => handleVehicleGate(veh.id, "entry")}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                    >
                      Log Entry
                    </button>
                    <button
                      type="button"
                      disabled={!!opsBusy}
                      onClick={() => handleVehicleGate(veh.id, "exit")}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white font-bold text-[11px]"
                    >
                      Log Exit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </MobileBottomSheet>

      {/* Package Arrival Sheet */}
      <MobileBottomSheet
        isOpen={packageOpen}
        onClose={() => setPackageOpen(false)}
        title="Log Package Delivery"
      >
        <form onSubmit={handlePackageArrival} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Destination Unit</label>
            <select
              value={packageForm.homeId}
              onChange={(e) => setPackageForm((p) => ({ ...p, homeId: e.target.value }))}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
            >
              <option value="">Select Property Unit</option>
              {doorOptions.map((door) => (
                <option key={door.id} value={door.homeId || door.id}>
                  {formatDestinationOption(door)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Courier / Courier Name</label>
            <input
              type="text"
              value={packageForm.courier}
              onChange={(e) => setPackageForm((p) => ({ ...p, courier: e.target.value }))}
              placeholder="e.g. DHL, FedEx, Amazon, Local Dispatch"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              value={packageForm.description}
              onChange={(e) => setPackageForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="e.g. 2 medium cardboard boxes left at gate office"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={opsBusy === "package"}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
          >
            {opsBusy === "package" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Delivery Log"}
          </button>
        </form>
      </MobileBottomSheet>

      {/* Guard Attendance Sheet */}
      <MobileBottomSheet
        isOpen={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        title="Guard Attendance Shift Log"
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={!!opsBusy}
              onClick={() => handleClockGuard("clock_in")}
              className="py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Clock3 className="w-4 h-4" />
              <span>Clock In Shift</span>
            </button>
            <button
              type="button"
              disabled={!!opsBusy}
              onClick={() => handleClockGuard("clock_out")}
              className="py-3 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Clock3 className="w-4 h-4" />
              <span>Clock Out Shift</span>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">Today's Shift Activity</h4>
            {attendanceRows.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No shift clocks recorded today.</p>
            ) : (
              attendanceRows.map((att) => (
                <div key={att.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                  <span className="font-semibold text-slate-800 uppercase">{att.type || att.action}</span>
                  <span className="text-slate-500 font-mono">{new Date(att.timestamp || att.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </MobileBottomSheet>

      {/* Incident Report Sheet */}
      <MobileBottomSheet
        isOpen={incidentOpen}
        onClose={() => setIncidentOpen(false)}
        title="Report Security Incident"
      >
        <form onSubmit={handleReportIncident} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Incident Category</label>
              <select
                value={incidentForm.incidentType}
                onChange={(e) => setIncidentForm((p) => ({ ...p, incidentType: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="general">General Alert</option>
                <option value="unauthorized_entry">Unauthorized Entry</option>
                <option value="property_damage">Property Damage</option>
                <option value="noise_complaint">Noise Complaint</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Severity Level</label>
              <select
                value={incidentForm.severity}
                onChange={(e) => setIncidentForm((p) => ({ ...p, severity: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High / Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description / Details</label>
            <textarea
              value={incidentForm.description}
              onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe what occurred, location, individuals involved..."
              rows={3}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Attach Photo Evidence (Optional)</label>
            <div className="flex items-center gap-2">
              <label className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-200">
                <span>Upload Image</span>
                <input type="file" accept="image/*" onChange={handleIncidentPhotoUpload} className="hidden" />
              </label>
              {incidentPhotoName && (
                <span className="text-xs text-slate-600 truncate font-mono">{incidentPhotoName}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={opsBusy === "incident"}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
          >
            {opsBusy === "incident" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Submit Incident Report"}
          </button>
        </form>
      </MobileBottomSheet>
    </div>
  );
}
