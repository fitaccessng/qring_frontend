import { describe, expect, it } from "vitest";
import {
  canPerformSubscriptionAction,
  getSubscriptionEntitlementState,
  hasSubscriptionCategoryAccess,
  isSubscriptionEntitled,
  isSubscriptionFeatureEnabled,
  normalizeSubscriptionSummary,
  requiresSubscriptionUpgrade,
  resolveSubscriptionNamedLimit,
  resolveSubscriptionRetention,
  resolveSubscriptionLimit,
} from "./subscription";

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

  it("keeps messaging access available on free plans", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "active",
      featureFlags: {},
      allowedActions: {},
      features: []
    });

    expect(isSubscriptionFeatureEnabled(subscription, "chat_call_verification")).toBe(false);
    expect(isSubscriptionEntitled(subscription, { requiredFeature: "chat_call_verification" })).toBe(false);
  });

  it("uses shared limit resolution so trial users bypass plan counts", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "active",
      inSignupTrial: true,
      featureFlags: {},
      allowedActions: {}
    });

    const state = resolveSubscriptionLimit(subscription, { maxCount: 3, usedCount: 4 });

    expect(state.canAdd).toBe(true);
    expect(state.isTrialBypass).toBe(true);
    expect(state.remaining).toBe(null);
  });

  it("returns a richer entitlement state for features and actions", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "active",
      featureFlags: { chat_call_verification: true },
      allowedActions: { start_call: false }
    });

    const state = getSubscriptionEntitlementState(subscription, { requiredFeature: "chat_call_verification", requiredAction: "start_call" });

    expect(state.entitled).toBe(false);
    expect(state.featureEnabled).toBe(true);
    expect(state.actionAllowed).toBe(false);
    expect(state.isTrialBypass).toBe(false);
  });

  it("blocks expired trials from premium features while preserving renewal actions", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "trial_expired",
      trialStatus: "expired",
      featureFlags: { visitor_scheduling: true },
      allowedActions: { create_visitor_request: true, renew_subscription: true }
    });

    expect(isSubscriptionEntitled(subscription, { requiredFeature: "visitor_scheduling" })).toBe(false);
    expect(canPerformSubscriptionAction(subscription, "create_visitor_request")).toBe(false);
    expect(canPerformSubscriptionAction(subscription, "renew_subscription")).toBe(true);
    expect(requiresSubscriptionUpgrade(subscription, "visitor_scheduling")).toBe(true);
  });

  it("resolves named limits and retention from the shared payload", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "active",
      limits: { maxHomes: 10, logRetentionDays: 14 },
      featureFlags: { limited_logs: true },
      allowedActions: {}
    });

    expect(resolveSubscriptionNamedLimit(subscription, "homes", { usedCount: 8 }).remaining).toBe(2);
    expect(resolveSubscriptionRetention(subscription, "visitor_history")).toMatchObject({
      days: 14,
      limited: true,
      unlimited: false,
    });
  });

  it("supports capability categories for analytics, exports, realtime, notifications, and scale", () => {
    const subscription = normalizeSubscriptionSummary({
      status: "active",
      featureFlags: {
        advanced_analytics: true,
        export_reports: true,
        realtime_alerts: true,
        advanced_notifications: true,
        multi_admin: true,
        multiple_branches: true,
      },
      allowedActions: {}
    });

    expect(hasSubscriptionCategoryAccess(subscription, "analytics")).toBe(true);
    expect(hasSubscriptionCategoryAccess(subscription, "exports")).toBe(true);
    expect(hasSubscriptionCategoryAccess(subscription, "realtime")).toBe(true);
    expect(hasSubscriptionCategoryAccess(subscription, "notifications")).toBe(true);
    expect(hasSubscriptionCategoryAccess(subscription, "multiAdmin")).toBe(true);
    expect(hasSubscriptionCategoryAccess(subscription, "multiBranch")).toBe(true);
  });
});
