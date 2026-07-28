import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Clock3, Download, Loader2, LogIn, LogOut, RefreshCw, Search, Users } from "lucide-react";
import { api, extractResponseData } from "../../../services/api";
import { useSocketQueryInvalidation } from "../../../hooks/useApi";
import { endpoints } from "../../../services/endpoints";
import OfficePageHeader from "../../../components/office/OfficePageHeader";
import { OfficeEmptyState, OfficeErrorBanner, OfficeLoadingState } from "../../../components/office/OfficeStates";
import { downloadOfficeAttendanceCsv } from "../../../services/officeService";
import { officeTabs } from "./officeNav";

const QUERY_KEY = ["office", "attendance"];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

function getLocalDateInputValue(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getDatePresetRange(preset) {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = getLocalDateInputValue(today);

  if (preset === "today") {
    return { startDate: getLocalDateInputValue(startOfToday), endDate: endOfToday };
  }

  if (preset === "week") {
    const start = new Date(startOfToday);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return { startDate: getLocalDateInputValue(start), endDate: endOfToday };
  }

  if (preset === "month") {
    const start = new Date(startOfToday);
    start.setDate(1);
    return { startDate: getLocalDateInputValue(start), endDate: endOfToday };
  }

  return { startDate: "", endDate: "" };
}

function formatTimestamp(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function getActionMeta(action) {
  const normalized = String(action || "").toLowerCase();
  if (normalized === "clock_in") {
    return {
      label: "Clock in",
      icon: <LogIn className="h-3.5 w-3.5" />,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
    };
  }
  if (normalized === "clock_out") {
    return {
      label: "Clock out",
      icon: <LogOut className="h-3.5 w-3.5" />,
      className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
    };
  }
  return {
    label: normalized || "Update",
    icon: <Clock3 className="h-3.5 w-3.5" />,
    className: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
  };
}

function AttendanceMetricCard({ label, value, helper, icon }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
          {helper ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{helper}</p> : null}
        </div>
        <div className="rounded-2xl border border-white/70 bg-white p-3 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

function AttendanceCard({ item }) {
  const actionMeta = getActionMeta(item.action);
  const department = item.employee?.department || "Department not set";
  const role = item.employee?.role || item.employee?.roleLabel || "Employee";
  const floor = item.employee?.floor ? `Floor ${item.employee.floor}` : "";
  const extension = item.employee?.extension ? `Ext. ${item.employee.extension}` : "";

  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950 dark:text-white">{item.employeeName || "Employee"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{department}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${actionMeta.className}`}>
          {actionMeta.icon}
          {actionMeta.label}
        </span>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Role</span>
          <span className="font-semibold text-slate-900 dark:text-white">{role}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Location</span>
          <span className="font-semibold text-slate-900 dark:text-white">{[floor, extension].filter(Boolean).join(" • ") || "Not set"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 dark:text-slate-400">Recorded</span>
          <span className="font-semibold text-slate-900 dark:text-white">{formatTimestamp(item.recordedAt)}</span>
        </div>
      </div>
      {item.note ? <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">{item.note}</p> : null}
    </article>
  );
}

function buildQueryParams({ search, action, startDate, endDate, page, limit }) {
  return {
    search: search || undefined,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit
  };
}

export default function OfficeAttendancePage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [datePreset, setDatePreset] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [exporting, setExporting] = useState(false);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const presetRange = getDatePresetRange(datePreset);
    if (datePreset === "custom") return;
    setStartDate(presetRange.startDate);
    setEndDate(presetRange.endDate);
  }, [datePreset]);

  const queryKey = useMemo(() => [...QUERY_KEY, search, action, startDate, endDate, pageSize], [search, action, startDate, endDate, pageSize]);

  const attendanceQuery = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get(endpoints.office.attendance, {
        params: buildQueryParams({ search, action, startDate, endDate, page: pageParam, limit: pageSize })
      });
      return extractResponseData(response);
    },
    getNextPageParam: (lastPage) => (lastPage?.pagination?.hasMore ? lastPage.pagination.nextPage : undefined),
    refetchInterval: 20000
  });

  useSocketQueryInvalidation(QUERY_KEY, [
    "office.staff.checked_in",
    "office.staff.checked_out"
  ]);

  useEffect(() => {
    if (!loadMoreRef.current || !attendanceQuery.hasNextPage) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && attendanceQuery.hasNextPage && !attendanceQuery.isFetchingNextPage) {
          attendanceQuery.fetchNextPage();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [attendanceQuery.fetchNextPage, attendanceQuery.hasNextPage, attendanceQuery.isFetchingNextPage]);

  const pages = attendanceQuery.data?.pages || [];
  const rows = pages.flatMap((page) => page?.items || []);
  const metrics = pages[0]?.metrics || {};
  const pagination = pages[pages.length - 1]?.pagination || pages[0]?.pagination || null;

  async function handleExport() {
    setExporting(true);
    try {
      await downloadOfficeAttendanceCsv({ search, action, startDate, endDate });
    } finally {
      setExporting(false);
    }
  }

  if (attendanceQuery.isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 px-4 py-6 sm:px-6 lg:px-8">
        <OfficeLoadingState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-10">
        {attendanceQuery.isError ? (
          <OfficeErrorBanner
            message={attendanceQuery.error?.message || "Unable to load attendance logs."}
            onRetry={() => attendanceQuery.refetch()}
          />
        ) : null}

        <OfficePageHeader
          title="Attendance"
          subtitle="Browse the office clock-in and clock-out log table with date filters, CSV export, and endless scrolling."
          tabs={officeTabs}
          actions={[
            <button
              key="export"
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              CSV
            </button>,
            <button
              key="refresh"
              type="button"
              onClick={() => attendanceQuery.refetch()}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          ]}
        />

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Filters</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Narrow results by staff, action, and date range</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value)}
              className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom range</option>
            </select>
            <label className="relative block">
              <span className="sr-only">Search attendance</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff, notes, department..."
                className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All actions</option>
              <option value="clock_in">Clock in</option>
              <option value="clock_out">Clock out</option>
            </select>
            <label className="block">
              <span className="sr-only">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setDatePreset("custom");
                  setStartDate(event.target.value);
                }}
                className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="sr-only">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setDatePreset("custom");
                  setEndDate(event.target.value);
                }}
                className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="sr-only">Page size</span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value) || 50)}
                className="w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AttendanceMetricCard label="Matching logs" value={String(metrics.total ?? rows.length)} helper={`Showing ${rows.length} loaded record${rows.length === 1 ? "" : "s"}`} icon={<Clock3 className="h-5 w-5" />} />
          <AttendanceMetricCard label="Clock-ins" value={String(metrics.clockIns ?? 0)} helper="Inbound staff activity" icon={<LogIn className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />} />
          <AttendanceMetricCard label="Clock-outs" value={String(metrics.clockOuts ?? 0)} helper="Outbound staff activity" icon={<LogOut className="h-5 w-5 text-amber-600 dark:text-amber-300" />} />
          <AttendanceMetricCard label="Unique staff" value={String(metrics.uniqueEmployees ?? 0)} helper="Distinct employees in this result set" icon={<Users className="h-5 w-5 text-brand-600" />} />
        </div>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">Attendance Log</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pagination?.total != null ? `${rows.length} loaded of ${pagination.total} matching records` : `${rows.length} records loaded`}
            </p>
          </div>
          {rows.length > 0 ? (
            <>
              <div className="grid gap-3 md:hidden">
                {rows.map((item) => (
                  <AttendanceCard key={item.id} item={item} />
                ))}
              </div>
              <div className="hidden overflow-hidden rounded-[1.6rem] border border-slate-200 dark:border-slate-800 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950/40">
                    <tr className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      <th scope="col" className="px-4 py-3">Employee</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                      <th scope="col" className="px-4 py-3">Department</th>
                      <th scope="col" className="px-4 py-3">Note</th>
                      <th scope="col" className="px-4 py-3">Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {rows.map((item) => {
                      const actionMeta = getActionMeta(item.action);
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="font-bold text-slate-950 dark:text-white">{item.employeeName || "Employee"}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {item.employee?.role || item.employee?.roleLabel || "Employee"}
                              {item.employee?.floor ? ` • Floor ${item.employee.floor}` : ""}
                              {item.employee?.extension ? ` • Ext. ${item.employee.extension}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${actionMeta.className}`}>
                              {actionMeta.icon}
                              {actionMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                            <div className="font-semibold text-slate-900 dark:text-white">{item.employee?.department || "Department not set"}</div>
                            <div className="mt-1 text-slate-500 dark:text-slate-400">{item.source || "qr_scan"}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {item.note ? item.note : <span className="text-slate-400">No note</span>}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatTimestamp(item.recordedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div ref={loadMoreRef} className="flex flex-col items-center gap-3 pt-4">
                {attendanceQuery.isFetchingNextPage ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more records...
                  </div>
                ) : attendanceQuery.hasNextPage ? (
                  <button
                    type="button"
                    onClick={() => attendanceQuery.fetchNextPage()}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-500/30 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Loader2 className="h-4 w-4" />
                    Load more
                  </button>
                ) : (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">You’ve reached the end of this attendance history.</p>
                )}
              </div>
            </>
          ) : (
            <OfficeEmptyState
              title="No attendance logs yet"
              description="Clock-in and clock-out actions from the QR flow will appear here as staff use the office entry page."
            />
          )}
        </section>
      </div>
    </div>
  );
}
