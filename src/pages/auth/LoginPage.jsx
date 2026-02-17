import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";

const rolePath = {
  homeowner: "/dashboard/homeowner/overview",
  admin: "/dashboard/admin",
  estate: "/dashboard/estate"
};

function resolveTargetPath(data, fromPath) {
  const role = data?.user?.role;
  if (!role) {
    return null;
  }

  const fallback = rolePath[role];
  if (!fallback) {
    throw new Error(`Login succeeded but role '${role}' is not supported in this app.`);
  }

  return fromPath ?? fallback;
}

export default function LoginPage() {
  const { login, googleSignIn, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const initialLogin = searchParams.get("email") ?? searchParams.get("username") ?? "";
  const [form, setForm] = useState({ email: initialLogin, password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await login(form);
      const target = resolveTargetPath(data, location.state?.from?.pathname);
      if (!target) {
        throw new Error("Login succeeded but no user role was returned. Please contact support.");
      }
      navigate(target, { replace: true });
    } catch (submitError) {
      setError(submitError.message ?? "Login failed");
    }
  };

  const onGoogleSignIn = async () => {
    setError("");
    try {
      const data = await googleSignIn();
      const target = resolveTargetPath(data, location.state?.from?.pathname);
      if (!target) {
        navigate("/google-role", {
          replace: true,
          state: { from: location.state?.from?.pathname }
        });
        return;
      }
      navigate(target, { replace: true });
    } catch (submitError) {
      setError(submitError.message ?? "Google sign-in failed");
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Login" subtitle="Access your secure Qring workspace">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email or Username"
            type="text"
            value={form.email}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
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
            onClick={onGoogleSignIn}
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <svg className="mb-0.5 mr-2 inline h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Sign in with Google"}
          </button>

          <div className="flex justify-between text-xs text-slate-500">
            <Link to="/forgot-password" className="hover:text-brand-500">
              Forgot password?
            </Link>
            <Link to="/signup" className="hover:text-brand-500">
              Create account
            </Link>
          </div>
        </form>
      </AuthCard>
    </div>
  );
}

function Input({ label, type, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
