import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, ShieldCheck, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "../../services/apiClient";
import quickdropLogo from "../../assets/qring_logo.jpeg";

const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: false, ok: false, error: "" });
  const [form, setForm] = useState({ email: "", code: "" });
  const otpRefs = useRef([]);

  const linkEmail = useMemo(() => params.get("email") || "", [params]);
  const linkToken = useMemo(() => params.get("token") || "", [params]);
  
  const otpDigits = useMemo(() => {
    const clean = String(form.code || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
    return Array.from({ length: OTP_LENGTH }, (_, index) => clean[index] || "");
  }, [form.code]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!linkEmail || !linkToken) return;
      if (active) setState((prev) => ({ ...prev, loading: true, ok: false, error: "" }));
      try {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email: linkEmail, token: linkToken }),
        });
        if (active) setState((prev) => ({ ...prev, loading: false, ok: true, error: "" }));
      } catch (err) {
        if (active) {
          setState((prev) => ({
            ...prev,
            loading: false,
            ok: false,
            error: "Link expired. Please enter the 6-digit code manually below.",
          }));
        }
      }
    }
    run();
    return () => { active = false; };
  }, [linkEmail, linkToken]);

  useEffect(() => {
    if (linkEmail) setForm((prev) => ({ ...prev, email: linkEmail }));
  }, [linkEmail]);

  const handleOtpChange = (index, value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const nextDigits = [...otpDigits];
    
    if (digits.length > 1) {
      const pasted = digits.slice(0, OTP_LENGTH);
      setForm(p => ({ ...p, code: pasted }));
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      return;
    }

    nextDigits[index] = digits;
    const nextCode = nextDigits.join("");
    setForm(p => ({ ...p, code: nextCode }));
    
    if (digits && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
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
        <h1 className="text-white font-headline text-3xl font-black tracking-tight">Verify Identity</h1>
        <p className="text-slate-400 text-sm mt-1 font-medium tracking-wide">Secure Urban Access Control</p>
      </div>

      {/* --- Bottom Sheet Container --- */}
      <div className="flex-1 bg-white rounded-t-[3rem] shadow-[0_-10px_40px_rgba(0,0,0,0.4)] px-6 pt-10 pb-12 overflow-y-auto">
        <div className="max-w-md mx-auto w-full">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-10 -mt-4" />

          {state.ok ? (
            <div className="text-center py-8 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Verified!</h2>
              <p className="text-slate-500 text-sm mb-10 font-medium">Your email is confirmed. You can now access your workspace.</p>
              <Link
                to="/login"
                className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ChevronRight size={20} />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setState((prev) => ({ ...prev, loading: true, ok: false, error: "" }));
                try {
                  await apiRequest("/auth/verify-email", {
                    method: "POST",
                    body: JSON.stringify({ email: form.email.trim().toLowerCase(), token: form.code }),
                  });
                  setState((prev) => ({ ...prev, loading: false, ok: true, error: "" }));
                } catch (err) {
                  setState((prev) => ({
                    ...prev,
                    loading: false,
                    ok: false,
                    error: err?.message || "Invalid verification code.",
                  }));
                }
              }}
              className="flex flex-col gap-6"
            >
              <div className="text-center px-4">
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  We've sent a 6-digit code to your inbox. Enter it below to activate your account.
                </p>
              </div>

              {state.error && (
                <div className="p-4 rounded-2xl text-xs font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-3 animate-in slide-in-from-top-2">
                  <AlertCircle size={16} />
                  <span>{state.error}</span>
                </div>
              )}

              <InputField 
                icon={Mail} 
                type="email"
                placeholder="Confirm Email" 
                value={form.email} 
                onChange={(v) => setForm(p => ({ ...p, email: v }))} 
              />

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck size={14} className="text-brand-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Code</span>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="h-14 w-full bg-slate-50 border-2 border-transparent rounded-xl text-center text-xl font-bold text-slate-900 outline-none transition-all focus:bg-white focus:border-brand-500/20 focus:ring-4 focus:ring-brand-500/5"
                    />
                  ))}
                </div>
              </div>

              <button
                disabled={state.loading || form.code.length !== OTP_LENGTH}
                className="w-full bg-brand-500 text-white font-black py-5 rounded-[2.5rem] shadow-xl shadow-brand-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                type="submit"
              >
                {state.loading ? "Verifying..." : "Verify Account"}
                {!state.loading && <ChevronRight className="w-5 h-5 font-bold" />}
              </button>

              <Link
                to="/login"
                className="text-center text-slate-400 text-xs font-black uppercase tracking-widest hover:text-brand-500 transition-colors mt-4"
              >
                Cancel and Login
              </Link>
            </form>
          )}
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
