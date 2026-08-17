import { useEffect, useState } from "react";

const UPDATE_NOTICE_DISMISSED_STORAGE_KEY = "qring:update-notifier-dismissed";

function readUpdateNoticeDismissed() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(UPDATE_NOTICE_DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeUpdateNoticeDismissed(value) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(UPDATE_NOTICE_DISMISSED_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Ignore storage write failures.
  }
}

export default function AppUpdateNotifier() {
  const [updateReady, setUpdateReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    const handleControllerChange = () => {
      if (!active) return;
      window.location.reload();
    };

    const trackInstalling = (worker) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (!active) return;
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          if (!readUpdateNoticeDismissed()) {
            setUpdateReady(true);
          }
        }
      });
    };

    const register = async () => {
      if (typeof window === "undefined") return;
      if (import.meta.env.DEV) return;
      if (!("serviceWorker" in navigator)) return;
      if (window?.Capacitor?.isNativePlatform?.()) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        if (registration.waiting && !readUpdateNoticeDismissed()) {
          setUpdateReady(true);
        }

        if (registration.installing) {
          trackInstalling(registration.installing);
        }

        registration.addEventListener("updatefound", () => {
          trackInstalling(registration.installing);
        });

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        await registration.update();
      } catch (error) {
        console.warn("Service worker registration failed", error);
      }
    };

    void register();

    return () => {
      active = false;
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!updateReady) return null;

  const handleDismiss = () => {
    writeUpdateNoticeDismissed(true);
    setUpdateReady(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }
    } catch (error) {
      console.warn("Unable to apply app update", error);
    }
    window.location.reload();
  };

  return (
    <div className="fixed inset-x-4 top-4 z-[9999] rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur md:left-auto md:right-4 md:w-[360px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Update ready</p>
          <p className="mt-1 text-sm text-slate-600">A new version of Qring is available. Refresh to use the latest experience.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full bg-[#2456f5] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1b46c6] disabled:cursor-wait disabled:opacity-70"
          >
            {isRefreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
