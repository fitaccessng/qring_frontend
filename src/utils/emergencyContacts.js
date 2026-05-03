export function parseEmergencyContact(value, index = 0) {
  const raw = String(value || "").trim();
  const parts = raw.split("|").map((item) => item.trim());
  if (parts.length >= 3) {
    const second = parts[1] || "";
    return {
      id: `contact_${index}_${slugify(parts[0] || raw)}`,
      name: parts[0] || "Unnamed Contact",
      phone: second.includes("@") ? "" : second,
      email: second.includes("@") ? second : "",
      relationship: parts[2] || "Emergency Contact",
      raw
    };
  }

  return {
    id: `contact_${index}_${slugify(raw)}`,
    name: raw || "Unnamed Contact",
    phone: "",
    email: raw.includes("@") ? raw : "",
    relationship: "Emergency Contact",
    raw
  };
}

export function formatEmergencyContact(contact) {
  const name = String(contact?.name || "").trim();
  const emailOrPhone = String(contact?.email || contact?.phone || "").trim();
  const relationship = String(contact?.relationship || "").trim();
  return [name, emailOrPhone, relationship].filter(Boolean).join(" | ");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "contact";
}
