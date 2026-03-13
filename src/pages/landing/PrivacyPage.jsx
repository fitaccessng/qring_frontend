import LandingShell from "../../components/landing/LandingShell";

const privacyPoints = [
  "We collect only the data required to verify visits and operate estate workflows.",
  "Access logs are retained for auditability and can be exported on request.",
  "We never sell resident or visitor data to third parties."
];

export default function PrivacyPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Privacy</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Your data stays protected.</h1>
          <p className="mt-4 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring is built with privacy-first defaults and transparent data handling.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {privacyPoints.map((item) => (
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
