export function resolveNotificationRoute({ role, kind, payload }) {
  const safeRole = String(role || "").toLowerCase();
  const safeKind = String(kind || "").toLowerCase();
  const data = payload && typeof payload === "object" ? payload : {};
  const alertType = String(data.alertType || data.type || data.alert_type || "").toLowerCase();

  if (typeof data.route === "string" && data.route.startsWith("/")) {
    return data.route;
  }

  if (safeKind.startsWith("visitor.") || safeKind.startsWith("call.") || safeKind.startsWith("appointment.")) {
    return safeRole === "estate" ? "/dashboard/estate/logs" : "/dashboard/homeowner/visits";
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
      return "/dashboard/homeowner/alerts";
    }
  }

  if (safeRole === "estate") return "/dashboard/estate";
  if (safeRole === "admin") return "/dashboard/admin";
  return "/dashboard/homeowner/overview";
}
