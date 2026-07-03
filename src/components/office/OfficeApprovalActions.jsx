import { BadgeCheck, Ban, UserPlus2 } from "lucide-react";

export default function OfficeApprovalActions({ onApprove, onReject, onAssign, busy = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton icon={BadgeCheck} label="Approve" tone="emerald" onClick={onApprove} disabled={busy} />
      <ActionButton icon={Ban} label="Reject" tone="rose" onClick={onReject} disabled={busy} />
      <ActionButton icon={UserPlus2} label="Assign" tone="slate" onClick={onAssign} disabled={busy} />
    </div>
  );
}

function ActionButton({ icon: Icon, label, tone, onClick, disabled }) {
  const toneClass = tone === "emerald"
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : tone === "rose"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
