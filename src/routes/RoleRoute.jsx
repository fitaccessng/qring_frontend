import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();
  if (!user?.role || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}
