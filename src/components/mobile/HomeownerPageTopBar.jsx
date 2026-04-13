import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../notifications/NotificationBell";
import NotificationPanel from "../notifications/NotificationPanel";
import { useNotifications } from "../../state/NotificationsContext";

export default function HomeownerPageTopBar({
  title,
  subtitle = "Resident Profile",
  fallbackTo = "/dashboard/homeowner/overview"
}) {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsPanelRef = useRef(null);
  const notificationsButtonRef = useRef(null);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function handleOutside(event) {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-notification-panel-root="true"]')) return;
      if (notificationsPanelRef.current?.contains(target)) return;
      if (notificationsButtonRef.current?.contains(target)) return;
      setNotificationsOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen]);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-slate-50/88 px-4 py-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-[#00346f] shadow-sm transition hover:bg-slate-50"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{subtitle}</p>
            <h1 className="font-heading text-xl font-extrabold tracking-tight text-[#00346f]">{title}</h1>
          </div>
        </div>
        <div className="relative">
          <div ref={notificationsButtonRef}>
            <NotificationBell
              unreadCount={unreadCount}
              isOpen={notificationsOpen}
              onClick={(event) => {
                event?.stopPropagation?.();
                setNotificationsOpen((prev) => !prev);
              }}
            />
          </div>
          {notificationsOpen ? (
            <div ref={notificationsPanelRef}>
              <NotificationPanel onClose={() => setNotificationsOpen(false)} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
