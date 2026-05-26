import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { env } from "../config/env";
import { getStoredUser } from "../services/authStorage";
import { getVisitorSessionStatus } from "../services/homeownerService";
import { RealtimeEvent } from "../services/realtimeEvents";
import { createRealtimeSocket, releaseRealtimeSocket } from "../services/socketClient";
import { getVisitorSessionToken } from "../services/visitorSessionToken";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedSessionStatus(value) {
  return ["approved", "active", "gate_confirmed"].includes(normalizeStatus(value));
}

function isSettledSessionStatus(value) {
  return ["approved", "active", "gate_confirmed", "closed", "completed", "rejected"].includes(normalizeStatus(value));
}

export default function VisitorSessionGateRoute({ children }) {
  const { sessionId } = useParams();
  const user = useMemo(() => getStoredUser(), []);
  const role = String(user?.role || "").toLowerCase();
  const isStaff = role === "homeowner" || role === "estate" || role === "admin" || role === "security";

  const [loading, setLoading] = useState(!isStaff);
  const [error, setError] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");

  useEffect(() => {
    if (isStaff) return () => {};
    let active = true;
    let pollId = 0;
    let settled = false;
    const normalizedSessionId = String(sessionId || "").trim();
    const socket = createRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
      authBuilder: () => {
        const visitorToken = getVisitorSessionToken(sessionId);
        return visitorToken ? { visitorToken } : {};
      }
    });

    const handleConnect = () => {
      socket.timeout(5000).emit(RealtimeEvent.SESSION_JOIN, {
        sessionId,
        displayName: "Visitor",
        visitorToken: getVisitorSessionToken(sessionId) || undefined
      }, () => {});
    };

    const handleSessionSnapshot = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (!active || incomingSessionId !== normalizedSessionId) return;
      const nextStatus = normalizeStatus(payload?.status);
      if (!nextStatus) return;
      settled = isSettledSessionStatus(nextStatus);
      // eslint-disable-next-line no-console
      console.info("qring.visitor.gate.snapshot", { sessionId: normalizedSessionId, status: nextStatus });
      setSessionStatus(nextStatus);
      setLoading(false);
      setError("");
    };

    const handleSessionActivated = (payload) => {
      const incomingSessionId = String(payload?.sessionId || payload?.data?.id || "").trim();
      if (!active || incomingSessionId !== normalizedSessionId) return;
      settled = true;
      setSessionStatus("approved");
      setLoading(false);
      setError("");
      // eslint-disable-next-line no-console
      console.info("qring.visitor.gate.activated", { sessionId: normalizedSessionId });
    };

    const handleSessionStatus = (payload) => {
      const incomingSessionId = String(payload?.sessionId || "").trim();
      if (!active || incomingSessionId !== normalizedSessionId) return;
      const nextStatus = normalizeStatus(payload?.status || payload?.sessionStatus);
      if (!nextStatus) return;
      settled = isSettledSessionStatus(nextStatus);
      // eslint-disable-next-line no-console
      console.info("qring.visitor.gate.status", { sessionId: normalizedSessionId, status: nextStatus });
      setSessionStatus(nextStatus);
      setLoading(false);
      setError("");
    };

    socket.on("connect", handleConnect);
    socket.on(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
    socket.on(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
    socket.on(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);
    if (socket.connected) {
      handleConnect();
    }

    const check = async () => {
      if (!active) return;
      if (!pollId) {
        setLoading(true);
      }
      setError("");
      try {
        const data = await getVisitorSessionStatus(sessionId);
        if (!active) return;
        const nextStatus = normalizeStatus(data?.status || data?.sessionStatus);
        settled = isSettledSessionStatus(nextStatus);
        // eslint-disable-next-line no-console
        console.info("qring.visitor.gate.poll", { sessionId: normalizedSessionId, status: nextStatus });
        setSessionStatus(nextStatus);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Unable to verify session status");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };
    void check();
    pollId = window.setInterval(() => {
      if (settled) return;
      void check();
    }, 2500);
    return () => {
      active = false;
      if (pollId) {
        window.clearInterval(pollId);
      }
      socket.off("connect", handleConnect);
      socket.off(RealtimeEvent.SESSION_ACTIVATED, handleSessionActivated);
      socket.off(RealtimeEvent.SESSION_STATUS, handleSessionStatus);
      socket.off(RealtimeEvent.SESSION_SNAPSHOT, handleSessionSnapshot);
      releaseRealtimeSocket(env.signalingNamespace ?? "/realtime/signaling", {
        autoConnect: true,
        reconnection: true,
        withCredentials: true
      });
    };
  }, [isStaff, sessionId]);

  if (isStaff) return children;

  const allowed = isAllowedSessionStatus(sessionStatus);

  if (allowed) return children;

  return (
    <div className="min-h-screen bg-slate-950 px-5 pb-10 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Session</p>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
            {sessionStatus === "rejected"
              ? "Request rejected"
              : sessionStatus === "closed" || sessionStatus === "completed"
                ? "Session closed"
                : "Waiting for homeowner approval"}
          </h1>
          <p className="mt-2 text-[13px] text-white/70">
            {loading
              ? "Checking status..."
              : error
                ? error
                : sessionStatus === "rejected"
                  ? "The homeowner declined your request. You can rescan the code to try again."
                  : sessionStatus === "closed" || sessionStatus === "completed"
                    ? "This session is no longer available."
                    : "You can start the session only after the homeowner accepts."}
          </p>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-white/12 px-4 py-3 text-sm font-semibold transition hover:bg-white/16 active:scale-[0.99]"
            >
              Refresh
            </button>
            {sessionStatus === "rejected" ? (
              <button
                type="button"
                onClick={() => window.history.back()}
                className="w-full rounded-2xl border border-white/12 bg-transparent px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/6 active:scale-[0.99]"
              >
                Start New Request
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
