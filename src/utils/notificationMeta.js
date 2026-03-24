const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const KIND_META = [
  {
    match: (kind) => kind.startsWith("visitor.request"),
    category: "visitor",
    title: "Visitor Request",
    priority: "critical"
  },
  {
    match: (kind) => kind.includes("approved") || kind.includes("allowed"),
    category: "access",
    title: "Access Approved",
    priority: "normal"
  },
  {
    match: (kind) => kind.includes("denied") || kind.includes("rejected"),
    category: "access",
    title: "Access Denied",
    priority: "normal"
  },
  {
    match: (kind) => kind.includes("payment"),
    category: "payment",
    title: "Payment Update",
    priority: "normal"
  },
  {
    match: (kind) => kind.includes("security") || kind.includes("alert"),
    category: "security",
    title: "Security Alert",
    priority: "critical"
  },
  {
    match: (kind) => kind.includes("system") || kind.includes("update"),
    category: "system",
    title: "System Update",
    priority: "low"
  }
];

function toRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return { message: value };
    }
  }
  return {};
}

function toDateValue(...values) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function normalizeMessage(message) {
  const text = String(message || "").trim().replace(/\s+/g, " ");
  if (!text) return "You have a new notification.";
  return text;
}

function toTitleCase(value) {
  return String(value || "")
    .split(/[._-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseNotificationPayload(payload) {
  return toRecord(payload);
}

export function getNotificationMeta(kind = "", payload = {}) {
  const safeKind = String(kind || "").toLowerCase();
  const safePayload = toRecord(payload);
  const matched = KIND_META.find((item) => item.match(safeKind));
  const category = safePayload.category || matched?.category || "system";
  const priority = safePayload.priority || matched?.priority || "normal";
  const title =
    safePayload.title ||
    safePayload.heading ||
    safePayload.subject ||
    matched?.title ||
    toTitleCase(safeKind) ||
    "Notification";

  return { category, priority, title };
}

export function normalizeNotification(raw, route = "/dashboard/notifications") {
  const payload = parseNotificationPayload(raw?.payload);
  const kind = String(raw?.kind || raw?.type || payload.kind || payload.type || "system.update").toLowerCase();
  const meta = getNotificationMeta(kind, payload);
  const createdAt = toDateValue(raw?.createdAt, raw?.created_at, raw?.timestamp, payload?.createdAt);
  const readAt = toDateValue(raw?.readAt, raw?.read_at, payload?.readAt);
  const title = String(raw?.title || meta.title || "Notification").trim();
  const message = normalizeMessage(raw?.message || raw?.body || raw?.description || payload?.message || payload?.body);
  const sessionId = String(payload?.sessionId || payload?.visitId || payload?.session_id || "").trim();
  const status = String(payload?.status || payload?.decision || "").toLowerCase();
  const canRespondToVisit = kind.startsWith("visitor.request") && Boolean(sessionId) && !["approved", "rejected", "denied"].includes(status);

  return {
    ...raw,
    id: String(raw?.id || payload?.id || `${kind}-${createdAt || Date.now()}`),
    kind,
    title,
    message,
    payload,
    createdAt,
    readAt,
    route: String(payload?.route || route || "/dashboard/notifications"),
    category: meta.category,
    priority: String(meta.priority || "normal").toLowerCase(),
    unread: !readAt,
    sessionId,
    canRespondToVisit
  };
}

export function formatRelativeNotificationTime(value) {
  if (!value) return "Just now";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Just now";

  const diffMs = timestamp - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diffMs) < hour) {
    return relativeTimeFormatter.format(Math.round(diffMs / minute) || 0, "minute");
  }
  if (Math.abs(diffMs) < day) {
    return relativeTimeFormatter.format(Math.round(diffMs / hour), "hour");
  }
  if (Math.abs(diffMs) < 7 * day) {
    return relativeTimeFormatter.format(Math.round(diffMs / day), "day");
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function getNotificationGroupLabel(value) {
  if (!value) return "Earlier";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetStart.getTime() === todayStart.getTime()) return "Today";
  if (targetStart.getTime() === yesterdayStart.getTime()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric"
  });
}

export function groupNotificationsByDate(items) {
  return items.reduce((groups, item) => {
    const label = getNotificationGroupLabel(item?.createdAt);
    const group = groups.find((entry) => entry.label === label);
    if (group) {
      group.items.push(item);
      return groups;
    }
    groups.push({ label, items: [item] });
    return groups;
  }, []);
}
