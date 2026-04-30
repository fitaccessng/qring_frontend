import { isNativeApp } from "../utils/nativeRuntime";

let appPluginPromise = null;
let networkPluginPromise = null;

function sanitizeRoute(route) {
  const safeRoute = String(route || "").trim();
  if (!safeRoute.startsWith("/") || safeRoute.startsWith("//")) {
    return "";
  }
  return safeRoute;
}

async function loadAppPlugin() {
  if (!isNativeApp()) return null;
  if (!appPluginPromise) {
    const moduleName = "@capacitor/app";
    appPluginPromise = import(/* @vite-ignore */ moduleName)
      .then((mod) => mod?.App ?? null)
      .catch(() => null);
  }
  return appPluginPromise;
}

async function loadNetworkPlugin() {
  if (!isNativeApp()) return null;
  if (!networkPluginPromise) {
    const moduleName = "@capacitor/network";
    networkPluginPromise = import(/* @vite-ignore */ moduleName)
      .then((mod) => mod?.Network ?? null)
      .catch(() => null);
  }
  return networkPluginPromise;
}

export function getRouteFromAppUrl(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) return "";

  try {
    const parsed = new URL(safeUrl);
    const routeFromQuery = sanitizeRoute(parsed.searchParams.get("route"));
    if (routeFromQuery) return routeFromQuery;

    if (parsed.protocol === "qring:") {
      const pathFromCustomScheme = sanitizeRoute(parsed.pathname);
      if (pathFromCustomScheme) return pathFromCustomScheme;
    }

    const pathFromWebUrl = sanitizeRoute(`${parsed.pathname}${parsed.search}${parsed.hash || ""}`.replace(/#\/?/, "/"));
    return pathFromWebUrl;
  } catch {
    return "";
  }
}

export async function addNativeAppStateListener(listener) {
  const App = await loadAppPlugin();
  if (!App || typeof listener !== "function") {
    return () => {};
  }

  const handle = await App.addListener("appStateChange", listener);
  return () => {
    void handle.remove();
  };
}

export async function addNativeAppUrlListener(listener) {
  const App = await loadAppPlugin();
  if (!App || typeof listener !== "function") {
    return () => {};
  }

  const handle = await App.addListener("appUrlOpen", listener);
  return () => {
    void handle.remove();
  };
}

export async function getNativeLaunchRoute() {
  const App = await loadAppPlugin();
  if (!App) return "";

  try {
    const launched = await App.getLaunchUrl();
    return getRouteFromAppUrl(launched?.url);
  } catch {
    return "";
  }
}

export async function addNativeNetworkListener(listener) {
  const Network = await loadNetworkPlugin();
  if (!Network || typeof listener !== "function") {
    return () => {};
  }

  const handle = await Network.addListener("networkStatusChange", listener);
  return () => {
    void handle.remove();
  };
}

export async function getNativeNetworkStatus() {
  const Network = await loadNetworkPlugin();
  if (!Network) return { connected: true };

  try {
    return await Network.getStatus();
  } catch {
    return { connected: true };
  }
}
