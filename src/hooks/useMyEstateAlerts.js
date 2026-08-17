import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { invalidateMyEstateAlertsCache, listMyEstateAlerts } from "../services/estateService";
import { getDashboardSocket } from "../services/socketClient";

const POLL_INTERVAL_MS = 60 * 1000;
const REALTIME_DEBOUNCE_MS = 600;
const LOCAL_INVALIDATION_EVENT = "qring:my-estate-alerts-invalidated";
const SOCKET_EVENTS = ["ALERT_CREATED", "ALERT_UPDATED", "ALERT_DELETED", "PAYMENT_STATUS_UPDATED"];

let state = {
  rows: [],
  loading: false,
  error: "",
  loaded: false
};

const listeners = new Set();
const subscribers = new Set();
let pollTimer = null;
let realtimeTimer = null;
let socketAttached = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function getSnapshot() {
  return state;
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function refresh({ silent = false, force = false } = {}) {
  if (force) {
    invalidateMyEstateAlertsCache({ notify: false });
  }
  if (!silent) {
    setState({ loading: true, error: "" });
  }
  try {
    const rows = await listMyEstateAlerts();
    setState({ rows, loaded: true, error: "", loading: false });
    return rows;
  } catch (error) {
    setState({ error: error?.message || "Unable to load alerts", loading: false, loaded: true });
    throw error;
  }
}

function scheduleRealtimeRefresh() {
  window.clearTimeout(realtimeTimer);
  realtimeTimer = window.setTimeout(() => {
    void refresh({ silent: true, force: true }).catch(() => {});
  }, REALTIME_DEBOUNCE_MS);
}

function attachSocketOnce() {
  if (socketAttached || typeof window === "undefined") return;
  const socket = getDashboardSocket();
  SOCKET_EVENTS.forEach((eventName) => socket.on(eventName, scheduleRealtimeRefresh));
  window.addEventListener(LOCAL_INVALIDATION_EVENT, scheduleRealtimeRefresh);
  socketAttached = true;
}

function startPolling() {
  if (pollTimer || typeof window === "undefined") return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    void refresh({ silent: true }).catch(() => {});
  }, POLL_INTERVAL_MS);
}

function stopPollingIfIdle() {
  if (subscribers.size > 0 || !pollTimer) return;
  window.clearInterval(pollTimer);
  pollTimer = null;
}

export function useMyEstateAlerts(alertType = "") {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const subscriptionToken = {};
    subscribers.add(subscriptionToken);
    attachSocketOnce();
    startPolling();
    if (!state.loaded) {
      void refresh().catch(() => {});
    }
    return () => {
      subscribers.delete(subscriptionToken);
      stopPollingIfIdle();
    };
  }, []);

  const refetch = useCallback((options = {}) => refresh({ silent: true, ...options }), []);

  const rows = useMemo(() => {
    if (!alertType) return snapshot.rows;
    return snapshot.rows.filter((item) => item.alertType === alertType);
  }, [alertType, snapshot.rows]);

  return {
    rows,
    loading: snapshot.loading && !snapshot.loaded,
    error: snapshot.error,
    refetch
  };
}
