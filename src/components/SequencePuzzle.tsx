import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, GripVertical, Sparkles } from 'lucide-react';
import { RETURN_SEQUENCE, SEQUENCE_START } from '../missions/mars/data';
import { apolloAudio } from '../audio/apolloAudio';

interface SequencePuzzleProps {
  onComplete: () => void;
}

export const SequencePuzzle: React.FC<SequencePuzzleProps> = ({ onComplete }) => {
  const [order, setOrder] = useState<string[]>(SEQUENCE_START);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const orderRef = useRef(order);
  const doneRef = useRef(done);
  const dragId = useRef<string | null>(null);
  const pointerId = useRef<number | null>(null);
  orderRef.current = order;
  doneRef.current = done;

  const reorderTo = (id: string, toIndex: number) => {
    if (doneRef.current) return;
    const current = orderRef.current;
    const from = current.indexOf(id);
    if (from < 0 || toIndex < 0 || toIndex >= current.length || from === toIndex) return;
    const copy = current.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(toIndex, 0, item);
    orderRef.current = copy;
    setOrder(copy);
    setError(null);
    apolloAudio.playClickSound();
  };
  const reorderToRef = useRef(reorderTo);
  reorderToRef.current = reorderTo;

  useEffect(() => {
    const indexAt = (clientY: number, id: string) => {
      const rows = listRef.current?.querySelectorAll<HTMLElement>('[data-stage]');
      if (!rows || rows.length === 0) return 0;
      let insert = 0;
      rows.forEach(row => {
        if (row.dataset.stage === id) return;
        const rect = row.getBoundingClientRect();
        if (clientY > rect.top + rect.height / 2) insert += 1;
      });
      return insert;
    };
    const move = (event: PointerEvent) => {
      const id = dragId.current;
      if (!id || event.pointerId !== pointerId.current) return;
      reorderToRef.current(id, indexAt(event.clientY, id));
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
    if (doneRef.current || event.button !== 0) return;
    dragId.current = id;
    pointerId.current = event.pointerId;
    setDraggingId(id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The window listener still follows the pointer when capture is unavailable.
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, id: string, index: number) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      reorderTo(id, index - 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      reorderTo(id, index + 1);
    }
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
            Five stages were drawn for bringing Jezero’s samples to Earth. Drag them into the planned order. This campaign was not flown as first drawn.
          </p>
        </div>

        <ol ref={listRef} className="space-y-2">
          {order.map((id, index) => {
            const stage = RETURN_SEQUENCE.find(item => item.id === id)!;
            const dragging = draggingId === id;
            return (
              <li
                key={id}
                data-stage={id}
                tabIndex={done ? -1 : 0}
                onPointerDown={event => onPointerDown(event, id)}
                onKeyDown={event => onKeyDown(event, id, index)}
                role="button"
                aria-roledescription="Draggable stage"
                aria-label={`${stage.text}. Position ${index + 1}. Drag to reorder.`}
                className={`flex touch-none cursor-grab items-center gap-2 rounded-lg border bg-slate-950/70 p-3 outline-none select-none focus-visible:border-amber-300 ${
                  dragging
                    ? 'z-10 cursor-grabbing border-amber-300 bg-slate-900 shadow-lg'
                    : 'border-slate-800'
                } ${done ? 'cursor-default' : ''}`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="w-6 text-center text-xs font-mono-num text-amber-300">{index + 1}</span>
                <span className="flex-1 text-sm text-slate-100">{stage.text}</span>
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
