import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyPaystackPayment } from "../../services/paymentService";
import { useAuth } from "../../state/AuthContext";

export default function BillingCallbackPage() {
  const { user } = useAuth();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Verifying payment...");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function verify() {
      const reference = searchParams.get("reference") || searchParams.get("trxref");
      if (!reference) {
        setError("Missing Paystack reference.");
        return;
      }

      try {
        await verifyPaystackPayment(reference);
        if (!active) return;
        setStatus("Payment successful. Redirecting...");
        setTimeout(() => {
          const destination = user?.role === "estate" ? "/dashboard/estate" : "/dashboard/homeowner/overview";
          navigate(destination, { replace: true });
        }, 800);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message ?? "Unable to verify payment.");
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [navigate, searchParams, user?.role]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {error ? (
          <p className="text-sm font-semibold text-danger">{error}</p>
        ) : (
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{status}</p>
        )}
      </div>
    </div>
  );
}
