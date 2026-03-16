import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../../state/ThemeContext";
import BrandMark from "../BrandMark";

const navItems = [
  { title: "Use Cases", href: "/platform" },
  { title: "Features", href: "/platform" },
  { title: "Security", href: "/security" },
  { title: "Pricing", href: "/pricing" },
  { title: "Company", href: "/company" },
  { title: "FAQ", href: "/contact" }
];

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Security", href: "/security" },
      { label: "Pricing", href: "/pricing" },
      { label: "API Docs", href: "/api-docs" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Company", href: "/company" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" }
    ]
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Compliance", href: "/compliance" },
      { label: "Legal", href: "/legal" }
    ]
  }
];

export default function LandingShell({ children, hideHeader = false, hideFooter = false }) {
  const { isDark, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(14,116,144,0.08),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(34,197,94,0.08),transparent_40%)]" />
      {!hideHeader ? (
        <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/90">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
              </span>
              <span className="leading-tight">
                <span className="block text-xl font-black tracking-tight sm:text-2xl">Qring</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Smart Access Control
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} className="transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                  {item.title}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-full border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isDark ? "Light" : "Dark"}
              </button>
              <Link
                to="/login"
                className="hidden rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 md:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="hidden rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 md:inline-flex dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Try Qring
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="md:hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                aria-label="Toggle menu"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                  />
                </svg>
              </button>
            </div>
          </nav>

          {menuOpen ? (
            <div className="border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
              <div className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {item.title}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl border border-slate-200 px-3 py-2 text-center dark:border-slate-700"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl bg-slate-900 px-3 py-2 text-center text-white dark:bg-white dark:text-slate-900"
                >
                  Try Qring
                </Link>
              </div>
            </div>
          ) : null}
        </header>
      ) : null}

      <main className="relative">{children}</main>

      {!hideFooter ? (
        <footer className="mt-16 border-t border-slate-200/70 bg-white/90 py-12 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <BrandMark tone="light" className="h-6 w-6 dark:invert-0" />
                  </span>
                  <div>
                    <p className="text-lg font-black">Qring</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Smart Access Control</p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-sm text-slate-600 dark:text-slate-400">
                  Qring gives estates and homeowners a secure, auditable, and human-friendly way to manage access.
                </p>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                {footerGroups.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{group.title}</p>
                    <div className="mt-3 space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {group.links.map((link) => (
                        <Link key={link.href} to={link.href} className="block transition hover:text-slate-900 dark:hover:text-white">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-6 text-xs text-slate-500 dark:border-slate-800">
              <p>© {new Date().getFullYear()} Qring Technologies. All rights reserved.</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/privacy" className="hover:text-slate-700 dark:hover:text-slate-300">
                  Privacy
                </Link>
                <Link to="/terms" className="hover:text-slate-700 dark:hover:text-slate-300">
                  Terms
                </Link>
                <Link to="/compliance" className="hover:text-slate-700 dark:hover:text-slate-300">
                  Compliance
                </Link>
              </div>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

