import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import BrandMark from "../../components/BrandMark";
import { env } from "../../config/env";
import { getHomeownerContext, getHomeownerDoors, joinEstate } from "../../services/homeownerService";
import { getEstateOverview } from "../../services/estateService";
import * as authService from "../../services/authService";
import { requestBrowserNotificationPermission } from "../../services/notificationService";
import { checkLocationPermission, requestLocationPermission } from "../../utils/locationService";
import {
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  Globe,
  Lock,
  Mail,
  MapPin,
  Mic,
  Shield,
  Siren,
  Users
} from "lucide-react";

function getDashboardRoute(role) {
  if (role === "estate") return "/dashboard/estate";
  if (role === "admin") return "/dashboard/admin";
  return "/dashboard/homeowner/overview";
}

function getIdentity(user) {
  if (user?.id) return `id:${user.id}`;
  if (user?.email) return `email:${String(user.email).trim().toLowerCase()}`;
  return "anonymous";
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const accountRole = user?.role === "estate" ? "estate" : "homeowner";
  const [step, setStep] = useState(0);
  const [onboardingRole, setOnboardingRole] = useState(() => {
    if (accountRole === "estate") return "estate";
    try {
      return localStorage.getItem("qring_onboarding_role_intent") === "resident" ? "resident" : "homeowner";
    } catch {
      return "homeowner";
    }
  });
  const [onboardingRoleTouched, setOnboardingRoleTouched] = useState(false);
  const [homeownerContext, setHomeownerContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [permissionState, setPermissionState] = useState({
    notifications: "unknown",
    location: "unknown",
    camera: "unknown",
    microphone: "unknown"
  });
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("");
  const [estateJoinState, setEstateJoinState] = useState({
    joinToken: "",
    unitName: "",
    busy: false,
    status: ""
  });
  const [scenarioState, setScenarioState] = useState({
    running: false,
    stage: "idle",
    secondsLeft: 0,
    cancelled: false
  });
  const [previewState, setPreviewState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (accountRole !== "homeowner") return;
    try {
      localStorage.removeItem("qring_onboarding_role_intent");
    } catch {
      // ignore
    }
  }, [accountRole]);

  const onboardingPersona = useMemo(() => {
    if (accountRole === "estate") return "estate";
    if (onboardingRole === "resident") return "resident";
    return "homeowner";
  }, [accountRole, onboardingRole]);

  const persona = useMemo(() => {
    if (onboardingPersona === "estate") {
      return {
        label: "Estate Manager",
        subtitle: "Run access, security teams, and resident operations from one place.",
        icon: Users
      };
    }
    if (onboardingPersona === "resident") {
      return {
        label: "Resident",
        subtitle: "Connected to estate security for faster response and coordination.",
        icon: Shield
      };
    }
    return {
      label: "Homeowner",
      subtitle: "Approve visitors fast, keep logs, and trigger emergency alerts when needed.",
      icon: Lock
    };
  }, [onboardingPersona]);

  const totalSteps = 6;

  useEffect(() => {
    if (step !== totalSteps - 1) return;
    let active = true;

    async function loadPreview() {
      setPreviewState({ loading: true, data: null, error: "" });
      try {
        if (onboardingPersona === "estate") {
          const overview = await getEstateOverview();
          const estates = Array.isArray(overview?.estates) ? overview.estates : [];
          const homes = Array.isArray(overview?.homes) ? overview.homes : [];
          const doors = Array.isArray(overview?.doors) ? overview.doors : [];
          if (!active) return;
          setPreviewState({
            loading: false,
            error: "",
            data: {
              status: estates.length > 0 ? "Live" : "Setup",
              homes: homes.length,
              doors: doors.length
            }
          });
          return;
        }

        const doorData = await getHomeownerDoors();
        const doors = Array.isArray(doorData?.doors) ? doorData.doors : [];
        const plan = doorData?.subscription?.plan || "Free";
        if (!active) return;
        setPreviewState({
          loading: false,
          error: "",
          data: {
            status: "Live",
            doors: doors.length,
            plan: String(plan).toUpperCase()
          }
        });
      } catch (error) {
        if (!active) return;
        setPreviewState({
          loading: false,
          data: null,
          error: error?.message || "Unable to load preview."
        });
      }
    }

    loadPreview();
    return () => {
      active = false;
    };
  }, [onboardingPersona, step, totalSteps]);
  const isLast = step >= totalSteps - 1;

  function markSeen() {
    const identity = getIdentity(user);
    localStorage.setItem(`qring_dashboard_welcome_seen_${accountRole}_${identity}`, "true");
    localStorage.setItem(`qring_onboarding_seen_${accountRole}_${identity}`, "true");
    // Backward-compatible keys to avoid re-showing onboarding for existing users.
    if (user?.email) {
      const email = String(user.email).trim().toLowerCase();
      localStorage.setItem(`qring_dashboard_welcome_seen_${accountRole}_${email}`, "true");
      localStorage.setItem(`qring_onboarding_seen_${accountRole}_${email}`, "true");
    }
    if (user?.id) {
      localStorage.setItem(`qring_dashboard_welcome_seen_${accountRole}_${user.id}`, "true");
      localStorage.setItem(`qring_onboarding_seen_${accountRole}_${user.id}`, "true");
    }
    localStorage.setItem(`qring_dashboard_welcome_seen_${accountRole}_anonymous`, "true");
    localStorage.setItem(`qring_onboarding_seen_${accountRole}_anonymous`, "true");
  }

  function completeOnboarding() {
    markSeen();
    navigate(getDashboardRoute(user?.role), { replace: true });
  }

  function handleSkip() {
    completeOnboarding();
  }

  useEffect(() => {
    if (accountRole !== "homeowner") return;
    let active = true;
    setLoadingContext(true);
    getHomeownerContext()
      .then((data) => {
        if (!active) return;
        setHomeownerContext(data);
        if (!onboardingRoleTouched) {
          setOnboardingRole(data?.managedByEstate ? "resident" : "homeowner");
        }
      })
      .catch(() => {
        if (!active) return;
        setHomeownerContext(null);
      })
      .finally(() => {
        if (!active) return;
        setLoadingContext(false);
      });
    return () => {
      active = false;
    };
  }, [accountRole, onboardingRoleTouched]);

  useEffect(() => {
    let active = true;

    async function refreshPermissionState() {
      const notifications =
        typeof window !== "undefined" && typeof window.Notification !== "undefined"
          ? window.Notification.permission
          : "unsupported";
      const location = (await checkLocationPermission().catch(() => ({ state: "prompt" })))?.state ?? "prompt";
      if (!active) return;
      setPermissionState((prev) => ({
        ...prev,
        notifications,
        location
      }));
    }

    refreshPermissionState();
    return () => {
      active = false;
    };
  }, []);

  async function requestNotifications() {
    const result = await requestBrowserNotificationPermission();
    setPermissionState((prev) => ({ ...prev, notifications: result || "default" }));
  }

  async function requestLocation() {
    const result = await requestLocationPermission();
    setPermissionState((prev) => ({ ...prev, location: result?.state || "prompt" }));
  }

  async function requestMedia(kind) {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState((prev) => ({ ...prev, [kind]: "unsupported" }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: kind === "camera",
        audio: kind === "microphone"
      });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState((prev) => ({ ...prev, [kind]: "granted" }));
    } catch {
      setPermissionState((prev) => ({ ...prev, [kind]: "denied" }));
    }
  }

  function isEmailVerified() {
    return Boolean(user?.emailVerified ?? user?.email_verified ?? user?.email_verified_at ?? user?.verified);
  }

  async function sendVerificationEmail() {
    if (!user?.email) {
      setVerificationStatus("Missing email on your account.");
      return;
    }
    setVerificationBusy(true);
    setVerificationStatus("");
    try {
      await authService.requestEmailVerification({ email: String(user.email).trim().toLowerCase() });
      setVerificationStatus("Verification email sent. Check your inbox (and spam).");
    } catch (error) {
      setVerificationStatus(error?.message || "Unable to send verification email.");
    } finally {
      setVerificationBusy(false);
    }
  }

  async function runScenarioDemo() {
    if (scenarioState.running) return;
    setScenarioState({ running: true, stage: "arming", secondsLeft: 3, cancelled: false });
    for (let i = 3; i >= 1; i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000));
      setScenarioState((prev) => ({ ...prev, secondsLeft: Math.max(0, i - 1) }));
    }
    setScenarioState((prev) => ({ ...prev, stage: "cancel_window", secondsLeft: 8 }));
    for (let i = 8; i >= 1; i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1000));
      setScenarioState((prev) => ({ ...prev, secondsLeft: Math.max(0, i - 1) }));
      if (scenarioState.cancelled) break;
    }
    setScenarioState((prev) => ({
      ...prev,
      stage: prev.cancelled ? "cancelled" : "sent",
      running: false,
      secondsLeft: 0
    }));
  }

  function cancelScenario() {
    setScenarioState((prev) => ({ ...prev, cancelled: true, stage: "cancelled", running: false, secondsLeft: 0 }));
  }

  const headerHint = useMemo(() => {
    if (onboardingPersona === "estate") return "Built for estate operations in Nigeria: fast, reliable, auditable.";
    if (onboardingPersona === "resident") return `Linked to an estate for coordinated security response.`;
    return "Built for everyday gate access and real emergencies.";
  }, [onboardingPersona]);

  const nextLabel = isLast ? "Open Dashboard" : "Continue";

  return (
    <div className="safe-content min-h-[100dvh] bg-[radial-gradient(circle_at_12%_10%,rgba(37,99,235,0.18),transparent_38%),radial-gradient(circle_at_86%_86%,rgba(20,184,166,0.14),transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f1f5f9_100%)] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/60 bg-white/80 shadow-soft">
              <BrandMark tone="light" className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">QRing Onboarding</div>
              <div className="text-sm font-extrabold text-slate-900">{persona.label}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700"
          >
            Skip
          </button>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/85 shadow-[0_24px_80px_rgba(2,6,23,0.12)] backdrop-blur">
          <div className="border-b border-slate-200/70 bg-white/70 px-5 py-4">
            <p className="text-xs font-semibold text-slate-600">{headerHint}</p>
            <div className="mt-3 flex items-center gap-2">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2.5 flex-1 rounded-full ${idx <= step ? "bg-brand-500" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>

          <div className="p-5">
            {step === 0 ? (
              <div>
                <h1 className="font-heading text-2xl font-black tracking-tight text-slate-900">I am a:</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Choose the onboarding path that matches how you’ll use QRing. This only changes what we show you here.
                </p>

                <div className="mt-5 grid gap-3">
                  <RoleCard
                    active={onboardingPersona === "homeowner"}
                    disabled={accountRole !== "homeowner"}
                    icon={Lock}
                    title="Homeowner"
                    body="Approve visitors, manage logs, and alert your trusted contacts."
                    onClick={() => {
                      setOnboardingRoleTouched(true);
                      setOnboardingRole("homeowner");
                    }}
                  />
                  <RoleCard
                    active={onboardingPersona === "estate"}
                    disabled={accountRole !== "estate"}
                    icon={Users}
                    title="Estate Manager"
                    body="Run security workflow, live queue, and resident operations."
                    onClick={() => {
                      setOnboardingRoleTouched(true);
                      setOnboardingRole("estate");
                    }}
                  />
                  <RoleCard
                    active={onboardingPersona === "resident"}
                    disabled={accountRole !== "homeowner"}
                    icon={Shield}
                    title="Resident"
                    body="Link to your estate so emergencies route to security first."
                    onClick={() => {
                      setOnboardingRoleTouched(true);
                      setOnboardingRole("resident");
                    }}
                  />
                </div>

                {accountRole === "estate" ? (
                  <p className="mt-4 text-xs text-slate-500">
                    This account is registered as an Estate Manager. To onboard as a homeowner or resident, create a homeowner account.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                    <persona.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-heading text-2xl font-black tracking-tight text-slate-900">
                      Welcome to QRing
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-600">{persona.subtitle}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {onboardingPersona === "estate" ? (
                    <>
                      <ValueCard icon={Users} title="Visitor logs and live queue" body="See what’s waiting, approved, and denied across your estate in real time." />
                      <ValueCard icon={Shield} title="Security dashboard workflow" body="Guards get clarity. Admins track decisions. Every action is auditable." />
                      <ValueCard icon={Siren} title="Emergency coordination" body="A resident can trigger an alert that routes to guards, admins, and escalation contacts." />
                    </>
                  ) : (
                    <>
                      <ValueCard icon={Shield} title="Emergency alerts that coordinate help" body="Hold to trigger an alert. Built for unstable networks and real emergencies." />
                      <ValueCard icon={Globe} title="Works under poor network" body="Realtime first, fallback channels when connectivity is weak." />
                      <ValueCard icon={Lock} title="Verifiable activity trail" body="Visitor requests, messages, and security actions are recorded for accountability." />
                    </>
                  )}
                </div>

                {accountRole === "homeowner" ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Mode</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {loadingContext
                        ? "Checking estate link..."
                        : onboardingPersona === "resident"
                          ? homeownerContext?.managedByEstate
                            ? `Resident under ${homeownerContext?.estateName || "an estate"}`
                            : "Resident (not linked yet)"
                          : "Independent homeowner"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      You can update safety preferences anytime from the Safety page.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Permissions, explained</h2>
                <p className="mt-1 text-sm text-slate-600">
                  QRing asks only for what makes access and emergencies work smoothly.
                </p>

                <div className="mt-5 grid gap-3">
                  <PermissionCard
                    icon={Bell}
                    title="Notifications"
                    description="So visitor requests and emergency alerts show instantly, even when the app is in the background."
                    status={permissionState.notifications}
                    actionLabel="Enable"
                    onAction={requestNotifications}
                  />
                  <PermissionCard
                    icon={MapPin}
                    title="Location"
                    description="So emergency alerts can include your last known location for faster coordination."
                    status={permissionState.location}
                    actionLabel="Enable"
                    onAction={requestLocation}
                  />
                  <PermissionCard
                    icon={Camera}
                    title="Camera"
                    description="Used for snapshot verification and call verification when needed."
                    status={permissionState.camera}
                    actionLabel="Test"
                    onAction={() => requestMedia("camera")}
                  />
                  <PermissionCard
                    icon={Mic}
                    title="Microphone"
                    description="Used for call verification and voice notes when network is unstable."
                    status={permissionState.microphone}
                    actionLabel="Test"
                    onAction={() => requestMedia("microphone")}
                  />
                  {onboardingPersona !== "estate" ? (
                    <PermissionCard
                      icon={Users}
                      title="Emergency contacts (optional)"
                      description="Add trusted people now so independent alerts can reach someone fast."
                      status="optional"
                      actionLabel="Set up"
                      onAction={() => navigate("/dashboard/homeowner/emergency-contacts")}
                    />
                  ) : null}
                </div>

                <p className="mt-4 text-xs text-slate-500">
                  Tip: You can proceed without enabling everything now. QRing will ask again only when required.
                </p>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Secure your account</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Verification makes alerts more reliable and reduces abuse.
                </p>

                <div className="mt-5 grid gap-3">
                  {onboardingPersona === "resident" ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">Estate verification (optional)</p>
                          <p className="mt-1 text-xs text-slate-600">
                            Enter a join code or estate ID to link your unit. If you don’t have one, ask your estate admin.
                          </p>
                        </div>
                      </div>

                      {homeownerContext?.managedByEstate ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                          Linked to {homeownerContext?.estateName || "your estate"}.
                        </div>
                      ) : (
                        <form
                          className="mt-4 grid gap-2"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (estateJoinState.busy) return;
                            setEstateJoinState((prev) => ({ ...prev, busy: true, status: "" }));
                            try {
                              await joinEstate({
                                joinToken: estateJoinState.joinToken,
                                unitName: estateJoinState.unitName
                              });
                              const refreshed = await getHomeownerContext();
                              setHomeownerContext(refreshed);
                              setEstateJoinState((prev) => ({ ...prev, busy: false, status: "Estate linked successfully." }));
                            } catch (error) {
                              setEstateJoinState((prev) => ({
                                ...prev,
                                busy: false,
                                status: error?.message || "Unable to link estate."
                              }));
                            }
                          }}
                        >
                          <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            Estate code or ID
                            <input
                              value={estateJoinState.joinToken}
                              onChange={(event) => setEstateJoinState((prev) => ({ ...prev, joinToken: event.target.value }))}
                              placeholder="e.g. QR-EST-XXXXXX"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-semibold text-slate-700">
                            Unit / house label
                            <input
                              value={estateJoinState.unitName}
                              onChange={(event) => setEstateJoinState((prev) => ({ ...prev, unitName: event.target.value }))}
                              placeholder="e.g. Block C, Flat 12"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500"
                            />
                          </label>
                          <button
                            type="submit"
                            disabled={estateJoinState.busy}
                            className="mt-1 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {estateJoinState.busy ? "Linking..." : "Link estate"}
                          </button>
                          {estateJoinState.status ? (
                            <p className="text-xs font-medium text-slate-600">{estateJoinState.status}</p>
                          ) : null}
                        </form>
                      )}
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Email verification</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {isEmailVerified()
                              ? "Verified. You’re good to go."
                              : "Not verified yet. Please verify to keep emergency actions trusted."}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isEmailVerified() ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Verified
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={sendVerificationEmail}
                            disabled={verificationBusy}
                            className="rounded-full bg-brand-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white disabled:opacity-60"
                          >
                            {verificationBusy ? "Sending..." : "Send link"}
                          </button>
                        )}
                      </div>
                    </div>
                    {verificationStatus ? (
                      <p className="mt-3 text-xs font-medium text-slate-600">{verificationStatus}</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Safety first, no false promises</p>
                        <p className="mt-1 text-xs text-slate-600">
                          QRing facilitates emergency alerting and coordination. It does not guarantee external service response.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Quick practice</h2>
                <p className="mt-1 text-sm text-slate-600">
                  A short simulation so you know what to do under pressure.
                </p>

                {onboardingPersona === "estate" ? (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Scenario</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">Visitor arrival at Gate B</p>
                    <p className="mt-1 text-xs text-slate-600">
                      You’ll see it in the live queue, then guards and homeowners can act fast.
                    </p>
                    <div className="mt-4 grid gap-2">
                      <DemoRow label="Status" value="Waiting" />
                      <DemoRow label="Next action" value="Notify guard, contact homeowner" />
                      <DemoRow label="Audit trail" value="Recorded automatically" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-500/10 text-rose-600">
                        <Siren className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Emergency alert (demo)</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Hold to trigger. There’s a short cancel window to prevent false alarms.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-700">
                        {scenarioState.stage === "idle"
                          ? "Ready"
                          : scenarioState.stage === "arming"
                            ? `Holding... ${scenarioState.secondsLeft}s`
                            : scenarioState.stage === "cancel_window"
                              ? `Cancel window... ${scenarioState.secondsLeft}s`
                              : scenarioState.stage === "sent"
                                ? "Alert sent (demo)"
                                : "Cancelled (demo)"}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={runScenarioDemo}
                          disabled={scenarioState.running}
                          className="rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
                        >
                          Hold to Test
                        </button>
                        <button
                          type="button"
                          onClick={cancelScenario}
                          disabled={!scenarioState.running && scenarioState.stage !== "cancel_window"}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        Demo only. No messages are sent from this screen.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Make it useful now</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Optional setup. You can skip and return later.
                </p>

                <div className="mt-5 grid gap-3">
                  {onboardingPersona === "estate" ? (
                    <>
                      <SetupLink
                        to="/dashboard/estate/security"
                        title="Add your security team"
                        subtitle="Assign guards and set gate responsibilities."
                      />
                      <SetupLink
                        to="/dashboard/estate/doors"
                        title="Create doors and access points"
                        subtitle="Set up Gate A, Gate B, and checkpoints."
                      />
                      <SetupLink
                        to="/dashboard/estate/invites"
                        title="Invite homeowners and residents"
                        subtitle="Link units to the right people so alerts route correctly."
                      />
                    </>
                  ) : (
                    <>
                      <SetupLink
                        to="/dashboard/homeowner/emergency-contacts"
                        title="Add emergency contacts"
                        subtitle="So independent alerts can reach trusted people fast."
                      />
                      <SetupLink
                        to="/dashboard/homeowner/safety"
                        title="Set panic preferences"
                        subtitle="Silent trigger, cancel window, and alert type."
                      />
                      <SetupLink
                        to="/dashboard/homeowner/settings"
                        title="Tune notification sounds"
                        subtitle="Pick alert sounds and push settings that you won’t ignore."
                      />
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Network reality</p>
                        <p className="mt-1 text-xs text-slate-600">
                          In Nigeria, internet can drop. QRing prioritizes realtime, then fallback channels where available.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Motivation</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Finish setup to react faster</p>
                  <p className="mt-1 text-xs text-slate-600">
                    When something goes wrong, you won’t have time to learn the app. This walkthrough is here so you’re ready.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Preview</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">You’re ready.</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Open the dashboard to see live data and start using QRing.
                  </p>
                  <DashboardPreview
                    persona={onboardingPersona}
                    homeownerContext={homeownerContext}
                    previewState={previewState}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200/70 bg-white/70 p-5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                disabled={step === 0}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLast) {
                    completeOnboarding();
                    return;
                  }
                  setStep((prev) => Math.min(totalSteps - 1, prev + 1));
                }}
                className="rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-brand-700 active:scale-[0.99]"
              >
                {nextLabel}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Step {step + 1} of {totalSteps}</span>
            </div>
          </div>
        </section>

        <footer className="mt-4 text-center text-xs text-slate-500">
          Need help?{" "}
          <Link to="/contact" className="font-semibold text-brand-700">
            Contact support
          </Link>
        </footer>
      </div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{body}</p>
        </div>
      </div>
    </div>
  );
}

function normalizePermissionStatus(raw) {
  const value = String(raw || "").toLowerCase();
  if (value === "optional") return { label: "Optional", tone: "warn" };
  if (value === "granted") return { label: "Enabled", tone: "ok" };
  if (value === "denied") return { label: "Blocked", tone: "bad" };
  if (value === "unsupported") return { label: "Unsupported", tone: "muted" };
  if (value === "default" || value === "prompt" || value === "unknown") return { label: "Not set", tone: "warn" };
  return { label: "Not set", tone: "warn" };
}

function RoleCard({ active, disabled, icon: Icon, title, body, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? "border-brand-500 bg-brand-50"
          : disabled
            ? "border-slate-200 bg-slate-50 opacity-60"
            : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${active ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-800"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{body}</p>
        </div>
      </div>
    </button>
  );
}

function DashboardPreview({ persona, homeownerContext, previewState }) {
  const hasData = Boolean(previewState?.data);
  const headline =
    persona === "estate"
      ? "Estate snapshot"
      : homeownerContext?.managedByEstate
        ? "Resident snapshot"
        : "Home snapshot";
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">{headline}</p>
        {previewState?.loading ? (
          <span className="text-[11px] font-semibold text-slate-500">Loading…</span>
        ) : null}
      </div>
      {previewState?.error ? <p className="mt-2 text-xs text-rose-700">{previewState.error}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <PreviewTile label="Status" value={hasData ? previewState.data.status : "Ready"} />
        <PreviewTile label="Mode" value={persona === "estate" ? "Estate" : homeownerContext?.managedByEstate ? "Resident" : "Homeowner"} />
        {persona === "estate" ? (
          <>
            <PreviewTile label="Homes" value={hasData ? String(previewState.data.homes ?? 0) : "0"} />
            <PreviewTile label="Doors" value={hasData ? String(previewState.data.doors ?? 0) : "0"} />
          </>
        ) : (
          <>
            <PreviewTile label="Doors" value={hasData ? String(previewState.data.doors ?? 0) : "0"} />
            <PreviewTile label="Plan" value={hasData ? String(previewState.data.plan ?? "Free") : "Free"} />
          </>
        )}
      </div>
    </div>
  );
}

function PreviewTile({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function PermissionCard({ icon: Icon, title, description, status, actionLabel, onAction }) {
  const meta = normalizePermissionStatus(status);
  const badge =
    meta.tone === "ok"
      ? "bg-emerald-500/10 text-emerald-700"
      : meta.tone === "bad"
        ? "bg-rose-500/10 text-rose-700"
        : meta.tone === "muted"
          ? "bg-slate-200 text-slate-600"
          : "bg-amber-500/10 text-amber-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-800">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-600">{description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${badge}`}>
            {meta.label}
          </span>
          {meta.tone !== "ok" && meta.tone !== "muted" ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DemoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-900">{value}</span>
    </div>
  );
}

function SetupLink({ to, title, subtitle }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{subtitle}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400" />
    </Link>
  );
}
