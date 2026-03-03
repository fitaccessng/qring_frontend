export function resolveNotificationRoute({ role, kind, payload }) {
  const safeRole = String(role || "").toLowerCase();
  const safeKind = String(kind || "").toLowerCase();
  const data = payload && typeof payload === "object" ? payload : {};

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

  if (safeRole === "estate") return "/dashboard/estate";
  if (safeRole === "admin") return "/dashboard/admin";
  return "/dashboard/homeowner/overview";
}
