import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";

const roleSlides = {
  homeowner: [
    {
      title: "Task Management & To-Do List",
      description: "This productive tool is designed to help you better manage your tasks and visitor requests conveniently.",
      image: "https://cdn.undraw.co/illustration/knocking-on-the-door_vgly.svg"
    },
    {
      title: "Approve Visitors Faster",
      description: "Get instant alerts, review visitor identity, and approve or deny access from anywhere in seconds.",
      image: "https://cdn.undraw.co/illustration/remote-meeting_kqj0.svg"
    },
    {
      title: "Stay Secure Daily",
      description: "Track history, manage doors, and keep control of who enters your home in real time.",
      image: "https://cdn.undraw.co/illustration/questions_52ic.svg"
    }
  ],
  estate: [
    {
      title: "Estate Command Center",
      description: "Manage homes, doors, and residents from one unified workspace built for estate operations.",
      image: "https://cdn.undraw.co/illustration/plan-mode_rs7h.svg"
    },
    {
      title: "Assign Doors With Control",
      description: "Map access points to the right homeowners, invite residents, and keep your records organized.",
      image: "https://cdn.undraw.co/illustration/remote-meeting_kqj0.svg"
    },
    {
      title: "Monitor Access Logs",
      description: "Audit visitor activity across properties and enforce plan rules with real-time visibility.",
      image: "https://cdn.undraw.co/illustration/questions_52ic.svg"
    }
  ]
};

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
  const role = user?.role === "estate" ? "estate" : "homeowner";
  const slides = useMemo(() => roleSlides[role] ?? roleSlides.homeowner, [role]);
  const [index, setIndex] = useState(0);
  const current = slides[index];
  const isLast = index >= slides.length - 1;

  function markSeen() {
    const identity = getIdentity(user);
    localStorage.setItem(`qring_dashboard_welcome_seen_${role}_${identity}`, "true");
    localStorage.setItem(`qring_onboarding_seen_${role}_${identity}`, "true");
    // Backward-compatible keys to avoid re-showing onboarding for existing users.
    if (user?.email) {
      const email = String(user.email).trim().toLowerCase();
      localStorage.setItem(`qring_dashboard_welcome_seen_${role}_${email}`, "true");
      localStorage.setItem(`qring_onboarding_seen_${role}_${email}`, "true");
    }
    if (user?.id) {
      localStorage.setItem(`qring_dashboard_welcome_seen_${role}_${user.id}`, "true");
      localStorage.setItem(`qring_onboarding_seen_${role}_${user.id}`, "true");
    }
    localStorage.setItem(`qring_dashboard_welcome_seen_${role}_anonymous`, "true");
    localStorage.setItem(`qring_onboarding_seen_${role}_anonymous`, "true");
  }

  function completeOnboarding() {
    markSeen();
    navigate(getDashboardRoute(user?.role), { replace: true });
  }

  function handlePrimary() {
    if (isLast) {
      completeOnboarding();
      return;
    }
    setIndex((prev) => Math.min(prev + 1, slides.length - 1));
  }

  function handleSkip() {
    completeOnboarding();
  }

  return (
    <div className="safe-content flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_15%_12%,rgba(156,163,175,0.22),transparent_28%),radial-gradient(circle_at_85%_90%,rgba(167,139,250,0.2),transparent_26%),linear-gradient(140deg,#f8fafc_0%,#eef2ff_54%,#f5f3ff_100%)] px-4 py-6">
      <section className="w-full max-w-sm overflow-hidden rounded-[2.4rem] border border-white/50 bg-white/85 p-4 shadow-[0_24px_70px_rgba(30,41,59,0.16)] backdrop-blur-sm sm:p-5">
        <div className="relative rounded-[2rem] bg-white p-4 pt-5 sm:p-5">
          <div className="pointer-events-none absolute left-4 top-5 h-2.5 w-2.5 rounded-full bg-sky-300" />
          <div className="pointer-events-none absolute right-8 top-10 h-2 w-2 rounded-full bg-violet-300" />
          <div className="pointer-events-none absolute bottom-10 left-8 h-2 w-2 rounded-full bg-amber-300" />
          <div className="pointer-events-none absolute bottom-8 right-10 h-2.5 w-2.5 rounded-full bg-emerald-300" />

          <div className="mb-7 flex min-h-[280px] items-center justify-center rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-4">
            <img src={current.image} alt={current.title} className="max-h-[250px] w-full object-contain" />
          </div>

          <h1 className="text-center font-heading text-3xl font-extrabold leading-tight text-slate-900">{current.title}</h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-center text-sm leading-relaxed text-slate-500">{current.description}</p>

          <div className="mt-6 flex justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setIndex(slideIndex)}
                className={`h-2.5 rounded-full transition-all ${slideIndex === index ? "w-8 bg-violet-600" : "w-2.5 bg-slate-300"}`}
                aria-label={`Go to onboarding slide ${slideIndex + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrimary}
            className="mt-7 w-full rounded-2xl bg-violet-600 px-4 py-3.5 text-base font-bold text-white transition-all hover:bg-violet-700 active:scale-[0.99]"
          >
            {isLast ? "Open Dashboard" : "Let's Start"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="mt-3 w-full text-center text-xs font-semibold uppercase tracking-wide text-slate-400 transition hover:text-slate-500"
          >
            Skip
          </button>
        </div>
      </section>
    </div>
  );
}
