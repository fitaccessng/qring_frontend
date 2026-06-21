import { lazy, Suspense } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

const SessionMessagePage = lazy(() => import("../pages/visitor/SessionMessagePage"));

export default function SessionCallRoute() {
  const { sessionId } = useParams();
  const location = useLocation();
  const path = String(location.pathname || "").toLowerCase();
  const mode = path.endsWith("/video") ? "video" : "audio";

  if (!sessionId) {
    return <Navigate to="/" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      }
    >
      <SessionMessagePage key={`${sessionId}:${mode}`} />
    </Suspense>
  );
}
