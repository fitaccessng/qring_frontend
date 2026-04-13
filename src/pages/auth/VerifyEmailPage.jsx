import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/AuthCard";
import { apiRequest } from "../../services/apiClient";

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
      if (active) setState({ loading: true, ok: false, error: "" });
      try {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email: linkEmail, token: linkToken }),
        });
        if (active) setState({ loading: false, ok: true, error: "" });
      } catch (err) {
        if (active) {
          setState({
            loading: false,
            ok: false,
            error: "That link could not be used. Enter the 6-digit code from your email instead.",
          });
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [linkEmail, linkToken]);

  useEffect(() => {
    if (!linkEmail) return;
    setForm((prev) => ({ ...prev, email: linkEmail }));
  }, [linkEmail]);

  const setOtpCode = (value) => {
    const nextCode = String(value || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
    setForm((prev) => ({ ...prev, code: nextCode }));
    return nextCode;
  };

  const focusOtpIndex = (index) => {
    const input = otpRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  };

  const handleOtpChange = (index, value) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = "";
      setOtpCode(nextDigits.join(""));
      return;
    }

    if (digits.length > 1) {
      const pasted = digits.slice(0, OTP_LENGTH);
      setOtpCode(pasted);
      focusOtpIndex(Math.min(pasted.length, OTP_LENGTH - 1));
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = digits;
    setOtpCode(nextDigits.join(""));
    if (index < OTP_LENGTH - 1) {
      focusOtpIndex(index + 1);
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      focusOtpIndex(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpIndex(index - 1);
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpIndex(index + 1);
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    const nextCode = setOtpCode(pasted);
    focusOtpIndex(Math.min(nextCode.length, OTP_LENGTH - 1));
  };

  return (
    <div className="safe-content grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Verify Email" subtitle="Enter the 6-digit code from your email to activate your account">
        {state.loading ? <p className="text-sm text-slate-600 dark:text-slate-300">Verifying...</p> : null}
        {!state.loading && state.ok ? (
          <div className="space-y-3">
            <p className="text-sm text-success">Email verified. You can now login.</p>
            <Link
              to="/login"
              className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Continue to Login
            </Link>
          </div>
        ) : null}
        {!state.ok ? (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setState({ loading: true, ok: false, error: "" });
              try {
                await apiRequest("/auth/verify-email", {
                  method: "POST",
                  body: JSON.stringify({
                    email: String(form.email || "").trim().toLowerCase(),
                    token: String(form.code || "").trim(),
                  }),
                });
                setState({ loading: false, ok: true, error: "" });
              } catch (err) {
                setState({ loading: false, ok: false, error: err?.message || "Verification failed." });
              }
            }}
          >
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We sent a one-time code to your inbox. Paste it or type it below.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="text-sm">
              <span className="mb-2 block font-medium text-slate-700 dark:text-slate-300">OTP code</span>
              <div className="grid grid-cols-6 gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white text-center text-xl font-semibold tracking-[0.2em] text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                ))}
              </div>
            </div>
            {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <button
              type="submit"
              disabled={state.loading || form.code.replace(/\D/g, "").length !== OTP_LENGTH}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {state.loading ? "Verifying..." : "Verify code"}
            </button>
            <Link
              to="/login"
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              Back to Login
            </Link>
          </form>
        ) : null}
      </AuthCard>
    </div>
  );
}
