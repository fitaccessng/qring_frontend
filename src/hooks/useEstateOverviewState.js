import { useCallback, useEffect, useState } from "react";
import { getEstateOverview, getEstateOverviewSnapshot } from "../services/estateService";

export default function useEstateOverviewState() {
  const [overview, setOverview] = useState(() => getEstateOverviewSnapshot());
  const [estateId, setEstateId] = useState(() => getEstateOverviewSnapshot()?.estates?.[0]?.id || "");
  const [loading, setLoading] = useState(() => !getEstateOverviewSnapshot());
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const hasSnapshot = Boolean(getEstateOverviewSnapshot());
    setLoading((prev) => (hasSnapshot ? prev : true));
    try {
      const data = await getEstateOverview();
      setOverview(data);
      setEstateId((prev) => prev || data?.estates?.[0]?.id || "");
      setError("");
      return data;
    } catch (err) {
      const message = err?.message || "Failed to load estate data";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (!estateId && overview?.estates?.length) {
      setEstateId(overview.estates[0].id);
    }
  }, [estateId, overview]);

  return {
    overview,
    setOverview,
    estateId,
    setEstateId,
    loading,
    setLoading,
    error,
    setError,
    refresh
  };
}
