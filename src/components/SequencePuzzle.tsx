import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, AlertCircle, Sparkles } from 'lucide-react';
import { RETURN_SEQUENCE, SEQUENCE_START } from '../missions/mars/data';
import { apolloAudio } from '../audio/apolloAudio';

interface SequencePuzzleProps {
  onComplete: () => void;
}

export const SequencePuzzle: React.FC<SequencePuzzleProps> = ({ onComplete }) => {
  const [order, setOrder] = useState<string[]>(SEQUENCE_START);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= order.length || done) return;
    apolloAudio.playClickSound();
    const copy = order.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setOrder(copy);
    setError(null);
  };

  const confirm = () => {
    const correct = order.every((id, index) => id === RETURN_SEQUENCE[index].id);
    if (correct) {
      apolloAudio.playSuccessChime();
      setDone(true);
      setError(null);
      return;
    }
    setError('That is not the planned order. The tubes leave Mars only after a lander, a launch, a capture, and a delivery.');
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4 pointer-events-auto md:p-8">
      <div className="max-h-[92vh] w-full max-w-xl space-y-5 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-8">
        <div className="space-y-2 border-b border-slate-800 pb-5 text-center">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">
            RETURN ARCHITECTURE
          </div>
          <h2 className="text-xl font-bold text-slate-100 md:text-2xl">Order the original plan</h2>
          <p className="mx-auto max-w-md text-sm text-slate-400">
            Five stages were drawn for bringing Jezero’s samples to Earth. Put them in the planned order. This campaign was not flown as first drawn.
          </p>
        </div>

        <ol className="space-y-2">
          {order.map((id, index) => {
            const stage = RETURN_SEQUENCE.find(item => item.id === id)!;
            return (
              <li key={id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <span className="w-6 text-center text-xs font-mono-num text-amber-300">{index + 1}</span>
                <span className="flex-1 text-sm text-slate-100">{stage.text}</span>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={done || index === 0}
                  className="rounded border border-slate-700 p-1.5 text-slate-300 enabled:hover:border-amber-400 disabled:opacity-30"
                  aria-label={`Move stage ${index + 1} earlier`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={done || index === order.length - 1}
                  className="rounded border border-slate-700 p-1.5 text-slate-300 enabled:hover:border-amber-400 disabled:opacity-30"
                  aria-label={`Move stage ${index + 1} later`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ol>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/80 bg-emerald-950/40 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-mono-num font-bold text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <span>SEQUENCE RECONSTRUCTED</span>
            </div>
            <p className="text-sm text-slate-300">
              Perseverance caches the samples, a lander brings the ascent vehicle, the vehicle launches the container, an orbiter carries it toward Earth, and an entry system delivers it.
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              WITNESS THE PLAN
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={confirm}
            className="w-full rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950"
          >
            CONFIRM ORDER
          </button>
        )}
      </div>
    </div>
  );
};
