import React, { useEffect, useState } from 'react';
import { LoadState, onLoadProgress } from '../game/loadProgress';

const MB = 1024 * 1024;

/**
 * A small bar at the bottom while a mission's models download.
 * It waits half a second before showing, so a fast or cached load shows nothing.
 */
export const LoadingBar: React.FC<{ label: string }> = ({ label }) => {
  const [state, setState] = useState<LoadState>({ loaded: 0, total: 0, active: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => onLoadProgress(setState), []);

  useEffect(() => {
    if (state.active === 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 500);
    return () => window.clearTimeout(timer);
  }, [state.active > 0]);

  if (!visible || state.active === 0) return null;

  const fraction = state.total > 0 ? Math.min(1, state.loaded / state.total) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className="pointer-events-none absolute top-20 short:top-28 left-1/2 z-40 w-64 max-w-[80vw] -translate-x-1/2 rounded-full border border-slate-700/80 bg-slate-950/85 px-4 py-2 text-[11px] font-mono-num text-slate-300 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span>
          {state.total > 0 ? `${(state.loaded / MB).toFixed(1)} / ${(state.total / MB).toFixed(1)} MB` : '…'}
        </span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-amber-400 transition-[width] duration-200" style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
};
