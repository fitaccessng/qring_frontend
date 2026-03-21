import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getVisitorSessionStatus } from "../services/homeownerService";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("qring_user") || "null");
  } catch {
    return null;
  }
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
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
    setLoading(true);
    setError("");
    getVisitorSessionStatus(sessionId)
      .then((data) => {
        if (!active) return;
        setSessionStatus(normalizeStatus(data?.status || data?.sessionStatus));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Unable to verify session status");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isStaff, sessionId]);

  if (isStaff) return children;

  const allowed = sessionStatus === "approved" || sessionStatus === "active";

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
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-2xl bg-white/12 px-4 py-3 text-sm font-semibold transition hover:bg-white/16 active:scale-[0.99]"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
