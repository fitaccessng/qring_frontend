import { Clock3 } from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import OfficeStatusPill from "./OfficeStatusPill";

export default function OfficeVisitorRow({ item, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex w-full flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-brand-500/25 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-900 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex min-w-0 gap-4">
        <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800">
          <SecureSnapshotImage
            src={item.snapshotUrl}
            alt={item.visitorName || "Visitor snapshot"}
            className="h-20 w-20 object-cover"
            fallback={<div className="grid h-20 w-20 place-items-center bg-slate-100 text-slate-400" />}
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-black text-slate-950 dark:text-white">{item.visitorName}</p>
            <OfficeStatusPill label={item.statusLabel || item.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {item.company || "Visitor"}{item.department ? ` · ${item.department}` : ""}{item.employeeToVisit ? ` · ${item.employeeToVisit}` : ""}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.purpose || "Office visit"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Clock3 className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{formatTime(item.time)}</span>
      </div>
    </Wrapper>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
