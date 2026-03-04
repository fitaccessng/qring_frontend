const LOCATION_PERMISSION_KEY = "qring_location_permission_state_v1";
const LAST_LOCATION_KEY = "qring_last_location_v1";

function isNativePlatform() {
  try {
    return Boolean(globalThis?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no-op
  }
}

function savePermissionState(state) {
  writeJSON(LOCATION_PERMISSION_KEY, {
    state,
    at: new Date().toISOString()
  });
}

function getCachedLocation(maxAgeMs) {
  const cached = readJSON(LAST_LOCATION_KEY);
  if (!cached?.coords?.latitude || !cached?.coords?.longitude || !cached?.at) return null;
  const ageMs = Date.now() - new Date(cached.at).getTime();
  if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return null;
  return cached;
}

function saveLocation(coords) {
  writeJSON(LAST_LOCATION_KEY, {
    coords: {
      latitude: Number(coords?.latitude),
      longitude: Number(coords?.longitude),
      accuracy: Number(coords?.accuracy || 0)
    },
    at: new Date().toISOString()
  });
}

async function getNativeGeolocation() {
  if (!isNativePlatform()) return null;
  try {
    const moduleName = "@capacitor/geolocation";
    const mod = await import(/* @vite-ignore */ moduleName);
    return mod?.Geolocation ?? null;
  } catch {
    return null;
  }
}

function mapState(raw) {
  if (raw === "granted") return "granted";
  if (raw === "denied") return "denied";
  return "prompt";
}

export async function checkLocationPermission() {
  const geolocationPlugin = await getNativeGeolocation();
  if (geolocationPlugin?.checkPermissions) {
    try {
      const current = await geolocationPlugin.checkPermissions();
      const state = mapState(current?.location ?? current?.coarseLocation);
      savePermissionState(state);
      return { granted: state === "granted", state };
    } catch {
      return { granted: false, state: "prompt" };
    }
  }

  if (navigator?.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "geolocation" });
      const state = mapState(status?.state);
      savePermissionState(state);
      return { granted: state === "granted", state };
    } catch {
      return { granted: false, state: "prompt" };
    }
  }

  const cachedPermission = readJSON(LOCATION_PERMISSION_KEY);
  const state = mapState(cachedPermission?.state);
  return { granted: state === "granted", state };
}

export async function requestLocationPermission() {
  const checked = await checkLocationPermission();
  if (checked.granted) return checked;

  const geolocationPlugin = await getNativeGeolocation();
  if (geolocationPlugin?.requestPermissions) {
    try {
      const requested = await geolocationPlugin.requestPermissions();
      const state = mapState(requested?.location ?? requested?.coarseLocation);
      savePermissionState(state);
      return { granted: state === "granted", state };
    } catch {
      savePermissionState("denied");
      return { granted: false, state: "denied" };
    }
  }

  if (!navigator?.geolocation) {
    savePermissionState("denied");
    return { granted: false, state: "denied" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        savePermissionState("granted");
        saveLocation(position.coords);
        resolve({ granted: true, state: "granted" });
      },
      () => {
        savePermissionState("denied");
        resolve({ granted: false, state: "denied" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 }
    );
  });
}

