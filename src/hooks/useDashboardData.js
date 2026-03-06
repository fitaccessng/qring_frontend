import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  normalizeDashboard
} from "../services/dashboardService";
import {
  closeDashboardSocket,
  getDashboardSocket
} from "../services/socketClient";
import { env } from "../config/env";

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
  const realtimeEnabled = !import.meta.env.DEV || env.enableRealtimeInDev;
  const [dashboard, setDashboard] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

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
    if (!realtimeEnabled) {
      refresh();
      return () => {};
    }

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
    const onIncomingCall = (payload) => {
      if (!mounted) return;
      setIncomingCall(payload?.data ?? payload ?? null);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("dashboard.snapshot", onSnapshot);
    socket.on("dashboard.patch", onPatch);
    socket.on("dashboard.error", onError);
    socket.on("incoming-call", onIncomingCall);

    refresh();

    return () => {
      mounted = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("dashboard.snapshot", onSnapshot);
      socket.off("dashboard.patch", onPatch);
      socket.off("dashboard.error", onError);
      socket.off("incoming-call", onIncomingCall);
      closeDashboardSocket();
    };
  }, [refresh, realtimeEnabled]);

  return useMemo(
    () => ({
      ...dashboard,
      loading,
      error,
      connected,
      incomingCall,
      clearIncomingCall: () => setIncomingCall(null),
      realtimeEnabled,
      refresh
    }),
    [dashboard, loading, error, connected, incomingCall, realtimeEnabled, refresh]
  );
}
