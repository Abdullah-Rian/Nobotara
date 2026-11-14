import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { apolloAudio } from '../audio/apolloAudio';

export interface MatchItem {
  id: string;
  text: string;
}

export interface MatchReason {
  id: string;
  text: string;
  /** The item this reason belongs to. */
  itemId: string;
}

interface MatchBoardProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  leftLabel: string;
  rightLabel: string;
  items: MatchItem[];
  reasons: MatchReason[];
  /** Message when some links are wrong (they have just been removed). */
  wrongText: (wrong: number) => string;
  successTitle: string;
  successText: string;
  finishLabel: string;
  onComplete: () => void;
  /** Called on the first link, so the tutorial hint can go away. */
  onFirstLink?: () => void;
  /** data-coach target for the tutorial hint. */
  coach?: string;
}

interface Line {
  id: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  locked: boolean;
}

/**
 * Match each item on the left with its reason on the right.
 * Cards share rows, so both sides are the same size, and a line joins every link.
 * When everything is linked the board checks it: right links lock in green, wrong
 * links are removed (their items marked red) so the player can try again.
 */
export const MatchBoard: React.FC<MatchBoardProps> = ({
  eyebrow,
  title,
  subtitle,
  leftLabel,
  rightLabel,
  items,
  reasons,
  wrongText,
  successTitle,
  successText,
  finishLabel,
  onComplete,
  onFirstLink,
  coach
}) => {
  /** itemId → reasonId */
  const [links, setLinks] = useState<Record<string, string>>({});
  /** Links that were checked and found right: they stay and cannot change. */
  const [locked, setLocked] = useState<string[]>([]);
  /** Items whose last link was wrong, until they are linked again. */
  const [wrong, setWrong] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLElement | null>>({});

  const belongs = (itemId: string, reasonId: string) => reasons.find(r => r.id === reasonId)?.itemId === itemId;

  const choose = (reasonId: string) => {
    if (!selected || done || locked.includes(selected)) return;
    apolloAudio.playClickSound();
    onFirstLink?.();
    const next: Record<string, string> = {};
    // A reason can only be linked once: taking it from another item unlinks that one.
    for (const [itemId, linked] of Object.entries(links)) if (linked !== reasonId) next[itemId] = linked;
    next[selected] = reasonId;
    setLinks(next);
    setWrong(current => current.filter(id => id !== selected));
    setMessage(null);

    const upcoming = items.find(item => !next[item.id]);
    if (upcoming) {
      setSelected(upcoming.id);
      return;
    }
    // Everything is linked: check it.
    const right = items.filter(item => belongs(item.id, next[item.id])).map(item => item.id);
    const bad = items.filter(item => !right.includes(item.id)).map(item => item.id);
    setLocked(right);
    if (bad.length === 0) {
      setSelected(null);
      setDone(true);
      apolloAudio.playSuccessChime();
      return;
    }
    const kept: Record<string, string> = {};
    for (const id of right) kept[id] = next[id];
    setLinks(kept);
    setWrong(bad);
    setSelected(bad[0]);
    setMessage(wrongText(bad.length));
  };

  const pick = (itemId: string) => {
    if (done || locked.includes(itemId)) return;
    setSelected(itemId);
  };

  /** Lines from the right edge of each item to the left edge of its reason, in board coordinates. */
  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const origin = board.getBoundingClientRect();
    const next: Line[] = [];
    for (const [itemId, reasonId] of Object.entries(links)) {
      const left = leftRefs.current[itemId]?.getBoundingClientRect();
      const right = rightRefs.current[reasonId]?.getBoundingClientRect();
      if (!left || !right) continue;
      const x1 = left.right - origin.left;
      const y1 = left.top + left.height / 2 - origin.top;
      const x2 = right.left - origin.left;
      const y2 = right.top + right.height / 2 - origin.top;
      const bend = Math.max(12, (x2 - x1) * 0.5);
      next.push({
        id: itemId,
        d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
        x1,
        y1,
        x2,
        y2,
        locked: locked.includes(itemId)
      });
    }
    setLines(next);
  }, [links, locked]);

  useLayoutEffect(() => {
    measure();
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // When all are matched, bring the success box and its finish button into view (on a phone it can sit
  // below the fold). Does nothing when it is already visible.
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (done) successRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [done]);

  const reasonOwner = (reasonId: string) => Object.entries(links).find(([, r]) => r === reasonId)?.[0];

  return (
    // Phones: the scrolling area starts below the HOME button, so a scrolled board never slides under it.
    <div className="thin-scroll absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 pt-[6vh] pointer-events-auto short:top-[calc(env(safe-area-inset-top,0px)+3.5rem)] short:p-2 short:pt-1 md:p-8 md:pt-[8vh]">
      <div
        data-coach={coach}
        className="w-full max-w-3xl space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl short:space-y-3 short:p-3 md:p-8"
      >
        <div className={`space-y-2 border-b border-slate-800 pb-5 text-center short:space-y-1 short:pb-2 ${done ? 'short:hidden' : ''}`}>
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">{eyebrow}</div>
          <h2 className="text-xl font-bold text-slate-100 md:text-2xl short:text-base">{title}</h2>
          <p className="mx-auto max-w-lg text-xs text-slate-400 md:text-sm short:hidden">{subtitle}</p>
        </div>

        <div ref={boardRef} className="relative">
          <div className="mb-2 grid grid-cols-2 gap-x-14 text-xs font-mono-num font-semibold text-slate-400 short:mb-1 short:gap-x-10 short:text-[10px]">
            <div>{leftLabel}</div>
            <div>{rightLabel}</div>
          </div>

          {/* One row per pair: both cards in a row share its height, and every row is the same height. */}
          <div className="grid auto-rows-fr grid-cols-2 gap-x-14 gap-y-3 short:gap-x-10 short:gap-y-2">
            {items.map((item, index) => {
              const reason = reasons[index];
              const isSelected = selected === item.id && !done;
              const isLocked = locked.includes(item.id);
              const isWrong = wrong.includes(item.id);
              const linked = Boolean(links[item.id]);
              const owner = reason ? reasonOwner(reason.id) : undefined;
              const reasonLocked = owner ? locked.includes(owner) : false;
              const canChoose = Boolean(selected) && !done && !reasonLocked;
              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    ref={element => {
                      leftRefs.current[item.id] = element;
                    }}
                    onClick={() => pick(item.id)}
                    aria-pressed={isSelected}
                    className={`flex h-full w-full items-center justify-between gap-2 rounded-lg border p-3.5 text-left transition-colors short:p-2 ${
                      isLocked
                        ? 'cursor-default border-emerald-600/70 bg-emerald-950/25'
                        : isSelected
                          ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400'
                          : isWrong
                            ? 'border-rose-600/70 bg-rose-950/25'
                            : linked
                              ? 'border-amber-400/50 bg-slate-900/70'
                              : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-200 short:text-xs">{item.text}</span>
                    {isLocked && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                    {isWrong && !linked && <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />}
                  </button>
                  {reason ? (
                    <button
                      type="button"
                      ref={element => {
                        rightRefs.current[reason.id] = element;
                      }}
                      disabled={!canChoose}
                      onClick={() => choose(reason.id)}
                      className={`flex h-full w-full items-center rounded-lg border p-3.5 text-left text-xs leading-relaxed transition-colors md:text-sm short:p-2 short:text-[11px] short:leading-snug ${
                        reasonLocked
                          ? 'cursor-default border-emerald-600/70 bg-emerald-950/25 text-slate-200'
                          : owner
                            ? 'border-amber-400/50 bg-slate-900/70 text-slate-200 hover:border-amber-400'
                            : canChoose
                              ? 'border-slate-700 bg-slate-950/80 text-slate-200 hover:border-amber-400 hover:bg-slate-900'
                              : 'cursor-not-allowed border-slate-800 bg-slate-950/30 text-slate-500'
                      }`}
                    >
                      {reason.text}
                    </button>
                  ) : (
                    <div />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {lines.map(line => (
              <g key={line.id} className={line.locked ? 'text-emerald-400' : 'text-amber-300'}>
                <path d={line.d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={line.x1} cy={line.y1} r="4" fill="currentColor" />
                <circle cx={line.x2} cy={line.y2} r="4" fill="currentColor" />
              </g>
            ))}
          </svg>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-300 short:p-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {done && (
          <div ref={successRef} className="space-y-3 rounded-xl border border-emerald-500/80 bg-emerald-950/40 p-5 text-center short:space-y-1.5 short:p-2">
            <div className="flex items-center justify-center gap-2 text-sm font-mono-num font-bold text-emerald-400">
              <Sparkles className="h-5 w-5" />
              <span>{successTitle}</span>
            </div>
            <p className="mx-auto max-w-lg text-xs text-slate-300 md:text-sm short:text-[11px] short:leading-snug">{successText}</p>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 short:py-2"
            >
              {finishLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
