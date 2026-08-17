export function buildStartSessionCallPlan({
  sessionId,
  visitorSessionId,
  visitorRequestId,
  visitorName,
  type,
  hasVideo,
  visitorToken,
  communicationTarget
} = {}) {
  const safeSessionId = String(sessionId || visitorSessionId || "").trim();
  const explicitVisitorSessionId = String(visitorSessionId || "").trim() || undefined;
  const explicitVisitorRequestId = String(visitorRequestId || visitorSessionId || "").trim() || undefined;
  const normalizedType = type === "video" ? "video" : "audio";
  const normalizedVisitorName = typeof visitorName === "string" ? visitorName.trim() || undefined : undefined;
  const normalizedVisitorToken = String(visitorToken || "").trim() || undefined;
  const normalizedCommunicationTarget = String(communicationTarget || "").trim().toLowerCase() || undefined;
  const canUseCanonicalRoute = Boolean(explicitVisitorSessionId || explicitVisitorRequestId) && normalizedCommunicationTarget !== "homeowner";

  const resolvedHasVideo = hasVideo !== undefined ? Boolean(hasVideo) : normalizedType === "video";

  const canonicalBody = {
    visitorSessionId: explicitVisitorSessionId,
    visitorRequestId: explicitVisitorRequestId,
    visitorName: normalizedVisitorName,
    type: normalizedType,
    hasVideo: resolvedHasVideo,
    communicationTarget: normalizedCommunicationTarget
  };

  const legacyBody = {
    sessionId: safeSessionId,
    type: normalizedType,
    hasVideo: resolvedHasVideo,
    visitorToken: normalizedVisitorToken,
    communicationTarget: normalizedCommunicationTarget
  };

  return {
    canUseCanonicalRoute,
    canonicalBody,
    legacyBody
  };
}
