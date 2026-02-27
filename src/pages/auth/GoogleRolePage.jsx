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
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const intent = location.state?.intent ?? "signin-fallback";

  async function onContinue(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await googleSignUp(role);
      if (intent === "signup") {
        localStorage.removeItem("qring_access_token");
        localStorage.removeItem("qring_refresh_token");
        localStorage.removeItem("qring_user");
        setShowSuccess(true);
        window.dispatchEvent(
          new CustomEvent("qring:flash", {
            detail: {
              type: "success",
              title: "Signup Successful",
              message: "Google account setup complete. Redirecting to login...",
              duration: 2600
            }
          })
        );
        window.setTimeout(() => window.location.assign("/login"), 1800);
        return;
      }

      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("qring_user") ?? "null");
        } catch {
          return null;
        }
      })();
      const userRole = data?.user?.role ?? storedUser?.role;
      if (!userRole) throw new Error("Account setup completed but role was not returned.");
      const fallback = rolePath[userRole];
      if (!fallback) throw new Error(`Account setup completed but role '${userRole}' is not supported.`);
      navigate(location.state?.from ?? fallback, { replace: true });
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
      {showSuccess ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Success</p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              Account setup complete. Redirecting to login...
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
