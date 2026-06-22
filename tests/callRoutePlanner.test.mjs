import test from "node:test";
import assert from "node:assert/strict";
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

  assert.equal(plan.canUseCanonicalRoute, true);
  assert.deepEqual(plan.canonicalBody, {
    visitorSessionId: "visitor-session-123",
    visitorRequestId: "request-123",
    visitorName: "Visitor Example",
    type: "video",
    hasVideo: true
  });
  assert.deepEqual(plan.legacyBody, {
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

  assert.equal(plan.canUseCanonicalRoute, false);
  assert.deepEqual(plan.legacyBody, {
    sessionId: "legacy-session",
    type: "audio",
    hasVideo: false,
    visitorToken: "visitor-token-1"
  });
});
