export function showFlash(message, options = {}) {
  if (typeof window === "undefined") return;
  const detail = {
    id: options.id || "",
    dedupeKey: options.dedupeKey || "",
    type: options.type || "success",
    title: options.title || (options.type === "error" ? "Something went wrong" : "Success"),
    message,
    duration: options.duration ?? 3600,
    kind: options.kind || "",
    route: options.route || "",
    actionLabel: options.actionLabel || ""
  };
  window.dispatchEvent(new CustomEvent("qring:flash", { detail }));
}

export function showSuccess(message, options = {}) {
  showFlash(message, { ...options, type: "success", title: options.title || "Success" });
}

export function showInfo(message, options = {}) {
  showFlash(message, { ...options, type: "info", title: options.title || "Notice" });
}

export function showError(message, options = {}) {
  showFlash(message, { ...options, type: "error", title: options.title || "Something went wrong" });
}
