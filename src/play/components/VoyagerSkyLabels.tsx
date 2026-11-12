import React, { useEffect, useRef } from 'react';
import { SkyFrame } from '../game/voyagerEngine';

interface VoyagerSkyLabelsProps {
  readFrame: () => SkyFrame | undefined;
  /** Draw only these names. Mission 1 uses the Sun and Earth labels. */
  keys?: Array<(typeof LABELS)[number]['key']>;
}

const LABELS = [
  { key: 'sun' as const, name: 'SUN', dx: -78, dy: -52, tone: 'border-amber-200/80 text-amber-50' },
  { key: 'earth' as const, name: 'EARTH', dx: -130, dy: 24, tone: 'border-sky-200/80 text-sky-50' },
  { key: 'mars' as const, name: 'MARS', dx: 0, dy: 62, tone: 'border-orange-400/80 text-orange-100' },
  { key: 'jezero' as const, name: 'Jezero Crater', dx: -120, dy: -48, tone: 'border-orange-400/80 text-orange-100' }
];

/**
 * SUN, EARTH, and MARS names with leader lines. Positions are written on the elements
 * so the overlay does not re-render every frame.
 */
export const VoyagerSkyLabels: React.FC<VoyagerSkyLabelsProps> = ({ readFrame, keys }) => {
  const chipRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const keyList = keys?.join(',') ?? '';

  useEffect(() => {
    const labels = keyList
      ? LABELS.filter(label => keyList.split(',').includes(label.key))
      : LABELS;
    let frame = 0;
    const tick = () => {
      const data = readFrame();
      const width = window.innerWidth;
      const height = window.innerHeight;
      labels.forEach((label, index) => {
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
        const tipX = point.x - (point.tipLeft ?? 0);
        const tipY = point.y;
        line.setAttribute('x1', String(startX));
        line.setAttribute('y1', String(startY));
        line.setAttribute('x2', String(tipX));
        line.setAttribute('y2', String(tipY));
        dot.setAttribute('cx', String(tipX));
        dot.setAttribute('cy', String(tipY));
        line.style.opacity = '1';
        dot.style.opacity = '1';
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readFrame, keyList]);

  const labels = keyList
    ? LABELS.filter(label => keyList.split(',').includes(label.key))
    : LABELS;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <svg className="h-full w-full" aria-hidden="true">
        {labels.map((label, index) => (
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
      {labels.map((label, index) => (
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
