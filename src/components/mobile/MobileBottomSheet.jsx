import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, animate, useTransform } from "framer-motion";
import { X } from "lucide-react";

export default function MobileBottomSheet({
  open,
  title,
  onClose,
  children,
  footer = null,
  snapPoints = [0.4, 0.8, 0.96], // Using 0.96 to leave a small gap at top for "sheet" feel
  initialSnap = 1,
  zIndex = 50,
  headerActions = null,
  contentClassName = ""
}) {
  const contentRef = useRef(null);
  const y = useMotionValue(0);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);

  const resolvedSnapPoints = useMemo(
    () => [...snapPoints].sort((a, b) => a - b),
    [snapPoints]
  );

  // ✅ 1. Real-time Viewport Tracking
  useEffect(() => {
    const updateHeight = () => {
      // visualViewport is much more accurate for mobile keyboards/resizing
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
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

  // ✅ 2. Precise Snap Function
  const snapTo = (index) => {
    const snapPercentage = resolvedSnapPoints[index];
    const targetY = viewportHeight - viewportHeight * snapPercentage;

    animate(y, targetY, {
      type: "spring",
      stiffness: 350,
      damping: 35,
      restDelta: 0.5
    });
  };

  // ✅ 3. Auto-fit logic on Open
  useEffect(() => {
    if (open && viewportHeight) {
      // Small timeout to ensure DOM is painted
      const timer = setTimeout(() => {
        const content = contentRef.current;
        const isLong = content && content.scrollHeight > viewportHeight * 0.4;
        snapTo(isLong ? resolvedSnapPoints.length - 1 : initialSnap);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [open, viewportHeight]);

  // ✅ 4. Body Scroll Lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  // 5. Opacity Backdrop Animation
  const backdropOpacity = useTransform(y, [viewportHeight, viewportHeight * 0.5], [0, 1]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex justify-center" style={{ zIndex }}>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ opacity: backdropOpacity }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: viewportHeight }}
        dragElastic={0.05} // Low elasticity prevents "glitching" on scroll
        style={{ 
          y, 
          height: viewportHeight, // Forces the container to match the actual viewable area
          bottom: 0,
          position: 'absolute'
        }}
        onDragEnd={(_, info) => {
          const velocity = info.velocity.y;
          const offset = info.offset.y;

          if (velocity > 500 || offset > viewportHeight * 0.3) {
            onClose();
          } else {
            // Find closest snap point based on final position
            const currentY = y.get();
            const distances = resolvedSnapPoints.map(p => 
              Math.abs(currentY - (viewportHeight - viewportHeight * p))
            );
            snapTo(distances.indexOf(Math.min(...distances)));
          }
        }}
        className="w-full max-w-[720px] flex flex-col rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* Handle Bar Area */}
        <div className="shrink-0 pt-3 pb-1 cursor-grab active:cursor-grabbing">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header: Fixed Height */}
        <header className="flex shrink-0 items-center justify-between px-6 py-3 border-b border-slate-50 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content: Flexible & Scrollable */}
        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto px-6 py-4 overscroll-contain touch-pan-y ${contentClassName}`}
          // This allows scrolling even when the sheet is being dragged
          onPointerDown={(e) => e.stopPropagation()} 
        >
          {/* Use a wrapper to ensure height is calculated correctly */}
          <div className="min-h-full w-full pb-10">
            {children}
          </div>
        </div>

        {/* Footer: Fixed Height */}
        {footer && (
          <footer className="shrink-0 border-t border-slate-50 bg-white/95 backdrop-blur px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900 dark:border-slate-800">
            {footer}
          </footer>
        )}
      </motion.div>
    </div>
  );
}