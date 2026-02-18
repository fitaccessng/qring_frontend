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
  const progress = useMemo(() => {
    if (!total) return 0;
    return Math.round(((index + 1) / total) * 100);
  }, [index, total]);

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                QRing Onboarding
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {role === "estate" ? "Estate Manager Guide" : "Homeowner Guide"}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Step {index + 1} of {total}: {currentStep.title}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
            >
              Close
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {currentStep.description}
          </p>

          {currentStep.points?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {currentStep.points.map((point) => (
                <div
                  key={point}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {point}
                </div>
              ))}
            </div>
          ) : null}

          {currentStep.route && currentStep.routeLabel ? (
            <button
              type="button"
              onClick={() => onNavigate?.(currentStep.route)}
              className="rounded-lg border border-brand-500 bg-brand-500 px-3 py-2 text-xs font-semibold text-white"
            >
              {currentStep.routeLabel}
            </button>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            {steps.map((step, stepIndex) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setIndex(stepIndex)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  stepIndex === index
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={index === 0}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40 dark:border-slate-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg border border-brand-500 bg-brand-500 px-3 py-2 text-xs font-semibold text-white"
          >
            {index >= total - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
