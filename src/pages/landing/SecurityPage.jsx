import LandingShell from "../../components/landing/LandingShell";

const safeguards = [
  {
    title: "Scoped permissions",
    body: "Role-based access ensures residents and admins only see what they should."
  },
  {
    title: "Encrypted sessions",
    body: "All realtime events and session data are encrypted in transit."
  },
  {
    title: "Audit-ready logs",
    body: "Every action is captured for compliance and investigations."
  },
  {
    title: "Secure QR routing",
    body: "Entry QR codes are validated server-side with strict rules."
  }
];

export default function SecurityPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Security</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Privacy-first, audit-ready access.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Qring is built with security layers that keep resident data protected and access decisions traceable.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 md:grid-cols-2">
          {safeguards.map((item) => (
            <div key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:p-10">
          <h2 className="text-2xl font-black">Security reviews and compliance support</h2>
          <p className="mt-2 text-sm text-white/70 dark:text-slate-600">
            Need documentation for your auditors? We provide deployment and data handling guidance on request.
          </p>
        </div>
      </section>
    </LandingShell>
  );
}
