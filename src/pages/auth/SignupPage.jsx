import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
<<<<<<< HEAD
import { Building2, Home, User, Mail, Lock, Gift, ChevronRight, Eye, EyeOff } from "lucide-react";
=======
import { Building2, CheckCircle2, Home, Mail, ArrowRight, RefreshCw, X } from "lucide-react";
import AuthCard from "../../components/AuthCard";
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
import { useAuth } from "../../state/AuthContext";
import quickdropLogo from "../../assets/qring_logo.jpeg";

export default function SignupPage() {
  const { signup, beginGoogleSignUp, resumeGoogleRedirect } = useAuth();
  const navigate = useNavigate();

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    let active = true;
    const resumeNativeGoogleSignup = async () => {
      try {
        const resumed = await resumeGoogleRedirect();
        if (!active || !resumed) return;
        if (resumed.intent === "signup") {
          navigate("/google-role", { replace: true, state: { intent: "signup" } });
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
      setError("Please agree to the terms to continue.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
<<<<<<< HEAD
      const normalizedEmail = form.email.trim().toLowerCase();
      await signup({ ...form, email: normalizedEmail });
      navigate(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`, {
        replace: true,
      });
    } catch (err) {
      setError(err.message ?? "Signup failed");
=======
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
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< HEAD
  const onGoogleSignUp = async () => {
    if (!agreedToTerms) {
      setError("Please agree to the terms first.");
=======
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
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
      return;
    }
    setSubmitting(true);
    try {
      await beginGoogleSignUp(form.referralCode);
<<<<<<< HEAD
    } catch (err) {
      setError(err.message ?? "Google sign-up failed");
=======
      navigate("/google-role", { state: { intent: "signup" } });
    } catch (submitError) {
      setError(submitError.message ?? "Google sign-up failed");
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
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
<<<<<<< HEAD
    <div className="min-h-screen bg-slate-950 flex flex-col font-body antialiased">
      {/* --- Branding Header --- */}
      <div className="pt-10 pb-8 px-6 flex flex-col items-center text-center">
        <img 
          src={quickdropLogo} 
          alt="QRing" 
          className="h-16 w-16 rounded-2xl mb-4 shadow-2xl border border-white/10 object-cover" 
        />
        <h1 className="text-white font-headline text-3xl font-black tracking-tight">Create Account</h1>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">See, Talk, Approve Visitors </p>
      </div>

      {/* --- Bottom Sheet Container --- */}
      <div className="flex-1 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] px-6 pt-10 pb-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10 -mt-4" />

          {/* Role Selection Cluster */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <RoleTab 
              active={form.role === "homeowner"} 
              onClick={() => setForm({ ...form, role: "homeowner" })}
              icon={Home}
              label="Resident"
            />
            <RoleTab 
              active={form.role === "estate"} 
              onClick={() => setForm({ ...form, role: "estate" })}
              icon={Building2}
              label="Estate"
            />
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-bold bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2 text-center">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
            <InputField 
              icon={User} 
              placeholder="Full Name" 
              value={form.fullName} 
              onChange={(v) => setForm({ ...form, fullName: v })} 
            />
            
            <InputField 
              icon={Mail} 
              type="email"
              placeholder="Email Address" 
              value={form.email} 
              onChange={(v) => setForm({ ...form, email: v })} 
            />

            <div className="relative group w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm group-focus-within:border-brand-500/30 transition-colors z-10">
                <Lock className="text-slate-400 w-4 h-4 group-focus-within:text-brand-500" />
              </div>
              <input
                className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-medium"
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors z-10"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <InputField 
              icon={Gift} 
              required={false}
              placeholder="Referral Code (Optional)" 
              value={form.referralCode} 
              onChange={(v) => setForm({ ...form, referralCode: v })} 
            />

            <div className="flex items-center gap-3 px-1 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 rounded-lg border-slate-200 text-brand-500 focus:ring-brand-500 transition-all cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs font-bold text-slate-500 uppercase tracking-tight cursor-pointer">
                Agree to <Link to="/terms" className="text-brand-500 underline underline-offset-2">Terms & Conditions</Link>
              </label>
            </div>

            <button
              disabled={submitting}
              className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              type="submit"
            >
              {submitting ? "Processing..." : "Create Account"}
              {!submitting && <ChevronRight className="w-5 h-5 font-bold" />}
            </button>
          </form>

          <div className="relative flex py-8 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Or social sign up</span>
            <div className="flex-grow border-t border-slate-100"></div>
=======
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
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
          </div>

          <button
            type="button"
            onClick={onGoogleSignUp}
<<<<<<< HEAD
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm active:bg-slate-50 active:scale-[0.98] transition-all mb-10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-slate-700 font-bold text-sm">Sign up with Google</span>
          </button>

          <p className="text-center text-sm font-bold text-slate-400">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-500 font-black underline underline-offset-4 ml-1">
              Login
            </Link>
          </p>
        </div>
=======
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
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
      </div>
    </div>
  );
}

<<<<<<< HEAD
function InputField({ icon: Icon, placeholder, type = "text", value, onChange, required = true }) {
  return (
    <div className="relative group w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm group-focus-within:border-brand-500/30 transition-colors z-10">
        <Icon className="text-slate-400 w-4 h-4 group-focus-within:text-brand-500" />
      </div>
=======
function Input({ label, type, value, onChange, placeholder, required = true }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 px-1">{label}</label>
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
      <input
        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-medium"
        placeholder={placeholder}
        type={type}
<<<<<<< HEAD
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
=======
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
      />
    </div>
  );
}

function RoleTab({ active, onClick, icon: Icon, label }) {
  return (
<<<<<<< HEAD
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-5 px-4 rounded-3xl border-2 transition-all active:scale-95 ${
        active 
          ? "border-brand-500 bg-brand-50/50" 
          : "border-slate-50 bg-slate-50 hover:border-slate-100"
      }`}
    >
      <div className={`p-2 rounded-xl mb-2 ${active ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30" : "bg-white text-slate-400 shadow-sm"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`text-[11px] font-black uppercase tracking-tighter ${active ? "text-brand-500" : "text-slate-400"}`}>
        {label}
      </span>
    </button>
=======
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
>>>>>>> 0fdd799755b08ac01a92e9d93143562b7cba3b19
  );
}