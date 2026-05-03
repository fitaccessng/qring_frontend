import LandingShell from "../../components/landing/LandingShell";

const leadership = [
  { name: "Operations", detail: "Estate deployment & customer success" },
  { name: "Engineering", detail: "Realtime infrastructure & platform" },
  { name: "Product", detail: "Experience design & workflows" }
];

export default function CompanyPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Company</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Building calm, secure access experiences.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring is focused on modern estate operations, protecting communities while simplifying daily access workflows.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {leadership.map((item) => (
            <div key={item.name} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{item.name}</p>
              <p className="mt-3 text-lg font-bold">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <h2 className="text-2xl font-black">Join the Qring mission</h2>
          <p className="mt-2 text-sm text-white/70 dark:text-slate-600">We are hiring operators, engineers, and community builders.</p>
        </div>
      </section>
    </LandingShell>
  );
}