export async function getCurrentDeviceLocation(options = {}) {
  const {
    enableHighAccuracy = false,
    timeout = 15000,
    maximumAge = 60000,
    maxCachedAgeMs = 5 * 60 * 1000
  } = options;

  const cached = getCachedLocation(maxCachedAgeMs);
  if (cached) {
    return { ok: true, coords: cached.coords, source: "cache" };
  }

  const permission = await requestLocationPermission();
  if (!permission.granted) {
    return { ok: false, reason: "permission_denied" };
  }

  const geolocationPlugin = await getNativeGeolocation();
  if (geolocationPlugin?.getCurrentPosition) {
    try {
      const position = await geolocationPlugin.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: Math.max(timeout, 20000),
        maximumAge: 0
      });
      const coords = {
        latitude: Number(position?.coords?.latitude),
        longitude: Number(position?.coords?.longitude),
        accuracy: Number(position?.coords?.accuracy || 0)
      };
      if (Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
        saveLocation(coords);
        return { ok: true, coords, source: "native" };
      }
    } catch {
      // Retry with a looser, coarse-favoring option set for unstable GPS environments.
      try {
        const fallback = await geolocationPlugin.getCurrentPosition({
          enableHighAccuracy: Boolean(enableHighAccuracy),
          timeout: Math.max(timeout, 25000),
          maximumAge: Math.max(maximumAge, 180000)
        });
        const coords = {
          latitude: Number(fallback?.coords?.latitude),
          longitude: Number(fallback?.coords?.longitude),
          accuracy: Number(fallback?.coords?.accuracy || 0)
        };
        if (Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
          saveLocation(coords);
          return { ok: true, coords, source: "native-fallback" };
        }
      } catch {
        // fallback handled below
      }
      const stale = readJSON(LAST_LOCATION_KEY);
      if (stale?.coords?.latitude && stale?.coords?.longitude) {
        return { ok: true, coords: stale.coords, source: "stale-cache" };
      }
      return { ok: false, reason: "service_off" };
    }
  }

  if (!navigator?.geolocation) {
    return { ok: false, reason: "unavailable" };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: Number(position?.coords?.latitude),
          longitude: Number(position?.coords?.longitude),
          accuracy: Number(position?.coords?.accuracy || 0)
        };
        saveLocation(coords);
        resolve({ ok: true, coords, source: "browser" });
      },
      () => resolve({ ok: false, reason: "service_off" }),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

export async function watchDeviceLocation(onPosition, onError, options = {}) {
  const settings = {
    enableHighAccuracy: Boolean(options.enableHighAccuracy ?? true),
    timeout: Number(options.timeout ?? 20000),
    maximumAge: Number(options.maximumAge ?? 30000),
  };

  const geolocationPlugin = await getNativeGeolocation();
  if (geolocationPlugin?.watchPosition) {
    try {
      const watchId = await geolocationPlugin.watchPosition(settings, (position, err) => {
        if (err) {
          onError?.(err);
          return;
        }
        const coords = position?.coords;
        if (!coords) return;
        saveLocation(coords);
        onPosition?.(coords);
      });
      return { type: "capacitor", id: watchId };
    } catch {
      // Browser fallback below.
    }
  }

  if (!navigator?.geolocation) {
    return null;
  }

  const id = navigator.geolocation.watchPosition(
    (position) => {
      const coords = position?.coords;
      if (!coords) return;
      saveLocation(coords);
      onPosition?.(coords);
    },
    (error) => onError?.(error),
    settings
  );
  return { type: "browser", id };
}

export async function clearDeviceLocationWatch(watchHandle) {
  if (!watchHandle?.type) return;
  if (watchHandle.type === "browser" && navigator?.geolocation && watchHandle.id != null) {
    navigator.geolocation.clearWatch(watchHandle.id);
    return;
  }
  if (watchHandle.type === "capacitor" && watchHandle.id != null) {
    const geolocationPlugin = await getNativeGeolocation();
    try {
      await geolocationPlugin?.clearWatch?.({ id: watchHandle.id });
    } catch {
      // no-op
    }
  }
}

export async function openLocationSettings() {
  if (!isNativePlatform()) return false;
  try {
    const moduleName = "@capacitor/app";
    const mod = await import(/* @vite-ignore */ moduleName);
    await mod?.App?.openSettings?.();
    return true;
  } catch {
    // fallback below
  }
  try {
    const plugin = globalThis?.Capacitor?.Plugins?.App;
    if (plugin?.openSettings) {
      await plugin.openSettings();
      return true;
    }
  } catch {
    // no-op
  }
  return false;
}
