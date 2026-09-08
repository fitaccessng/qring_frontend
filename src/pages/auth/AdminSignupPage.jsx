import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthCard from "../../components/AuthCard";
import { adminSignup } from "../../services/authService";

export default function AdminSignupPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await adminSignup(form);
      setTimeout(() => navigate("/admin/login"), 500);
    } catch (submitError) {
      setError(submitError.message ?? "Admin signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Create Admin Account" subtitle="Creates an admin user account">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full Name" type="text" value={form.fullName} onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} />
          <Input label="Password" type="password" value={form.password} onChange={(value) => setForm((prev) => ({ ...prev, password: value }))} />
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {submitting ? "Creating..." : "Create Admin"}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have admin account?{" "}
            <Link to="/admin/login" className="font-semibold hover:text-slate-700 dark:hover:text-slate-300">
              Admin login
            </Link>
          </p>
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
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-slate-900 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}
