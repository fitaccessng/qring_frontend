import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function Header({
  title,
  subtitle = "",
  leading = null,
  trailing = null,
  backTo = "",
  status = ""
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-[#f7f5ee]/85 px-4 pb-4 pt-[calc(0.85rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        {backTo ? (
          <Link
            to={backTo}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : leading ? (
          leading
        ) : null}

        <div className="min-w-0 flex-1">
          {subtitle ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">{subtitle}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <h1 className="truncate font-heading text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#08233c]">
              {title}
            </h1>
            {status ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                {status}
              </span>
            ) : null}
          </div>
        </div>

        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </motion.div>
    </header>
  );
}
