import React, { useEffect, useRef, useState } from 'react';
import { CURIOUS_QUESTIONS, MARS_LAST_WORD } from '../missions/mars/data';

interface CuriousCardProps {
  onMissions: () => void;
}

export const CuriousCard: React.FC<CuriousCardProps> = ({ onMissions }) => {
  const [available, setAvailable] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState(false);
  const answerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (answer) answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answer]);

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

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || asked || busy) return;
    setBusy(true);
    try {
      const response = await fetch('/api/mars-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed })
      });
      const data = await response.json();
      setAnswer(typeof data.answer === 'string' ? data.answer : 'The archive cannot answer that right now.');
      setAsked(true);
    } catch {
      setAnswer('The archive cannot answer that right now.');
      setAsked(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thin-scroll pointer-events-auto mx-auto my-auto max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950/95 p-6 text-left shadow-2xl md:p-8">
      <p className="border-b border-slate-800 pb-4 text-base italic leading-relaxed text-slate-200">“{MARS_LAST_WORD}”</p>
      <div className="mt-4 text-xs font-mono-num font-bold tracking-wider text-amber-300">STILL CURIOUS?</div>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-100">Three questions, answered</h2>
      <div className="mt-4 space-y-4">
        {CURIOUS_QUESTIONS.map(item => (
          <div key={item.q}>
            <div className="text-sm font-bold text-slate-100">{item.q}</div>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.a}</p>
          </div>
        ))}
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
            Ask one more question about this mission
          </label>
          <textarea
            id="mars-followup"
            value={question}
            disabled={asked || busy}
            onChange={event => setQuestion(event.target.value)}
            maxLength={280}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            placeholder="Ask about Jezero, the tubes, or the return plan"
          />
          <button
            type="submit"
            disabled={asked || busy || question.trim().length === 0}
            className="mt-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
          >
            {busy ? 'ASKING THE ARCHIVE' : asked ? 'FOLLOW-UP USED' : 'ASK THE ARCHIVE'}
          </button>
          {answer && <p ref={answerRef} className="mt-3 text-sm leading-relaxed text-slate-200">{answer}</p>}
        </form>
      )}

      <button
        type="button"
        onClick={onMissions}
        className="mt-6 w-full rounded-lg border border-slate-600 px-4 py-3 text-sm font-bold text-slate-200"
      >
        BACK TO MISSIONS
      </button>
    </div>
  );
};
