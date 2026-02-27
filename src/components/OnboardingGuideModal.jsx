import { useEffect, useMemo, useState } from "react";

export default function OnboardingGuideModal({
  open,
  role,
  steps,
  onClose,
  onComplete,
  onNavigate
}) {
  const [index, setIndex] = useState(0);
  const total = steps.length;
  const currentStep = steps[index];
  const roleTitle = useMemo(
    () => (role === "estate" ? "Estate Manager Guide" : "Homeowner Guide"),
    [role]
  );

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, role]);

  if (!open || !currentStep) return null;

  function handleClose() {
    onClose?.();
  }

  function handleNext() {
    if (index >= total - 1) {
      onComplete?.();
      return;
    }
    setIndex((prev) => prev + 1);
  }

  function handleBack() {
    if (index === 0) return;
    setIndex((prev) => prev - 1);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4">
      <div className="relative w-full max-w-sm overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.24)] max-h-[90vh]">
        <div className="absolute -top-6 left-1/2 h-12 w-16 -translate-x-1/2 rounded-3xl bg-brand-600 shadow-soft" />
        <div className="pt-4 text-center">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500">
            QRING
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">{roleTitle}</p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3M14 18h7M18 14v7" />
            </svg>
          </div>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">{currentStep.title}</h2>
          <p className="mt-2 text-lg font-semibold text-brand-600">Smart Access Communication</p>
          <p className="mx-auto mt-3 max-w-[18rem] text-base leading-relaxed text-slate-500">
            {currentStep.description}
          </p>
        </div>

        {currentStep.points?.length ? (
          <div className="mx-auto mt-4 max-w-[18rem] text-center text-sm text-slate-600">
            {currentStep.points[0]}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center gap-2">
          {steps.map((step, stepIndex) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setIndex(stepIndex)}
              aria-label={`Go to step ${stepIndex + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                stepIndex === index ? "w-7 bg-brand-600" : "w-2.5 bg-slate-300"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleNext}
            className="w-full rounded-2xl bg-brand-600 py-3 text-base font-bold text-white shadow-soft transition hover:bg-brand-700"
          >
            {index >= total - 1 ? "Finish" : "Next"}
          </button>
          <div className="flex items-center justify-center gap-5 text-sm">
            <button
              type="button"
              onClick={handleClose}
              className="font-semibold text-slate-400 transition hover:text-slate-600"
            >
              Skip
            </button>
            {currentStep.route && currentStep.routeLabel ? (
              <button
                type="button"
                onClick={() => onNavigate?.(currentStep.route)}
                className="font-semibold text-brand-600 transition hover:text-brand-700"
              >
                {currentStep.routeLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
