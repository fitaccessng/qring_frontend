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
  const explicitVisitorRequestId = String(visitorRequestId || "").trim() || undefined;
  const normalizedType = type === "video" ? "video" : "audio";
  const normalizedVisitorName = typeof visitorName === "string" ? visitorName.trim() || undefined : undefined;
  const normalizedVisitorToken = String(visitorToken || "").trim() || undefined;
  const canUseCanonicalRoute = Boolean(explicitVisitorSessionId || explicitVisitorRequestId);

  const canonicalBody = {
    visitorSessionId: explicitVisitorSessionId,
    visitorRequestId: explicitVisitorRequestId,
    visitorName: normalizedVisitorName,
    type: normalizedType,
    hasVideo: Boolean(hasVideo)
  };

  const legacyBody = {
    sessionId: safeSessionId,
    type: normalizedType,
    hasVideo: Boolean(hasVideo),
    visitorToken: normalizedVisitorToken
  };

  return {
    canUseCanonicalRoute,
    canonicalBody,
    legacyBody
  };
}
