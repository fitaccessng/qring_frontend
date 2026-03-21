import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock3, Package, Phone,
  PlusCircle, ShieldCheck, Star, Video, XCircle,
  ChevronDown, WifiOff, RefreshCw, X, Camera, RotateCcw
} from "lucide-react";
import AppShell from "../../layouts/AppShell";
import MobileBottomSheet from "../../components/mobile/MobileBottomSheet";
import {
  getSecurityDashboard, actOnSecurityRequest,
  getSecurityDoorOptions, registerSecurityVisitor,
  validateSecurityAccessPass
} from "../../services/securityService";
import {
  enqueueSecurityAction, flushQueuedSecurityActions,
  listQueuedSecurityActions
} from "../../services/securityOfflineQueue";
import { apiRequest } from "../../services/apiClient";
import { useSocketEvents } from "../../hooks/useSocketEvents";
import { getDashboardSocket } from "../../services/socketClient";
import { showSuccess } from "../../utils/flash";

const SECTIONS = [
  { key: "newRequests", label: "New", accentColor: "#f59e0b", emptyText: "No new requests." },
  { key: "waitingForHomeowner", label: "Waiting", accentColor: "#3b82f6", emptyText: "No pending homeowner approval." },
  { key: "approvedPendingEntry", label: "At Gate", accentColor: "#10b981", emptyText: "No visitors at gate." },
  { key: "completed", label: "Done", accentColor: "#64748b", emptyText: "Nothing completed yet." }
];

