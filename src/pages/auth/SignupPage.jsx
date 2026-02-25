import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";

export default function SignupPage() {
  const { signup, beginGoogleSignUp } = useAuth();
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
  const navigate = useNavigate();

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(form);
      navigate("/login");
    } catch (submitError) {
      setError(submitError.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogleSignUp = async () => {
    setError("");
    setSubmitting(true);
    try {
      await beginGoogleSignUp(form.referralCode);
      navigate("/google-role", {
        state: { intent: "signup" }
      });
    } catch (submitError) {
      setError(submitError.message ?? "Google sign-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Create Account" subtitle="Start with secure QR access">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" type="text" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <PasswordInput
            label="Password"
            value={form.password}
            show={showPassword}
            onToggle={() => setShowPassword((prev) => !prev)}
            onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
          />
          <Input
            label="Referral code (optional)"
            type="text"
            value={form.referralCode}
            required={false}
            onChange={(value) => setForm((prev) => ({ ...prev, referralCode: value }))}
          />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Role</span>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="homeowner">Homeowner</option>
              <option value="estate">Estate User</option>
            </select>
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Account"}
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
            onClick={onGoogleSignUp}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            <svg className="mb-0.5 mr-2 inline h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {submitting ? "Creating account..." : "Sign up with Google"}
          </button>

          <p className="text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold hover:text-brand-500">
              Login
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}

function Input({ label, type, value, onChange, required = true }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="relative">
        <input
          required
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 pr-16 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-2 my-1 rounded-lg px-3 text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
