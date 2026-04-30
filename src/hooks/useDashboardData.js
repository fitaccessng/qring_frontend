import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardOverview,
  normalizeDashboard
} from "../services/dashboardService";
import {
  closeDashboardSocket,
  getDashboardSocket
} from "../services/socketClient";
import { env } from "../config/env";
import { queryClient } from "../lib/queryClient";

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
  const [connected, setConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [realtimeError, setRealtimeError] = useState("");
  const {
    data: dashboard = initialData,
    isFetching,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: getDashboardOverview,
    placeholderData: initialData,
    staleTime: 45 * 1000,
  });

  useEffect(() => {
    if (!realtimeEnabled) {
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
      queryClient.setQueryData(["dashboard", "overview"], normalizeDashboard(data));
    };
    const onPatch = (payload) => {
      if (!mounted) return;
      queryClient.setQueryData(["dashboard", "overview"], (prev) =>
        normalizeDashboard({
          ...(prev ?? initialData),
          ...(payload?.data ?? payload)
        })
      );
    };
    const onError = (payload) => {
      if (!mounted) return;
      setRealtimeError(payload?.message ?? "Realtime error");
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
  }, [realtimeEnabled]);

  return useMemo(
    () => ({
      ...dashboard,
      loading: isLoading,
      refreshing: isFetching,
      error: realtimeError || error?.message || "",
      connected,
      incomingCall,
      clearIncomingCall: () => setIncomingCall(null),
      realtimeEnabled,
      refresh: refetch
    }),
    [dashboard, isLoading, isFetching, realtimeError, error, connected, incomingCall, realtimeEnabled, refetch]
  );
}
