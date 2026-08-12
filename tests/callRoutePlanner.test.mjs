import { test, expect } from "vitest";
import { buildStartSessionCallPlan } from "../src/services/callRoutePlanner.js";

test("buildStartSessionCallPlan prefers canonical call request inputs when visitor request data is present", () => {
  const plan = buildStartSessionCallPlan({
    sessionId: "visitor-session-123",
    visitorSessionId: "visitor-session-123",
    visitorRequestId: "request-123",
    visitorName: "Visitor Example",
    type: "video",
    hasVideo: true
  });

  expect(plan.canUseCanonicalRoute).toBe(true);
  expect(plan.canonicalBody).toEqual({
    visitorSessionId: "visitor-session-123",
    visitorRequestId: "request-123",
    visitorName: "Visitor Example",
    type: "video",
    hasVideo: true
  });
  expect(plan.legacyBody).toEqual({
    sessionId: "visitor-session-123",
    type: "video",
    hasVideo: true,
    visitorToken: undefined
  });
});

test("buildStartSessionCallPlan keeps security and realtime callers on the legacy path", () => {
  const plan = buildStartSessionCallPlan({
    sessionId: "legacy-session",
    type: "audio",
    hasVideo: false,
    visitorToken: "visitor-token-1"
  });

  expect(plan.canUseCanonicalRoute).toBe(false);
  expect(plan.legacyBody).toEqual({
    sessionId: "legacy-session",
    type: "audio",
    hasVideo: false,
    visitorToken: "visitor-token-1"
  });
});
