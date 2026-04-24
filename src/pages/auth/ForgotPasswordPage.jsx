import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Mail, Key, Lock, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { resetPassword } from "../../services/authService";
import quickdropLogo from "../../assets/qring_logo.jpeg";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [token, setToken] = useState(() => searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(() => (searchParams.get("token") ? 2 : 1));
  const [state, setState] = useState({ loading: false, error: "", done: false, message: "" });

  useEffect(() => {
    const nextEmail = searchParams.get("email") || "";
    const nextToken = searchParams.get("token") || "";
    setEmail(nextEmail);
    setToken(nextToken);
    setStep(nextToken ? 2 : 1);
  }, [searchParams]);

  const verifyEmail = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", done: false, message: "" });
    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      const data = response?.data ?? response;
      setState({
        loading: false,
        error: "",
        done: true,
        message: data?.debugToken
          ? "Check your email for a reset link, or use the debug token shown below."
          : "If an account exists, a reset link has been sent to your email."
      });
      setStep(2);
      if (data?.debugToken) setToken(String(data.debugToken));
    } catch (submitError) {
      setState({
        loading: false,
        error: submitError.message ?? "Request failed",
        done: false,
        message: ""
      });
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        newPassword,
      });
      setState({ loading: false, error: "", done: true, message: "Password reset successful! Your account is now secure." });
      setStep(3);
    } catch (submitError) {
      setState((prev) => ({ ...prev, loading: false, error: submitError.message ?? "Reset failed" }));
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
        <h1 className="text-white font-headline text-3xl font-black tracking-tight">Account Recovery</h1>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">Secure Urban Access Control</p>
      </div>

      {/* --- Bottom Sheet Container --- */}
      <div className="flex-1 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] px-6 pt-10 pb-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10 -mt-4" />

          {state.error && (
            <div className="mb-6 p-4 rounded-2xl text-xs font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-3 animate-in fade-in">
              <AlertCircle size={16} />
              <span>{state.error}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={verifyEmail} className="flex flex-col gap-6 w-full">
              <div className="text-center mb-2 px-4">
                <p className="text-slate-500 text-sm font-medium">Enter your email address to receive a password reset link.</p>
              </div>
              
              <InputField 
                icon={Mail} 
                type="email"
                placeholder="Email Address" 
                value={email} 
                onChange={setEmail} 
              />

              <button
                disabled={state.loading}
                className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                type="submit"
              >
                {state.loading ? "Sending link..." : "Send Reset Link"}
                {!state.loading && <ChevronRight className="w-5 h-5 font-bold" />}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={submitReset} className="flex flex-col gap-5 w-full">
              <div className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 mb-2">
                <p className="text-xs font-bold text-brand-600 leading-relaxed text-center">
                  {state.message}
                </p>
              </div>

              <InputField 
                icon={Key} 
                placeholder="Reset Token" 
                value={token} 
                onChange={setToken} 
              />

              <InputField 
                icon={Lock} 
                type="password"
                placeholder="New Password" 
                value={newPassword} 
                onChange={setNewPassword} 
              />

              <button
                disabled={state.loading}
                className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                type="submit"
              >
                {state.loading ? "Updating..." : "Reset Password"}
                {!state.loading && <ChevronRight className="w-5 h-5 font-bold" />}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-6 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Success!</h2>
              <p className="text-slate-500 text-sm mb-8 px-4 font-medium leading-relaxed">
                {state.message}
              </p>
              <Link
                to="/login"
                className="w-full bg-slate-950 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Back to Login
              </Link>
            </div>
          )}

          {step !== 3 && (
            <div className="mt-10 pt-6 border-t border-slate-50 flex justify-center">
              <Link to="/login" className="text-slate-400 text-xs font-black uppercase tracking-widest hover:text-brand-500 transition-colors flex items-center gap-2">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Input Component for consistent width and spacing
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
