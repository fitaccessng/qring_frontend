import { useEffect } from "react";

export default function AppUpdateNotifier() {
  useEffect(() => {
    let active = true;

    const handleControllerChange = () => {
      if (!active || !navigator.serviceWorker.controller) return;
      window.location.reload();
    };

    const activateUpdate = (worker) => {
      if (!worker) return;
      worker.postMessage({ type: "SKIP_WAITING" });
    };

    const watchInstalling = (worker, hasController) => {
      if (!worker || !hasController) return;
      const activateIfInstalled = () => {
        if (active && worker.state === "installed") {
          activateUpdate(worker);
        }
      };
      worker.addEventListener("statechange", activateIfInstalled);
      activateIfInstalled();
    };

    const register = async () => {
      if (typeof window === "undefined") return;
      if (import.meta.env.DEV) return;
      if (!("serviceWorker" in navigator)) return;
      if (window?.Capacitor?.isNativePlatform?.()) return;

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const hasController = Boolean(navigator.serviceWorker.controller);
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        if (registration.waiting && hasController) {
          activateUpdate(registration.waiting);
        }
        watchInstalling(registration.installing, hasController);

        registration.addEventListener("updatefound", () => {
          watchInstalling(registration.installing, hasController);
        });

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

  return null;
}
