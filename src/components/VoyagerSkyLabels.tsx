import React, { useEffect, useRef } from 'react';
import { SkyFrame } from '../game/voyagerEngine';

interface VoyagerSkyLabelsProps {
  readFrame: () => SkyFrame | undefined;
}

const LABELS = [
  { key: 'sun' as const, name: 'SUN', dx: -78, dy: -52, tone: 'border-amber-200/80 text-amber-50' },
  { key: 'earth' as const, name: 'EARTH', dx: 78, dy: -40, tone: 'border-sky-200/80 text-sky-50' }
];

/**
 * SUN and EARTH names with leader lines. Positions are written on the elements
 * so the overlay does not re-render every frame.
 */
export const VoyagerSkyLabels: React.FC<VoyagerSkyLabelsProps> = ({ readFrame }) => {
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const data = readFrame();
      const width = window.innerWidth;
      const height = window.innerHeight;
      LABELS.forEach((label, index) => {
        const chip = chipRefs.current[index];
        const line = lineRefs.current[index];
        const dot = dotRefs.current[index];
        const point = data?.[label.key];
        if (!chip || !line || !dot || !point?.visible) {
          if (chip) chip.style.visibility = 'hidden';
          if (line) line.style.opacity = '0';
          if (dot) dot.style.opacity = '0';
          return;
        }
        const halfW = chip.offsetWidth / 2 || 24;
        const halfH = chip.offsetHeight / 2 || 12;
        const x = Math.min(width - halfW - 8, Math.max(halfW + 8, point.x + label.dx));
        const y = Math.min(height - halfH - 8, Math.max(halfH + 8, point.y + label.dy));
        chip.style.left = `${x}px`;
        chip.style.top = `${y}px`;
        chip.style.visibility = 'visible';
        const rect = chip.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        line.setAttribute('x1', String(startX));
        line.setAttribute('y1', String(startY));
        line.setAttribute('x2', String(point.x));
        line.setAttribute('y2', String(point.y));
        dot.setAttribute('cx', String(point.x));
        dot.setAttribute('cy', String(point.y));
        line.style.opacity = '1';
        dot.style.opacity = '1';
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readFrame]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <svg className="h-full w-full" aria-hidden="true">
        {LABELS.map((label, index) => (
          <g key={label.key}>
            <line
              ref={element => { lineRefs.current[index] = element; }}
              stroke="#f8fafc"
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{ opacity: 0 }}
            />
            <circle
              ref={element => { dotRefs.current[index] = element; }}
              r="3"
              fill="#f8fafc"
              style={{ opacity: 0 }}
            />
          </g>
        ))}
      </svg>
      {LABELS.map((label, index) => (
        <div
          key={label.key}
          ref={element => { chipRefs.current[index] = element; }}
          className={`fixed z-20 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-slate-950/90 px-2 py-1 text-xs font-bold tracking-wide ${label.tone}`}
          style={{ visibility: 'hidden' }}
        >
          {label.name}
        </div>
      ))}
    </div>
  );
};
