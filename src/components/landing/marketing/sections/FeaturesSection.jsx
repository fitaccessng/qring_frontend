import { Activity, Building2, Camera, CheckCircle2, ListChecks, QrCode } from "lucide-react";
import FeatureCard from "../FeatureCard";

const features = [
  {
    icon: QrCode,
    title: "QR Visitor Check-in",
    description: "Visitors request entry using QR codes at the gate. No paper, no confusion.",
  },
  {
    icon: CheckCircle2,
    title: "Instant Homeowner Approval",
    description: "Homeowners approve visitors from their phone in one tap, with full context.",
  },
  {
    icon: Camera,
    title: "Visitor Snapshot Verification",
    description: "Security receives photo confirmation to reduce impersonation and fraud.",
  },
  {
    icon: Activity,
    title: "Live Visitor Queue",
    description: "Guards see approved and waiting visitors in realtime to keep the gate moving.",
  },
  {
    icon: ListChecks,
    title: "Visitor History Logs",
    description: "Estates track visitor activity with searchable records and timestamps.",
  },
  {
    icon: Building2,
    title: "Multi-Estate Dashboard",
    description: "Property managers manage multiple estates from one unified view.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-16 dark:bg-slate-950 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Key Features</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Everything you need at the gate</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            QRing replaces manual processes with a simple, secure workflow that homeowners, managers, and guards can trust.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
      </div>
    </section>
  );
}

