import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { hasStoredSession } from "../services/authStorage";
import { getRoleHomePath } from "../utils/authRouting";

export default function PublicOnlyRoute() {
  const { user, isAuthenticated, ready } = useAuth();
  const hasToken = hasStoredSession();
  if (!ready) {
    return null;
  }
  if (isAuthenticated && hasToken) {
    return <Navigate to={getRoleHomePath(user?.role)} replace />;
  }
  return <Outlet />;
}
