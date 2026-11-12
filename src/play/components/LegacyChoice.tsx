import React from 'react';
import { LEGACY_CHOICES, LegacyId } from '../missions/mars/data';
import { apolloAudio } from '../audio/apolloAudio';

interface LegacyChoiceProps {
  onChoose: (id: LegacyId) => void;
}

export const LegacyChoice: React.FC<LegacyChoiceProps> = ({ onChoose }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4 pointer-events-auto md:p-8">
      <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-8">
        <div className="border-b border-slate-800 pb-5 text-center">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">THE LEGACY</div>
          <h2 className="mt-2 text-xl font-bold text-slate-100 md:text-2xl">What should this mission be remembered for?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            The samples are still on Mars. The question is still open. You decide what this unfinished mission leaves behind.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {LEGACY_CHOICES.map(choice => (
            <button
              key={choice.id}
              type="button"
              onClick={() => {
                apolloAudio.playClickSound();
                onChoose(choice.id);
              }}
              className="rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-left text-slate-100 transition-transform hover:-translate-y-0.5 hover:border-amber-400"
            >
              <div className="text-sm font-bold">{choice.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{choice.detail}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