export default function SecurityDashboardPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [data, setData] = useState({ profile: null, queues: {}, rules: null });
  const [doorOptions, setDoorOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [queuedCount, setQueuedCount] = useState(() => listQueuedSecurityActions().length);
  const [accessCode, setAccessCode] = useState("");
  const [accessResult, setAccessResult] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== "undefined" ? !navigator.onLine : false));
  const [registerOpen, setRegisterOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const [registeringVisitor, setRegisteringVisitor] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "", doorId: "", purpose: "visitor", visitorType: "guest",
    snapshotBase64: "", snapshotMime: "image/jpeg"
  });
  const [cameraFacingMode, setCameraFacingMode] = useState("environment");
  const [cameraState, setCameraState] = useState({ starting: false, ready: false, error: "" });
  const [activeSection, setActiveSection] = useState("newRequests");
  const [refreshing, setRefreshing] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const modalOpen = registerOpen || validateOpen;

  async function loadDashboard({ background = false } = {}) {
    if (!background) { setLoading(true); setError(""); }
    try {
      const response = await getSecurityDashboard();
      setData(response || { profile: null, queues: {}, rules: null });
    } catch (e) {
      if (!background) setError(e?.message || "Failed to load dashboard.");
    } finally {
      if (!background) setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDashboard({ background: true });
    setRefreshing(false);
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
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    if (modalOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalOpen]);

  useEffect(() => {
    const socket = getDashboardSocket();
    function handleIncomingCall(payload) {
      setIncomingCall(payload?.data ?? payload ?? null);
    }
    socket.on("incoming-call", handleIncomingCall);
    return () => {
      socket.off("incoming-call", handleIncomingCall);
    };
  }, []);

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
      await apiRequest("/calls/start", { method: "POST", body: JSON.stringify({ sessionId, type, hasVideo: type === "video" }) });
      await loadDashboard({ background: true });
    } catch (e) { setError(e?.message || "Unable to start call."); }
    finally { setBusyKey(""); }
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
      await registerSecurityVisitor({
        requestId: `sec_${Date.now().toString(36)}`,
        name: registerForm.name.trim() || undefined,
        doorId: registerForm.doorId,
        purpose: registerForm.purpose,
        visitorType: registerForm.purpose === "delivery" ? "delivery" : "guest",
        snapshotBase64: registerForm.snapshotBase64,
        snapshotMime: registerForm.snapshotMime
      });
      setRegisterForm(p => ({ ...p, name: "", purpose: "visitor", visitorType: "guest", snapshotBase64: "", snapshotMime: "image/jpeg" }));
      setCameraState({ starting: false, ready: false, error: "" });
      showSuccess("Request sent to homeowner.");
      setRegisterOpen(false);
      await loadDashboard({ background: true });
    } catch (e) { setError(e?.message || "Unable to register visitor."); }
    finally { setRegisteringVisitor(false); }
  }

  const summary = useMemo(() => {
    const q = data?.queues || {};
    return {
      newRequests: q.newRequests?.length || 0,
      waiting: q.waitingForHomeowner?.length || 0,
      pendingEntry: q.approvedPendingEntry?.length || 0,
      completed: q.completed?.length || 0,
      deliveryWaiting: data?.summary?.deliveryWaiting || 0,
      flaggedVisitors: data?.summary?.flaggedVisitors || 0
    };
  }, [data]);

  const activeRows = Array.isArray(data?.queues?.[activeSection]) ? data.queues[activeSection] : [];
  const activeSectionMeta = SECTIONS.find(s => s.key === activeSection);

  return (
    <AppShell title="Security Hub">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Instrument+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .sec-root { font-family: 'Instrument Sans', sans-serif; background:
          radial-gradient(circle at top right, rgba(16,185,129,0.08), transparent 28%),
          linear-gradient(180deg, #f5f7f2 0%, #f8f7f4 38%, #f4f4f1 100%); min-height: 100dvh; }
        .sec-root * { box-sizing: border-box; }
        .sec-label { font-family: 'Fraunces', serif; }
        .sec-shell { width: min(100%, 860px); margin: 0 auto; }
        .pill-tab { transition: all 0.18s ease; }
        .pill-tab.active { background: #111827; color: #fff; box-shadow: 0 10px 18px rgba(15,23,42,0.14); }
        .pill-tab.inactive { background: transparent; color: #71717a; }
        .card-in { animation: cardSlide 0.22s ease both; }
        @keyframes cardSlide { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .action-btn { -webkit-tap-highlight-color: transparent; user-select: none; }
        .action-btn:active { transform: scale(0.95); }
        .modal-overlay { animation: fadeIn 0.18s ease; }
        .modal-sheet { animation: slideUp 0.22s cubic-bezier(0.32,0.72,0,1); }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        .badge-pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        .visitor-card { border-left: 3px solid transparent; transition: border-color 0.15s, transform 0.18s ease, box-shadow 0.18s ease; }
        .visitor-card:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(15,23,42,0.08); }
        .input-field { -webkit-appearance: none; appearance: none; }
        .input-field:focus, .select-field:focus { border-color: #94a3b8; box-shadow: 0 0 0 4px rgba(148,163,184,0.15); }
        .select-field { -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
        .soft-panel { background: rgba(255,255,255,0.72); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 16px 40px rgba(15,23,42,0.06); }
        .section-scroller { overflow-x: auto; scrollbar-width: none; }
        .section-scroller::-webkit-scrollbar { display: none; }
        .modal-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; scrollbar-width: thin; }
        .modal-scroll::-webkit-scrollbar { width: 8px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.55); border-radius: 999px; }
      `}</style>
      <div className="sec-root">
        <div className="sec-shell">

        {/* ─── TOP BAR ─── */}
        <header style={{ position: "sticky", top: 0, zIndex: 40, padding: "12px 16px 0" }}>
          <div className="soft-panel" style={{ background: "#0f172a", color: "#fff", borderRadius: 24, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOffline ? "#f59e0b" : "#10b981" }} className={isOffline ? "" : "badge-pulse"} />
              <div>
                <span className="sec-label" style={{ color: "#fff", fontSize: 15, fontWeight: 700, display: "block" }}>
                  {data?.profile?.gateId || "Main Gate"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 11 }}>
                  {isOffline ? "Offline mode" : "Live monitoring"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {queuedCount > 0 && (
                <span style={{ background: "#f59e0b", color: "#000", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 8px" }}>
                  {queuedCount} queued
                </span>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: 12, width: 38, height: 38, display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <RefreshCw size={15} className={refreshing ? "spin" : ""} />
              </button>
            </div>
          </div>
        </header>

        {/* ─── OFFLINE BANNER ─── */}
        {(isOffline || queuedCount > 0) && (
          <div style={{ background: "#fef3c7", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            <WifiOff size={13} />
            {isOffline ? "You're offline. " : ""}{queuedCount > 0 ? `${queuedCount} action${queuedCount === 1 ? "" : "s"} will sync when back online.` : "Back online — syncing actions."}
          </div>
        )}

        {/* ─── ERROR ─── */}
        {error && (
          <div style={{ margin: "12px 16px 0", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#be123c" }}>
            {error}
          </div>
        )}

        {incomingCall?.sessionId ? (
          <div style={{ margin: "12px 16px 0", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 18, padding: "14px 16px", boxShadow: "0 14px 28px rgba(16,185,129,0.10)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <p className="sec-label" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#047857", margin: "0 0 4px" }}>
                  Incoming Homeowner Call
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#064e3b", margin: "0 0 4px" }}>
                  {incomingCall.homeownerName || incomingCall.visitorName || "Homeowner"} is calling security.
                </p>
                <p style={{ fontSize: 12, color: "#065f46", margin: 0 }}>
                  Open the live call screen to answer now.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link
                  to={`/session/${encodeURIComponent(incomingCall.sessionId)}/${incomingCall.hasVideo ? "video" : "audio"}`}
                  style={{ background: "#059669", color: "#fff", borderRadius: 12, padding: "10px 12px", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {incomingCall.hasVideo ? <Video size={13} /> : <Phone size={13} />}
                  Answer
                </Link>
                <button
                  type="button"
                  onClick={() => setIncomingCall(null)}
                  style={{ background: "#fff", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: 12, padding: "10px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div style={{ padding: "0 0 96px" }}>

          {/* ─── HERO METRICS ─── */}
          <div style={{ padding: "16px 16px 0" }}>
            <div style={{ background: "linear-gradient(145deg, #0f172a 0%, #111827 55%, #0a0f1d 100%)", borderRadius: 28, padding: "20px 18px 18px", overflow: "hidden", position: "relative", boxShadow: "0 24px 45px rgba(15,23,42,0.16)" }}>
              <div style={{ position: "absolute", top: -28, right: -14, width: 150, height: 150, background: "radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 72%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -30, left: -24, width: 140, height: 140, background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 72%)", pointerEvents: "none" }} />
              <p style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px" }} className="sec-label">
                {data?.profile?.fullName || "Officer"} on duty
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 className="sec-label" style={{ color: "#fff", fontSize: 28, lineHeight: 1, margin: "0 0 6px" }}>
                    Security overview
                  </h2>
                  <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>
                    Track arrivals, approvals, and gate activity from one screen.
                  </p>
                </div>
                {data?.summary?.flaggedVisitors > 0 && (
                  <span style={{ background: "rgba(220,38,38,0.14)", border: "1px solid rgba(248,113,113,0.25)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "6px 10px", display: "flex", alignItems: "center", gap: 4, height: "fit-content" }}>
                    <AlertTriangle size={10} /> {data.summary.flaggedVisitors} flagged
                  </span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "New", value: summary.newRequests, color: "#f59e0b" },
                  { label: "Waiting", value: summary.waiting, color: "#3b82f6" },
                  { label: "At Gate", value: summary.pendingEntry, color: "#10b981" },
                  { label: "Done", value: summary.completed, color: "#6b7280" }
                ].map(m => (
                  <div key={m.label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "14px" }}>
                    <p style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.12em" }}>{m.label}</p>
                    <p className="sec-label" style={{ color: m.color, fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── QUICK ACTIONS ─── */}
          <div style={{ padding: "16px 16px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              className="action-btn"
              onClick={() => setRegisterOpen(true)}
              style={{ background: "linear-gradient(135deg, #10b981 0%, #0f9f6e 100%)", color: "#fff", border: "none", borderRadius: 20, padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", width: "100%", textAlign: "left", boxShadow: "0 16px 30px rgba(16,185,129,0.18)" }}
            >
              <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 12, width: 40, height: 40, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <PlusCircle size={17} />
              </div>
              <div>
                <p className="sec-label" style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Register Visitor</p>
                <p style={{ fontSize: 11, margin: 0, opacity: 0.84 }}>Create a walk-in request with photo capture.</p>
              </div>
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => { setAccessResult(null); setValidateOpen(true); }}
              style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "#fff", border: "none", borderRadius: 20, padding: "16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", width: "100%", textAlign: "left", boxShadow: "0 16px 30px rgba(15,23,42,0.16)" }}
            >
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, width: 40, height: 40, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <ShieldCheck size={17} />
              </div>
              <div>
                <p className="sec-label" style={{ fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>Validate Access</p>
                <p style={{ fontSize: 11, margin: 0, opacity: 0.74 }}>Check a visitor PIN or QR token instantly.</p>
              </div>
            </button>
          </div>

          {/* ─── ALERTS ─── */}
          {data?.alerts?.length ? (
            <div className="soft-panel" style={{ margin: "16px 16px 0", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <AlertTriangle size={13} color="#c2410c" />
                <span className="sec-label" style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: "0.1em" }}>Alerts</span>
              </div>
              {data.alerts.map(a => (
                <div key={a.id} style={{ background: "rgba(255,255,255,0.92)", borderRadius: 12, padding: "10px 12px", marginBottom: 8, border: "1px solid rgba(251,146,60,0.16)" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1c1917", margin: "0 0 2px" }}>{a.visitorName}</p>
                  <p style={{ fontSize: 12, color: "#78350f", margin: 0 }}>{a.reason}</p>
                </div>
              ))}
            </div>
          ) : null}

          {/* ─── SECTION TABS ─── */}
          <div style={{ padding: "16px 16px 0" }}>
            <div className="section-scroller soft-panel" style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.75)", borderRadius: 18, padding: 5 }}>
              {SECTIONS.map(s => {
                const count = (data?.queues?.[s.key] || []).length;
                const isActive = activeSection === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    className={`pill-tab action-btn sec-label ${isActive ? "active" : "inactive"}`}
                    onClick={() => setActiveSection(s.key)}
                    style={{ flex: 1, minWidth: 76, border: "none", borderRadius: 12, padding: "10px 8px", cursor: "pointer", fontSize: 12, fontWeight: 700, position: "relative" }}
                  >
                    {s.label}
                    {count > 0 && (
                      <span style={{
                        position: "absolute", top: 2, right: 2,
                        background: isActive ? "#fff" : s.accentColor,
                        color: isActive ? "#000" : "#fff",
                        fontSize: 9, fontWeight: 800, borderRadius: 20,
                        minWidth: 14, height: 14, display: "grid", placeItems: "center", lineHeight: 1
                      }}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── VISITOR CARDS ─── */}
          <div style={{ padding: "12px 16px 0" }}>
            {loading ? (
              <div className="soft-panel" style={{ textAlign: "center", padding: "40px 0", borderRadius: 22 }}>
                <div style={{ width: 28, height: 28, border: "3px solid #e2e8f0", borderTopColor: "#10b981", borderRadius: "50%", margin: "0 auto" }} className="spin" />
                <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 10 }}>Loading...</p>
              </div>
            ) : activeRows.length === 0 ? (
              <div className="soft-panel" style={{ textAlign: "center", padding: "36px 16px", borderRadius: 22, border: "1px dashed #d6dbe4" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  {activeSection === "completed" ? "✓" : "·"}
                </div>
                <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{activeSectionMeta?.emptyText}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeRows.map((row, i) => (
                  <VisitorCard
                    key={row.id}
                    row={row}
                    sectionKey={activeSection}
                    busyKey={busyKey}
                    canApprove={!!data?.rules?.canApproveWithoutHomeowner}
                    onAction={handleAction}
                    onCall={startCall}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* ─── REGISTER MODAL ─── */}
        {registerOpen && (
          <BottomSheet title="Register Visitor" onClose={() => setRegisterOpen(false)}>
            <form onSubmit={handleRegisterVisitor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Name (optional)">
                <input
                  type="text" className="input-field"
                  value={registerForm.name}
                  onChange={e => setRegisterForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Leave blank if unknown"
                  style={inputStyle}
                />
              </Field>
              <Field label="Door / Unit">
                <select
                  value={registerForm.doorId}
                  onChange={e => setRegisterForm(p => ({ ...p, doorId: e.target.value }))}
                  style={{ ...inputStyle, paddingRight: 40 }} className="select-field"
                >
                  {doorOptions.map(d => (
                    <option key={d.id} value={d.id}>{d.name} · {d.homeName} · {d.homeownerName}</option>
                  ))}
                </select>
              </Field>
              <Field label="Purpose">
                <select
                  value={registerForm.purpose}
                  onChange={e => setRegisterForm(p => ({ ...p, purpose: e.target.value }))}
                  style={{ ...inputStyle, paddingRight: 40 }} className="select-field"
                >
                  <option value="visitor">Visitor</option>
                  <option value="delivery">Delivery</option>
                  <option value="guest">Guest</option>
                </select>
              </Field>

              {/* Camera section */}
              <div style={{ borderRadius: 16, overflow: "hidden", background: "#0a0a0a" }}>
                {!registerForm.snapshotBase64 ? (
                  <>
                    <div style={{ position: "relative", aspectRatio: "16/9" }}>
                      <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} playsInline muted />
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      <div style={{ position: "absolute", top: 10, right: 10 }}>
                        <button
                          type="button"
                          onClick={() => setCameraFacingMode(p => p === "environment" ? "user" : "environment")}
                          style={{ background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <RotateCcw size={12} /> Flip
                        </button>
                      </div>
                    </div>
                    {cameraState.error && (
                      <div style={{ padding: "8px 12px", background: "#fff1f2", color: "#be123c", fontSize: 12 }}>{cameraState.error}</div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#222" }}>
                      <button
                        type="button"
                        onClick={() => startCamera(cameraFacingMode)}
                        disabled={cameraState.starting || cameraState.ready}
                        style={{ background: "#1a1a1a", border: "none", color: "#e2e8f0", padding: "13px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: (cameraState.starting || cameraState.ready) ? 0.5 : 1 }}
                      >
                        <Camera size={14} />
                        {cameraState.ready ? "Ready" : cameraState.starting ? "Starting…" : "Start camera"}
                      </button>
                      <button
                        type="button"
                        onClick={captureSnapshot}
                        disabled={!cameraState.ready}
                        style={{ background: "#10b981", border: "none", color: "#fff", padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: cameraState.ready ? 1 : 0.4 }}
                      >
                        Capture photo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <img
                      src={`data:${registerForm.snapshotMime};base64,${registerForm.snapshotBase64}`}
                      alt="Visitor"
                      style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => { setRegisterForm(p => ({ ...p, snapshotBase64: "", snapshotMime: "image/jpeg" })); setCameraState({ starting: false, ready: false, error: "" }); }}
                      style={{ width: "100%", background: "#1a1a1a", border: "none", color: "#9ca3af", padding: "11px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      <RotateCcw size={12} /> Retake photo
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "4px 10px",
                  background: registerForm.snapshotBase64 ? "#d1fae5" : "#fef3c7",
                  color: registerForm.snapshotBase64 ? "#065f46" : "#92400e"
                }}>
                  {registerForm.snapshotBase64 ? "✓ Photo captured" : "Photo required"}
                </span>
                <button
                  type="submit"
                  disabled={registeringVisitor}
                  className="action-btn"
                  style={{ background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 14, padding: "13px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, opacity: registeringVisitor ? 0.6 : 1 }}
                >
                  {registeringVisitor ? <Clock3 size={14} className="spin" /> : <PlusCircle size={14} />}
                  Submit
                </button>
              </div>
            </form>
          </BottomSheet>
        )}

        {/* ─── VALIDATE MODAL ─── */}
        {validateOpen && (
          <BottomSheet title="Validate Access" onClose={() => setValidateOpen(false)}>
            <form onSubmit={handleValidateAccessCode} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="PIN or QR token">
                <input
                  type="text" className="input-field"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  placeholder="Enter code"
                  style={{ ...inputStyle, fontFamily: "'DM Mono', 'Courier New', monospace", letterSpacing: "0.12em", fontSize: 16 }}
                />
              </Field>
              {accessResult && (
                <div style={{ background: "#d1fae5", borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#065f46", margin: "0 0 4px" }}>Access granted</p>
                  <p style={{ fontSize: 13, color: "#047857", margin: 0 }}>
                    {accessResult.visitorName || accessResult.label} · {accessResult.remainingUses} use{accessResult.remainingUses === 1 ? "" : "s"} left
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={validatingCode || !accessCode.trim()}
                className="action-btn"
                style={{ background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 14, padding: "15px", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: validatingCode || !accessCode.trim() ? 0.5 : 1 }}
              >
                {validatingCode ? "Checking…" : "Validate Access"}
              </button>
            </form>
          </BottomSheet>
        )}

        <MobileBottomSheet
          open={!!incomingCall?.sessionId}
          title="Incoming Homeowner Call"
          onClose={() => setIncomingCall(null)}
          width="680px"
          height="60dvh"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#f0fdf4", borderRadius: 18, padding: "16px", border: "1px solid #bbf7d0" }}>
              <p className="sec-label" style={{ fontSize: 20, color: "#064e3b", margin: "0 0 6px" }}>
                {incomingCall?.homeownerName || incomingCall?.visitorName || "Homeowner"}
              </p>
              <p style={{ fontSize: 13, color: "#065f46", margin: "0 0 4px" }}>
                A homeowner is trying to reach the security desk right now.
              </p>
              <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>
                Session: {incomingCall?.sessionId || "N/A"}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Link
                to={`/session/${encodeURIComponent(incomingCall?.sessionId || "")}/${incomingCall?.hasVideo ? "video" : "audio"}`}
                style={{ background: "#111827", color: "#fff", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                {incomingCall?.hasVideo ? <Video size={15} /> : <Phone size={15} />}
                Answer Call
              </Link>
              <button
                type="button"
                onClick={() => setIncomingCall(null)}
                style={{ background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 16, padding: "14px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </MobileBottomSheet>
      </div>
    </AppShell>
  );
}

/* ─────────────── VISITOR CARD ─────────────── */
function VisitorCard({ row, sectionKey, busyKey, canApprove, onAction, onCall, style: extraStyle }) {
  const [expanded, setExpanded] = useState(false);

  const urgentColors = {
    approved: { bar: "#10b981", bg: "#f0fdf4" },
    rejected: { bar: "#ef4444", bg: "#fef2f2" },
    pending: { bar: "#f59e0b", bg: "#fffbeb" },
    default: { bar: "#e2e8f0", bg: "#ffffff" }
  };
  const colors = urgentColors[row.status] || urgentColors.default;

  return (
    <article
      className="visitor-card card-in"
      style={{
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        borderLeft: `3px solid ${colors.bar}`,
        ...extraStyle
      }}
    >
      {/* Summary row - always visible */}
      <button
        type="button"
        className="action-btn"
        onClick={() => setExpanded(p => !p)}
        style={{ width: "100%", background: "none", border: "none", padding: "12px 14px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span className="sec-label" style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{row.visitorName}</span>
            <StatusPill status={row.status} />
            {row.suspiciousFlag && <MiniPill label="⚠ Flagged" color="#dc2626" bg="#fef2f2" />}
            {row.preApproved && <MiniPill label="Pre-approved" color="#059669" bg="#f0fdf4" />}
            {row.visitorType === "delivery" && <MiniPill label="📦 Delivery" color="#d97706" bg="#fffbeb" />}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
            <span>{row.doorName || "Door"}</span>
            <span style={{ fontSize: 8 }}>●</span>
            <span>Waiting {formatWait(row.waitingSeconds)}</span>
            <span style={{ fontSize: 8 }}>●</span>
            <span>{timeAgo(row.startedAt)}</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          color="#94a3b8"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s", flexShrink: 0, marginTop: 2 }}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 14px" }}>
          {/* Info chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            <TrustChip status={row.trustStatus} />
            <MiniPill label={row.requestSource === "gateman_assisted" ? "Gateman" : "Visitor QR"} color="#0369a1" bg="#f0f9ff" />
            <MiniPill label={`${row.trustMetrics?.totalVisits || 0} visits`} color="#64748b" bg="#f8fafc" />
            {row.autoApproveSuggested && <MiniPill label="Auto-approve suggested" color="#059669" bg="#f0fdf4" />}
          </div>

          {row.purpose && (
            <p style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>{row.purpose}</p>
          )}

          {row.suspiciousReason && (
            <div style={{ background: "#fff7ed", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#c2410c", marginBottom: 10 }}>
              {row.suspiciousReason}
            </div>
          )}

          {(row.preferredCommunicationChannel || row.preferredCommunicationTarget) && (
            <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#065f46", marginBottom: 10 }}>
              {row.preferredCommunicationChannel && <span>Channel: <strong>{row.preferredCommunicationChannel}</strong></span>}
              {row.preferredCommunicationTarget && <span style={{ marginLeft: 8 }}>Target: <strong>{row.preferredCommunicationTarget}</strong></span>}
            </div>
          )}

          {/* Action buttons - large touch targets */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Primary actions row */}
            <div style={{ display: "flex", gap: 8 }}>
              <Link
                to={`/dashboard/security/messages?sessionId=${encodeURIComponent(row.id)}`}
                style={{ flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "11px", fontSize: 13, fontWeight: 700, color: "#334155", textDecoration: "none", textAlign: "center", display: "block" }}
              >
                Chat
              </Link>
              {sectionKey !== "completed" && (
                <>
                  <ActionBtn
                    label={<><Phone size={13} /> Audio</>}
                    busy={busyKey === `${row.id}:call:audio`}
                    onClick={() => onCall(row.id, "audio")}
                    style={{ flex: 1 }}
                  />
                  <ActionBtn
                    label={<><Video size={13} /> Video</>}
                    busy={busyKey === `${row.id}:call:video`}
                    onClick={() => onCall(row.id, "video")}
                    style={{ flex: 1 }}
                  />
                </>
              )}
            </div>

            {/* Contextual actions */}
            {sectionKey === "newRequests" && (
              <ActionBtn
                label="Forward to Homeowner"
                busy={busyKey === `${row.id}:forward`}
                onClick={() => onAction(row.id, "forward")}
                full
              />
            )}
            {sectionKey !== "completed" && row.autoApproveSuggested && (
              <ActionBtn
                label={<><Star size={13} /> Approve Repeat Visitor</>}
                busy={busyKey === `${row.id}:approve_repeat_visitor`}
                onClick={() => onAction(row.id, "approve_repeat_visitor")}
                tone="success" full
              />
            )}
            {sectionKey !== "completed" && row.visitorType === "delivery" && (
              <ActionBtn
                label={<><Package size={13} /> Delivery Drop-Off</>}
                busy={busyKey === `${row.id}:delivery_drop_off`}
                onClick={() => onAction(row.id, "delivery_drop_off")}
                tone="warning" full
              />
            )}
            {canApprove && sectionKey !== "completed" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <ActionBtn
                  label={<><CheckCircle2 size={13} /> Approve</>}
                  busy={busyKey === `${row.id}:approve`}
                  onClick={() => onAction(row.id, "approve")}
                  tone="success" full
                />
                <ActionBtn
                  label={<><XCircle size={13} /> Reject</>}
                  busy={busyKey === `${row.id}:reject`}
                  onClick={() => onAction(row.id, "reject")}
                  tone="danger" full
                />
              </div>
            )}
            {sectionKey === "approvedPendingEntry" && (
              <ActionBtn
                label={<><ShieldCheck size={13} /> Confirm Entry</>}
                busy={busyKey === `${row.id}:confirm_entry`}
                onClick={() => onAction(row.id, "confirm_entry")}
                tone="success" full
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function ActionBtn({ label, busy, onClick, tone = "default", full, style: extra }) {
  const tones = {
    success: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" },
    danger: { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
    warning: { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" },
    default: { background: "#f8fafc", color: "#334155", border: "1px solid #e2e8f0" }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="action-btn"
      style={{
        ...tones[tone],
        borderRadius: 12,
        padding: "11px 12px",
        fontSize: 13,
        fontWeight: 700,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.6 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        width: full ? "100%" : undefined,
        ...extra
      }}
    >
      {busy ? <Clock3 size={13} className="spin" /> : label}
    </button>
  );
}

/* ─────────────── BOTTOM SHEET ─────────────── */
function BottomSheet({ title, onClose, children }) {
  return (
    <MobileBottomSheet open title={title} onClose={onClose}>
      {children}
    </MobileBottomSheet>
  );
}

/* ─────────────── HELPERS ─────────────── */
function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
  padding: "13px 14px", fontSize: 14, color: "#0f172a", outline: "none",
  WebkitAppearance: "none"
};

function StatusPill({ status }) {
  const map = {
    approved: { bg: "#d1fae5", color: "#065f46" },
    rejected: { bg: "#fee2e2", color: "#991b1b" },
    pending: { bg: "#fef9c3", color: "#854d0e" },
    waiting_for_homeowner: { bg: "#dbeafe", color: "#1e40af" }
  };
  const style = map[status] || { bg: "#f1f5f9", color: "#475569" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 7px", background: style.bg, color: style.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {String(status || "pending").replace(/_/g, " ")}
    </span>
  );
}

function TrustChip({ status }) {
  const map = {
    trusted: { color: "#059669", bg: "#f0fdf4" },
    flagged: { color: "#dc2626", bg: "#fef2f2" },
    new: { color: "#64748b", bg: "#f8fafc" }
  };
  const s = map[status] || map.new;
  return <MiniPill label={status || "new"} color={s.color} bg={s.bg} />;
}

function MiniPill({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 8px", background: bg, color, display: "inline-flex", alignItems: "center", gap: 3 }}>
      {label}
    </span>
  );
}

function timeAgo(value) {
  if (!value) return "just now";
  const diff = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function formatWait(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(total / 60);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
