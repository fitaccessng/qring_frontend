import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/AuthCard";
import { apiRequest } from "../../services/apiClient";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: false, ok: false, error: "" });
  const [form, setForm] = useState({ email: "", code: "" });

  const linkEmail = useMemo(() => params.get("email") || "", [params]);
  const linkToken = useMemo(() => params.get("token") || "", [params]);

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
        if (active) setState({ loading: false, ok: false, error: err?.message || "Verification failed." });
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

  return (
    <div className="safe-content grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Verify Email" subtitle="Confirm your email to activate your account">
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
        {!state.loading && !state.ok && (linkEmail && linkToken) ? (
          <div className="space-y-3">
            <p className="text-sm text-danger">{state.error || "Unable to verify email."}</p>
            <Link
              to="/login"
              className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              Back to Login
            </Link>
          </div>
        ) : null}

        {!state.ok && !(linkEmail && linkToken) ? (
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
              Paste the 6-digit OTP from your email, or open the verification link you received.
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
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">OTP code</span>
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <button
              type="submit"
              disabled={state.loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
            >
              {state.loading ? "Verifying..." : "Verify"}
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
