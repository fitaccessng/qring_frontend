import LandingShell from "../../components/landing/LandingShell";

const items = [
  {
    title: "Audit Trails",
    body: "Every visit, approval, and escalation is recorded with timestamps and actors."
  },
  {
    title: "Data Retention",
    body: "Retention policies can be tuned to estate requirements and regional guidance."
  },
  {
    title: "Incident Support",
    body: "We provide logs and reporting support for investigations and regulatory reviews."
  }
];

export default function CompliancePage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Compliance</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Compliance-ready estate operations</h1>
          <p className="mt-4 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring supports auditability and reporting for regulated communities and security teams.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </LandingShell>
  );
}
