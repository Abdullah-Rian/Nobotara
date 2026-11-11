import React, { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { EVIDENCE_ITEMS, EVIDENCE_REASONS } from '../missions/mars/data';
import { apolloAudio } from '../audio/apolloAudio';

interface EvidenceBoardProps {
  onComplete: () => void;
}

export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({ onComplete }) => {
  const [matches, setMatches] = useState<Partial<Record<string, string>>>({});
  const [selected, setSelected] = useState<string | null>(EVIDENCE_ITEMS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [checked, setChecked] = useState(false);

  const isRight = (itemId: string, reasonId: string | undefined) =>
    EVIDENCE_REASONS.find(entry => entry.id === reasonId)?.itemId === itemId;

  const choose = (reasonId: string) => {
    if (!selected || done) return;
    apolloAudio.playClickSound();
    const next = { ...matches, [selected]: reasonId };
    setMatches(next);
    setError(null);
    setChecked(false);
    const upcoming = EVIDENCE_ITEMS.find(item => !next[item.id]);
    setSelected(upcoming ? upcoming.id : null);
    if (EVIDENCE_ITEMS.every(item => next[item.id])) {
      const wrong = EVIDENCE_ITEMS.filter(item => !isRight(item.id, next[item.id])).length;
      setChecked(true);
      if (wrong === 0) {
        apolloAudio.playSuccessChime();
        setDone(true);
      } else {
        setError(
          wrong === 1
            ? 'One link does not fit. It is marked in red. Press Change on it and try another meaning.'
            : `${wrong} links do not fit. They are marked in red. Press Change on each and try another meaning.`
        );
      }
    }
  };

  return (
    <div className="thin-scroll absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 pt-[6vh] pointer-events-auto short:pt-3 md:p-8 md:pt-[8vh]">
      <div className="w-full max-w-3xl space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-8">
        <div className="space-y-2 border-b border-slate-800 pb-5 text-center">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">
            EVIDENCE BOARD
          </div>
          <h2 className="text-xl font-bold text-slate-100 md:text-2xl">What does each clue really tell us?</h2>
          <p className="mx-auto max-w-lg text-sm text-slate-400">
            Pick a clue on the left, then choose what it means on the right.
          </p>
        </div>

        <div data-coach="mars-board" className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-mono-num font-semibold text-slate-400">1. PICK A CLUE</div>
            {EVIDENCE_ITEMS.map(item => {
              const reason = EVIDENCE_REASONS.find(entry => entry.id === matches[item.id]);
              const right = checked && reason ? isRight(item.id, reason.id) : null;
              const linkedBox =
                right === true
                  ? 'border-emerald-600/60 bg-emerald-950/20'
                  : right === false
                    ? 'border-rose-600/70 bg-rose-950/25'
                    : 'border-slate-600 bg-slate-900/60';
              const linkedText =
                right === true ? 'text-emerald-300/90' : right === false ? 'text-rose-300' : 'text-slate-300';
              return (
                <div
                  key={item.id}
                  onClick={() => setSelected(item.id)}
                  className={`w-full cursor-pointer rounded-lg border p-3.5 text-left ${
                    selected === item.id
                      ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400'
                      : reason
                        ? linkedBox
                        : 'border-slate-800 bg-slate-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{item.text}</span>
                    {right === true && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {right === false && <AlertCircle className="h-4 w-4 text-rose-400" />}
                  </div>
                  {reason && (
                    <div className={`mt-1.5 flex items-start justify-between text-xs ${linkedText}`}>
                      <span className="pr-2 leading-snug">Linked: {reason.text}</span>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          const cleared = { ...matches };
                          delete cleared[item.id];
                          setMatches(cleared);
                          setSelected(item.id);
                          setDone(false);
                          setChecked(false);
                          setError(null);
                        }}
                        className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="text-xs font-mono-num font-semibold text-slate-400">2. CHOOSE WHAT IT MEANS</div>
            {EVIDENCE_REASONS.map(reason => {
              const used = Object.values(matches).includes(reason.id);
              return (
                <button
                  key={reason.id}
                  type="button"
                  disabled={!selected || done || used}
                  onClick={() => choose(reason.id)}
                  className={`w-full rounded-lg border p-3.5 text-left text-sm leading-relaxed ${
                    used
                      ? 'border-slate-700 bg-slate-800/40 text-slate-400 opacity-60'
                      : selected
                        ? 'border-slate-700 bg-slate-950/80 text-slate-200 hover:border-amber-400'
                        : 'cursor-not-allowed border-slate-800 bg-slate-950/30 text-slate-500'
                  }`}
                >
                  {reason.text}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {done && (
          <div className="space-y-3 rounded-xl border border-emerald-500/80 bg-emerald-950/40 p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-mono-num font-bold text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <span>CLUES MATCHED</span>
            </div>
            <p className="text-sm text-slate-300">
              The lake could once have held life. The leopard-spot rock is a possible sign of it. The sealed samples could settle the question, in a laboratory on Earth.
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              RETURN TO THE TUBES
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
