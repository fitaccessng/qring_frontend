export function normalizeCallRequestMediaContract({ type, hasAudio, hasVideo } = {}) {
  const normalizedType = String(type || "audio").trim().toLowerCase() === "video" ? "video" : "audio";
  const parsedHasAudio = typeof hasAudio === "boolean" ? hasAudio : true;
  const parsedHasVideo = typeof hasVideo === "boolean" ? hasVideo : normalizedType === "video";
  const canonicalAudio = parsedHasAudio === true;
  const canonicalVideo = parsedHasVideo === true;

  return {
    type: normalizedType,
    hasAudio: canonicalAudio,
    hasVideo: canonicalVideo,
    callType: normalizedType,
    mediaIntent: {
      hasAudio: canonicalAudio,
      hasVideo: canonicalVideo
    }
  };
}

export function buildStartSessionCallPlan({
  sessionId,
  visitorSessionId,
  visitorRequestId,
  visitorName,
  type,
  hasAudio,
  hasVideo,
  visitorToken,
  communicationTarget
} = {}) {
  const safeSessionId = String(sessionId || visitorSessionId || "").trim();
  const explicitVisitorSessionId = String(visitorSessionId || "").trim() || undefined;
  const explicitVisitorRequestId = String(visitorRequestId || visitorSessionId || "").trim() || undefined;
  const normalizedType = String(type || "audio").trim().toLowerCase() === "video" ? "video" : "audio";
  const normalizedVisitorName = typeof visitorName === "string" ? visitorName.trim() || undefined : undefined;
  const normalizedVisitorToken = String(visitorToken || "").trim() || undefined;
  const normalizedCommunicationTarget = String(communicationTarget || "").trim().toLowerCase() || undefined;
  const canUseCanonicalRoute = Boolean(explicitVisitorSessionId || explicitVisitorRequestId) && normalizedCommunicationTarget !== "homeowner";

  const canonicalMedia = normalizeCallRequestMediaContract({
    type: normalizedType,
    hasAudio,
    hasVideo
  });

  const canonicalBody = {
    visitorSessionId: explicitVisitorSessionId,
    visitorRequestId: explicitVisitorRequestId,
    visitorName: normalizedVisitorName,
    type: canonicalMedia.type,
    hasAudio: canonicalMedia.hasAudio,
    hasVideo: canonicalMedia.hasVideo,
    communicationTarget: normalizedCommunicationTarget
  };

  const legacyBody = {
    sessionId: safeSessionId,
    type: canonicalMedia.type,
    hasAudio: canonicalMedia.hasAudio,
    hasVideo: canonicalMedia.hasVideo,
    visitorToken: normalizedVisitorToken,
    communicationTarget: normalizedCommunicationTarget
  };

  return {
    canUseCanonicalRoute,
    canonicalBody,
    legacyBody
  };
}
