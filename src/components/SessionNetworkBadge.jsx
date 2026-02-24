const badgeStyles = {
  good: "bg-emerald-100 text-emerald-800",
  slow: "bg-amber-100 text-amber-800",
  reconnecting: "bg-slate-200 text-slate-700"
};

const labels = {
  good: "Good",
  slow: "Slow",
  reconnecting: "Reconnecting"
};

export default function SessionNetworkBadge({
  quality = "reconnecting",
  detail = "",
  detailClassName = "text-slate-500"
}) {
  const tone = badgeStyles[quality] || badgeStyles.reconnecting;
  const label = labels[quality] || labels.reconnecting;

  return (
    <div className="mt-2">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
        Network: {label}
      </span>
      {detail ? <p className={`mt-1 text-xs ${detailClassName}`}>{detail}</p> : null}
    </div>
  );
}
