const STYLE_MAP = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  checked_in: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  checked_out: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  available: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  busy: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  offline: "bg-slate-500/10 text-slate-700 dark:text-slate-300"
};

export default function OfficeStatusPill({ label }) {
  const normalized = String(label || "").trim().toLowerCase().replace(/\s+/g, "_");
  return (
    <span className={[
      "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em]",
      STYLE_MAP[normalized] || "bg-brand-500/10 text-brand-700 dark:text-brand-300"
    ].join(" ")}>
      {String(label || "update").replace(/_/g, " ")}
    </span>
  );
}
