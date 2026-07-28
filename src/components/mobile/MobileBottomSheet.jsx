import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}) {
  const [isMobile, setIsMobile] = useState(true);

  // Handle responsive check purely on mount/resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [open]);

  // ESC key support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (open && e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex justify-center items-end md:items-center">
          {/* Backdrop Blur & Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {isMobile ? (
            /* ========================================== */
            /* 📱 MOBILE BOTTOM SHEET                     */
            /* ========================================== */
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="
                relative w-full max-h-[92dvh] 
                bg-white dark:bg-slate-900 rounded-t-[24px] shadow-2xl 
                flex flex-col overflow-hidden 
                isolate z-10
              "
            >
              {/* Premium Pill Indicator */}
              <div className="pt-3 pb-2 flex justify-center w-full">
                <div className="w-12 h-1 bg-neutral-200 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex justify-between items-center px-5 pb-4 pt-1">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <button 
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="p-1.5 rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 pb-6 text-neutral-600 dark:text-slate-300 overscroll-contain">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-neutral-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 sticky bottom-0">
                  {footer}
                </div>
              )}

              {/* iOS Safe Area Padding */}
              <div className="h-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-900" />
            </motion.div>
          ) : (
            /* ========================================== */
            /* 💻 DESKTOP MODAL                           */
            /* ========================================== */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="
                relative w-full max-w-lg max-h-[85dvh] 
                bg-white dark:bg-slate-900 rounded-2xl shadow-2xl 
                flex flex-col overflow-hidden 
                isolate z-10 m-4
              "
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-neutral-100 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <button 
                  type="button"
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="p-1.5 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 text-neutral-600 dark:text-slate-300">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="p-4 border-t border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-900">
                  {footer}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
