import { Navigate, useParams } from "react-router-dom";
import { hasSessionCallAccess } from "../services/sessionCallAccess";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("qring_user") || "null");
  } catch {
    return null;
  }
}

export default function VisitorCallRoute({ children }) {
  const { sessionId } = useParams();
  const user = getStoredUser();

  if (user?.role === "homeowner") {
    return children;
  }

  if (hasSessionCallAccess(sessionId)) {
    return children;
  }

  return <Navigate to={`/session/${sessionId}/message`} replace />;
}
