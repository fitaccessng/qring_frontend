import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

function roleHome(user) {
  if (user?.role === "estate") return "/dashboard/estate";
  if (user?.role === "admin") return "/dashboard/admin";
  return "/dashboard/homeowner/overview";
}

export default function PublicOnlyRoute() {
  const { user, isAuthenticated } = useAuth();
  const hasToken = Boolean(localStorage.getItem("qring_access_token"));
  if (isAuthenticated && hasToken) {
    return <Navigate to={roleHome(user)} replace />;
  }
  return <Outlet />;
}
