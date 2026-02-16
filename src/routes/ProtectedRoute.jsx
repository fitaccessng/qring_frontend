import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const hasToken = Boolean(localStorage.getItem("qring_access_token"));

  if (!isAuthenticated || !hasToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
