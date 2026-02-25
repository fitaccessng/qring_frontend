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

function hasDashboardPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  return Boolean(
    payload.metrics ||
      payload.activity ||
      payload.waitingRoom ||
      payload.session ||
      payload.messages ||
      payload.traffic ||
      payload.callControls
  );
}

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
      const data = payload?.data ?? payload;
      if (!hasDashboardPayload(data)) return;
      setDashboard(normalizeDashboard(data));
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
    const onConnectError = () => {
      if (!mounted) return;
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("dashboard.snapshot", onSnapshot);
    socket.on("dashboard.patch", onPatch);
    socket.on("dashboard.error", onError);

    refresh();

    return () => {
      mounted = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
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
