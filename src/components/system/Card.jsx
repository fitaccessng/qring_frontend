import { motion } from "framer-motion";

export default function Card({
  children,
  className = "",
  tone = "default"
}) {
  const toneClassName =
    tone === "hero"
      ? "border-[#0d4d86]/10 bg-[linear-gradient(145deg,#0d4d86_0%,#123c62_100%)] text-white shadow-[0_24px_60px_rgba(13,77,134,0.28)]"
      : "border-white/70 bg-[#fffdf8]/88 text-slate-950 shadow-[0_16px_40px_rgba(15,23,42,0.08)]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`rounded-[1.9rem] border p-5 ${toneClassName} ${className}`}
    >
      {children}
    </motion.section>
  );
}
