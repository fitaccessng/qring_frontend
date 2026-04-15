import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { X } from "lucide-react";

export default function MobileBottomSheet({
  open,
  title,
  onClose,
  children,
  footer = null, // 🔥 sticky CTA slot
  snapPoints = [0.4, 0.75, 1],
  initialSnap = 2,
  zIndex = 50,
  headerActions = null,
  contentClassName = ""
}) {
  const sheetRef = useRef(null);
  const contentRef = useRef(null);
  const y = useMotionValue(0);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);

  const resolvedSnapPoints = useMemo(
    () =>
      [...snapPoints]
        .map((p) => Math.min(Math.max(Number(p) || 0, 0.3), 1))
        .sort((a, b) => a - b),
    [snapPoints]
  );

  const sheetHeight = viewportHeight;

  // ✅ Viewport + keyboard aware
  useEffect(() => {
    const updateHeight = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(vh);
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, []);

  // ✅ Lock background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [open]);

  // ✅ Snap logic
  const snapTo = (index) => {
    const snapHeight = resolvedSnapPoints[index] * viewportHeight;
    const targetY = Math.max(sheetHeight - snapHeight, 0);

    animate(y, targetY, {
      type: "spring",
      stiffness: 320,
      damping: 35
    });

    setCurrentSnap(index);
  };

  // ✅ Open → snap
  useEffect(() => {
    if (open && viewportHeight) {
      requestAnimationFrame(() => snapTo(initialSnap));
    }
  }, [open, viewportHeight]);

  // 🔥 Dynamic snap based on content height
  useEffect(() => {
    if (!open) return;

    const el = contentRef.current;
    if (!el) return;

    const isOverflowing = el.scrollHeight > el.clientHeight;

    if (isOverflowing) {
      snapTo(resolvedSnapPoints.length - 1); // go full height
    }
  }, [open, viewportHeight]);

  // 🔥 Auto scroll inputs into view (keyboard fix)
  useEffect(() => {
    const handleFocus = (e) => {
      const target = e.target;

      if (!contentRef.current?.contains(target)) return;

      setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }, 250);
    };

    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        ref={sheetRef}
        style={{
          y,
          height: sheetHeight,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          borderTopLeftRadius: '1.75rem',
          borderTopRightRadius: '1.75rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--tw-bg-opacity,1) #fff',
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: sheetHeight }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          const velocity = info.velocity.y;
          const offset = info.offset.y;
          if (velocity > 1200 || offset > sheetHeight * 0.4) {
            onClose?.();
            return;
          }
          const distances = resolvedSnapPoints.map((p) => {
            const snapY = sheetHeight - p * viewportHeight;
            return Math.abs(y.get() - snapY);
          });
          const closest = distances.indexOf(Math.min(...distances));
          snapTo(closest);
        }}
        className="w-full max-w-[720px] flex flex-col rounded-t-[1.75rem] bg-white shadow-xl dark:bg-slate-900"
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
      >
        {/* Handle */}
        <div className="shrink-0 py-3">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-4 pb-2">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {title}
          </h3>

          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))] ${contentClassName}`}
          style={{ maxHeight: 'calc(90vh - 120px)', WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {/* Sticky Footer (CTA area) */}
        {footer && (
          <div className="shrink-0 border-t bg-white px-4 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}