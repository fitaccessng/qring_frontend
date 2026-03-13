import LandingShell from "../../components/landing/LandingShell";

const apiSections = [
  {
    title: "Authentication",
    body: "Secure token-based access for estate integrations."
  },
  {
    title: "Webhooks",
    body: "Receive realtime events for payments, approvals, and visitor status."
  },
  {
    title: "Access Logs",
    body: "Query visit history with rich metadata for reporting."
  },
  {
    title: "Resident Directory",
    body: "Sync homeowner data and door assignments." 
  }
];

export default function ApiDocsPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">API Docs</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Integrate Qring with your stack.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Use the Qring API to extend access control, reporting, and estate operations into your internal systems.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2">
          {apiSections.map((item) => (
            <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <h2 className="text-2xl font-black">Request API access</h2>
          <p className="mt-2 text-sm text-white/70 dark:text-slate-600">
            Our team will help you scope endpoints, sandbox access, and rollout timelines.
          </p>
        </div>
      </section>
    </LandingShell>
  );
}
