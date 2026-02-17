import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import LoginPage from "./pages/auth/LoginPage";
import AdminLoginPage from "./pages/auth/AdminLoginPage";
import AdminSignupPage from "./pages/auth/AdminSignupPage";
import SignupPage from "./pages/auth/SignupPage";
import GoogleRolePage from "./pages/auth/GoogleRolePage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import HomeownerDashboardPage from "./pages/dashboard/HomeownerDashboardPage";
import HomeownerVisitsPage from "./pages/dashboard/HomeownerVisitsPage";
import HomeownerMessagesPage from "./pages/dashboard/HomeownerMessagesPage";
import HomeownerDoorsPage from "./pages/dashboard/HomeownerDoorsPage";
import HomeownerSettingsPage from "./pages/dashboard/HomeownerSettingsPage";
import HomeownerPaywallPage from "./pages/dashboard/HomeownerPaywallPage";
import BillingCallbackPage from "./pages/dashboard/BillingCallbackPage";
import EstateDashboardPage from "./pages/dashboard/EstateDashboardPage";
import EstateCreatePage from "./pages/dashboard/EstateCreatePage";
import EstateDoorsPage from "./pages/dashboard/EstateDoorsPage";
import EstateAssignPage from "./pages/dashboard/EstateAssignPage";
import EstateInvitesPage from "./pages/dashboard/EstateInvitesPage";
import EstateMappingsPage from "./pages/dashboard/EstateMappingsPage";
import EstateLogsPage from "./pages/dashboard/EstateLogsPage";
import EstatePlanPage from "./pages/dashboard/EstatePlanPage";
import EstateHomesPage from "./pages/dashboard/EstateHomesPage";
import AdminDashboardPage from "./pages/dashboard/AdminDashboardPage";
import AdminPaymentsPage from "./pages/dashboard/AdminPaymentsPage";
import AdminUsersPage from "./pages/dashboard/AdminUsersPage";
import AdminSessionsPage from "./pages/dashboard/AdminSessionsPage";
import AdminConfigPage from "./pages/dashboard/AdminConfigPage";
import AdminAuditPage from "./pages/dashboard/AdminAuditPage";
import ScanPage from "./pages/visitor/ScanPage";
import SessionMessagePage from "./pages/visitor/SessionMessagePage";
import SessionAudioPage from "./pages/visitor/SessionAudioPage";
import SessionVideoPage from "./pages/visitor/SessionVideoPage";
import UnauthorizedPage from "./pages/common/UnauthorizedPage";
import NotFoundPage from "./pages/common/NotFoundPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import { AuthProvider } from "./state/AuthContext";
import { ThemeProvider } from "./state/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/signup" element={<AdminSignupPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/google-role" element={<GoogleRolePage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/scan/:qrId" element={<ScanPage />} />
            <Route path="/session/:sessionId" element={<Navigate to="message" replace />} />
            <Route path="/session/:sessionId/message" element={<SessionMessagePage />} />
            <Route path="/session/:sessionId/audio" element={<SessionAudioPage />} />
            <Route path="/session/:sessionId/video" element={<SessionVideoPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRoles={["homeowner", "estate"]} />}>
                <Route path="/billing/paywall" element={<HomeownerPaywallPage />} />
                <Route path="/billing/callback" element={<BillingCallbackPage />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["homeowner"]} />}>
                <Route path="/dashboard/homeowner" element={<Navigate to="/dashboard/homeowner/overview" replace />} />
                <Route path="/dashboard/homeowner/overview" element={<HomeownerDashboardPage />} />
                <Route path="/dashboard/homeowner/visits" element={<HomeownerVisitsPage />} />
                <Route path="/dashboard/homeowner/messages" element={<HomeownerMessagesPage />} />
                <Route path="/dashboard/homeowner/doors" element={<HomeownerDoorsPage />} />
                <Route path="/dashboard/homeowner/settings" element={<HomeownerSettingsPage />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["estate"]} />}>
                <Route path="/dashboard/estate" element={<EstateDashboardPage />} />
                <Route path="/dashboard/estate/create" element={<EstateCreatePage />} />
                <Route path="/dashboard/estate/doors" element={<EstateDoorsPage />} />
                <Route path="/dashboard/estate/assign" element={<EstateAssignPage />} />
                <Route path="/dashboard/estate/invites" element={<EstateInvitesPage />} />
                <Route path="/dashboard/estate/mappings" element={<EstateMappingsPage />} />
                <Route path="/dashboard/estate/logs" element={<EstateLogsPage />} />
                <Route path="/dashboard/estate/plan" element={<EstatePlanPage />} />
                <Route path="/dashboard/estate/homes" element={<EstateHomesPage />} />
              </Route>
              <Route element={<RoleRoute allowedRoles={["admin"]} />}>
                <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
                <Route path="/dashboard/admin/users" element={<AdminUsersPage />} />
                <Route path="/dashboard/admin/sessions" element={<AdminSessionsPage />} />
                <Route path="/dashboard/admin/payments" element={<AdminPaymentsPage />} />
                <Route path="/dashboard/admin/config" element={<AdminConfigPage />} />
                <Route path="/dashboard/admin/audit" element={<AdminAuditPage />} />
              </Route>
            </Route>

            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/dashboard" element={<Navigate to="/dashboard/homeowner/overview" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
