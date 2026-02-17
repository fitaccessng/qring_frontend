import { Link } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";
import { resetPassword } from "../../services/authService";

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [state, setState] = useState({ loading: false, error: "", done: false, message: "" });

  const verifyEmail = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", done: false, message: "" });
    try {
      const response = await forgotPassword(email);
      const data = response?.data ?? response;
      setState({
        loading: false,
        error: "",
        done: true,
        message: data?.status === "email_verified" ? "Email found. Set your new password." : "Email verified."
      });
      setStep(2);
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
      await resetPassword({ email, newPassword });
      setState({ loading: false, error: "", done: true, message: "Password reset successful. You can now login." });
      setStep(3);
    } catch (submitError) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: submitError.message ?? "Reset failed"
      }));
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Forgot Password" subtitle="Verify your email and set a new password">
        {step === 1 ? (
          <form onSubmit={verifyEmail} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <button
              type="submit"
              disabled={state.loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {state.loading ? "Checking..." : "Continue"}
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={submitReset} className="space-y-4">
            <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {state.message || "Set your new password."}
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">New Password</span>
              <input
                required
                minLength={8}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
            <button
              type="submit"
              disabled={state.loading}
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {state.loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm text-success">{state.message}</p>
            <Link
              to="/login"
              className="block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Back to Login
            </Link>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-slate-500">
          Back to{" "}
          <Link to="/login" className="font-semibold hover:text-brand-500">
            Login
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
