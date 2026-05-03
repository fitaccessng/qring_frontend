import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "For Estates", href: "#for-estates" },
  { label: "Pricing", href: "#pricing" },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b backdrop-blur",
        scrolled
          ? "border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70"
          : "border-transparent bg-white/40 dark:bg-slate-950/40",
      ].join(" ")}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-soft dark:bg-white dark:text-slate-950">
            <span className="text-lg font-black tracking-tight">Q</span>
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-black tracking-tight text-slate-950 dark:text-white">QRing</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Visitor Management
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
          {navLinks.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 md:inline-flex dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="hidden items-center rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-700 md:inline-flex"
          >
            Get Started <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 md:hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
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
        <div className="border-t border-slate-200/70 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <div className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-3 py-2 transition hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                {item.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block rounded-2xl border border-slate-200 px-3 py-2 text-center dark:border-slate-800">
              Login
            </Link>
            <Link
              to="/signup"
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl bg-brand-600 px-3 py-2 text-center text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

