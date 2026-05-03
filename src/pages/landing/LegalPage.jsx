import LandingShell from "../../components/landing/LandingShell";

const items = [
  { title: "Company details", body: "Qring Technologies operates software and services for estates and homeowners." },
  { title: "Intellectual property", body: "All platform assets, trademarks, and software are protected by applicable laws." },
  { title: "Service availability", body: "We maintain 99.9% uptime targets and communicate maintenance windows in advance." }
];

export default function LegalPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Legal</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Legal information</h1>
          <p className="mt-4 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            This page summarizes our legal positioning and ownership guidelines. For detailed terms, see the linked policies.
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
