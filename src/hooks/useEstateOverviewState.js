import { useCallback, useEffect, useState } from "react";
import {
  ESTATE_DATA_UPDATED_EVENT,
  getEstateOverview,
  getEstateOverviewSnapshot
} from "../services/estateService";
import { getDashboardSocket } from "../services/socketClient";

const ESTATE_OVERVIEW_REFRESH_INTERVAL_MS = 15_000;

export default function useEstateOverviewState() {
  const [overview, setOverview] = useState(() => getEstateOverviewSnapshot());
  const [estateId, setEstateId] = useState(() => getEstateOverviewSnapshot()?.estates?.[0]?.id || "");
  const [loading, setLoading] = useState(() => !getEstateOverviewSnapshot());
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const hasSnapshot = Boolean(getEstateOverviewSnapshot());
    setLoading((prev) => (hasSnapshot ? prev : true));
    try {
      const data = await getEstateOverview({ force: true });
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
    const refreshSilently = () => {
      refresh().catch(() => {});
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshSilently();
    };
    const socket = getDashboardSocket();
    const socketEvents = ["connect", "dashboard.snapshot", "dashboard.patch", "estate.updated"];
    const intervalId = window.setInterval(refreshWhenVisible, ESTATE_OVERVIEW_REFRESH_INTERVAL_MS);

    window.addEventListener(ESTATE_DATA_UPDATED_EVENT, refreshSilently);
    window.addEventListener("focus", refreshSilently);
    window.addEventListener("online", refreshSilently);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    socketEvents.forEach((eventName) => socket.on(eventName, refreshSilently));

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(ESTATE_DATA_UPDATED_EVENT, refreshSilently);
      window.removeEventListener("focus", refreshSilently);
      window.removeEventListener("online", refreshSilently);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      socketEvents.forEach((eventName) => socket.off(eventName, refreshSilently));
    };
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
