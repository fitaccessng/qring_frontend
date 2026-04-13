import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const defaultNavLinks = [
  { label: "About", to: "/about" },
  { label: "How it Works", to: "/#how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "Use Cases", to: "/#use-cases" },
  { label: "Contact", to: "/contact" }
];

export default function LandingPageNavbar({ navLinks = defaultNavLinks }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const previousBodyOverflowRef = useRef("");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    previousBodyOverflowRef.current = document.body.style.overflow;
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflowRef.current;
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/75 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="font-heading text-2xl font-extrabold tracking-[-0.06em] text-slate-950"
        >
          QRing
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="font-heading text-sm font-bold tracking-tight text-slate-600 transition hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/signup"
            className="rounded-2xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/90 p-2.5 text-slate-700 transition hover:bg-slate-50 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        id="landing-mobile-menu"
        className={[
          "overflow-hidden border-t border-white/40 bg-white/95 px-4 transition-[max-height,opacity] duration-200 md:hidden",
          menuOpen ? "max-h-screen py-4 opacity-100" : "max-h-0 py-0 opacity-0",
        ].join(" ")}
      >
        <div className="space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 font-heading text-sm font-bold tracking-tight text-slate-700 transition hover:bg-slate-100 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/signup"
            onClick={() => setMenuOpen(false)}
            className="block rounded-2xl bg-[linear-gradient(135deg,#00346f_0%,#004a99_100%)] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.12em] text-white"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
