import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BatteryFull,
  CheckCircle2,
  History,
  Lock,
  QrCode,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  Wifi,
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";

const ONBOARDING_STEPS = [
  {
    eyebrow: "Sentinel Active",
    title: "Your Home,\nYour Rules",
    body: "Take control of your gate from anywhere. No more missed calls or security guesswork.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAYlQyfk2hf4ZM7KZEfhaIMvQ9bso2v7eYerPGZDnGmi_VZOPKllFr-MDPUek6cAado-mzm6VQLQi9yS5DIkfcj869WrhYJ3igY8HLwRxh45IBgF6M7eRphmghzNwMZ5zMq4M_ICWpzvw2cwJNVw1Awqh0Lkd-Kz7LQQT0G6fOi4gCBFrx-v-Y7TUsN2fXLaIg20TeuBOxIXoNBgosPgjr0Ht0xr034sglGAhEDIw0FyKyiNbLawLN6G_6SAeDDR10yf_PisTjBe6Ad",
  },
  {
    eyebrow: "Verification Active",
    title: "See & Verify\nInstantly",
    body: "Receive real-time alerts and video feeds when someone arrives. Verify identity before you even open the second gate.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBzmB0rWzn8yPOJmzUGOCBgoaVuNHzMPdyuyjQsaOiFc-b921EUMftnghUFAkoFVx5TVUQ3XFSgCRxa2aJtXDKqRsbW6AzHUOdLVd8Pr8ZhiC7mH3DWLlHSYAalSA_r_vbI-Bwnh_n9Dpp2LduKGYfnUHx-3jJGc0Ygd74xp_c3Kg_8VyyD4kv0VmOrY1sULDSCTl2ff7SMijJjMfNl7PjOzmNdqvliQmizcZ10pytkLIfPGStHoXb98wCdQbPJ1iB2a6eO5Ba1CLdw",
  },
  {
    eyebrow: "Guest Access",
    title: "Invite Guests in Seconds",
    body: "Generate unique QR passes for visitors, delivery agents, or domestic staff. Set time windows for total security.",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDB8N7uING40cWx4-OZXUN1-AJe8V6_E80y6XLC0uVAhypjRSMBg81sPVfx8dJWm6TnUg_hNnnW5fIMMoeHRtS6cFsgoq7ReDC28GBXHSBIQSiZ1tDUroxduZ4z12I3K49i_cYoYGOTlvwkMXm7kIPi6_UVHayXoglt3ARdDmMqW-GOEUttJkVVjgtF_FBuCjCYfprYABOJstEy_kYGiUlMOp5cVhnYUZrmMiC3v1V1h2b1KvT_wvLUK06nAxf8iYA3gINeWDhtWBg3",
  },
  {
    eyebrow: "Audit Log",
    title: "A Clear Record of Every Visit",
    body: "Access a complete, searchable history of every entry and exit. Full visibility and accountability for total peace of mind.",
  },
];

