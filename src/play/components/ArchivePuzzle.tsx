import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ARCHIVE_DISCLAIMER, ARCHIVE_ITEMS } from '../missions/voyager/data';
import { apolloAudio } from '../audio/apolloAudio';

interface ArchivePuzzleProps {
  onComplete: () => void;
  onPickedCount?: (count: number) => void;
}

export const ArchivePuzzle: React.FC<ArchivePuzzleProps> = ({ onComplete, onPickedCount }) => {
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    onPickedCount?.(picked.length);
  }, [picked.length, onPickedCount]);

  const toggle = (id: string) => {
    if (done) return;
    apolloAudio.playClickSound();
    setError(null);
    setPicked(current => {
      if (current.includes(id)) return current.filter(item => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const confirm = () => {
    const wrong = ARCHIVE_ITEMS.filter(item => !item.correct && picked.includes(item.id));
    if (picked.length !== 3 || wrong.length > 0) {
      const count = wrong.length === 1 ? 'One of those was' : wrong.length === 2 ? 'Two of those were' : 'None of those were';
      setError(`${count}${wrong.length === 3 ? '' : ' not'} Voyager 1. ${wrong.map(item => item.note).join(' ')}`);
      return;
    }
    setDone(true);
    setError(null);
    onComplete();
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[45]">
      <div className="side-sheet pointer-events-auto absolute right-4 top-1/2 max-h-[calc(100%-2rem)] w-[min(24rem,42vw)] -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl md:right-8">
        <div className="side-sheet-body thin-scroll p-5 pb-2 short:p-3 short:pb-1">
        <div className="mb-5 border-b border-slate-800 pb-4 text-center short:mb-3 short:pb-2">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">
            FINAL ARCHIVE
          </div>
          <h2 className="mt-2 text-xl font-bold text-slate-100 md:text-2xl short:mt-1 short:text-base">
            Choose three discoveries to preserve
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
            Three of these were Voyager 1. The others were other spacecraft. Pick Voyager 1's three to send home.
          </p>
        </div>

        <div data-coach="voyager-archive" className="grid gap-2">
          {ARCHIVE_ITEMS.map(item => {
            const selected = picked.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors short:px-3 short:py-2 ${
                  selected
                    ? 'border-amber-400 bg-amber-500/10 text-slate-100'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>{item.text}</span>
                {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-300" />}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">{ARCHIVE_DISCLAIMER}</p>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        </div>
        <div className="flex shrink-0 justify-end px-5 pb-5 pt-2 short:px-3 short:pb-3">
          {!done ? (
            <button
              type="button"
              data-coach="voyager-send"
              onClick={confirm}
              disabled={picked.length !== 3}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            SEND TELEMETRY
          </button>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950"
            >
              SENDING TELEMETRY
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
