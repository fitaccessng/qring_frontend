const DEFAULT_ALLOWED_ACTIONS = {
  view_dashboard: true,
  renew_subscription: true
};

const CATEGORY_FEATURE_KEYS = {
  analytics: ["analytics", "advanced_analytics", "activity_tracking", "activity_reports", "advanced_reporting"],
  announcements: ["estate_announcements", "urgent_announcements", "targeted_announcements"],
  audit: ["security_audit_logs", "management_activity_history"],
  calls: ["chat_call_verification", "video_verification", "audio_verification"],
  deliveries: ["delivery_management", "delivery_records", "package_tracking", "package_notifications"],
  exports: ["export_reports", "data_export", "download_visitor_records", "download_resident_records", "download_security_reports", "download_gate_activity_reports"],
  incidents: ["incident_reporting", "incident_photo_attachments", "security_incident_history", "security_incident_tracking", "resident_security_concerns"],
  notifications: ["basic_notifications", "advanced_notifications", "email_notifications", "realtime_alerts", "security_alerts", "package_notifications"],
  realtime: ["realtime_alerts", "mobile_dashboard"],
  residents: ["register_residents", "resident_management", "move_in_management", "move_out_management", "suspend_former_resident_access"],
  security: ["register_security_guards", "multiple_security_guards", "security_guard_activity", "guard_attendance"],
  visitors: ["visitor_scheduling", "frequent_visitor_passes", "regular_visitor_registration", "trusted_visitor_management", "access_time_windows", "access_days"],
  multiAdmin: ["multi_admin", "multi_admin_roles", "multiple_receptionists", "role_permissions"],
  multiBranch: ["multiple_branches", "multi_location_control", "central_multi_estate_dashboard"],
};

const RETENTION_LIMIT_KEYS = {
  visitor_history: ["visitorHistoryRetentionDays", "visitorRetentionDays", "logRetentionDays"],
  visitor_logs: ["visitorLogRetentionDays", "logRetentionDays"],
  audit_logs: ["auditLogRetentionDays", "logRetentionDays"],
  visitor_history_days: ["visitorHistoryRetentionDays", "visitorRetentionDays", "logRetentionDays"],
};

const LIMIT_KEY_ALIASES = {
  admins: ["maxAdmins"],
  branches: ["maxBranches", "maxEstates"],
  doors: ["maxDoors"],
  estates: ["maxEstates"],
  homes: ["maxHomes", "maxDoors"],
  qr_codes: ["maxQrCodes"],
};

function normalizeKey(key) {
  return String(key ?? "").trim();
}

