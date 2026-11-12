import React, { useEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { MarsReading } from '../missions/mars/data';

interface MarsInspectProps {
  reading: MarsReading;
  narrationDone: boolean;
  scanDone: boolean;
  continueLabel: string;
  onScanProgress: (progress: number) => void;
  onScanDone: () => void;
  onClose: () => void;
  read: () => { x: number; y: number; visible: boolean } | undefined;
}

/** Seconds of holding needed to finish a scan. */
const SCAN_SECONDS = 3.2;

export const MarsInspect: React.FC<MarsInspectProps> = ({
  reading,
  narrationDone,
  scanDone,
  continueLabel,
  onScanProgress,
  onScanDone,
  onClose,
  read
}) => {
  const scanning = Boolean(reading.scan) && !scanDone;
  const [progress, setProgress] = useState(reading.scan ? 0 : 1);
  const [holding, setHolding] = useState(false);
  const progressRef = useRef(progress);
  const holdRef = useRef(false);
  const callbacks = useRef({ onScanProgress, onScanDone });
  callbacks.current = { onScanProgress, onScanDone };

  const setHold = (value: boolean) => {
    holdRef.current = value;
    setHolding(value);
  };

  // The scan advances only while the button, E, or Space is held.
  useEffect(() => {
    if (!scanning) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (holdRef.current && progressRef.current < 1) {
        const next = Math.min(1, progressRef.current + dt / SCAN_SECONDS);
        progressRef.current = next;
        setProgress(next);
        callbacks.current.onScanProgress(next);
        if (next >= 1) {
          holdRef.current = false;
          setHolding(false);
          callbacks.current.onScanDone();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const down = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' || event.code === 'Space') setHold(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' || event.code === 'Space') setHold(false);
    };
    const release = () => setHold(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
    };
  }, [scanning]);

  const shown = reading.scan ? Math.floor(progress * reading.facts.length + 0.0001) : reading.facts.length;
  const panelRef = useRef<HTMLElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const point = read();
      const panel = panelRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      if (!panel || !line || !dot || !point?.visible) {
        if (line) line.style.opacity = '0';
        if (dot) dot.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
      const rect = panel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = point.x - cx;
      const dy = point.y - cy;
      const sx = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity;
      const sy = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity;
      const scale = Math.min(sx, sy);
      if (scale >= 1) {
        line.style.opacity = '0';
        dot.style.opacity = '0';
        frame = requestAnimationFrame(tick);
        return;
      }
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
    <>
      <svg className="pointer-events-none fixed inset-0 z-30 h-full w-full" aria-hidden="true">
        <line ref={lineRef} stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0 }} />
        <circle ref={dotRef} r="4.5" fill="#f8fafc" style={{ opacity: 0 }} />
      </svg>
      <aside
        ref={panelRef}
        className="pointer-events-auto absolute right-4 top-1/2 z-30 flex max-h-[min(32rem,calc(100%-8rem))] w-[min(22rem,40vw)] -translate-y-1/2 flex-col rounded-2xl border border-slate-700/80 bg-slate-950/92 text-slate-100 shadow-2xl short:top-14 short:max-h-[calc(100%-4.5rem)] short:translate-y-0 md:right-8"
      >
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4 short:p-3">
      <div className="text-[11px] font-mono-num font-bold text-amber-300">{reading.kicker}</div>
      <h2 className="mt-1 text-lg font-bold">{reading.title}</h2>
      <dl className="mt-3 space-y-2">
        {reading.facts.map((fact, index) => (
          <div key={fact.label}>
            <dt className="text-[10px] font-mono-num uppercase tracking-wider text-slate-400">{fact.label}</dt>
            {index < shown ? (
              <dd className="text-sm leading-relaxed text-slate-200">{fact.text}</dd>
            ) : (
              <dd className="mt-1 h-4 w-3/4 rounded bg-slate-800/80" aria-label="Not scanned yet" />
            )}
          </div>
        ))}
      </dl>
      {reading.caution && <p className="mt-3 text-sm leading-relaxed text-amber-200">{reading.caution}</p>}
      </div>
      {/* The footer keeps its height, so the panel does not jump when the button arrives. */}
      <div className="shrink-0 border-t border-slate-800 px-4 py-3 short:px-3 short:py-2">
        {scanning ? (
          <button
            type="button"
            data-coach="mars-scan"
            onPointerDown={event => {
              event.preventDefault();
              setHold(true);
            }}
            onContextMenu={event => event.preventDefault()}
            className={`relative w-full touch-none select-none overflow-hidden rounded-lg border px-4 py-2.5 text-sm font-bold ${
              holding ? 'border-cyan-200 text-white' : 'border-cyan-400/70 text-cyan-100'
            }`}
          >
            <span
              className="absolute inset-y-0 left-0 bg-cyan-600"
              style={{ width: `${Math.round(progress * 100)}%`, opacity: holding ? 0.9 : 0.4 }}
            />
            <span className="relative flex items-center justify-center gap-2">
              <ScanLine className="h-4 w-4" />
              {holding ? `SCANNING ${Math.round(progress * 100)}%` : progress > 0 ? 'KEEP HOLDING TO SCAN' : 'HOLD TO SCAN'}
            </span>
          </button>
        ) : narrationDone ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
          >
            {continueLabel}
          </button>
        ) : (
          <div className="flex h-9 items-center gap-2 font-mono-num text-[11px] text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <span>LISTENING…</span>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
