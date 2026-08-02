import { useEffect, useState } from "react";

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
          setUpdateReady(true);
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
        if (registration.waiting) {
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
  );
}