function readFirstNumber(source, keys, fallback = 0) {
  for (const key of keys) {
    const value = source?.[key];
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return fallback;
}

export function isSubscriptionTrialLike(subscription) {
  if (!subscription) return false;
  const status = String(subscription.status ?? "").trim().toLowerCase();
  const trialStatus = String(subscription.trialStatus ?? "").trim().toLowerCase();
  return Boolean(
    subscription.inSignupTrial ||
    subscription.isTrial ||
    trialStatus === "active" ||
    status === "trial"
  );
}

export function isSubscriptionExpiredTrial(subscription) {
  if (!subscription) return false;
  const status = String(subscription.status ?? "").trim().toLowerCase();
  const trialStatus = String(subscription.trialStatus ?? "").trim().toLowerCase();
  return trialStatus === "expired" || status === "trial_expired";
}

export function isSubscriptionPaidPlan(subscription) {
  if (!subscription) return false;
  const paymentStatus = String(subscription.paymentStatus ?? subscription.payment_status ?? "").trim().toLowerCase();
  const status = String(subscription.status ?? "").trim().toLowerCase();
  const amount = Number(subscription.amount ?? subscription.monthlyAmount ?? subscription.planAmount ?? 0);
  return amount > 0 || ["paid", "active"].includes(paymentStatus) || (status === "active" && subscription.plan !== "free");
}

export function isSubscriptionFeatureEnabled(subscription, featureKey) {
  if (!featureKey) return true;
  const normalizedFeature = normalizeKey(featureKey);
  if (isSubscriptionExpiredTrial(subscription) || subscription?.status === "suspended") return false;
  if (isSubscriptionTrialLike(subscription)) return true;
  return Boolean(
    subscription?.featureFlags?.[normalizedFeature] ||
    subscription?.features?.includes?.(normalizedFeature) ||
    subscription?.allowedActions?.[normalizedFeature] === true
  );
}

export function canPerformSubscriptionAction(subscription, actionKey) {
  if (!actionKey) return true;
  const normalizedAction = normalizeKey(actionKey);
  if (isSubscriptionExpiredTrial(subscription) || subscription?.status === "suspended") {
    return ["view_dashboard", "view_logs", "view_messages", "renew_subscription", "manage_billing"].includes(normalizedAction);
  }
  if (isSubscriptionTrialLike(subscription)) return true;
  return subscription?.allowedActions?.[normalizedAction] !== false;
}

export function getSubscriptionEntitlementState(subscription, { requiredFeature = "", requiredAction = "" } = {}) {
  const isTrialBypass = Boolean(subscription && isSubscriptionTrialLike(subscription));
  const featureEnabled = requiredFeature ? isSubscriptionFeatureEnabled(subscription, requiredFeature) : true;
  const actionAllowed = canPerformSubscriptionAction(subscription, requiredAction);
  const entitled = isTrialBypass || (featureEnabled && actionAllowed);

  return {
    entitled,
    featureEnabled,
    actionAllowed,
    isTrialBypass,
  };
}

export function isSubscriptionEntitled(subscription, { requiredFeature = "", requiredAction = "" } = {}) {
  if (!subscription) return false;
  if (subscription.status === "suspended") return false;
  if (isSubscriptionExpiredTrial(subscription)) return false;
  return getSubscriptionEntitlementState(subscription, { requiredFeature, requiredAction }).entitled;
}

export function requiresSubscriptionUpgrade(subscription, capabilityKey) {
  const key = normalizeKey(capabilityKey);
  if (!key || isSubscriptionTrialLike(subscription)) return false;
  if (!subscription || subscription.status === "suspended" || isSubscriptionExpiredTrial(subscription)) return true;
  return !isSubscriptionFeatureEnabled(subscription, key);
}

export function resolveSubscriptionRetention(subscription, retentionKey = "visitor_history") {
  const keys = RETENTION_LIMIT_KEYS[normalizeKey(retentionKey)] ?? [normalizeKey(retentionKey)];
  const days = readFirstNumber(subscription?.limits, keys, 0);
  return {
    days,
    unlimited: days <= 0 && !isSubscriptionFeatureEnabled(subscription, "limited_logs"),
    limited: days > 0,
    entitled: Boolean(subscription) && subscription.status !== "suspended" && !isSubscriptionExpiredTrial(subscription),
    isTrialBypass: isSubscriptionTrialLike(subscription),
  };
}

export function resolveSubscriptionLimit(subscription, { maxCount = 0, usedCount = 0, featureKey = "", actionKey = "" } = {}) {
  const normalizedMax = Number(maxCount ?? 0);
  const normalizedUsed = Number(usedCount ?? 0);
  const unlimitedCapacity = normalizedMax <= 0;
  const entitlementState = getSubscriptionEntitlementState(subscription, { requiredFeature: featureKey, requiredAction: actionKey });
  const isTrialBypass = entitlementState.isTrialBypass;
  const entitled = entitlementState.entitled;

  if (!subscription) {
    return {
      canAdd: unlimitedCapacity,
      isTrialBypass: false,
      remaining: normalizedMax > 0 ? Math.max(normalizedMax - normalizedUsed, 0) : null,
      limitReached: normalizedMax > 0 && normalizedUsed >= normalizedMax,
      entitled: false,
      maxCount: normalizedMax,
      usedCount: normalizedUsed,
    };
  }

  const limitReached = normalizedMax > 0 && normalizedUsed >= normalizedMax;
  const canAdd = unlimitedCapacity || !limitReached || isTrialBypass || entitled;

  return {
    canAdd,
    isTrialBypass,
    remaining: isTrialBypass ? null : (normalizedMax > 0 ? Math.max(normalizedMax - normalizedUsed, 0) : null),
    limitReached,
    entitled,
    maxCount: normalizedMax,
    usedCount: normalizedUsed,
  };
}

export function resolveSubscriptionNamedLimit(subscription, limitKey, { usedCount = 0, featureKey = "", actionKey = "" } = {}) {
  const key = normalizeKey(limitKey);
  const aliases = LIMIT_KEY_ALIASES[key] ?? [key];
  const maxCount = readFirstNumber(subscription?.limits, aliases, 0);
  return resolveSubscriptionLimit(subscription, { maxCount, usedCount, featureKey, actionKey });
}

export function hasSubscriptionCategoryAccess(subscription, categoryKey) {
  const keys = CATEGORY_FEATURE_KEYS[normalizeKey(categoryKey)] ?? [normalizeKey(categoryKey)];
  return keys.some((key) => isSubscriptionFeatureEnabled(subscription, key));
}

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function daysBetween(now, future) {
  if (!future) return null;
  const target = new Date(future);
  if (Number.isNaN(target.getTime())) return null;
  const deltaMs = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(deltaMs / (24 * 60 * 60 * 1000)));
}

