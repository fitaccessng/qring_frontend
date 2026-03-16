import { Link } from "react-router-dom";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Security", href: "#trust" },
      { label: "Support", to: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "Careers", to: "/careers" },
      { label: "Blog", to: "/blog" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Compliance", to: "/compliance" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white py-14 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-soft dark:bg-white dark:text-slate-950">
                <span className="text-lg font-black tracking-tight">Q</span>
              </span>
              <div>
                <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">QRing</p>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Smart Visitor Access</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              QRing helps estates replace gate logbooks with a fast, secure, and auditable visitor approval flow.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{col.title}</p>
                <div className="mt-4 space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {col.links.map((l) =>
                    l.to ? (
                      <Link key={l.label} to={l.to} className="block transition hover:text-slate-950 dark:hover:text-white">
                        {l.label}
                      </Link>
                    ) : (
                      <a key={l.label} href={l.href} className="block transition hover:text-slate-950 dark:hover:text-white">
                        {l.label}
                      </a>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-500 dark:border-slate-800">
          <p>© {new Date().getFullYear()} QRing. All rights reserved.</p>
          <div className="flex items-center gap-3">
            {[
              { label: "X", href: "#" },
              { label: "LinkedIn", href: "#" },
              { label: "YouTube", href: "#" },
            ].map((s) => (
              <a key={s.label} href={s.href} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