function getDashboardRoute(role) {
  if (role === "estate") return "/dashboard/estate";
  if (role === "admin") return "/dashboard/admin";
  if (role === "security") return "/dashboard/security";
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
  const accountRole = user?.role === "estate" ? "estate" : user?.role === "security" ? "security" : "homeowner";
  const [step, setStep] = useState(0);
  const isLast = step === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function markSeen() {
    const identity = getIdentity(user);
    localStorage.setItem(`qring_dashboard_welcome_seen_${accountRole}_${identity}`, "true");
    localStorage.setItem(`qring_onboarding_seen_${accountRole}_${identity}`, "true");
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

  function handleNext() {
    if (isLast) {
      completeOnboarding();
      return;
    }
    setStep((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
  }

  function handleSkip() {
    completeOnboarding();
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f8f9fa] text-[#191c1d]">
      {step === 0 ? <SlideOne onNext={handleNext} onSkip={handleSkip} /> : null}
      {step === 1 ? <SlideTwo onNext={handleNext} onSkip={handleSkip} /> : null}
      {step === 2 ? <SlideThree onNext={handleNext} onSkip={handleSkip} /> : null}
      {step === 3 ? <SlideFour onNext={handleNext} onSkip={handleSkip} /> : null}
    </div>
  );
}

function StepDots({ active, variant = "default" }) {
  return (
    <div className="flex items-center gap-2">
      {ONBOARDING_STEPS.map((_, index) => {
        const isActive = index === active;
        const isPast = index < active;
        const widthClass =
          variant === "wide"
            ? isActive
              ? "w-12"
              : "w-6"
            : isActive
              ? "w-8"
              : "w-1.5";
        return (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ${widthClass} ${
              isActive ? "bg-[#00346f]" : isPast ? "bg-[#90acd9]" : "bg-[#d7dce2]"
            }`}
          />
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[1.75rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.24em] text-white shadow-[0_20px_40px_rgba(0,52,111,0.22)] transition active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[1.75rem] bg-[#eef1f4] px-5 py-4 text-sm font-extrabold uppercase tracking-[0.24em] text-[#00346f] transition active:scale-[0.98]"
    >
      {children}
    </button>
  );
}

function SlideOne({ onNext, onSkip }) {
  const item = ONBOARDING_STEPS[0];
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-8 pt-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full px-2 py-1 text-sm font-semibold text-[#737783] transition hover:text-[#00346f]"
        >
          Skip
        </button>
      </div>

      <div className="relative mt-4 w-full flex-1 lg:mt-6">
        <div className="absolute inset-0 rounded-full bg-[#00346f]/8 blur-3xl" />
        <div className="relative mx-auto aspect-square max-w-[min(100%,26rem)] overflow-hidden rounded-[2rem] bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.06)] lg:max-w-[min(58vh,32rem)]">
          <img src={item.image} alt="Modern architectural home" className="h-full w-full rounded-[1.4rem] object-cover" />
          <div className="absolute right-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-xl sm:right-6 sm:top-6 sm:px-4 sm:py-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#9bf0d3]/50 sm:h-9 sm:w-9">
              <ShieldCheck className="h-5 w-5 text-[#016b54]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#016b54]">{item.eyebrow}</p>
              <p className="text-xs font-extrabold text-[#00346f]">Encrypted Access</p>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/40 bg-white/80 p-3 backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-6 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#737783]">Status</p>
                <p className="text-sm font-extrabold text-[#191c1d]">Main Gate Locked</p>
              </div>
              <Lock className="h-5 w-5 text-[#00346f]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 w-full space-y-4 px-1 text-center lg:text-left">
        <h1 className="whitespace-pre-line font-heading text-3xl font-extrabold leading-tight tracking-tight text-[#00346f] sm:text-4xl lg:max-w-xl">
          {item.title}
        </h1>
        <p className="mx-auto max-w-[92%] text-sm leading-relaxed text-[#424751] sm:text-base lg:mx-0 lg:max-w-xl">{item.body}</p>
      </div>

      <div className="flex w-full justify-center py-4 lg:justify-start">
        <StepDots active={0} />
      </div>

      <div className="mt-auto grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
        <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
        <PrimaryButton onClick={onNext}>Next</PrimaryButton>
      </div>
    </main>
  );
}

function SlideTwo({ onNext, onSkip }) {
  const item = ONBOARDING_STEPS[1];
  return (
    <div className="min-h-[100dvh] bg-[#f8f9fa]">
      <header className="sticky top-0 z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#00346f]">Step 2 of 4</div>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-semibold text-[#737783] transition hover:text-[#00346f]"
        >
          Skip
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-8 px-5 pb-24 pt-4 sm:px-6 lg:min-h-[calc(100dvh-6rem)] lg:flex-row lg:gap-10 lg:px-8 lg:pb-10">
        <div className="relative w-full max-w-md lg:max-w-[min(48vw,40rem)]">
          <div className="absolute inset-0 rotate-[-4deg] rounded-[2.8rem] bg-[#eef1f4]" />
          <div className="relative aspect-[4/5] max-h-[62dvh] overflow-hidden rounded-[2.5rem] bg-[#e7e8e9] shadow-sm lg:max-h-[70dvh]">
            <img src={item.image} alt="Real-time security interface" className="h-full w-full object-cover" />
            <div className="absolute left-1/2 top-6 w-[90%] -translate-x-1/2 rounded-[1.6rem] border border-white/30 bg-white/80 p-4 shadow-2xl backdrop-blur-xl sm:top-10 sm:rounded-[1.8rem] sm:p-5">
              <div className="mb-4 flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#004a99]">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#00346f]">Incoming Alert</p>
                  <p className="font-heading text-lg font-extrabold leading-tight text-[#191c1d]">Marcus Sterling, Delivery</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" className="flex-1 rounded-xl bg-[#016b54] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white">
                  Approve
                </button>
                <button type="button" className="flex-1 rounded-xl bg-[#ba1a1a] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white">
                  Deny
                </button>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 rounded-xl bg-black/45 px-3 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                <span className="h-2 w-2 rounded-full bg-[#ba1a1a]" />
                Live, Main Gate
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6 lg:space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#9bf0d3] px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-[#0c7058]" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#0c7058]">{item.eyebrow}</span>
            </div>
            <h1 className="whitespace-pre-line font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-[#00346f] sm:text-4xl lg:text-5xl">
              {item.title}
            </h1>
            <p className="text-base leading-relaxed text-[#424751] sm:text-lg">{item.body}</p>
          </div>

          <StepDots active={1} variant="wide" />

          <div className="grid gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
            <PrimaryButton onClick={onNext}>Next</PrimaryButton>
          </div>
        </div>
      </main>

    </div>
  );
}

function SlideThree({ onNext, onSkip }) {
  const item = ONBOARDING_STEPS[2];
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f8f9fa] pb-28 pt-8 sm:pt-10">
      <div className="pointer-events-none absolute right-0 top-0 opacity-5">
        <div className="h-[40rem] w-40 bg-[linear-gradient(180deg,#00346f_0%,transparent_100%)]" />
      </div>

      <main className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col items-center justify-center px-5 pb-12 sm:px-8 lg:min-h-[calc(100dvh-2rem)] lg:flex-row lg:gap-12 lg:px-8">
        <div className="absolute left-0 top-8 flex w-full items-center justify-between px-5 sm:px-8">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#00346f]">Step 3 of 4</div>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-[#737783] transition hover:text-[#00346f]"
          >
            Skip
          </button>
        </div>

        <div className="relative mb-10 mt-16 flex aspect-[4/5] w-full max-w-sm items-center justify-center lg:mb-0 lg:mt-0 lg:max-w-[min(40vw,24rem)]">
          <div className="absolute inset-0 scale-105 rotate-[-4deg] rounded-[3rem] bg-[#eef1f4]" />
          <div className="relative flex h-[min(31rem,62dvh)] w-[min(16rem,72vw)] flex-col overflow-hidden rounded-[2.5rem] border-[6px] border-[#edeeef] bg-white shadow-[0_20px_50px_rgba(0,52,111,0.08)] sm:w-64 lg:h-[min(34rem,72dvh)] lg:w-[18rem]">
            <div className="flex items-center justify-between px-6 pt-4 text-[10px] font-bold">
              <span>9:41</span>
              <div className="flex items-center gap-1 text-[#191c1d]">
                <div className="flex gap-[2px]">
                  <span className="h-2 w-1 rounded-sm bg-current opacity-70" />
                  <span className="h-2.5 w-1 rounded-sm bg-current opacity-80" />
                  <span className="h-3 w-1 rounded-sm bg-current opacity-90" />
                  <span className="h-3.5 w-1 rounded-sm bg-current" />
                </div>
                <Wifi className="h-3.5 w-3.5" />
                <BatteryFull className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full bg-[#e7e8e9]">
                  <img src={item.image} alt="Delivery person" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 h-2 w-20 rounded-full bg-[#e7e8e9]" />
                  <div className="h-1.5 w-12 rounded-full bg-[#e7e8e9]/70" />
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#00346f] p-4 shadow-lg">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9bbdff]">Guest Access Pass</p>
                <div className="rounded-2xl bg-white p-4">
                  <QrCode className="h-20 w-20 text-[#00346f]" strokeWidth={1.75} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-white">Valid: 14:00 - 18:00</p>
                  <p className="text-[10px] text-[#9bbdff]">Building A, Entrance 4</p>
                </div>
              </div>

              <div className="mt-4 self-end rounded-t-xl rounded-bl-xl bg-[#9bf0d3]/35 px-3 py-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#0c7058]">
                  <CheckCircle2 className="h-4 w-4" />
                  Pass Shared Successfully
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -right-4 top-1/4 grid h-16 w-16 rotate-12 place-items-center rounded-2xl bg-[#9bf0d3] shadow-xl">
            <UserPlus className="h-7 w-7 text-[#0c7058]" />
          </div>
          <div className="absolute -left-6 bottom-1/4 grid h-14 w-14 -rotate-12 place-items-center rounded-full bg-[#d7e2ff] shadow-lg">
            <Shield className="h-6 w-6 text-[#00346f]" />
          </div>
        </div>

        <div className="w-full max-w-sm text-center lg:max-w-md lg:text-left">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#016b54]">{item.eyebrow}</p>
          <h1 className="mb-4 font-heading text-3xl font-extrabold tracking-tight text-[#00346f] sm:text-4xl">{item.title}</h1>
          <p className="px-4 text-sm leading-relaxed text-[#424751] sm:text-base lg:px-0">{item.body}</p>
        </div>

        <div className="mt-8 lg:mt-10 lg:self-start">
          <StepDots active={2} />
        </div>
      </main>

      <footer className="w-full px-6 pb-10 pt-4 md:px-8 md:pb-8 md:pt-0">
        <div className="mx-auto max-w-md lg:max-w-6xl lg:px-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
            <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] py-5 font-heading text-sm font-extrabold uppercase tracking-[0.24em] text-white shadow-xl transition active:scale-[0.98]"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SlideFour({ onNext, onSkip }) {
  const item = ONBOARDING_STEPS[3];
  const entries = [
    {
      title: "Marcus Aurelius",
      subtitle: "Main Entrance Gate, Access Granted",
      time: "14:02",
      tone: "text-[#016b54]",
      icon: CheckCircle2,
    },
    {
      title: "Elena Fisher",
      subtitle: "North Service Exit, Logged Out",
      time: "13:45",
      tone: "text-[#00346f]",
      icon: ArrowRight,
    },
    {
      title: "Delivery Service #492",
      subtitle: "Visitor Pass, QR Scanned",
      time: "12:20",
      tone: "text-[#016b54]",
      icon: QrCode,
    },
    {
      title: "Guest Invitation Sent",
      subtitle: "Resident App, Julia Smith",
      time: "11:55",
      tone: "text-[#737783]",
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#f8f9fa] pb-32 md:pb-12">
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col items-center justify-center px-5 pt-10 sm:px-6 md:min-h-[calc(100dvh-1rem)] md:justify-center lg:flex-row lg:gap-12 lg:px-8">
        <div className="mb-8 w-full max-w-lg overflow-hidden rounded-[2rem] bg-[#f3f4f5] p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] sm:p-6 lg:mb-0 lg:max-w-[min(46vw,34rem)]">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#004a99] text-white">
                <History className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00346f]">{item.eyebrow}</p>
                <p className="text-[10px] text-[#737783]">Live Updates</p>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e1e3e4]">
              <Search className="h-4 w-4 text-[#737783]" />
            </div>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => {
              const Icon = entry.icon;
              return (
                <div
                  key={entry.title}
                  className="flex items-center gap-4 rounded-2xl border border-[#c2c6d3]/20 bg-white p-4"
                  style={{ opacity: 1 - index * 0.18 }}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f3f4f5]">
                    <Icon className={`h-5 w-5 ${entry.tone}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-heading text-sm font-extrabold text-[#191c1d]">{entry.title}</p>
                      <p className="text-[10px] font-medium text-[#737783]">{entry.time}</p>
                    </div>
                    <p className="text-xs text-[#424751]">{entry.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 px-2 text-center lg:max-w-md lg:text-left">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#00346f]">Step 4 of 4</div>
          <h1 className="font-heading text-3xl font-extrabold leading-tight tracking-tight text-[#191c1d] sm:text-4xl">{item.title}</h1>
          <p className="mx-auto max-w-[20rem] text-sm leading-relaxed text-[#424751] sm:text-base lg:mx-0">{item.body}</p>
        </div>
      </main>

      <div className="w-full px-6 pb-10 pt-6 md:px-8 md:pb-8 md:pt-4">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
          <StepDots active={3} variant="wide" />
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
            <PrimaryButton onClick={onNext}>Get Started</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
