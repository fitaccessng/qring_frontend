export function buildStartSessionCallPlan({
  sessionId,
  visitorSessionId,
  visitorRequestId,
  visitorName,
  type,
  hasVideo,
  visitorToken
} = {}) {
  const safeSessionId = String(sessionId || visitorSessionId || "").trim();
  const explicitVisitorSessionId = String(visitorSessionId || "").trim() || undefined;
  const explicitVisitorRequestId = String(visitorRequestId || visitorSessionId || "").trim() || undefined;
  const normalizedType = type === "video" ? "video" : "audio";
  const normalizedVisitorName = typeof visitorName === "string" ? visitorName.trim() || undefined : undefined;
  const normalizedVisitorToken = String(visitorToken || "").trim() || undefined;
  const canUseCanonicalRoute = Boolean(explicitVisitorSessionId || explicitVisitorRequestId);

  const resolvedHasVideo = hasVideo !== undefined ? Boolean(hasVideo) : normalizedType === "video";

  const canonicalBody = {
    visitorSessionId: explicitVisitorSessionId,
    visitorRequestId: explicitVisitorRequestId,
    visitorName: normalizedVisitorName,
    type: normalizedType,
    hasVideo: resolvedHasVideo
  };

  const legacyBody = {
    sessionId: safeSessionId,
    type: normalizedType,
    hasVideo: resolvedHasVideo,
    visitorToken: normalizedVisitorToken
  };

  return {
    canUseCanonicalRoute,
    canonicalBody,
    legacyBody
  };
}
