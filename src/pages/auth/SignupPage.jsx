import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Home } from "lucide-react";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";
import { requestEmailVerification } from "../../services/authService";

const MOBILE_ONBOARDING_INTENT_KEY = "qring_mobile_onboarding_intent";

export default function SignupPage() {
  const { signup, login, beginGoogleSignUp, resumeGoogleRedirect } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "homeowner",
    referralCode: ""
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [verification, setVerification] = useState({ sending: false, status: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const resumeNativeGoogleSignup = async () => {
      try {
        const resumed = await resumeGoogleRedirect();
        if (!active || !resumed) return;
        if (resumed.intent === "signup") {
          navigate("/google-role", {
            replace: true,
            state: { intent: "signup" }
          });
        }
      } catch (resumeError) {
        if (!active) return;
        setError(resumeError.message ?? "Google sign-up failed");
      }
    };

    resumeNativeGoogleSignup();
    return () => {
      active = false;
    };
  }, [navigate, resumeGoogleRedirect]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!agreedToTerms) {
      setError("You must agree to the Terms and Conditions to sign up.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await signup(form);
      setPendingCredentials({ email: form.email, password: form.password });
      setSignupSuccess(true);
      // Backend already attempts sending verification mail, but we also trigger a best-effort resend
      // so the user immediately gets a link (and we can show clear UI feedback).
      setVerification({ sending: true, status: "" });
      try {
        const response = await requestEmailVerification({ email: String(form.email || "").trim().toLowerCase() });
        const status = response?.data?.emailStatus ?? response?.emailStatus ?? "unknown";
        const reason = response?.data?.emailReason ?? response?.emailReason ?? "";
        if (String(status).toLowerCase() === "sent") {
          setVerification({ sending: false, status: "Email sent" });
          navigate(`/verify-email?email=${encodeURIComponent(String(form.email || "").trim().toLowerCase())}`);
        } else {
          setVerification({
            sending: false,
            status: `Verification email could not be sent (${status}${reason ? `: ${reason}` : ""}).`
          });
        }
      } catch (err) {
        setVerification({
          sending: false,
          status: err?.message || "Unable to send verification email right now. Use Resend to try again."
        });
      }
    } catch (submitError) {
      setError(submitError.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onContinueAfterSignup = async () => {
    if (!pendingCredentials) return;
    setError("");
    setContinuing(true);
    try {
      await login(pendingCredentials);
      localStorage.setItem(MOBILE_ONBOARDING_INTENT_KEY, "1");
      navigate("/onboarding", { replace: true });
    } catch (submitError) {
      const status = Number(submitError?.status ?? 0);
      const message = String(submitError?.message ?? "");
      if (status === 403 && message.toLowerCase().includes("not verified")) {
        setError("Email is not verified yet. Please verify your email, then tap “I’ve verified, continue”.");
      } else {
        setError(submitError.message ?? "Login failed after signup");
      }
    } finally {
      setContinuing(false);
    }
  };

  const onGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setError("You must agree to the Terms and Conditions to sign up.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await beginGoogleSignUp(form.referralCode);
      navigate("/google-role", {
        state: { intent: "signup" }
      });
    } catch (submitError) {
      setError(submitError.message ?? "Google sign-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="safe-content min-h-[105dvh] overflow-x-hidden bg-slate-50 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-6 dark:bg-slate-950 sm:grid sm:place-items-center sm:px-4 sm:py-6">
      <AuthCard title="Create Account" subtitle="Start with secure QR access">
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
          <Input label="Full name" type="text" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <PasswordInput
            label="Password"
            value={form.password}
            show={showPassword}
            onToggle={() => setShowPassword((prev) => !prev)}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          <Input
            label="Referral code (optional)"
            type="text"
            value={form.referralCode}
            required={false}
            onChange={(value) => setForm((prev) => ({ ...prev, referralCode: value }))}
          />

          <RolePicker
            value={form.role}
            onChange={(role) => setForm((prev) => ({ ...prev, role }))}
            options={[
              {
                value: "homeowner",
                label: "Resident",
                description: "Manage your home, visitors, doors, and alerts.",
                icon: Home
              },
              {
                value: "estate",
                label: "Estate Management",
                description: "Run an estate with resident access, visitor logs, and oversight tools.",
                icon: Building2
              }
            ]}
          />

          <div className="flex items-center gap-2">
            <input
              id="agree-terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="accent-brand-500 w-4 h-4"
              required
            />
            <label htmlFor="agree-terms" className="text-xs text-slate-700 dark:text-slate-300 select-none">
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-brand-500">Terms and Conditions</a>
            </label>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Account"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-50 px-2 text-slate-500 dark:bg-slate-950 dark:text-slate-400">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoogleSignUp}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <svg className="mb-0.5 mr-2 inline h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {submitting ? "Creating account..." : "Sign up with Google"}
          </button>

          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:text-brand-500">
              Login
            </Link>
          </p>
        </form>
      </AuthCard>
      {signupSuccess ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/55 p-4">
          <div className="flex min-h-[22rem] w-full max-w-lg flex-col justify-center rounded-3xl border border-emerald-200 bg-white px-7 py-10 shadow-2xl sm:min-h-[24rem] sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Congratulations</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Account Created</h2>
            <p className="mt-3 text-sm font-medium text-slate-700">
              Verify your email to activate login, then continue to onboarding.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-800">Email verification</p>
              <p className="mt-1 text-xs text-slate-600">
                We sent a verification link to <span className="font-semibold">{pendingCredentials?.email}</span>.
              </p>
              {verification.status ? <p className="mt-2 text-xs text-slate-600">{verification.status}</p> : null}
              <button
                type="button"
                disabled={verification.sending}
                onClick={async () => {
                  const email = String(pendingCredentials?.email || "").trim().toLowerCase();
                  if (!email) return;
                  setVerification({ sending: true, status: "" });
                  try {
                    const response = await requestEmailVerification({ email });
                    const status = response?.data?.emailStatus ?? response?.emailStatus ?? "unknown";
                    const reason = response?.data?.emailReason ?? response?.emailReason ?? "";
                    if (String(status).toLowerCase() === "sent") {
                      setVerification({ sending: false, status: "Email sent" });
                      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
                    } else {
                      setVerification({
                        sending: false,
                        status: `Verification email could not be sent (${status}${reason ? `: ${reason}` : ""}).`
                      });
                    }
                  } catch (err) {
                    setVerification({
                      sending: false,
                      status: err?.message || "Unable to resend verification email."
                    });
                  }
                }}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60"
              >
                {verification.sending ? "Sending..." : "Resend verification email"}
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <button
              type="button"
              onClick={onContinueAfterSignup}
              disabled={continuing}
              className="mt-6 w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {continuing ? "Please wait..." : "I’ve verified, continue"}
            </button>
            <Link
              to={`/login?email=${encodeURIComponent(String(pendingCredentials?.email || ""))}`}
              className="mt-3 text-center text-xs font-semibold text-slate-600 hover:text-brand-600"
            >
              Go to login instead
            </Link>
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
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pick how you want to use Qring on this device.</p>
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

function Input({ label, type, value, onChange, required = true }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 pr-16 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
