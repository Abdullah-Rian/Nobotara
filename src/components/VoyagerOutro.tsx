import React from 'react';
import { ARCHIVE_DISCLAIMER } from '../missions/voyager/data';

interface VoyagerOutroProps {
  progress: number;
  onContinue: () => void;
  onMissions: () => void;
}

export const VoyagerOutro: React.FC<VoyagerOutroProps> = ({ progress, onContinue, onMissions }) => {
  const showCard = progress > 0.72;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none md:p-12">
      <div className="w-fit rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-mono-num text-slate-300">
        MISSION 02: VOYAGER 1 · ARCHIVE SENT
      </div>

      {showCard && (
        <div className="pointer-events-auto mx-auto my-auto max-w-xl rounded-2xl border border-slate-700/80 bg-slate-950/95 p-6 text-center shadow-2xl md:p-8">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-300">
            MARS SAMPLE RETURN
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-100 md:text-3xl">
            A neighbouring world
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Sometimes the greatest discoveries are not in the farthest dark. Sometimes they wait on a world that once may have held rivers, lakes, and conditions suitable for life. Mars.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{ARCHIVE_DISCLAIMER}</p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 rounded-lg bg-orange-400 px-5 py-3 text-sm font-bold text-slate-950"
          >
            CONTINUE TO MISSION 03
          </button>
          <button
            type="button"
            onClick={onMissions}
            className="mt-3 block w-full rounded-lg border border-slate-600 bg-slate-800 px-5 py-3 text-sm font-bold text-slate-100"
          >
            BACK TO MISSIONS
          </button>
        </div>
      )}

      <div className="text-center text-xs font-mono-num text-slate-500">
        {progress < 0.4
          ? 'LEAVING VOYAGER 1'
          : progress < 0.72
            ? 'PALE BLUE DOT · EARTH FROM THE DEEP'
            : 'APPROACHING MARS'}
      </div>
    </div>
  );
};
