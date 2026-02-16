import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  normalizeDashboard
} from "../services/dashboardService";
import {
  closeDashboardSocket,
  getDashboardSocket
} from "../services/socketClient";

const initialData = normalizeDashboard({});

export function useDashboardData() {
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDashboardOverview();
      setDashboard(data);
    } catch (fetchError) {
      setError(fetchError.message ?? "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const socket = getDashboardSocket();

    const onConnect = () => mounted && setConnected(true);
    const onDisconnect = () => mounted && setConnected(false);
    const onSnapshot = (payload) => {
      if (!mounted) return;
      setDashboard(normalizeDashboard(payload?.data ?? payload));
    };
    const onPatch = (payload) => {
      if (!mounted) return;
      setDashboard((prev) =>
        normalizeDashboard({
          ...prev,
          ...(payload?.data ?? payload)
        })
      );
    };
    const onError = (payload) => {
      if (!mounted) return;
      setError(payload?.message ?? "Realtime error");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("dashboard.snapshot", onSnapshot);
    socket.on("dashboard.patch", onPatch);
    socket.on("dashboard.error", onError);

    refresh();

    return () => {
      mounted = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("dashboard.snapshot", onSnapshot);
      socket.off("dashboard.patch", onPatch);
      socket.off("dashboard.error", onError);
      closeDashboardSocket();
    };
  }, [refresh]);

  return useMemo(
    () => ({
      ...dashboard,
      loading,
      error,
      connected,
      refresh
    }),
    [dashboard, loading, error, connected, refresh]
  );
}
