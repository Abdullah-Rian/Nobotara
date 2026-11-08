import React from 'react';
import { MarsReading } from '../missions/mars/data';

interface MarsInspectProps {
  reading: MarsReading;
  narrationDone: boolean;
  onClose: () => void;
}

export const MarsInspect: React.FC<MarsInspectProps> = ({ reading, narrationDone, onClose }) => {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4">
      <div className="pointer-events-auto max-h-[48vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/92 p-4 text-slate-100 shadow-xl">
        <div className="text-[11px] font-mono-num font-bold text-amber-300">{reading.kicker}</div>
        <h2 className="mt-1 text-lg font-bold">{reading.title}</h2>
        <dl className="mt-3 space-y-2">
          {reading.facts.map(fact => (
            <div key={fact.label}>
              <dt className="text-[10px] font-mono-num uppercase tracking-wider text-slate-400">{fact.label}</dt>
              <dd className="text-sm leading-relaxed text-slate-200">{fact.text}</dd>
            </div>
          ))}
        </dl>
        {reading.caution && <p className="mt-3 text-sm leading-relaxed text-amber-200">{reading.caution}</p>}
        {narrationDone && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            {reading.continueLabel}
          </button>
        )}
      </div>
    </div>
  );
};
