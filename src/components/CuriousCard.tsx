import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, RotateCcw, Sparkles } from 'lucide-react';
import { CURIOUS_QUESTIONS, MARS_LAST_WORD } from '../missions/mars/data';

interface CuriousCardProps {
  onMissions: () => void;
  onReplay: () => void;
  /** Title of the legacy the player chose, when they chose one. */
  legacy: string | null;
  /** All three missions have been finished on this device. */
  allDone: boolean;
}

/** Follow-up questions one player may ask the archive. */
const MAX_QUESTIONS = 3;

const COLLECTED = ['3 rocks scanned', 'Sample tubes found', 'Return plan rebuilt', '3 clues matched'];

export const CuriousCard: React.FC<CuriousCardProps> = ({ onMissions, onReplay, legacy, allDone }) => {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const lastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thread.length > 0) lastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [thread.length]);

  useEffect(() => {
    let alive = true;
    fetch('/api/mars-archive')
      .then(response => response.json())
      .then(data => {
        if (alive) setAvailable(Boolean(data.available));
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const left = MAX_QUESTIONS - thread.length;

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || left <= 0 || busy) return;
    setBusy(true);
    let answer = 'The archive cannot answer that right now.';
    try {
      const response = await fetch('/api/mars-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed })
      });
      const data = await response.json();
      if (typeof data.answer === 'string' && data.answer) answer = data.answer;
    } catch {
      // Keep the fallback answer.
    }
    setThread(current => [...current, { q: trimmed, a: answer }]);
    setQuestion('');
    setBusy(false);
  };

  return (
    <div className="thin-scroll pointer-events-auto mx-auto my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950/95 p-6 text-left shadow-2xl md:p-8 short:p-4">
      <div className="flex items-center gap-2 text-xs font-mono-num font-bold tracking-wider text-emerald-300">
        <Sparkles className="h-4 w-4" />
        MISSION 03 COMPLETE
      </div>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-100">Mars Sample Return</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {COLLECTED.map(item => (
          <li
            key={item}
            className="flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-1 font-mono-num text-[11px] text-emerald-200"
          >
            <Check className="h-3 w-3" />
            {item}
          </li>
        ))}
        {legacy && (
          <li className="rounded bg-amber-400/15 px-2 py-1 font-mono-num text-[11px] text-amber-200">
            Legacy: {legacy}
          </li>
        )}
      </ul>

      {allDone && (
        <p className="mt-4 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm leading-relaxed text-amber-100">
          Congratulations, Explorer! You have completed all three missions. But space exploration is far from over.
          There are still countless questions waiting to be explored.
        </p>
      )}

      <p className="mt-4 border-y border-slate-800 py-3 text-sm italic leading-relaxed text-slate-300">“{MARS_LAST_WORD}”</p>

      <div className="mt-4 text-xs font-mono-num font-bold tracking-wider text-amber-300">STILL CURIOUS?</div>
      <div className="mt-2 space-y-2">
        {CURIOUS_QUESTIONS.map((item, index) => {
          const shown = open === index;
          return (
            <div key={item.q} className="rounded-lg border border-slate-800 bg-slate-900/70">
              <button
                type="button"
                onClick={() => setOpen(shown ? null : index)}
                aria-expanded={shown}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-bold text-slate-100"
              >
                <span>{item.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${shown ? 'rotate-180' : ''}`} />
              </button>
              {shown && <p className="px-3 pb-3 text-sm leading-relaxed text-slate-300">{item.a}</p>}
            </div>
          );
        })}
      </div>

      {available && (
        <form
          className="mt-5 border-t border-slate-800 pt-4"
          onSubmit={event => {
            event.preventDefault();
            void ask();
          }}
        >
          <label className="text-xs font-mono-num text-slate-400" htmlFor="mars-followup">
            Ask the mission archive your own question ({left} of {MAX_QUESTIONS} left)
          </label>
          {thread.map((item, index) => (
            <div key={index} ref={index === thread.length - 1 ? lastRef : undefined} className="mt-3">
              <div className="text-sm font-bold text-slate-100">{item.q}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.a}</p>
            </div>
          ))}
          {left > 0 && (
            <>
              <textarea
                id="mars-followup"
                value={question}
                disabled={busy}
                onChange={event => setQuestion(event.target.value)}
                maxLength={280}
                rows={2}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                placeholder="Ask about Jezero, the tubes, or the plan to bring them home"
              />
              <button
                type="submit"
                disabled={busy || question.trim().length === 0}
                className="mt-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
              >
                {busy ? 'ASKING THE ARCHIVE…' : 'ASK THE ARCHIVE'}
              </button>
            </>
          )}
        </form>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onReplay}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-3 text-sm font-bold text-slate-200"
        >
          <RotateCcw className="h-4 w-4" />
          PLAY AGAIN
        </button>
        <button
          type="button"
          onClick={onMissions}
          className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold text-slate-950"
        >
          BACK TO MISSIONS
        </button>
      </div>
    </div>
  );
};
