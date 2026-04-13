export function getUserInitials(value, maxLetters = 2) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) return "U";

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.slice(0, maxLetters).toUpperCase();
  }

  return normalized.slice(0, maxLetters).toUpperCase();
}
