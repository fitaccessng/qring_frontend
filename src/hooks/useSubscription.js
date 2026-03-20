import { useEffect, useMemo, useState } from "react";
import { getMySubscription } from "../services/paymentService";

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
        const data = await getMySubscription();
        if (!active) return;
        setSubscription(data ?? null);
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
      hasFeature: (featureKey) => hasSubscriptionFeature(subscription, featureKey),
    }),
    [subscription, loading, error]
  );
}
