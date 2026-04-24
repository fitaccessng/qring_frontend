import { useEffect, useRef, useState } from "react";
import { animate, useDragControls, useMotionValue } from "framer-motion";

export default function useResponsiveSheet({
  open,
  onClose,
  closeOffset = 120,
  closeVelocity = 500
}) {
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const contentRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const updateViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(height);
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const startHeight = viewportHeight || window.innerHeight || 0;
    y.set(startHeight);
    requestAnimationFrame(() => {
      animate(y, 0, {
        type: "spring",
        stiffness: 260,
        damping: 28
      });
    });
  }, [open, viewportHeight, y]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const animateToRest = () =>
    animate(y, 0, {
      type: "spring",
      stiffness: 260,
      damping: 28
    });

  const mobileSheetProps = {
    style: {
      y,
      height: viewportHeight || undefined
    },
    drag: "y",
    dragControls,
    dragListener: false,
    dragConstraints: { top: 0, bottom: viewportHeight || 0 },
    dragElastic: 0.08,
    onDragEnd: (_, info) => {
      if (info.offset.y > closeOffset || info.velocity.y > closeVelocity) {
        onClose?.();
        return;
      }
      animateToRest();
    }
  };

  return {
    contentRef,
    dragControls,
    isMobile,
    mobileSheetProps,
    startDrag: (event) => dragControls.start(event),
    viewportHeight,
    onContentScroll: (event) => setAtTop(event.currentTarget.scrollTop <= 0),
    onContentPointerDown: (event) => {
      if (atTop) dragControls.start(event);
    }
  };
}
