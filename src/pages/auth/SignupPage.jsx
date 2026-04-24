import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Home, Mail, ArrowRight, RefreshCw, X } from "lucide-react";
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
    return () => { active = false; };
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
      setVerification({ sending: true, status: "" });
      try {
        const response = await requestEmailVerification({ email: String(form.email || "").trim().toLowerCase() });
        const status = response?.data?.emailStatus ?? response?.emailStatus ?? "unknown";
        if (String(status).toLowerCase() === "sent") {
          setVerification({ sending: false, status: "Email sent" });
        } else {
          setVerification({ sending: false, status: "Verification email queued." });
        }
      } catch (err) {
        setVerification({ sending: false, status: "Verification link sent to inbox." });
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
        setError("Please verify your email first.");
      } else {
        setError(submitError.message ?? "Login failed");
      }
    } finally {
      setContinuing(false);
    }
  };

  const onGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await beginGoogleSignUp(form.referralCode);
      navigate("/google-role", { state: { intent: "signup" } });
    } catch (submitError) {
      setError(submitError.message ?? "Google sign-up failed");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const email = String(pendingCredentials?.email || "").trim().toLowerCase();
    if (!email) return;
    setVerification({ sending: true, status: "" });
    try {
      await requestEmailVerification({ email });
      setVerification({ sending: false, status: "New link sent!" });
    } catch (err) {
      setVerification({ sending: false, status: "Failed to resend." });
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 px-4 pt-8 pb-12 sm:flex sm:items-center sm:justify-center">
      <AuthCard title="Create Account" subtitle="Join the future of secure access">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-3">
            <Input label="Full Name" placeholder="John Doe" type="text" value={form.fullName} onChange={(v) => setForm(p => ({ ...p, fullName: v }))} />
            <Input label="Email Address" placeholder="name@example.com" type="email" value={form.email} onChange={(v) => setForm(p => ({ ...p, email: v }))} />
            <PasswordInput label="Password" value={form.password} show={showPassword} onToggle={() => setShowPassword(!showPassword)} onChange={(v) => setForm(p => ({ ...p, password: v }))} />
            <Input label="Referral Code (Optional)" type="text" value={form.referralCode} required={false} onChange={(v) => setForm(p => ({ ...p, referralCode: v }))} />
          </div>

          <RolePicker
            value={form.role}
            onChange={(role) => setForm(p => ({ ...p, role }))}
            options={[
              { value: "homeowner", label: "Resident", description: "Manage your home and visitors", icon: Home },
              { value: "estate", label: "Management", description: "Oversight for entire estates", icon: Building2 }
            ]}
          />

          <div className="flex items-center gap-2 px-1">
            <input id="terms" type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="w-4 h-4 rounded accent-brand-500" />
            <label htmlFor="terms" className="text-xs text-slate-500">
              I agree to the <Link to="/terms" className="text-brand-500 font-medium">Terms & Conditions</Link>
            </label>
          </div>

          {error && <p className="text-xs font-medium text-red-500 animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-brand-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-transform disabled:opacity-70"
          >
            {submitting ? "Processing..." : "Create Account"}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">OR</span>
            <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={onGoogleSignUp}
            className="flex w-full items-center justify-center gap-3 h-12 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-slate-500">
            Already a member? <Link to="/login" className="text-brand-500 font-bold">Login</Link>
          </p>
        </form>
      </AuthCard>

      {/* --- PREMIUM BOTTOM SHEET MODAL --- */}
      {signupSuccess && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Verify your email</h2>
              <p className="mt-2 text-slate-500 text-sm">
                We've sent a secure link to <span className="font-bold text-slate-800 dark:text-slate-200">{pendingCredentials?.email}</span>
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={onContinueAfterSignup}
                disabled={continuing}
                className="flex w-full items-center justify-center gap-2 h-14 bg-brand-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-brand-500/25 active:scale-95 transition-all"
              >
                {continuing ? "Verifying..." : "I've Verified, Let's Go"}
                <ArrowRight className="h-5 w-5" />
              </button>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  disabled={verification.sending}
                  onClick={handleResend}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-500"
                >
                  <RefreshCw className={`h-4 w-4 ${verification.sending ? "animate-spin" : ""}`} />
                  {verification.status || "Resend verification email"}
                </button>
                
                <Link
                  to="/login"
                  className="text-center text-xs font-medium text-slate-400 underline underline-offset-4"
                >
                  Back to login
                </Link>
              </div>
            </div>
            
            <div className="mt-6 h-env-safe-bottom" />
          </div>
        </div>
      )}
    </div>
  );
}

function RolePicker({ value, onChange, options }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">Select Account Type</p>
      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                isActive 
                  ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10 ring-1 ring-brand-500" 
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              }`}
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isActive ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className={`font-bold transition-colors ${isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-white"}`}>
                  {option.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{option.description}</p>
              </div>
              {isActive && <CheckCircle2 className="h-5 w-5 text-brand-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Input({ label, type, value, onChange, placeholder, required = true }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">{label}</label>
      <input
        required={required}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
      />
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle }) {
  return (
    <div className="space-y-1.5 text-sm">
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">{label}</label>
      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-500 uppercase tracking-tighter"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}