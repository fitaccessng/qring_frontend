import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { hasStoredSession } from "../services/authStorage";

export default function ProtectedRoute() {
  const { isAuthenticated, ready } = useAuth();
  const location = useLocation();
  const hasToken = hasStoredSession();

  if (!ready) {
    return null;
  }

  if (!isAuthenticated || !hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
