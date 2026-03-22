import { useEffect, useMemo, useState } from "react";
import { getSubscriptionSummary } from "../services/paymentService";
import { normalizeSubscriptionSummary } from "../utils/subscription";

export function hasSubscriptionFeature(subscription, featureKey) {
  return Boolean(subscription?.featureFlags?.[featureKey]);
}

export default function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getSubscriptionSummary();
        if (!active) return;
        setSubscription(normalizeSubscriptionSummary(data));
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.message ?? "Failed to load subscription");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      subscription,
      loading,
      error,
      status: subscription?.status ?? "inactive",
      daysToExpiry: subscription?.daysToExpiry ?? null,
      graceDaysLeft: subscription?.graceDaysLeft ?? 0,
      isBillPayer: Boolean(subscription?.isBillPayer),
      warningPhase: subscription?.warningPhase ?? null,
      hasFeature: (featureKey) => hasSubscriptionFeature(subscription, featureKey),
      can: (actionKey) => subscription?.can?.(actionKey) ?? true,
    }),
    [subscription, loading, error]
  );
}
