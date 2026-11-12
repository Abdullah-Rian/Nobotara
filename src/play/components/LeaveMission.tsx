import React, { useState } from 'react';

interface LeaveMissionProps {
  /** "Mission 01", shown in the warning. */
  missionLabel: string;
  onLeave: () => void;
}

/** MISSIONS button in a mission's top bar. Asks first, because progress is not saved. */
export const LeaveMission: React.FC<LeaveMissionProps> = ({ missionLabel, onLeave }) => {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLeaving(value => !value)}
        aria-expanded={leaving}
        className="rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2 font-mono-num text-xs text-slate-300"
      >
        MISSIONS
      </button>
      {leaving && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-left shadow-2xl">
          <div className="text-sm font-bold text-slate-100">Leave this mission?</div>
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
              LEAVE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
