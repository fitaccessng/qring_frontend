import { motion } from "framer-motion";

export default function PageWrapper({ children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`space-y-5 px-4 pb-6 pt-4 sm:px-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
