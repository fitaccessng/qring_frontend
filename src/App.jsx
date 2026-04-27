import { BrowserRouter, HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import LandingPage from "./pages/landing/LandingPage";
import AboutPage from "./pages/landing/AboutPage";
import PricingPage from "./pages/landing/PricingPage";
import ContactPage from "./pages/landing/ContactPage";
import PlatformPage from "./pages/landing/PlatformPage";
import SecurityPage from "./pages/landing/SecurityPage";
import ApiDocsPage from "./pages/landing/ApiDocsPage";
import CompanyPage from "./pages/landing/CompanyPage";
import BlogPage from "./pages/landing/BlogPage";
import CareersPage from "./pages/landing/CareersPage";
import LegalPage from "./pages/landing/LegalPage";
import PrivacyPage from "./pages/landing/PrivacyPage";
import TermsPage from "./pages/landing/TermsPage";
import CompliancePage from "./pages/landing/CompliancePage";
import RequestDemoPage from "./pages/landing/RequestDemoPage";
import LoginPage from "./pages/auth/LoginPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import SignupPage from "./pages/auth/SignupPage";
import GoogleRolePage from "./pages/auth/GoogleRolePage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import UnauthorizedPage from "./pages/common/UnauthorizedPage";
import NotFoundPage from "./pages/common/NotFoundPage";
import LoaderPage from "./pages/common/LoaderPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import VisitorCallRoute from "./routes/VisitorCallRoute";
import VisitorSessionGateRoute from "./routes/VisitorSessionGateRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";
import EstateManagedHomeownerRoute from "./routes/EstateManagedHomeownerRoute";
import HomeownerSubscriptionRoute from "./routes/HomeownerSubscriptionRoute";
import { AuthProvider } from "./state/AuthContext";
import { LanguageProvider } from "./state/LanguageContext";
import { ThemeProvider } from "./state/ThemeContext";
import BlockingModal from "./components/BlockingModal";
import AppPreloader from "./components/mobile/AppPreloader";
import PanicAlertCenter from "./components/panic/PanicAlertCenter";
import ToastCenter from "./components/ToastCenter";
import { env } from "./config/env";
import { NotificationsProvider } from "./state/NotificationsContext";
import { queryClient } from "./lib/queryClient";

const OnboardingPage = lazy(() => import("./pages/auth/OnboardingPage"));
const HomeownerDashboardPage = lazy(() => import("./pages/dashboard/HomeownerDashboardPage"));
const HomeownerVisitsPage = lazy(() => import("./pages/dashboard/HomeownerVisitsPage"));
const HomeownerAppointmentsPage = lazy(() => import("./pages/dashboard/HomeownerAppointmentsPage"));
const HomeownerMessagesPage = lazy(() => import("./pages/dashboard/HomeownerMessagesPage"));
const HomeownerDoorsPage = lazy(() => import("./pages/dashboard/HomeownerDoorsPage"));
const HomeownerSettingsPage = lazy(() => import("./pages/dashboard/HomeownerSettingsPage"));
const HomeownerAutomationPage = lazy(() => import("./pages/dashboard/HomeownerAutomationPage"));
const HomeownerAccessPassesPage = lazy(() => import("./pages/dashboard/HomeownerAccessPassesPage"));
const HomeownerPaywallPage = lazy(() => import("./pages/dashboard/HomeownerPaywallPage"));
const HomeownerLiveQueuePage = lazy(() => import("./pages/dashboard/HomeownerLiveQueuePage"));
const HomeownerReceiptsPage = lazy(() => import("./pages/dashboard/HomeownerReceiptsPage"));
const BillingCallbackPage = lazy(() => import("./pages/dashboard/BillingCallbackPage"));
const HomeownerAlertsPage = lazy(() => import("./pages/dashboard/HomeownerAlertsPage"));
const HomeownerSafetyPage = lazy(() => import("./pages/dashboard/HomeownerSafetyPage"));
const HomeownerEmergencyContactsPage = lazy(() => import("./pages/dashboard/HomeownerEmergencyContactsPage"));
const HomeownerMaintenancePage = lazy(() => import("./pages/dashboard/HomeownerMaintenancePage"));
const EstateManagedHomeownerModulePage = lazy(() => import("./pages/dashboard/EstateManagedHomeownerModulePage"));
const EstateDashboardPage = lazy(() => import("./pages/dashboard/EstateDashboardPage"));
const EstateCreatePage = lazy(() => import("./pages/dashboard/EstateCreatePage"));
const EstateDoorsPage = lazy(() => import("./pages/dashboard/EstateDoorsPage"));
const EstateAssignPage = lazy(() => import("./pages/dashboard/EstateAssignPage"));
const EstateInvitesPage = lazy(() => import("./pages/dashboard/EstateInvitesPage"));
const EstateMappingsPage = lazy(() => import("./pages/dashboard/EstateMappingsPage"));
const EstateLogsPage = lazy(() => import("./pages/dashboard/EstateLogsPage"));
const EstatePlanPage = lazy(() => import("./pages/dashboard/EstatePlanPage"));
const EstateHomesPage = lazy(() => import("./pages/dashboard/EstateHomesPage"));
const EstateSecurityPage = lazy(() => import("./pages/dashboard/EstateSecurityPage"));
const EstateEmergencyPage = lazy(() => import("./pages/dashboard/EstateEmergencyPage"));
const EstateSettingsPage = lazy(() => import("./pages/dashboard/EstateSettingsPage"));
const EstateCommunityBoardPage = lazy(() => import("./pages/dashboard/EstateCommunityBoardPage"));
const EstateBroadcastsPage = lazy(() => import("./pages/dashboard/EstateBroadcastsPage"));
const EstateMeetingsPage = lazy(() => import("./pages/dashboard/EstateMeetingsPage"));
const EstatePollsPage = lazy(() => import("./pages/dashboard/EstatePollsPage"));
const EstateDuesPage = lazy(() => import("./pages/dashboard/EstateDuesPage"));
const EstateMaintenancePage = lazy(() => import("./pages/dashboard/EstateMaintenancePage"));
const EstateStatsPage = lazy(() => import("./pages/dashboard/EstateStatsPage"));
const SecurityDashboardPage = lazy(() => import("./pages/dashboard/SecurityDashboardPage"));
const SecurityEmergencyPage = lazy(() => import("./pages/dashboard/SecurityEmergencyPage"));
const SecurityMessagesPage = lazy(() => import("./pages/dashboard/SecurityMessagesPage"));
const AdminDashboardPage = lazy(() => import("./pages/dashboard/AdminDashboardPage"));
const AdminPaymentsPage = lazy(() => import("./pages/dashboard/AdminPaymentsPage"));
const AdminUsersPage = lazy(() => import("./pages/dashboard/AdminUsersPage"));
const AdminSessionsPage = lazy(() => import("./pages/dashboard/AdminSessionsPage"));
const AdminConfigPage = lazy(() => import("./pages/dashboard/AdminConfigPage"));
const AdminAuditPage = lazy(() => import("./pages/dashboard/AdminAuditPage"));
const NotificationsPage = lazy(() => import("./pages/dashboard/NotificationsPage"));
const ScanPage = lazy(() => import("./pages/visitor/ScanPage"));
const AppointmentPage = lazy(() => import("./pages/visitor/AppointmentPage"));
const SessionMessagePage = lazy(() => import("./pages/visitor/SessionMessagePage"));
const SessionAudioPage = lazy(() => import("./pages/visitor/SessionAudioPage"));
const SessionVideoPage = lazy(() => import("./pages/visitor/SessionVideoPage"));

export default function App() {
  const Router = resolveRouterComponent();
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <NotificationsProvider>
              <Router>
                <AppRoutes />
              </Router>
            </NotificationsProvider>
          </QueryClientProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function resolveRouterComponent() {
  if (typeof window === "undefined") return BrowserRouter;
  if (prepareNativeHashRoute()) return HashRouter;
  const mode = String(env.routerMode || "auto").toLowerCase();
  if (mode === "hash") return HashRouter;
  if (mode === "browser") return BrowserRouter;
  // Auto: if a user arrives on a hash route (common on static hosts without rewrite rules),
  // keep using hash routing to avoid full-page reload loops.
  return String(window.location.hash || "").startsWith("#/") ? HashRouter : BrowserRouter;
}

function prepareNativeHashRoute() {
  if (!isNativeCapacitorApp() || typeof window === "undefined") return false;

  const hash = String(window.location.hash || "");
  if (hash.startsWith("#/")) {
    return true;
  }

  const pathname = String(window.location.pathname || "/");
  const search = String(window.location.search || "");
  if (pathname !== "/") {
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    window.history.replaceState(window.history.state, "", `/#${normalizedPath}${search}`);
  }

  return true;
}

function AppRoutes() {
  const location = useLocation();
  const nativeApp = isNativeCapacitorApp();
  const nativeEntryRoute = getNativeEntryRoute();
  const [showPreloader, setShowPreloader] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("qring_preloader_seen") !== "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    const ping = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      fetch(`${env.apiBaseUrl}/health`, { method: "GET", cache: "no-store" }).catch(() => {});
    };
    ping();
    const interval = window.setInterval(ping, 4 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showPreloader) return () => {};
    const timer = window.setTimeout(() => {
      setShowPreloader(false);
      try {
        sessionStorage.setItem("qring_preloader_seen", "true");
      } catch {
        // No-op if storage is unavailable.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [showPreloader]);

  return (
    <>
      <SpaRedirectRecovery />
      {showPreloader ? (
        <AppPreloader />
      ) : (
        <>
          <GlobalNotifications />
          <div className="animate-screen-enter min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/platform" element={<PlatformPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/api-docs" element={<ApiDocsPage />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/compliance" element={<CompliancePage />} />
              <Route path="/request-demo" element={<RequestDemoPage />} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin/signup" element={<Navigate to="/admin/login" replace />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/google-role" element={<GoogleRolePage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ForgotPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
              </Route>
              <Route path="/loader" element={<LoaderPage />} />

              <Route path="/scan/:qrId" element={<LazyRoute><ScanPage /></LazyRoute>} />
              <Route path="/appointment/:shareToken" element={<LazyRoute><AppointmentPage /></LazyRoute>} />
              <Route path="/session/:sessionId" element={<Navigate to="message" replace />} />
              <Route
                path="/session/:sessionId/message"
                element={
                  <VisitorSessionGateRoute>
                    <LazyRoute><SessionMessagePage /></LazyRoute>
                  </VisitorSessionGateRoute>
                }
              />
              <Route
                path="/session/:sessionId/audio"
                element={
                  <VisitorSessionGateRoute>
                    <VisitorCallRoute>
                      <LazyRoute><SessionAudioPage /></LazyRoute>
                    </VisitorCallRoute>
                  </VisitorSessionGateRoute>
                }
              />
              <Route
                path="/session/:sessionId/video"
                element={
                  <VisitorSessionGateRoute>
                    <VisitorCallRoute>
                      <LazyRoute><SessionVideoPage /></LazyRoute>
                    </VisitorCallRoute>
                  </VisitorSessionGateRoute>
                }
              />

              <Route element={<ProtectedRoute />}>
                <Route element={<RoleRoute allowedRoles={["homeowner", "estate"]} />}>
                  <Route path="/billing/paywall" element={<LazyRoute><HomeownerPaywallPage /></LazyRoute>} />
                  <Route path="/billing/callback" element={<LazyRoute><BillingCallbackPage /></LazyRoute>} />
                  <Route path="/onboarding" element={<LazyRoute><OnboardingPage /></LazyRoute>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={["homeowner", "estate", "admin", "security"]} />}>
                  <Route path="/dashboard/notifications" element={<LazyRoute><NotificationsPage /></LazyRoute>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={["homeowner"]} />}>
                  <Route path="/dashboard/homeowner" element={<Navigate to="/dashboard/homeowner/overview" replace />} />
                  <Route path="/dashboard/homeowner/overview" element={<LazyRoute><HomeownerDashboardPage /></LazyRoute>} />
                  <Route element={<HomeownerSubscriptionRoute requiredFeature="visitor_scheduling" />}>
                    <Route path="/dashboard/homeowner/appointments" element={<LazyRoute><HomeownerAppointmentsPage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/access-passes" element={<LazyRoute><HomeownerAccessPassesPage /></LazyRoute>} />
                  </Route>
                  <Route path="/dashboard/homeowner/visits" element={<LazyRoute><HomeownerVisitsPage /></LazyRoute>} />
                  <Route element={<HomeownerSubscriptionRoute requiredFeature="chat_call_verification" />}>
                    <Route path="/dashboard/homeowner/messages" element={<LazyRoute><HomeownerMessagesPage /></LazyRoute>} />
                  </Route>
                  <Route path="/dashboard/homeowner/doors" element={<LazyRoute><HomeownerDoorsPage /></LazyRoute>} />
                  <Route path="/dashboard/homeowner/safety" element={<LazyRoute><HomeownerSafetyPage /></LazyRoute>} />
                  <Route path="/dashboard/homeowner/emergency-contacts" element={<LazyRoute><HomeownerEmergencyContactsPage /></LazyRoute>} />
                  <Route element={<EstateManagedHomeownerRoute />}>
                    <Route path="/dashboard/homeowner/automation" element={<LazyRoute><HomeownerAutomationPage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/live-queue" element={<LazyRoute><HomeownerLiveQueuePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/receipts" element={<LazyRoute><HomeownerReceiptsPage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/alerts" element={<LazyRoute><HomeownerAlertsPage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/maintenance" element={<LazyRoute><HomeownerMaintenancePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-broadcasts" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-meetings" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-polls" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-dues" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-maintenance" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-doors" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-approvals" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-messages" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-video-calls" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-audio-calls" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-alerts" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                    <Route path="/dashboard/homeowner/estate-panic" element={<LazyRoute><EstateManagedHomeownerModulePage /></LazyRoute>} />
                  </Route>
                  <Route path="/dashboard/homeowner/settings" element={<LazyRoute><HomeownerSettingsPage /></LazyRoute>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={["estate"]} />}>
                  <Route path="/dashboard/estate" element={<LazyRoute><EstateDashboardPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/create" element={<LazyRoute><EstateCreatePage /></LazyRoute>} />
                  <Route path="/dashboard/estate/doors" element={<LazyRoute><EstateDoorsPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/assign" element={<LazyRoute><EstateAssignPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/invites" element={<LazyRoute><EstateInvitesPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/mappings" element={<LazyRoute><EstateMappingsPage /></LazyRoute>} />
                  <Route element={<HomeownerSubscriptionRoute requiredFeature="visitor_logs" />}>
                    <Route path="/dashboard/estate/logs" element={<LazyRoute><EstateLogsPage /></LazyRoute>} />
                  </Route>
                  <Route path="/dashboard/estate/plan" element={<LazyRoute><EstatePlanPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/homes" element={<LazyRoute><EstateHomesPage /></LazyRoute>} />
                  <Route element={<HomeownerSubscriptionRoute requiredFeature="multi_admin_roles" />}>
                    <Route path="/dashboard/estate/security" element={<LazyRoute><EstateSecurityPage /></LazyRoute>} />
                  </Route>
                  <Route path="/dashboard/estate/emergency" element={<LazyRoute><EstateEmergencyPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/community" element={<LazyRoute><EstateCommunityBoardPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/settings" element={<LazyRoute><EstateSettingsPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/broadcasts" element={<LazyRoute><EstateBroadcastsPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/meetings" element={<LazyRoute><EstateMeetingsPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/polls" element={<LazyRoute><EstatePollsPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/dues" element={<LazyRoute><EstateDuesPage /></LazyRoute>} />
                  <Route path="/dashboard/estate/maintenance" element={<LazyRoute><EstateMaintenancePage /></LazyRoute>} />
                  <Route element={<HomeownerSubscriptionRoute requiredFeature="analytics" />}>
                    <Route path="/dashboard/estate/stats" element={<LazyRoute><EstateStatsPage /></LazyRoute>} />
                  </Route>
                </Route>
                <Route element={<RoleRoute allowedRoles={["security"]} />}>
                  <Route path="/dashboard/security" element={<LazyRoute><SecurityDashboardPage /></LazyRoute>} />
                  <Route path="/dashboard/security/emergency" element={<LazyRoute><SecurityEmergencyPage /></LazyRoute>} />
                  <Route path="/dashboard/security/messages" element={<LazyRoute><SecurityMessagesPage /></LazyRoute>} />
                </Route>
                <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                  <Route path="/dashboard/admin" element={<LazyRoute><AdminDashboardPage /></LazyRoute>} />
                  <Route path="/dashboard/admin/users" element={<LazyRoute><AdminUsersPage /></LazyRoute>} />
                  <Route path="/dashboard/admin/sessions" element={<LazyRoute><AdminSessionsPage /></LazyRoute>} />
                  <Route path="/dashboard/admin/payments" element={<LazyRoute><AdminPaymentsPage /></LazyRoute>} />
                  <Route path="/dashboard/admin/config" element={<LazyRoute><AdminConfigPage /></LazyRoute>} />
                  <Route path="/dashboard/admin/audit" element={<LazyRoute><AdminAuditPage /></LazyRoute>} />
                </Route>
              </Route>

              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/dashboard" element={<Navigate to="/dashboard/homeowner/overview" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </>
      )}
    </>
  );
}

function LazyRoute({ children }) {
  return (
    <Suspense fallback={<RouteFallback />}>
      {children}
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="grid min-h-[40vh] place-items-center px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
    </div>
  );
}

function GlobalNotifications() {
  return (
    <>
      <ToastCenter />
      <BlockingModal />
      <PanicAlertCenter />
    </>
  );
}

function isNativeCapacitorApp() {
  try {
    return Boolean(window?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function getNativeEntryRoute() {
  if (typeof window === "undefined") return "/login";
  try {
    const token = localStorage.getItem("qring_access_token");
    const rawUser = localStorage.getItem("qring_user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (!token || !user?.role) return "/login";
    const role = String(user.role).toLowerCase();
    if (role === "homeowner") return "/dashboard/homeowner/overview";
    if (role === "estate") return "/dashboard/estate";
    if (role === "security") return "/dashboard/security";
    if (role === "admin") return "/dashboard/admin";
  } catch {
    // Fall back to auth entry route below.
  }
  return "/login";
}

function SpaRedirectRecovery() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    if (!redirect) return;
    if (!redirect.startsWith("/") || redirect.startsWith("//")) return;
    navigate(redirect, { replace: true });
  }, [location.search, navigate]);

  return null;
}
