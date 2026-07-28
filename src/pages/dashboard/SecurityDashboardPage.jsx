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
  Bell,
  SlidersHorizontal,
  LogOut
} from "lucide-react";

import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
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

const SECTIONS = [
  { key: "newRequests", label: "New Requests", emptyText: "No new incoming requests." },
  { key: "waitingForHomeowner", label: "Pending Host", emptyText: "No requests waiting for homeowner approval." },
  { key: "approvedPendingEntry", label: "At Gate", emptyText: "No visitors currently waiting at the gate." },
  { key: "completed", label: "Completed", emptyText: "No recent security logs." }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Loading Gate System...</p>
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
    "flex-1 py-3 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 touch-manipulation";

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col gap-3.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {row.snapshotUrl || row.snapshotBase64 ? (
            <img
              src={row.snapshotUrl || `data:image/jpeg;base64,${row.snapshotBase64}`}
              alt={row.visitorName || "Visitor"}
              className="w-12 h-12 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-slate-700/60"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shrink-0 flex items-center justify-center text-slate-400">
              <UserCheck className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {row.visitorName || "Guest Visitor"}
              </h4>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {row.purpose || row.visitorType || "Visitor"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              To: <span className="font-semibold text-slate-700 dark:text-slate-200">{row.homeownerName || row.doorName || "Main Door"}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <Clock3 className="w-3 h-3" />
              <span>{row.createdAt ? new Date(row.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Chat with visitor"
            >
              <MessageSquare className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setControlsOpen((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                controlsOpen
                  ? "bg-slate-900 text-white dark:bg-blue-600"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
              }`}
              aria-expanded={controlsOpen}
              aria-controls={`security-controls-${sessionId}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Manage</span>
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
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
              {sectionKey === "newRequests" && (
                <>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onAction(sessionId, "forward")}
                    className={`${actionButtonClass} border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/30`}
                  >
                    {isBusy("forward") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    <span>Forward</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onAction(sessionId, "reject")}
                    className={`${actionButtonClass} border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/30`}
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
                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Audio Call"
                  >
                    {isCalling("audio") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    disabled={!!busyKey}
                    onClick={() => onCall(sessionId, "video")}
                    className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 active:scale-95 transition-all flex items-center justify-center shrink-0"
                    title="Video Call"
                  >
                    {isCalling("video") ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  </button>

                  {row.autoApproveSuggested && (
                    <button
                      type="button"
                      disabled={!!busyKey}
                      onClick={() => onAction(sessionId, "approve_repeat_visitor")}
                      className={`${actionButtonClass} border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400`}
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
                      className={`${actionButtonClass} border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400`}
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
                        className={`${actionButtonClass} border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30`}
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
                <span className="w-full text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 py-2 rounded-xl">
                  Entry Logged & Processed
                </span>
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
    <div className={`rounded-2xl border p-3 flex-1 min-w-[140px] ${active ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`} />
        <p className={`text-[10px] font-bold uppercase tracking-tight truncate ${active ? "text-emerald-800 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>{label}</p>
      </div>
      <p className={`mt-1 text-xs font-bold ${active ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400 dark:text-slate-500"}`}>{active ? "Active" : "Off"}</p>
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
  const [registeringVisitor, setRegisteringVisitor] = useState(false);

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
      // Local auth state is still cleared by the auth provider.
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
      } catch { if (active) setDoorOptions([]); }
    }
    loadDoors();
    return () => { active = false; };
  }, []);

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
    setValidatingCode(true); setError(""); setAccessResult(null);
    try {
      const result = await validateSecurityAccessPass(accessCode);
      setAccessResult(result);
      showSuccess("Access validated.");
      setAccessCode("");
      await loadDashboard({ background: true });
    } catch (err) { setError(err?.message || "Invalid access code."); }
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
    if (role === "security") return "Security";
    if (role === "homeowner") return "Homeowner";
    if (role === "visitor") return "Visitor";
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
      setCameraState({ starting: false, ready: false, error: e?.message || "Camera access denied." });
    }
  }

  function captureSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth || 0, h = video.videoHeight || 0;
    if (!w || !h) { setCameraState(p => ({ ...p, error: "Camera not ready yet." })); return; }
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
    if (!registerForm.doorId) { setError("Select a door first."); return; }
    if (!registerForm.snapshotBase64) { setError("Capture a photo first."); return; }
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
      showSuccess("Request sent to homeowner.");
      setRegisterOpen(false);
      await loadDashboard({ background: true });
      const sessionId = createdRequest?.sessionId || createdRequest?.visitorSessionId || createdRequest?.id;
      if (sessionId) navigate(`/dashboard/security/messages?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (e) { setError(e?.message || "Unable to register visitor."); }
    finally { setRegisteringVisitor(false); }
  }

  const summary = useMemo(() => {
    const q = data?.queues || {};
    return {
      newRequests: q.newRequests?.length || 0,
      waiting: q.waitingForHomeowner?.length || 0,
      pendingEntry: q.approvedPendingEntry?.length || 0,
      completed: q.completed?.length || 0
    };
  }, [data]);

  const activeRows = Array.isArray(data?.queues?.[activeSection]) ? data.queues[activeSection] : [];
  const activeSectionMeta = SECTIONS.find(s => s.key === activeSection);
  const gateName = data?.profile?.gateId || "Gate Console";
  const rules = data?.rules || {};
  const suspiciousAlerts = Array.isArray(data?.alerts) ? data.alerts : [];
  const policyItems = [
    { label: "Guard instant approval", active: !!rules.canApproveWithoutHomeowner },
    { label: "Notify homeowners", active: !!rules.mustNotifyHomeowner },
    { label: "Photo verification", active: !!rules.requirePhotoVerification },
    { label: "Call before approval", active: !!rules.requireCallBeforeApproval },
    { label: "Trusted visitor automation", active: !!rules.autoApproveTrustedVisitors }
  ];

  if (loading) return <LoadingState />;

  return (
    <div className="bg-slate-100 dark:bg-slate-950 min-h-screen pb-32 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white">
      {/* Sticky Top Mobile Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 safe-top">
        <div className="px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-slate-900 dark:text-white truncate">{gateName}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isOffline ? 'bg-amber-400 animate-pulse' : refreshing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">
                  {isOffline ? "Offline Mode" : refreshing ? "Syncing..." : `Officer ${data?.profile?.fullName || "On Duty"}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {queuedCount > 0 && (
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-xl">
                {queuedCount} Offline
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl transition-all active:scale-95"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutBusy}
              className="p-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              title="Sign out"
            >
              {logoutBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Body */}
      <main className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* Operational Status Notices */}
        {isOffline && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 rounded-2xl p-3.5 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Working offline. Actions will queue and sync when network returns.</span>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 rounded-2xl p-3.5 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {incomingCall?.sessionId && (
          <div className="bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 rounded-3xl p-4 shadow-lg flex flex-col gap-3">
            <div>
              <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full inline-block mb-1">
                Incoming {getIncomingCallRoleLabel()} Call
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {incomingCall.callerName || incomingCall.homeownerName || incomingCall.visitorName || "Incoming Caller"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {incomingCall.callerOrigin ? `Gate: ${incomingCall.callerOrigin}` : "Tap answer to connect."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/session/${encodeURIComponent(incomingCall.sessionId)}/${incomingCall.hasVideo ? "video" : "audio"}`}
                onClick={handleAnswerIncomingCall}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-3 rounded-2xl transition-all shadow-md active:scale-95"
              >
                {incomingCall.hasVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                Answer Call
              </Link>
              <button
                type="button"
                onClick={() => setIncomingCall(null)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-3 rounded-2xl transition-colors active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Gate Actions Hero Bento Box */}
        <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-5 text-white shadow-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Security Gate Operations</p>
              <h2 className="text-lg font-bold mt-0.5">Quick Access Console</h2>
            </div>
            <div className="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRegisterOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-2xl p-3.5 flex flex-col items-start justify-between gap-3 text-left transition-all shadow-md"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-xs">Register Guest</p>
                <p className="text-[10px] text-blue-100 opacity-80 mt-0.5">Capture walk-in entry</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setValidateOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700/80 rounded-2xl p-3.5 flex flex-col items-start justify-between gap-3 text-left transition-all shadow-md"
            >
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-xs">Verify Code</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Check access pass</p>
              </div>
            </button>
          </div>
        </div>

        {/* Gate Overview */}
        <section className="grid grid-cols-2 gap-3">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-2xl border p-3 text-left transition-all active:scale-95 ${
                activeSection === section.key
                  ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
                  : "border-slate-200/80 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              }`}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-tight text-slate-500 dark:text-slate-400">{section.label}</p>
              <p className="mt-1 text-2xl font-black">{summary[section.key] || 0}</p>
            </button>
          ))}
        </section>

        {/* Security Comms */}
        <section className="grid grid-cols-2 gap-3">
          <Link
            to="/dashboard/security/messages"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-slate-900 shadow-sm transition-all active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center dark:bg-blue-950/40 dark:text-blue-300">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Open</span>
            </div>
            <p className="mt-3 text-xs font-black">Messages</p>
          </Link>
          <Link
            to="/dashboard/security/emergency"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 text-slate-900 shadow-sm transition-all active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center dark:bg-rose-950/40 dark:text-rose-300">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Alerts</span>
            </div>
            <p className="mt-3 text-xs font-black">Security Alerts</p>
          </Link>
        </section>

        {/* Policy Horizontal Quick Scroll */}
        {/* <div className="overflow-x-auto no-scrollbar flex items-center gap-2 py-1 -mx-4 px-4">
          {policyItems.map((item, idx) => (
            <PolicyPill key={idx} label={item.label} active={item.active} />
          ))}
        </div> */}

        {/* Suspicious Alerts Banner */}
        {suspiciousAlerts.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>Gate Security Alerts ({suspiciousAlerts.length})</span>
            </div>
            <div className="space-y-1">
              {suspiciousAlerts.map((a, i) => (
                <p key={i} className="text-[11px] text-rose-600 dark:text-rose-300 font-medium">{a.message || a}</p>
              ))}
            </div>
          </div>
        )}

        {/* Tab Selection Filter Pills */}
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {SECTIONS.map((section) => {
            const count = summary[section.key] || 0;
            const isActive = activeSection === section.key;
            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{section.label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Visitor Log Section */}
        <section className="space-y-3">
          <AnimatePresence mode="wait">
            {activeRows.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">{activeSectionMeta?.emptyText}</p>
                <p className="text-[11px] text-slate-400">New requests will automatically stream to this queue.</p>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {activeRows.map((row) => (
                  <VisitorLogRow
                    key={row.sessionId || row.visitorSessionId || row.id}
                    row={row}
                    sectionKey={activeSection}
                    busyKey={busyKey}
                    canApprove={rules?.canApproveWithoutHomeowner}
                    onAction={handleAction}
                    onCall={startCall}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Register Visitor Bottom Sheet */}
      <MobileBottomSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register Visitor"
      >
        <form onSubmit={handleRegisterVisitor} className="space-y-4 pt-1 pb-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Property Unit / Resident</label>
              <select
                value={registerForm.doorId}
                onChange={e => setRegisterForm(p => ({ ...p, doorId: e.target.value }))}
                required
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {doorOptions.length === 0 && <option value="">No doors available</option>}
                {doorOptions.map(d => (
                  <option key={d.id} value={d.id}>{formatDestinationOption(d)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Visitor Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={registerForm.name}
                  onChange={e => setRegisterForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Optional"
                  value={registerForm.phoneNumber}
                  onChange={e => setRegisterForm(p => ({ ...p, phoneNumber: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Purpose / Note</label>
              <input
                type="text"
                placeholder="e.g., Delivery, Guest visit"
                value={registerForm.purpose}
                onChange={e => setRegisterForm(p => ({ ...p, purpose: e.target.value }))}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Camera Capture Viewport */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Visitor Photo Verification</label>
              <div className="relative rounded-2xl bg-slate-900 overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                {registerForm.snapshotBase64 ? (
                  <div className="relative w-full h-full">
                    <img
                      src={`data:${registerForm.snapshotMime};base64,${registerForm.snapshotBase64}`}
                      alt="Captured Snapshot"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterForm(p => ({ ...p, snapshotBase64: "" }));
                        startCamera(cameraFacingMode);
                      }}
                      className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retake
                    </button>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {cameraState.starting && (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          <span className="text-xs font-medium">Starting Camera...</span>
                        </div>
                      )}
                      {cameraState.error && (
                        <p className="text-xs font-semibold text-rose-400 px-4 text-center">{cameraState.error}</p>
                      )}
                    </div>

                    {cameraState.ready && (
                      <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const nextFacing = cameraFacingMode === "environment" ? "user" : "environment";
                            setCameraFacingMode(nextFacing);
                            startCamera(nextFacing);
                          }}
                          className="p-2.5 bg-slate-900/80 backdrop-blur-md text-white rounded-xl"
                          title="Switch Camera"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={captureSnapshot}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg active:scale-95"
                        >
                          <Camera className="w-4 h-4" /> Capture Snapshot
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={registeringVisitor || !registerForm.snapshotBase64}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            {registeringVisitor ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Notify Homeowner</span>
          </button>
        </form>
      </MobileBottomSheet>

      {/* Validate Access Code Bottom Sheet */}
      <MobileBottomSheet
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        title="Verify Access Code"
      >
        <div className="space-y-4 pt-1 pb-6">
          <form onSubmit={handleValidateAccessCode} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Enter Passcode / Token</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 849201"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  required
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={validatingCode || !accessCode.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-5 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                >
                  {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                </button>
              </div>
            </div>
          </form>

          {accessResult && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Access Pass Validated</span>
              </div>
              <div className="text-xs space-y-1 text-emerald-800 dark:text-emerald-300 font-medium">
                <p>Visitor: <span className="font-bold">{accessResult.visitorName || "Authorized Guest"}</span></p>
                <p>Host: <span className="font-bold">{accessResult.homeownerName || "Resident"}</span></p>
                {accessResult.homeName && <p>Home: <span className="font-bold">{accessResult.homeName}</span></p>}
                {accessResult.doorName && <p>Door: <span className="font-bold">{accessResult.doorName}</span></p>}
                <p>Access Type: <span className="font-bold">{accessResult.passType || "Standard Entry"}</span></p>
              </div>
            </div>
          )}
        </div>
      </MobileBottomSheet>
    </div>
  );
}
