import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Mail, Lock, ChevronRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { requestEmailVerification } from "../../services/authService";
import quickdropLogo from "../../assets/qring_logo.jpeg";
import { resolvePostLoginPath } from "../../utils/authRouting";
import { shouldUseGoogleAuth } from "../../utils/nativeRuntime";
import { useAsyncAction } from "../../hooks/useAsyncAction";

function resolveTargetPath(data, fromPath) {
  return resolvePostLoginPath(data?.user, fromPath);
}

export default function LoginPage() {
  const { login, googleSignIn, resumeGoogleRedirect } = useAuth();
  const [searchParams] = useSearchParams();
  const initialLogin = searchParams.get("email") ?? searchParams.get("username") ?? "";
  
  const [form, setForm] = useState({ email: initialLogin, password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [verificationState, setVerificationState] = useState({ needed: false, sending: false, status: "" });
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const googleAuthEnabled = shouldUseGoogleAuth();
  const formAction = useAsyncAction({
    debounceMs: 500,
    timeoutMs: 15000,
    timeoutMessage: "Login is taking too long. Please try again.",
  });
  const googleAction = useAsyncAction({
    debounceMs: 800,
    timeoutMs: 20000,
    timeoutMessage: "Google sign-in is taking too long. Please try again.",
  });

  useEffect(() => {
    if (!googleAuthEnabled) return () => {};
    let active = true;
    const resumeNativeGoogleAuth = async () => {
      try {
        const resumed = await resumeGoogleRedirect();
        if (!active || !resumed) return;
        if (resumed.intent === "signup") {
          navigate("/google-role", { replace: true, state: { intent: "signup" } });
          return;
        }
        const target = resolveTargetPath(resumed.data, location.state?.from?.pathname);
        navigate(target || "/google-role", { replace: true });
      } catch (err) {
        if (active) setError(err.message ?? "Google sign-in failed");
      }
    };
    resumeNativeGoogleAuth();
    return () => { active = false; };
  }, [googleAuthEnabled, location.state?.from?.pathname, navigate, resumeGoogleRedirect]);

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const result = await formAction.run(async () => {
        setError("");
        setVerificationState({ needed: false, sending: false, status: "" });
        setSubmitting(true);
        try {
          const data = await login(form);
          const target = resolveTargetPath(data, location.state?.from?.pathname);
          if (!target) throw new Error("No user role returned. Contact support.");
          navigate(target, { replace: true });
        } catch (err) {
          if (err?.status === 403) {
            setError("Email not verified.");
            setVerificationState((prev) => ({ ...prev, needed: true }));
          } else {
            setError(err?.message || "Invalid credentials");
          }
        } finally {
          setSubmitting(false);
        }
      });
      return result;
    } catch (err) {
      setSubmitting(false);
      if (err?.message) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
      return undefined;
    }
  };

  const onGoogleSignIn = async () => {
    try {
      return await googleAction.run(async () => {
        setError("");
        setVerificationState({ needed: false, sending: false, status: "" });
        setGoogleSubmitting(true);
        try {
          const data = await googleSignIn();
          const target = resolveTargetPath(data, location.state?.from?.pathname);
          if (!target) throw new Error("No user role returned. Contact support.");
          navigate(target, { replace: true });
        } catch (err) {
          if (err?.message !== "Redirecting to Google...") {
            setError(err?.message || "Google sign-in failed");
          }
        } finally {
          setGoogleSubmitting(false);
        }
      });
    } catch (err) {
      setGoogleSubmitting(false);
      if (err?.message) {
        setError(err.message);
      }
      return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-body antialiased">
      {/* --- Branding Header --- */}
      <div className="pt-12 pb-10 px-6 flex flex-col items-center text-center">
        <img 
          src={quickdropLogo} 
          alt="QRing" 
          className="h-16 w-16 rounded-2xl mb-4 shadow-2xl border border-white/10 object-cover" 
        />
        <h1 className="text-white font-headline text-3xl font-black tracking-tight">Welcome Back</h1>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">See, Talk, Approve Visitors </p>
      </div>

      {/* --- Bottom Sheet Container --- */}
      <div className="flex-1 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] px-6 pt-10 pb-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10 -mt-4" />

          {error && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-bold bg-red-50 text-red-600 border border-red-100 animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
            <InputField 
              icon={Mail} 
              type="text"
              placeholder="Email or Username" 
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

            {verificationState.needed && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Verification Required</p>
              <button
                type="button"
                disabled={verificationState.sending}
                  onClick={async () => {
                    setVerificationState((p) => ({ ...p, sending: true, status: "" }));
                    try {
                      await requestEmailVerification({ email: form.email.trim().toLowerCase() });
                      setVerificationState((p) => ({ ...p, sending: false, status: "Sent!" }));
                    } catch (requestError) {
                      setVerificationState((p) => ({ ...p, sending: false }));
                      setError(requestError.message ?? "Could not send verification email.");
                    }
                  }}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-700 active:bg-slate-100"
                >
                  {verificationState.sending ? "Sending..." : verificationState.status || "Resend Verification Email"}
                </button>
              </div>
            )}

            <button
              disabled={submitting || googleSubmitting || formAction.pending}
              className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              type="submit"
            >
              {submitting ? "Signing In..." : "Sign In"}
              {!submitting && <ChevronRight className="w-5 h-5 font-bold" />}
            </button>
          </form>

          {/* Social Divider */}
          {googleAuthEnabled ? (
            <>
              <div className="relative flex py-8 items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">Or continue with</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={submitting || googleSubmitting || googleAction.pending}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm active:bg-slate-50 active:scale-[0.98] transition-all mb-10 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-slate-700 font-bold text-sm">
                  {googleSubmitting ? "Opening Google..." : "Google Account"}
                </span>
              </button>
            </>
          ) : null}

          <div className="flex top-2 flex-col gap-4 items-center">
            <Link to="/forgot-password" size="sm" className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-brand-500 transition-colors">
              Forgot Password?
            </Link>
            <p className="text-center text-sm font-bold text-slate-400">
              New here?{" "}
              <Link to="/signup" className="text-brand-500 font-black underline underline-offset-4 ml-1">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ icon: Icon, placeholder, type = "text", value, onChange, required = true }) {
  return (
    <div className="relative group w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white border border-slate-100 shadow-sm group-focus-within:border-brand-500/30 transition-colors z-10">
        <Icon className="text-slate-400 w-4 h-4 group-focus-within:text-brand-500" />
      </div>
      <input
        className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 pl-14 pr-4 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5 outline-none transition-all font-medium"
        placeholder={placeholder}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
