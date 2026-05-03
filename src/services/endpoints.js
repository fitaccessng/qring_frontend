export const endpoints = {
  auth: {
    login: "/auth/login",
    refreshToken: "/auth/refresh-token",
    logout: "/auth/logout"
  },
  dashboard: {
    overview: "/dashboard/overview"
  },
  homeowner: {
    context: "/homeowner/context",
    visits: "/homeowner/visits",
    appointments: "/homeowner/appointments",
    messages: "/homeowner/messages",
    doors: "/homeowner/doors",
    accessPasses: "/homeowner/access-passes",
    safetyStatus: "/safety/status",
    emergencyTrigger: "/panic/trigger"
  },
  estate: {
    overview: "/estate/overview"
  },
  security: {
    dashboard: "/security/dashboard",
    messages: "/security/messages"
  },
  notifications: {
    list: "/notifications"
  }
};
