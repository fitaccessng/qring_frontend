import LandingShell from "../../components/landing/LandingShell";

const terms = [
  "Use of Qring requires valid authorization and compliance with estate access rules.",
  "Accounts are responsible for safeguarding credentials and access devices.",
  "Violation of access policies may result in suspension of service."
];

export default function TermsPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Terms</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Service terms</h1>
          <p className="mt-4 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            These highlights summarize key obligations for using Qring. Request full terms from our team for contracts.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {terms.map((item) => (
              <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </LandingShell>
  );
}
