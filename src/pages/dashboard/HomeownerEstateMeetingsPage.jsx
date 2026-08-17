import { useMemo } from "react";
import { Bell, CalendarDays, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { respondEstateMeeting } from "../../services/estateService";
import { useMyEstateAlerts } from "../../hooks/useMyEstateAlerts";
import { showError, showSuccess } from "../../utils/flash";
import {
  EstateEmptyState,
  EstateList,
  EstateListItem,
  EstateLoadingState,
  EstateMobilePage,
  EstateSectionHeader,
  EstateStatusPill
} from "../../components/homeowner/HomeownerEstateMobileUI";

export default function HomeownerEstateMeetingsPage() {
  const navigate = useNavigate();
  const { rows: meetings, loading, refetch } = useMyEstateAlerts("meeting");

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: meetings.filter((item) => !item.dueDate || new Date(item.dueDate).getTime() >= now),
      past: meetings.filter((item) => item.dueDate && new Date(item.dueDate).getTime() < now)
    };
  }, [meetings]);

  async function respond(id, response) {
    try {
      await respondEstateMeeting(id, response);
      showSuccess("Attendance response recorded");
      refetch({ force: true });
    } catch (error) {
      showError(error?.message || "Unable to respond");
    }
  }

  const NotificationBtn = (
    <button
      type="button"
      onClick={() => navigate("/dashboard/notifications")}
      aria-label="Notifications"
      className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
    >
      <Bell className="h-5 w-5" />
    </button>
  );

  return (
    <EstateMobilePage
      title="Meetings"
      onBack={() => navigate(-1)}
      action={NotificationBtn}
      rightAction={NotificationBtn}
      rightElement={NotificationBtn}
    >
      {loading ? (
        <EstateLoadingState label="Meetings" />
      ) : meetings.length ? (
        <div className="space-y-5">
          <MeetingSection label="Upcoming" rows={grouped.upcoming} onRespond={respond} />
          <MeetingSection label="Past" rows={grouped.past} onRespond={respond} past />
        </div>
      ) : (
        <EstateEmptyState icon={CalendarDays} title="No meetings" message="Estate meeting invites and updates will appear here." />
      )}
    </EstateMobilePage>
  );
}

function MeetingSection({ label, rows, onRespond, past = false }) {
  if (!rows.length) return null;
  return (
    <section>
      <EstateSectionHeader label={label} count={rows.length} />
      <EstateList>
        {rows.map((item) => {
          const attending = item.myMeetingResponse === "attending";
          const declining = item.myMeetingResponse === "not_attending";
          return (
            <EstateListItem key={item.id} className={past ? "opacity-70" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black">{item.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{formatDateTime(item.dueDate)}</p>
                </div>
                {attending || declining ? <EstateStatusPill tone={attending ? "emerald" : "rose"}>{attending ? "Attending" : "Declined"}</EstateStatusPill> : <EstateStatusPill tone="amber">RSVP</EstateStatusPill>}
              </div>
              {!past ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onRespond(item.id, "attending")} className={`min-h-10 rounded-xl text-xs font-black ${attending ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                    <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" /> Attending</span>
                  </button>
                  <button type="button" onClick={() => onRespond(item.id, "not_attending")} className={`min-h-10 rounded-xl text-xs font-black ${declining ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                    <span className="inline-flex items-center gap-1"><X className="h-4 w-4" /> Decline</span>
                  </button>
                </div>
              ) : null}
            </EstateListItem>
          );
        })}
      </EstateList>
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return "Schedule pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule pending";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
