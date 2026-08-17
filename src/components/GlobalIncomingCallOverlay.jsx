import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import VisitorIncomingCallModal from "./VisitorIncomingCallModal";
import { useNotifications } from "../state/NotificationsContext";

export default function GlobalIncomingCallOverlay() {
  const navigate = useNavigate();
  const { activeIncomingCall, dismissIncomingCall } = useNotifications();
  const [busy, setBusy] = useState(false);

  const call = useMemo(() => activeIncomingCall || null, [activeIncomingCall]);
  const sessionId = String(call?.sessionId || "").trim();
  const callSessionId = String(call?.callSessionId || call?.callId || "").trim();
  const hasVideo = Boolean(call?.hasVideo) || String(call?.callType || call?.type || "").toLowerCase() === "video";
  const callerLabel = String(call?.callerName || call?.callerRole || "Caller").trim();

  function handleAccept() {
    if (!sessionId || !callSessionId) return;
    setBusy(true);
    window.sessionStorage.setItem("qring_call_accept_intent", JSON.stringify({
      sessionId,
      hasVideo,
      callSessionId,
      visitorId: call?.visitorId || sessionId,
      eventId: call?.eventId || call?.callId || callSessionId,
      roomName: call?.roomName || "",
      callerRole: call?.callerRole || call?.role || "",
      callerName: call?.callerName || callerLabel
    }));
    dismissIncomingCall(call);
    navigate(`/session/${sessionId}/${hasVideo ? "video" : "audio"}`);
  }

  function handleReject() {
    dismissIncomingCall(call);
  }

  return (
    <VisitorIncomingCallModal
      open={Boolean(call && sessionId && callSessionId)}
      hasVideo={hasVideo}
      busy={busy}
      callerLabel={callerLabel}
      sourceLabel={call?.callerOrigin || ""}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
