import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthCard from "../../components/AuthCard";
import { apiRequest } from "../../services/apiClient";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, ok: false, error: "" });

  useEffect(() => {
    const email = params.get("email") || "";
    const token = params.get("token") || "";
    let active = true;
    async function run() {
      if (!email || !token) {
        if (active) setState({ loading: false, ok: false, error: "Missing verification link parameters." });
        return;
      }
      try {
        await apiRequest("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email, token }),
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
  }, [params]);

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
        {!state.loading && !state.ok ? (
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
      </AuthCard>
    </div>
  );
}

