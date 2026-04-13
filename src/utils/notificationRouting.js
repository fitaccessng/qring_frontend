export function resolveNotificationRoute({ role, kind, payload }) {
  const safeRole = String(role || "").toLowerCase();
  const safeKind = String(kind || "").toLowerCase();
  const data = payload && typeof payload === "object" ? payload : {};
  const alertType = String(data.alertType || data.type || data.alert_type || "").toLowerCase();
  const sessionId = String(data.sessionId || data.visitId || data.session_id || "").trim();

  function homeownerSessionRoute() {
    return sessionId
      ? `/dashboard/homeowner/messages?sessionId=${encodeURIComponent(sessionId)}`
      : "/dashboard/homeowner/messages";
  }

  if (typeof data.route === "string" && data.route.startsWith("/")) {
    return data.route;
  }

  if (safeKind.startsWith("visitor.") || safeKind.startsWith("call.") || safeKind.startsWith("appointment.")) {
    return safeRole === "estate" ? "/dashboard/estate/logs" : homeownerSessionRoute();
  }

  if (safeKind === "estate.assignment") {
    return "/dashboard/homeowner/doors";
  }

  if (safeKind === "estate.invite") {
    return "/dashboard/homeowner/settings";
  }

  if (safeKind === "referral.reward") {
    return "/dashboard/homeowner/settings";
  }

  if (safeKind.startsWith("estate.")) {
    if (safeRole === "estate") {
      if (alertType === "notice") return "/dashboard/estate/broadcasts";
      if (alertType === "meeting") return "/dashboard/estate/meetings";
      if (alertType === "poll") return "/dashboard/estate/polls";
      if (alertType === "payment_request" || alertType === "payment") return "/dashboard/estate/dues";
      if (alertType === "maintenance") return "/dashboard/estate/maintenance";
      if (safeKind.includes("payment")) return "/dashboard/estate/dues";
      if (safeKind.includes("maintenance")) return "/dashboard/estate/maintenance";
      if (safeKind.includes("poll")) return "/dashboard/estate/polls";
      if (safeKind.includes("meeting")) return "/dashboard/estate/meetings";
      if (safeKind.includes("broadcast") || safeKind.includes("notice")) return "/dashboard/estate/broadcasts";
      return "/dashboard/estate";
    }
    if (safeRole === "homeowner") {
      if (safeKind.includes("maintenance")) return "/dashboard/homeowner/maintenance";
      if (safeKind.includes("door")) return "/dashboard/homeowner/doors";
      return "/dashboard/notifications";
    }
  }

  if (safeKind.startsWith("system.") || safeKind.startsWith("security.") || safeKind.startsWith("payment.")) {
    return "/dashboard/notifications";
  }

  if (safeKind === "safety.panic") {
    if (safeRole === "estate") return "/dashboard/estate/emergency";
    if (safeRole === "security") return "/dashboard/security/emergency";
    if (safeRole === "homeowner") return "/dashboard/homeowner/safety";
    return "/dashboard/notifications";
  }

  if (safeKind.startsWith("access.")) {
    return safeRole === "estate" ? "/dashboard/estate/logs" : homeownerSessionRoute();
  }

  if (safeKind.startsWith("visitor.")) {
    return safeRole === "estate" ? "/dashboard/estate/logs" : homeownerSessionRoute();
  }

  if (safeRole === "homeowner") return "/dashboard/notifications";
  if (safeRole === "estate") return "/dashboard/estate";
  if (safeRole === "admin") return "/dashboard/admin";
  return "/dashboard/notifications";
}
