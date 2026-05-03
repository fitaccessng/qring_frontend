import LandingShell from "../../components/landing/LandingShell";

const roles = [
  { title: "Customer Success Lead", location: "Lagos, Hybrid" },
  { title: "Frontend Engineer", location: "Remote" },
  { title: "Implementation Manager", location: "Abuja, Onsite" }
];

export default function CareersPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Careers</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Help us build modern estate access.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            We are growing a team that cares about calm operations, security, and community trust.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="grid gap-4">
          {roles.map((role) => (
            <div key={role.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-lg font-bold">{role.title}</p>
              <p className="mt-2 text-sm text-slate-500">{role.location}</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                Email careers@useqring.online with your resume and a short intro.
              </p>
            </div>
          ))}
        </div>
      </section>
    </LandingShell>
  );
}
