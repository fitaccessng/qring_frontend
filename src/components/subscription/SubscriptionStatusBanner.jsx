import { AlertTriangle, Clock3, Lock } from "lucide-react";
import { getSubscriptionBannerContent } from "../../utils/subscription";

const toneClasses = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950"
};

function BannerIcon({ icon }) {
  if (icon === "lock") return <Lock size={18} className="mt-0.5 shrink-0" />;
  if (icon === "clock") return <Clock3 size={18} className="mt-0.5 shrink-0" />;
  return <AlertTriangle size={18} className="mt-0.5 shrink-0" />;
}

export default function SubscriptionStatusBanner({ subscription, onPrimaryAction }) {
  const content = getSubscriptionBannerContent(subscription);
  if (!content) return null;

  return (
    <section className={`rounded-[1.4rem] border px-4 py-4 shadow-sm ${toneClasses[content.tone] ?? toneClasses.info}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <BannerIcon icon={content.icon} />
          <div>
            <p className="text-sm font-semibold">{content.title}</p>
            <p className="mt-1 text-sm leading-6 opacity-90">{content.message}</p>
          </div>
        </div>
        {content.ctaLabel && onPrimaryAction ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {content.ctaLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
