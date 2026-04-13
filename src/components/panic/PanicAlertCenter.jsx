import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PanicAlertModal from "./PanicAlertModal";
import { acknowledgePanicAlert, getActivePanicAlerts } from "../../services/safetyService";
import { getDashboardSocket } from "../../services/socketClient";
import { useAuth } from "../../state/AuthContext";

export default function PanicAlertCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);

  async function loadActiveAlerts() {
    try {
      setAlerts(await getActivePanicAlerts());
    } catch {
      // Keep the alert center non-blocking.
    }
  }

  useEffect(() => {
    if (!user) return undefined;
    loadActiveAlerts();
    const socket = getDashboardSocket();
    const sync = () => loadActiveAlerts();
    socket.on("panic_alert", sync);
    socket.on("panic_alert_update", sync);
    return () => {
      socket.off("panic_alert", sync);
      socket.off("panic_alert_update", sync);
    };
  }, [user]);

  useEffect(() => {
    setDismissedAlertIds([]);
  }, [user?.id]);

  const currentAlert = useMemo(() => {
    if (user?.role !== "security" && user?.role !== "estate") return null;

    const visibleAlerts = alerts.filter(
      (item) =>
        item.userId !== user?.id &&
        item.status === "active" &&
        !dismissedAlertIds.includes(item.id)
    );
    return visibleAlerts[0] ?? null;
  }, [alerts, dismissedAlertIds, user?.id, user?.role]);

  useEffect(() => {
    if (!currentAlert) return;
    try {
      navigator.vibrate?.([220, 120, 220, 120, 220]);
    } catch {
      // Best effort.
    }
    if (typeof document !== "undefined") {
      document.body.style.backgroundColor = "#210809";
    }
    if (typeof window !== "undefined" && typeof window.Notification !== "undefined" && window.Notification.permission === "granted") {
      try {
        new window.Notification("Emergency Alert", {
          body: `${currentAlert.userName} triggered a panic alert at ${currentAlert.location?.doorName || currentAlert.unitLabel || "an unknown location"}.`
        });
      } catch {
        // Non-blocking.
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.backgroundColor = "";
      }
    };
  }, [currentAlert]);

  if (!user || !currentAlert) return null;

  async function handleAcknowledge() {
    setBusy(true);
    try {
      await acknowledgePanicAlert(currentAlert.id);
      await loadActiveAlerts();
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    if (!currentAlert?.acknowledged) return;
    setDismissedAlertIds((prev) => (prev.includes(currentAlert.id) ? prev : [...prev, currentAlert.id]));
  }

  function handleOpenDetails() {
    if (user?.role === "security") {
      navigate("/dashboard/security/emergency");
      return;
    }
    if (user?.role === "estate") {
      navigate("/dashboard/estate/emergency");
      return;
    }
    navigate("/dashboard/homeowner/safety");
  }

  return (
    <PanicAlertModal
      alert={currentAlert}
      busy={busy}
      canAcknowledge
      onAcknowledge={handleAcknowledge}
      onOpenDetails={handleOpenDetails}
      onDismiss={handleDismiss}
    />
  );
}
