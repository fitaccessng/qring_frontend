import { Clock3, Phone, Video } from "lucide-react";
import SecureSnapshotImage from "../../components/SecureSnapshotImage";
import OfficeStatusPill from "./OfficeStatusPill";

export default function OfficeQueueRow({ item, actions }) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50 lg:flex-row lg:items-center lg:justify-between">
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
            <OfficeStatusPill label={item.status || item.rawStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {item.company || "Visitor"}{item.department ? ` · ${item.department}` : ""}{item.requestedStaffName ? ` · ${item.requestedStaffName}` : ""}{item.assignedStaffName ? ` → ${item.assignedStaffName}` : ""}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.purpose || "Office visit"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">{item.visitorPhone || "No phone"}</span>
            <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">{item.hostName || item.requestedStaffName || "Reception"}</span>
            <span className="rounded-full bg-white px-3 py-1 dark:bg-slate-900">{formatTime(item.time)}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
          <Clock3 className="h-3.5 w-3.5" />
          {formatTime(item.time)}
        </span>
      </div>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
