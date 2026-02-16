import { useState } from "react";

export default function BrandMark({ className = "", tone = "dark", alt = "Qring" }) {
  const [failed, setFailed] = useState(false);
  const toneClass = tone === "light" ? "invert" : "";

  if (failed) {
    // Fallback so the UI isn't blank if the asset isn't present.
    return (
      <span
        aria-label={alt}
        className={`grid place-items-center rounded-md bg-slate-900 text-white ${className}`}
      >
        Q
      </span>
    );
  }

  return (
    <img
      src="/qring_logo.png"
      alt={alt}
      className={`${toneClass} ${className}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}

