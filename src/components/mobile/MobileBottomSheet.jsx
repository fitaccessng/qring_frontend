import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  animate,
  useDragControls,
} from "framer-motion";
import { X } from "lucide-react";

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
}) {
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const contentRef = useRef(null);

  const [vh, setVh] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const [atTop, setAtTop] = useState(true);

  // ✅ TRUE viewport height (fixes mobile bugs)
  useEffect(() => {
    const update = () => {
      const height =
        window.visualViewport?.height || window.innerHeight;

      setVh(height);
      setIsMobile(window.innerWidth < 768);
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // ✅ open/close animation
  useEffect(() => {
    if (open) {
      y.set(vh);
      requestAnimationFrame(() => {
        animate(y, 0, {
          type: "spring",
          stiffness: 260,
          damping: 28,
        });
      });
    } else {
      animate(y, vh);
    }
  }, [open, vh]);

  // ✅ lock scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => (document.body.style.overflow = "");
    }
  }, [open]);

  // ✅ ESC support
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  // ======================
  // 💻 DESKTOP MODAL
  // ======================
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="
            relative w-full max-w-lg 
            bg-white rounded-2xl shadow-xl 
            flex flex-col overflow-hidden
            max-h-[90dvh]
          "
        >
          <div className="flex justify-between p-4 border-b">
            <h3>{title}</h3>
            <button onClick={onClose}>
              <X />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            {children}
          </div>

          {footer && (
            <div className="p-4 border-t">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ======================
  // 📱 MOBILE SHEET (ELITE)
  // ======================
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ height: vh }}
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <motion.div
        style={{
          y,
          height: vh, // 🔥 CRITICAL FIX
        }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: vh }}
        dragElastic={0.08}
        onDragEnd={(e, info) => {
          if (info.offset.y > 120 || info.velocity.y > 500) {
            onClose();
          } else {
            animate(y, 0, {
              type: "spring",
              stiffness: 260,
              damping: 28,
            });
          }
        }}
        className="
          w-full bg-white 
          rounded-t-[20px]
          shadow-xl
          flex flex-col
          overflow-hidden
        "
      >
        {/* HANDLE */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="py-3 flex justify-center"
        >
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* HEADER */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex justify-between items-center px-4 pb-3"
        >
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* CONTENT (ONLY SCROLL AREA) */}
        <div
          ref={contentRef}
          onScroll={(e) =>
            setAtTop(e.currentTarget.scrollTop <= 0)
          }
          onPointerDown={(e) => {
            if (atTop) dragControls.start(e);
          }}
          className="
            flex-1 overflow-y-auto 
            px-4 pb-4 
            overscroll-contain
          "
        >
          {children}
        </div>

        {/* FOOTER (ALWAYS VISIBLE) */}
        {footer && (
          <div
            className="
              border-t p-4 
              bg-white
            "
          >
            {footer}
          </div>
        )}

        {/* SAFE AREA */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </motion.div>
    </div>
  );
}
