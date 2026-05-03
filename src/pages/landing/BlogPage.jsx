import LandingShell from "../../components/landing/LandingShell";

const posts = [
  {
    title: "Designing calm visitor experiences",
    summary: "How we removed friction from estate entry without sacrificing security.",
    date: "Mar 2026"
  },
  {
    title: "Estate ops that scale",
    summary: "Why dues, maintenance, and resident coordination belong in one system.",
    date: "Feb 2026"
  },
  {
    title: "Realtime access without chaos",
    summary: "A look at our delivery architecture for alerts and approvals.",
    date: "Jan 2026"
  }
];

export default function BlogPage() {
  return (
    <LandingShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-10">
        <div className="rounded-[2.5rem] border border-slate-200/80 bg-white/90 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Blog</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">Insights from the Qring team</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 sm:text-base dark:text-slate-300">
            Product updates, estate operations playbooks, and security best practices.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <div key={post.title} className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{post.date}</p>
              <h3 className="mt-3 text-lg font-bold">{post.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{post.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </LandingShell>
  );
}
