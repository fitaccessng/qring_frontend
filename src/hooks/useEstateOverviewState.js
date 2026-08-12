import { useCallback, useEffect, useState } from "react";
import {
  ESTATE_DATA_UPDATED_EVENT,
  getEstateOverview,
  getEstateOverviewSnapshot
} from "../services/estateService";
import { getDashboardSocket } from "../services/socketClient";

const ESTATE_OVERVIEW_REFRESH_INTERVAL_MS = 15_000;
const ACTIVE_ESTATE_STORAGE_KEY = "qring.activeEstateId";

function readStoredEstateId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACTIVE_ESTATE_STORAGE_KEY) || "";
}

function writeStoredEstateId(estateId) {
  if (typeof window === "undefined") return;
  if (estateId) window.localStorage.setItem(ACTIVE_ESTATE_STORAGE_KEY, estateId);
  else window.localStorage.removeItem(ACTIVE_ESTATE_STORAGE_KEY);
}

export default function useEstateOverviewState() {
  const [overview, setOverview] = useState(() => getEstateOverviewSnapshot());
  const [estateId, setEstateIdState] = useState(() => readStoredEstateId() || getEstateOverviewSnapshot()?.estates?.[0]?.id || "");
  const [loading, setLoading] = useState(() => !getEstateOverviewSnapshot());
  const [error, setError] = useState("");

  const setEstateId = useCallback((value) => {
    setEstateIdState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      writeStoredEstateId(next || "");
      return next || "";
    });
  }, []);

  const refresh = useCallback(async () => {
    const hasSnapshot = Boolean(getEstateOverviewSnapshot());
    setLoading((prev) => (hasSnapshot ? prev : true));
    try {
      const data = await getEstateOverview({ force: true });
      setOverview(data);
      setEstateId((prev) => {
        const estates = data?.estates ?? [];
        if (prev && estates.some((estate) => String(estate.id) === String(prev))) return prev;
        return estates?.[0]?.id || "";
      });
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
    const estates = overview?.estates ?? [];
    if (!estates.length) {
      if (estateId) setEstateId("");
      return;
    }
    if (!estateId || !estates.some((estate) => String(estate.id) === String(estateId))) {
      setEstateId(estates[0].id);
    }
  }, [estateId, overview, setEstateId]);

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
