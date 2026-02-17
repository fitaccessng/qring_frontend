import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../../components/AuthCard";
import { useAuth } from "../../state/AuthContext";

const rolePath = {
  homeowner: "/dashboard/homeowner/overview",
  admin: "/dashboard/admin",
  estate: "/dashboard/estate"
};

export default function GoogleRolePage() {
  const { googleSignUp, loading } = useAuth();
  const [role, setRole] = useState("homeowner");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  async function onContinue(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await googleSignUp(role);
      const userRole = data?.user?.role;
      if (!userRole) {
        throw new Error("Account setup completed but role was not returned.");
      }
      const fallback = rolePath[userRole];
      if (!fallback) {
        throw new Error(`Account setup completed but role '${userRole}' is not supported.`);
      }
      const target = location.state?.from ?? fallback;
      navigate(target, { replace: true });
    } catch (submitError) {
      setError(submitError.message ?? "Unable to finish Google account setup");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950">
      <AuthCard title="Choose Your Role" subtitle="Select how you want to use Qring on this account">
        <form onSubmit={onContinue} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-300">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="homeowner">Homeowner</option>
              <option value="estate">Estate User</option>
            </select>
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Continue"}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
