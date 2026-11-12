import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  GripVertical,
  Orbit,
  Rocket,
  Sparkles,
  TestTube
} from 'lucide-react';
import { RETURN_SEQUENCE, SEQUENCE_START } from '../missions/mars/data';
import { apolloAudio } from '../audio/apolloAudio';

interface SequencePuzzleProps {
  onComplete: () => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cache: TestTube,
  lander: ArrowDownToLine,
  ascent: Rocket,
  orbiter: Orbit,
  entry: Globe
};

const isRight = (id: string, index: number) => RETURN_SEQUENCE[index]?.id === id;

export const SequencePuzzle: React.FC<SequencePuzzleProps> = ({ onComplete }) => {
  const [order, setOrder] = useState<string[]>(SEQUENCE_START);
  /** Steps a check has confirmed. They stay where they are. */
  const [locked, setLocked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const orderRef = useRef(order);
  const lockedRef = useRef(locked);
  const doneRef = useRef(done);
  const dragId = useRef<string | null>(null);
  const pointerId = useRef<number | null>(null);
  orderRef.current = order;
  lockedRef.current = locked;
  doneRef.current = done;

  /** Move a step to the nth free slot. Locked steps keep their places. */
  const moveToFreeSlot = (id: string, slot: number) => {
    if (doneRef.current || lockedRef.current.includes(id)) return;
    const current = orderRef.current;
    const free = current.filter(item => !lockedRef.current.includes(item));
    const from = free.indexOf(id);
    const to = Math.max(0, Math.min(free.length - 1, slot));
    if (from < 0 || from === to) return;
    free.splice(from, 1);
    free.splice(to, 0, id);
    let next = 0;
    const copy = current.map(item => (lockedRef.current.includes(item) ? item : free[next++]));
    orderRef.current = copy;
    setOrder(copy);
    setError(null);
    apolloAudio.playClickSound();
  };
  const moveRef = useRef(moveToFreeSlot);
  moveRef.current = moveToFreeSlot;

  const nudge = (id: string, step: number) => {
    const free = orderRef.current.filter(item => !lockedRef.current.includes(item));
    moveToFreeSlot(id, free.indexOf(id) + step);
  };

  useEffect(() => {
    const slotAt = (clientY: number, id: string) => {
      const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-stage]');
      if (!rows || rows.length === 0) return 0;
      let slot = 0;
      rows.forEach(row => {
        const stage = row.dataset.stage!;
        if (stage === id || lockedRef.current.includes(stage)) return;
        const rect = row.getBoundingClientRect();
        if (clientY > rect.top + rect.height / 2) slot += 1;
      });
      return slot;
    };
    const move = (event: PointerEvent) => {
      const id = dragId.current;
      if (!id || event.pointerId !== pointerId.current) return;
      moveRef.current(id, slotAt(event.clientY, id));
    };
    const finish = (event: PointerEvent) => {
      if (pointerId.current === null || event.pointerId !== pointerId.current) return;
      dragId.current = null;
      pointerId.current = null;
      setDraggingId(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLLIElement>, id: string) => {
    if (doneRef.current || event.button !== 0 || lockedRef.current.includes(id)) return;
    if ((event.target as HTMLElement).closest('button')) return;
    dragId.current = id;
    pointerId.current = event.pointerId;
    setDraggingId(id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The window listener still follows the pointer when capture is unavailable.
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, id: string) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudge(id, -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudge(id, 1);
    }
  };

  const confirm = () => {
    const right = order.filter((id, index) => isRight(id, index));
    setLocked(right);
    lockedRef.current = right;
    if (right.length === order.length) {
      apolloAudio.playSuccessChime();
      setDone(true);
      setError(null);
      return;
    }
    const left = order.length - right.length;
    setError(
      right.length === 0
        ? 'None of the steps are in the right place yet. What has to happen before anything can leave Mars?'
        : `${right.length} in the right place, now locked in green. ${left} still to move. The samples cannot leave Mars before a rocket arrives.`
    );
  };

  const freeCount = order.length - locked.length;

  return (
    <div className="thin-scroll absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 pt-[6vh] pointer-events-auto short:pt-3 md:p-8 md:pt-[8vh]">
      <div className="w-full max-w-xl space-y-5 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl md:p-8">
        <div className="space-y-2 border-b border-slate-800 pb-5 text-center">
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-400">
            THE PLAN TO COME HOME
          </div>
          <h2 className="text-xl font-bold text-slate-100 md:text-2xl">Put the plan in order</h2>
          <p className="mx-auto max-w-md text-sm text-slate-400">
            Five steps were planned to bring the samples from Jezero to Earth. Drag them into order, from first to last.
          </p>
        </div>

        <ol ref={listRef} data-coach="mars-sequence" className="space-y-2">
          {order.map((id, index) => {
            const stage = RETURN_SEQUENCE.find(item => item.id === id)!;
            const Icon = ICONS[id];
            const dragging = draggingId === id;
            const fixed = locked.includes(id);
            const free = order.filter(item => !locked.includes(item));
            const slot = free.indexOf(id);
            return (
              <li
                key={id}
                data-stage={id}
                tabIndex={done || fixed ? -1 : 0}
                onPointerDown={event => onPointerDown(event, id)}
                onKeyDown={event => onKeyDown(event, id)}
                aria-label={`${stage.text}. Position ${index + 1}.${fixed ? ' Correct.' : ' Drag or use the arrows to move.'}`}
                className={`flex items-center gap-2 rounded-lg border p-3 outline-none select-none focus-visible:border-amber-300 ${
                  fixed
                    ? 'cursor-default border-emerald-500/70 bg-emerald-950/30'
                    : dragging
                      ? 'z-10 cursor-grabbing touch-none border-amber-300 bg-slate-900 shadow-lg'
                      : 'cursor-grab touch-none border-slate-800 bg-slate-950/70'
                }`}
              >
                {fixed ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <GripVertical className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                )}
                <span className={`w-5 text-center text-xs font-mono-num ${fixed ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {index + 1}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                    fixed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-cyan-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm text-slate-100">{stage.text}</span>
                {!fixed && !done && (
                  <span className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={slot <= 0}
                      onClick={() => nudge(id, -1)}
                      className="rounded border border-slate-700 p-0.5 text-slate-300 disabled:opacity-25"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={slot >= freeCount - 1}
                      onClick={() => nudge(id, 1)}
                      className="rounded border border-slate-700 p-0.5 text-slate-300 disabled:opacity-25"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </span>
                )}
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
              <span>PLAN REBUILT</span>
            </div>
            <p className="text-sm text-slate-300">
              Collect, land a rocket, launch to orbit, catch and fly home, land on Earth. Each step needs the one before it.
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950"
            >
              RUN THE PLAN
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={confirm}
            className="w-full rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950"
          >
            CHECK MY ORDER
          </button>
        )}
      </div>
    </div>
  );
};
