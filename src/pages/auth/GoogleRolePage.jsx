import { useState } from "react";
import { Building2, CheckCircle2, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";
import { getStoredUser } from "../../services/authStorage";
import { resolvePostLoginPath } from "../../utils/authRouting";

const rolePath = {
  homeowner: "/dashboard/homeowner/overview",
  admin: "/dashboard/admin",
  estate: "/dashboard/estate"
};
const MOBILE_ONBOARDING_INTENT_KEY = "qring_mobile_onboarding_intent";

export default function GoogleRolePage() {
  const { googleSignUp, loading } = useAuth();
  const [role, setRole] = useState("homeowner");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const intent = location.state?.intent ?? "signin-fallback";
  const onboardingIntentKey = "qring_onboarding_role_intent";

  async function onContinue(event) {
    event.preventDefault();
    setError("");

    try {
      localStorage.removeItem(onboardingIntentKey);
      const data = await googleSignUp(role);
      if (intent === "signup") {
        setShowSuccess(true);
        localStorage.setItem(MOBILE_ONBOARDING_INTENT_KEY, "1");
        window.dispatchEvent(
          new CustomEvent("qring:flash", {
            detail: {
              type: "success",
              title: "Signup Successful",
              message: "Google account setup complete. Opening onboarding...",
              duration: 2600
            }
          })
        );
        window.setTimeout(() => navigate("/onboarding", { replace: true }), 1200);
        return;
      }

      const storedUser = getStoredUser();
      const userRole = data?.user?.role ?? storedUser?.role;
      if (!userRole) throw new Error("Account setup completed but role was not returned.");
      const fallback = rolePath[userRole];
      if (!fallback) throw new Error(`Account setup completed but role '${userRole}' is not supported.`);
      navigate(resolvePostLoginPath({ role: userRole }, location.state?.from?.pathname ?? fallback), { replace: true });
    } catch (submitError) {
      setError(submitError.message ?? "Unable to finish Google account setup");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Choose Your Role" subtitle="Select how you want to use Qring on this account">
        <form onSubmit={onContinue} className="space-y-4">
          <RolePicker
            value={role}
            onChange={setRole}
            options={[
              {
                value: "homeowner",
                label: "Resident / Homeowner",
                description: "Control your home access, visitors, doors, and notifications.",
                icon: Home
              },
              {
                value: "estate",
                label: "Estate Manager",
                description: "Manage multiple homes, residents, security operations, and estate activity.",
                icon: Building2
              }
            ]}
          />

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Continue"}
          </button>
        </form>
      </AuthCard>
      {showSuccess ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Success</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Account setup complete. Opening onboarding...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RolePicker({ value, onChange, options }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Choose role</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Large touch-friendly options for quick selection on mobile.</p>
      </div>
      <div className="grid gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`w-full rounded-[1.35rem] border px-4 py-4 text-left transition active:scale-[0.99] sm:px-5 ${
                isActive
                  ? "border-[#00346f] bg-[#d7e2ff]/60 shadow-[0_12px_26px_rgba(0,52,111,0.12)]"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] ${
                    isActive ? "bg-[#00346f] text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{option.label}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{option.description}</p>
                    </div>
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? "text-[#00346f]" : "text-slate-300 dark:text-slate-600"}`}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
