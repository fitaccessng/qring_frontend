import { motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";
import StickyCTA from "./StickyCTA";

export default function AppLayout({
  header,
  navItems = [],
  children,
  stickyCta = null,
  className = ""
}) {
  const resolvedHeader =
    header && typeof header === "object" && !("type" in header) ? <Header {...header} /> : header;

  return (
    <div className={`relative min-h-[100dvh] overflow-x-hidden bg-[#f3f4ef] text-slate-950 ${className}`}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(1,76,142,0.18),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(198,126,59,0.16),_transparent_24%),linear-gradient(180deg,#f7f5ee_0%,#eef1ea_52%,#e7ece7_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.74),rgba(255,255,255,0))]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col"
      >
        {resolvedHeader}
        <main className="flex-1 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">{children}</main>
      </motion.div>

      {stickyCta ? <StickyCTA>{stickyCta}</StickyCTA> : null}
      <BottomNav items={navItems} />
    </div>
  );
}
