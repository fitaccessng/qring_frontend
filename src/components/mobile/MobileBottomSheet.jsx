import { useEffect } from "react";
import { X } from "lucide-react";

export default function MobileBottomSheet({
  open,
  title,
  onClose,
  children,
  width = "720px",
  height = "94dvh",
  zIndex = 50,
  contentClassName = "",
  headerActions = null
}) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-center overflow-y-auto bg-slate-950/55 px-3 pt-6 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_28px_60px_rgba(15,23,42,0.24)] dark:bg-slate-900"
        style={{
          width: `min(100%, ${width})`,
          height: `min(${height}, 960px)`,
          maxHeight: `min(${height}, 960px)`,
          minHeight: 0
        }}
      >
        <div className="sticky top-0 z-[1] border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-base font-extrabold text-slate-900 dark:text-white">{title}</h3>
            <div className="flex items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 ${contentClassName}`.trim()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
