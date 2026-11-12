import React, { useState } from 'react';
import { Home } from 'lucide-react';

interface LeaveMissionProps {
  /** "Mission 01", shown in the warning. */
  missionLabel: string;
  onLeave: () => void;
  /** Darker, stand-alone look for screens without a HUD around it. */
  floating?: boolean;
}

/** HOME button for a mission. Asks first, because progress is not saved. */
export const LeaveMission: React.FC<LeaveMissionProps> = ({ missionLabel, onLeave, floating = false }) => {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLeaving(value => !value)}
        aria-expanded={leaving}
        aria-label="Back to home"
        className={`flex min-w-[6.5rem] items-center justify-center gap-2 rounded-lg border px-5 py-2 font-mono-num text-xs text-slate-200 ${
          floating ? 'border-slate-600 bg-slate-950/90 shadow-lg' : 'border-slate-800/80 bg-slate-950/80'
        }`}
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        HOME
      </button>
      {leaving && (
        <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-left shadow-2xl">
          <div className="text-sm font-bold text-slate-100">Back to the home page?</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Your progress is not saved. You will start {missionLabel} from the beginning next time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setLeaving(false)}
              className="flex-1 rounded-md bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950"
            >
              KEEP PLAYING
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="flex-1 rounded-md border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200"
            >
              GO HOME
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
