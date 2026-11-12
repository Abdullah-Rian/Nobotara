import React, { useEffect, useRef } from 'react';
import { VOYAGER_PARTS, VoyagerPartFrame } from '../missions/voyager/parts';

interface VoyagerPartsProps {
  readFrame: () => VoyagerPartFrame | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Keep chips below the skip control and the mission title. */
  clearTop: number;
  /** Keep chips above the flight sticks and the dish dial. */
  clearBottom: number;
}

const CHIP_GAP = 104;

const SPREAD: Record<string, [number, number]> = {
  antenna: [0.2, -1],
  record: [-0.9, 0.55],
  power: [0.95, 0.45],
  magnetometer: [-0.15, 1],
  science: [-0.85, -0.55]
};

function edgeToward(rect: DOMRect, targetX: number, targetY: number) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const sx = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(sx, sy);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Name chips and leader lines for the five Voyager parts.
 * Positions update on the elements so the description card does not re-render every frame.
 */
export const VoyagerParts: React.FC<VoyagerPartsProps> = ({
  readFrame,
  selectedId,
  onSelect,
  clearTop,
  clearBottom
}) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lineRefs = useRef<Array<SVGLineElement | null>>([]);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const bindButton = useRef(VOYAGER_PARTS.map((_, index) => (element: HTMLButtonElement | null) => {
    buttonRefs.current[index] = element;
    if (element && element.dataset.bound !== '1') {
      element.dataset.bound = '1';
      element.style.visibility = 'hidden';
    }
  }));
  const bindLine = useRef(VOYAGER_PARTS.map((_, index) => (element: SVGLineElement | null) => {
    lineRefs.current[index] = element;
    if (element && element.dataset.bound !== '1') {
      element.dataset.bound = '1';
      element.style.opacity = '0';
    }
  }));
  const bindDot = useRef(VOYAGER_PARTS.map((_, index) => (element: SVGCircleElement | null) => {
    dotRefs.current[index] = element;
    if (element && element.dataset.bound !== '1') {
      element.dataset.bound = '1';
      element.style.opacity = '0';
    }
  }));
  const selected = VOYAGER_PARTS.find(part => part.id === selectedId);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const data = readFrame();
      const buttons = buttonRefs.current;
      const lines = lineRefs.current;
      const dots = dotRefs.current;
      const placed: Array<{ x: number; y: number; visible: boolean }> = [];

      VOYAGER_PARTS.forEach((part, index) => {
        const point = data?.parts[index];
        const visible = Boolean(point?.visible);
        const button = buttons[index];
        if (!point || !visible || !button) {
          placed.push({ x: 0, y: 0, visible: false });
          if (button) button.style.visibility = 'hidden';
          const line = lines[index];
          const dot = dots[index];
          if (line) line.style.opacity = '0';
          if (dot) dot.style.opacity = '0';
          return;
        }
        const originX = data?.centerX ?? window.innerWidth / 2;
        const originY = data?.centerY ?? window.innerHeight / 2;
        let dx = point.x - originX;
        let dy = point.y - originY;
        const length = Math.hypot(dx, dy);
        if (length < 28) {
          const spread = SPREAD[part.id] ?? [0, -1];
          dx = spread[0];
          dy = spread[1];
        } else {
          dx /= length;
          dy /= length;
        }
        placed.push({ x: point.x + dx * CHIP_GAP, y: point.y + dy * CHIP_GAP, visible: true });
      });

      const separate = () => {
        for (let pass = 0; pass < 10; pass++) {
          for (let i = 0; i < placed.length; i++) {
            if (!placed[i].visible) continue;
            const button = buttons[i];
            if (!button) continue;
            for (let j = i + 1; j < placed.length; j++) {
              if (!placed[j].visible) continue;
              const other = buttons[j];
              if (!other) continue;
              const width = (button.offsetWidth + other.offsetWidth) / 2 + 14;
              const height = (button.offsetHeight + other.offsetHeight) / 2 + 12;
              let dx = placed[j].x - placed[i].x;
              let dy = placed[j].y - placed[i].y;
              if (dx === 0 && dy === 0) {
                const angle = (j + 1) * 1.25;
                dx = Math.cos(angle);
                dy = Math.sin(angle);
              }
              const nx = dx / width;
              const ny = dy / height;
              const overlap = Math.hypot(nx, ny);
              if (overlap >= 1) continue;
              const push = (1 - overlap) * 0.55;
              const px = (nx / overlap) * width * push;
              const py = (ny / overlap) * height * push;
              placed[j].x += px;
              placed[j].y += py;
              placed[i].x -= px;
              placed[i].y -= py;
            }
          }
        }
      };
      const maxX = window.innerWidth - 8;
      const maxY = window.innerHeight - clearBottom;
      const clampSpots = () => {
        for (let i = 0; i < placed.length; i++) {
          if (!placed[i].visible) continue;
          const button = buttons[i];
          if (!button) continue;
          const halfW = button.offsetWidth / 2;
          const halfH = button.offsetHeight / 2;
          const topLimit = Math.max(clearTop + halfH, 8 + halfH);
          const bottomLimit = Math.max(topLimit, maxY - halfH);
          placed[i].x = Math.min(Math.max(placed[i].x, 8 + halfW), maxX - halfW);
          placed[i].y = Math.min(Math.max(placed[i].y, topLimit), bottomLimit);
        }
      };
      separate();
      clampSpots();
      separate();
      clampSpots();

      VOYAGER_PARTS.forEach((part, index) => {
        const button = buttons[index];
        const line = lines[index];
        const dot = dots[index];
        const spot = placed[index];
        const point = data?.parts[index];
        if (!button || !line || !dot || !spot?.visible || !point) return;
        const left = spot.x;
        const top = spot.y;
        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.style.visibility = 'visible';
        const rect = button.getBoundingClientRect();
        const start = edgeToward(rect, point.x, point.y);
        line.setAttribute('x1', String(start.x));
        line.setAttribute('y1', String(start.y));
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
  }, [readFrame, clearTop, clearBottom]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <svg className="h-full w-full" aria-hidden="true">
        {VOYAGER_PARTS.map((part, index) => (
          <g key={part.id}>
            <line
              ref={bindLine.current[index]}
              stroke="#f8fafc"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle ref={bindDot.current[index]} r="4.5" fill="#f8fafc" />
          </g>
        ))}
      </svg>
      {VOYAGER_PARTS.map((part, index) => (
        <button
          key={part.id}
          ref={bindButton.current[index]}
          type="button"
          onClick={() => onSelect(part.id)}
          aria-pressed={selectedId === part.id}
          className={`pointer-events-auto fixed z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-semibold shadow-lg short:px-1.5 short:py-0.5 short:text-[11px] ${
            selectedId === part.id
              ? 'border-amber-300 bg-amber-400 text-slate-950'
              : 'border-white/85 bg-slate-950/90 text-white'
          }`}
        >
          {part.name}
        </button>
      ))}
      {selected && (
        <div className="pointer-events-auto absolute left-1/2 top-52 z-40 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-slate-600 bg-slate-950/92 px-4 py-3 text-left shadow-xl">
          <div className="text-xs font-bold tracking-wide text-amber-200">{selected.name}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{selected.description}</p>
        </div>
      )}
    </div>
  );
};