export function normalizeSubscriptionSummary(raw) {
  if (!raw) return null;

  const now = new Date();
  const expiresAt = toIsoString(raw.current_period_end ?? raw.endsAt ?? raw.ends_at ?? raw.expiresAt ?? raw.trial_ends_at ?? raw.trialEndsAt);
  const graceEndsAt = toIsoString(raw.grace_ends_at ?? raw.graceEndsAt);
  const daysToExpiry =
    Number.isFinite(Number(raw.days_to_expiry)) ? Number(raw.days_to_expiry) :
    Number.isFinite(Number(raw.daysToExpiry)) ? Number(raw.daysToExpiry) :
    daysBetween(now, expiresAt);
  const graceDaysLeft =
    Number.isFinite(Number(raw.grace_days_left)) ? Number(raw.grace_days_left) :
    Number.isFinite(Number(raw.graceDaysLeft)) ? Number(raw.graceDaysLeft) :
    daysBetween(now, graceEndsAt) ?? 0;
  const allowedActions = {
    ...DEFAULT_ALLOWED_ACTIONS,
    ...(raw.allowed_actions ?? raw.allowedActions ?? {})
  };
  const isBillPayer = Boolean(raw.is_bill_payer ?? raw.isBillPayer ?? !raw.managedByEstate);
  const status = String(raw.status ?? "inactive").trim().toLowerCase() || "inactive";
  const warningPhase =
    raw.warning_phase ??
    raw.warningPhase ??
    (status === "expiring_soon"
      ? daysToExpiry <= 4
        ? "high"
        : daysToExpiry <= 9
          ? "medium"
          : "soft"
      : null);

  const normalized = {
    ...raw,
    status,
    expiresAt,
    graceEndsAt,
    daysToExpiry,
    graceDaysLeft,
    isBillPayer,
    allowedActions,
    warningPhase,
  };

  normalized.isTrialActive = isSubscriptionTrialLike(normalized);
  normalized.isExpiredTrial = isSubscriptionExpiredTrial(normalized);
  normalized.isPaidPlan = isSubscriptionPaidPlan(normalized);
  normalized.hasFeature = (featureKey) => isSubscriptionFeatureEnabled(normalized, featureKey);
  normalized.can = (actionKey) => canPerformSubscriptionAction(normalized, actionKey);
  normalized.requiresUpgrade = (capabilityKey) => requiresSubscriptionUpgrade(normalized, capabilityKey);
  normalized.resolveLimit = (limitKey, options = {}) => resolveSubscriptionNamedLimit(normalized, limitKey, options);
  normalized.resolveRetention = (retentionKey) => resolveSubscriptionRetention(normalized, retentionKey);

  return normalized;
}

export function getSubscriptionBannerContent(subscription) {
  if (!subscription) return null;

  if (subscription.status === "grace_period") {
    const daysLeft = Number(subscription.graceDaysLeft ?? 0);
    return {
      tone: "danger",
      title: "Subscription expired, grace period active",
      message:
        daysLeft > 0
          ? `Core visitor operations still work, but premium setup actions are limited. Renew within ${daysLeft} day${daysLeft === 1 ? "" : "s"} to avoid service pause.`
          : "Core visitor operations are temporarily limited. Renew now to avoid service pause.",
      ctaLabel: subscription.isBillPayer ? "Renew Now" : "",
      icon: "alert"
    };
  }

  if (subscription.status === "suspended") {
    return {
      tone: "danger",
      title: "Service paused",
      message: "Visitor operations are paused until the subscription is renewed. Your logs and data are still safe and will return immediately after payment.",
      ctaLabel: subscription.isBillPayer ? "Reactivate" : "",
      icon: "lock"
    };
  }

  if (subscription.status === "expiring_soon") {
    const daysLeft = Number(subscription.daysToExpiry ?? 0);
    const tone = subscription.warningPhase === "high" ? "warning" : subscription.warningPhase === "medium" ? "warning" : "info";
    return {
      tone,
      title: `Subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
      message: "Renew early to avoid grace-period restrictions for gate operations, visitor responses, and premium setup tools.",
      ctaLabel: subscription.isBillPayer ? "Review Plan" : "",
      icon: "clock"
    };
  }

  return null;
}

export function getRestrictionReason(error, fallback = "") {
  if (!error) return fallback;
  return (
    error?.payload?.subscription?.restriction_reason ??
    error?.payload?.subscription?.restrictionReason ??
    error?.payload?.message ??
    error?.message ??
    fallback
  );
}
