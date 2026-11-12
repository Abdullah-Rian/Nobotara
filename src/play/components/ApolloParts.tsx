import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { APOLLO_PART_NOTES, ApolloPartId } from '../data/artifactsData';

interface PartPoint {
  x: number;
  y: number;
  visible: boolean;
}

interface ApolloPartsProps {
  readFrame: () => Record<ApolloPartId, PartPoint> | undefined;
  /** Keep chips below the top bar and above the joystick and dialogue. */
  clearTop: number;
  clearBottom: number;
}

const IDS: ApolloPartId[] = ['descent', 'reflector'];
/** Where each chip sits relative to the point it names, in pixels. */
const OFFSET: Record<ApolloPartId, [number, number]> = {
  descent: [0, -92],
  reflector: [0, -78]
};

/**
 * Tappable names with leader lines for the Eagle descent stage and the retroreflector,
 * the same idea as Voyager's part labels. Tap one to read a short description.
 * Positions are written on the elements so the card does not re-render every frame.
 */
export const ApolloParts: React.FC<ApolloPartsProps> = ({ readFrame, clearTop: clearTopFull, clearBottom: clearBottomFull }) => {
  const [selected, setSelected] = useState<ApolloPartId | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lineRefs = useRef<Record<string, SVGLineElement | null>>({});
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const data = readFrame();
      for (const id of IDS) {
        const chip = chipRefs.current[id];
        const line = lineRefs.current[id];
        const dot = dotRefs.current[id];
        const point = data?.[id];
        if (!chip || !line || !dot) continue;
        if (!point?.visible) {
          chip.style.visibility = 'hidden';
          line.style.opacity = '0';
          dot.style.opacity = '0';
          continue;
        }
        const halfW = chip.offsetWidth / 2 || 60;
        const halfH = chip.offsetHeight / 2 || 16;
        const [dx, dy] = OFFSET[id];
        // On short screens (phones held sideways) the top bar and controls take less room.
        const short = window.innerHeight < 500;
        const clearTop = short ? 52 : clearTopFull;
        const clearBottom = short ? 70 : clearBottomFull;
        const x = Math.min(window.innerWidth - halfW - 8, Math.max(halfW + 8, point.x + dx));
        const y = Math.min(window.innerHeight - clearBottom - halfH, Math.max(clearTop + halfH, point.y + dy));
        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;
        chip.style.visibility = 'visible';
        const rect = chip.getBoundingClientRect();
        line.setAttribute('x1', String(rect.left + rect.width / 2));
        line.setAttribute('y1', String(rect.bottom > point.y ? rect.top + rect.height / 2 : rect.bottom));
        line.setAttribute('x2', String(point.x));
        line.setAttribute('y2', String(point.y));
        dot.setAttribute('cx', String(point.x));
        dot.setAttribute('cy', String(point.y));
        line.style.opacity = '1';
        dot.style.opacity = '1';
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readFrame, clearTopFull, clearBottomFull]);

  const note = selected ? APOLLO_PART_NOTES[selected] : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <svg className="h-full w-full" aria-hidden="true">
        {IDS.map(id => (
          <g key={id}>
            <line
              ref={element => { lineRefs.current[id] = element; }}
              stroke="#f8fafc"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
            <circle ref={element => { dotRefs.current[id] = element; }} r="4.5" fill="#f8fafc" style={{ opacity: 0 }} />
          </g>
        ))}
      </svg>
      {IDS.map(id => (
        <button
          key={id}
          ref={element => { chipRefs.current[id] = element; }}
          type="button"
          onClick={() => setSelected(current => (current === id ? null : id))}
          aria-pressed={selected === id}
          style={{ visibility: 'hidden' }}
          className={`pointer-events-auto fixed z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold shadow-lg short:px-1.5 short:py-0.5 short:text-[11px] ${
            selected === id ? 'border-amber-300 bg-amber-400 text-slate-950' : 'border-white/85 bg-slate-950/90 text-white'
          }`}
        >
          {APOLLO_PART_NOTES[id].name}
        </button>
      ))}
      {note && (
        <div
          role="dialog"
          aria-label={note.name}
          className="pointer-events-auto absolute left-1/2 top-24 z-30 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-950/92 px-4 py-3 text-left shadow-xl short:left-auto short:right-3 short:top-16 short:w-[16rem] short:translate-x-0 short:px-3 short:py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs font-bold tracking-wide text-amber-200">{note.name}</div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="-mr-1 -mt-1 rounded p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{note.description}</p>
        </div>
      )}
    </div>
  );
};
