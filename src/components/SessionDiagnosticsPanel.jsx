export default function SessionDiagnosticsPanel({ diagnostics, networkQuality = "good" }) {
  if (!diagnostics) return null;

  const rtt = diagnostics.roundTripTimeMs != null ? `${diagnostics.roundTripTimeMs} ms` : "-";
  const jitter = diagnostics.jitterMs != null ? `${diagnostics.jitterMs} ms` : "-";
  const loss = diagnostics.packetLoss != null ? String(diagnostics.packetLoss) : "-";
  const rttRisk = riskByThreshold(diagnostics.roundTripTimeMs, 300, 500);
  const jitterRisk = riskByThreshold(diagnostics.jitterMs, 30, 60);
  const lossRisk = riskByThreshold(diagnostics.packetLoss, 10, 30);
  const iceRisk =
    diagnostics.iceConnectionState === "failed" || diagnostics.iceConnectionState === "disconnected"
      ? "critical"
      : diagnostics.iceConnectionState === "checking"
        ? "risky"
        : "healthy";
  const connRisk =
    diagnostics.connectionState === "failed" || diagnostics.connectionState === "disconnected"
      ? "critical"
      : diagnostics.connectionState === "connecting"
        ? "risky"
        : "healthy";
  const candidateRisk =
    networkQuality === "slow" &&
    diagnostics.localCandidateType !== "relay" &&
    diagnostics.remoteCandidateType !== "relay"
      ? "risky"
      : "healthy";
  const hints = buildHints({ diagnostics, networkQuality, rttRisk, jitterRisk, lossRisk, candidateRisk, iceRisk });

  return (
    <section className="mt-3 rounded-2xl border border-cyan-400/25 bg-slate-950/45 p-3 text-xs text-slate-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">Call Diagnostics</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <DiagItem label="Conn" value={diagnostics.connectionState} risk={connRisk} />
        <DiagItem label="ICE" value={diagnostics.iceConnectionState} risk={iceRisk} />
        <DiagItem label="Signal" value={diagnostics.signalingState} />
        <DiagItem label="Local Cand" value={diagnostics.localCandidateType} risk={candidateRisk} />
        <DiagItem label="Remote Cand" value={diagnostics.remoteCandidateType} risk={candidateRisk} />
        <DiagItem label="RTT" value={rtt} risk={rttRisk} />
        <DiagItem label="Jitter" value={jitter} risk={jitterRisk} />
        <DiagItem label="Packets Lost" value={loss} risk={lossRisk} />
      </div>
      {hints.length > 0 ? (
        <div className="mt-3 space-y-1">
          {hints.map((hint) => (
            <p key={hint} className="rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] text-amber-200">
              {hint}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] text-emerald-200">
          Connection quality is healthy.
        </p>
      )}
    </section>
  );
}

function DiagItem({ label, value, risk = "healthy" }) {
  const riskTone =
    risk === "critical"
      ? "border-rose-400/35 bg-rose-500/10 text-rose-100"
      : risk === "risky"
        ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
        : "border-emerald-400/35 bg-emerald-500/10 text-emerald-100";

  return (
    <div className={`rounded-lg border px-2 py-1.5 ${riskTone}`}>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-semibold">{value}</p>
    </div>
  );
}

function riskByThreshold(value, risky, critical) {
  if (typeof value !== "number") return "healthy";
  if (value >= critical) return "critical";
  if (value >= risky) return "risky";
  return "healthy";
}

function buildHints({ diagnostics, networkQuality, rttRisk, jitterRisk, lossRisk, candidateRisk, iceRisk }) {
  const hints = [];

  if (iceRisk === "critical") {
    hints.push("ICE connection is unstable. Check TURN reachability and internet stability.");
  }
  if (candidateRisk === "risky") {
    hints.push("No relay candidate selected under slow network. Force TURN fallback for better reliability.");
  }
  if (rttRisk === "critical" || jitterRisk === "critical" || lossRisk === "critical") {
    hints.push("Media quality is poor. Switch to audio-only and keep low-bandwidth mode enabled.");
  } else if (rttRisk === "risky" || jitterRisk === "risky" || lossRisk === "risky") {
    hints.push("Network is degrading. Reduce video quality or move closer to a stronger connection.");
  }
  if (networkQuality === "slow" && diagnostics.remoteCandidateType === "relay") {
    hints.push("Relay path is active. Expect higher latency but more stable connectivity.");
  }

  return hints;
}
