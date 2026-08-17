import { Bell, CheckCircle2, Lock, Vote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { voteEstatePoll } from "../../services/estateService";
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

export default function HomeownerEstatePollsPage() {
  const navigate = useNavigate();
  const { rows: items, loading, refetch } = useMyEstateAlerts("poll");

  async function vote(id, index) {
    try {
      await voteEstatePoll(id, index);
      showSuccess("Vote submitted");
      refetch({ force: true });
    } catch (error) {
      showError(error?.message || "Unable to vote");
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
      title="Polls"
      onBack={() => navigate(-1)}
      action={NotificationBtn}
      rightAction={NotificationBtn}
      rightElement={NotificationBtn}
    >
      {loading ? (
        <EstateLoadingState label="Polls" />
      ) : items.length ? (
        <section>
          <EstateSectionHeader label="Ballots" count={items.length} />
          <EstateList>
            {items.map((item) => {
              const closed = item.dueDate && new Date(item.dueDate) < new Date();
              const hasVoted = item.myPollVote !== undefined && item.myPollVote !== null;
              return (
                <EstateListItem key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-black">{item.title}</h2>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <EstateStatusPill tone={closed ? "slate" : hasVoted ? "emerald" : "amber"}>
                      {closed ? "Closed" : hasVoted ? "Voted" : "Open"}
                    </EstateStatusPill>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(item.pollOptions || []).map((option, index) => {
                      const selected = item.myPollVote === index;
                      const percentage = item.pollResults?.[index]?.percent;
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={closed}
                          onClick={() => vote(item.id, index)}
                          className={`relative min-h-11 w-full overflow-hidden rounded-xl border px-3 text-left text-xs font-black transition active:scale-[0.99] disabled:cursor-not-allowed ${
                            selected
                              ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200"
                              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                          }`}
                        >
                          {percentage !== undefined ? <span className="absolute inset-y-0 left-0 bg-cyan-500/10" style={{ width: `${percentage}%` }} /> : null}
                          <span className="relative flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              {closed ? <Lock className="h-4 w-4 shrink-0 text-slate-400" /> : selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-600" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-700" />}
                              <span className="truncate">{option}</span>
                            </span>
                            {percentage !== undefined ? <span className="shrink-0 text-[11px] text-slate-500">{percentage}%</span> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </EstateListItem>
              );
            })}
          </EstateList>
        </section>
      ) : (
        <EstateEmptyState icon={Vote} title="No polls" message="Estate polls will appear here when voting opens." />
      )}
    </EstateMobilePage>
  );
}
