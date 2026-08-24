import React, { useMemo, useState, useEffect } from 'react';

const STORAGE_KEY = 'onboarding_walkthrough_completed_v1';

export default function WalkthroughModal({ open = true, onClose = () => {}, subscription = null, doors = [], hasSecurity = false }) {
  const [localProgress, setLocalProgress] = useState({});

  const steps = useMemo(() => [
    { id: 'create_estate', title: 'Create estate', required: true },
    { id: 'add_residents', title: 'Add residents', required: true },
    { id: 'add_security', title: 'Add security (optional)', required: false },
    { id: 'explain_features', title: 'Explore key features', required: true }
  ], []);

  // Auto-detect some completions from props
  const detected = useMemo(() => ({
    create_estate: !!subscription,
    add_residents: Array.isArray(doors) && doors.length > 0,
    add_security: Boolean(hasSecurity),
    explain_features: false
  }), [subscription, doors, hasSecurity]);

  useEffect(() => {
    setLocalProgress((p) => ({ ...detected, ...p }));
  }, [detected]);

  if (!open) return null;

  const markDone = (stepId) => setLocalProgress((p) => ({ ...p, [stepId]: true }));

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, ts: Date.now(), progress: localProgress }));
    } catch (e) {
      // ignore
    }
    onClose();
  };

  const skip = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed: true, ts: Date.now(), skipped: true })); } catch {};
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={skip} />
      <div className="relative bg-white max-w-xl w-full rounded-2xl p-6 shadow-lg mx-4">
        <h3 className="text-lg font-bold mb-2">Welcome — Quick Setup</h3>
        <p className="text-sm text-slate-500 mb-4">Complete a few quick steps to get your property set up. You can skip and return later.</p>

        <ul className="space-y-3 mb-4">
          {steps.map((s) => {
            const done = !!localProgress[s.id];
            return (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {done ? '✓' : s.title.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{s.title}</div>
                    <div className="text-xs text-slate-400">{s.required ? 'Required' : 'Optional'}</div>
                  </div>
                </div>
                <div>
                  {!done ? (
                    <button onClick={() => markDone(s.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">Mark done</button>
                  ) : (
                    <span className="text-xs text-slate-500">Completed</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between">
          <button onClick={skip} className="text-sm text-slate-600">Skip for now</button>
          <div className="flex items-center gap-3">
            <button onClick={finish} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold">Finish</button>
          </div>
        </div>
      </div>
    </div>
  );
}
