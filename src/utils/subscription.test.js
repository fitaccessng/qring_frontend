import { describe, expect, it } from "vitest";
import { isSubscriptionEntitled, normalizeSubscriptionSummary } from "./subscription";

describe("subscription entitlement", () => {
  it("treats trial subscriptions as entitled to premium features", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "trial",
      inSignupTrial: false,
      isTrial: true,
      trialStatus: "active",
      featureFlags: {},
      allowedActions: {}
    });

    expect(isSubscriptionEntitled(subscription, { requiredFeature: "chat_call_verification" })).toBe(true);
    expect(isSubscriptionEntitled(subscription, { requiredAction: "start_call" })).toBe(true);
  });
});
