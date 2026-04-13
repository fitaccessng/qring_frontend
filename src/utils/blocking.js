export function openBlockingModal({
  title = "Notice",
  message,
  actionLabel = "",
  actionRoute = ""
} = {}) {
  if (typeof window === "undefined") return;
  const body = String(message || "").trim();
  if (!body) return;
  window.dispatchEvent(
    new CustomEvent("qring:blocking", {
      detail: {
        title,
        message: body,
        actionLabel,
        actionRoute
      }
    })
  );
}

export function openPlanLockedModal({
  managedByEstate = false,
  estateName = "",
  featureLabel = "This feature"
} = {}) {
  const ownerLabel = managedByEstate ? (estateName || "your estate") : "your current plan";
  openBlockingModal({
    title: "Plan Restriction",
    message: managedByEstate
      ? `${featureLabel} is not available because ${ownerLabel} is not on the required plan yet. Contact the estate manager to upgrade the estate plan.`
      : `${featureLabel} is not available on your current plan yet. Upgrade your subscription to continue.`,
    actionLabel: managedByEstate ? "" : "View Billing",
    actionRoute: managedByEstate ? "" : "/billing/paywall"
  });
}
