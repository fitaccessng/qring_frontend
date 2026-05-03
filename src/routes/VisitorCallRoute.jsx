import { Navigate, useParams } from "react-router-dom";
import { getStoredUser } from "../services/authStorage";
import { hasSessionCallAccess } from "../services/sessionCallAccess";

export default function VisitorCallRoute({ children }) {
  const { sessionId } = useParams();
  const user = getStoredUser();

  if (["homeowner", "security", "estate", "admin"].includes(String(user?.role || "").toLowerCase())) {
    return children;
  }

  if (hasSessionCallAccess(sessionId)) {
    return children;
  }

  return <Navigate to={`/session/${sessionId}/message`} replace />;
}
