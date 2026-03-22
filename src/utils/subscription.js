const DEFAULT_ALLOWED_ACTIONS = {
  view_dashboard: true,
  renew_subscription: true
};

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

  return {
    ...raw,
    status,
    expiresAt,
    graceEndsAt,
    daysToExpiry,
    graceDaysLeft,
    isBillPayer,
    allowedActions,
    warningPhase,
    can: (actionKey) => {
      if (!actionKey) return true;
      return allowedActions[actionKey] !== false;
    }
  };
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
