import React, { useEffect, useRef, useState } from 'react';

export interface PerseverancePoint {
  x: number;
  y: number;
  visible: boolean;
}

const DESCRIPTION =
  'NASA’s Mars 2020 rover. It landed in Jezero Crater in February 2021 to study the rocks a lake left behind and to seal selected samples beside itself.';

/**
 * One name chip for Perseverance, drawn the same way as a Voyager part:
 * a leader line to the rover, and a short description when the chip is tapped.
 */
export const PerseveranceMark: React.FC<{ read: () => PerseverancePoint | undefined }> = ({ read }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const point = read();
      const button = buttonRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      const card = cardRef.current;
      const visible = Boolean(point?.visible);
      if (card) card.style.visibility = visible ? 'visible' : 'hidden';
      if (!button || !line || !dot || !point || !visible) {
        if (button) button.style.visibility = 'hidden';
        if (line) line.style.opacity = '0';
        if (dot) dot.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
      const halfW = button.offsetWidth / 2;
      const halfH = button.offsetHeight / 2;
      const x = Math.min(Math.max(point.x + 86, 8 + halfW), window.innerWidth - 8 - halfW);
      const y = Math.min(Math.max(point.y - 72, 72 + halfH), window.innerHeight - 96 - halfH);
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.style.visibility = 'visible';
      const rect = button.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = point.x - cx;
      const dy = point.y - cy;
      const sx = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity;
      const sy = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity;
      const scale = Math.min(sx, sy);
      line.setAttribute('x1', String(cx + dx * scale));
      line.setAttribute('y1', String(cy + dy * scale));
      line.setAttribute('x2', String(point.x));
      line.setAttribute('y2', String(point.y));
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      line.style.opacity = '1';
      dot.style.opacity = '1';
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [read]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <svg className="h-full w-full" aria-hidden="true">
        <line ref={lineRef} stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0 }} />
        <circle ref={dotRef} r="4.5" fill="#f8fafc" style={{ opacity: 0 }} />
      </svg>
      <button
        ref={element => {
          buttonRef.current = element;
          if (element && element.dataset.bound !== '1') {
            element.dataset.bound = '1';
            element.style.visibility = 'hidden';
          }
        }}
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-pressed={open}
        className={`pointer-events-auto fixed z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold shadow-lg short:px-1.5 short:py-0.5 short:text-[11px] ${
          open
            ? 'border-amber-300 bg-amber-400 text-slate-950'
            : 'border-white/85 bg-slate-950/90 text-white'
        }`}
      >
        Perseverance
      </button>
      {open && (
        <div
          ref={cardRef}
          className="pointer-events-auto absolute left-1/2 top-52 z-40 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-950/92 px-4 py-3 text-left shadow-xl"
        >
          <div className="text-xs font-bold tracking-wide text-amber-200">Perseverance</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{DESCRIPTION}</p>
        </div>
      )}
    </div>
  );
};
