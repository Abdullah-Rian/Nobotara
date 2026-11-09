import { useEffect, useState } from 'react';

export type CoachBeat = {
  id: string;
  text: string;
  /** `data-coach` value of the control the hint belongs to. */
  pointAt: string;
  /** Draw the pointing hand. A caption-only beat still anchors to the control. */
  hand: boolean;
  /** Controls whose first press dismisses the beat. Defaults to the pointed-at control. */
  dismissOn?: string[];
  /** Also dismiss when the player drives with the keyboard. */
  dismissOnDrive?: boolean;
};

type Side = 'above' | 'below' | 'left' | 'right';

const HAND = 64;
const GAP = 18;
const MARGIN = 12;
const DRIVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
]);

function coachElement(id: string) {
  return document.querySelector(`[data-coach="${id}"]`);
}

function chooseSide(rect: DOMRect, vw: number, vh: number): Side {
  const need = HAND + GAP + 8;
  const canRight = vw - rect.right > need;
  const canLeft = rect.left > need;
  const canAbove = rect.top > need;
  const canBelow = vh - rect.bottom > need;
  if (rect.bottom > vh * 0.62) {
    if (canRight) return 'right';
    if (canLeft) return 'left';
  }
  if (rect.top < vh * 0.28 && canBelow) return 'below';
  if (canAbove) return 'above';
  if (canBelow) return 'below';
  if (canRight) return 'right';
  if (canLeft) return 'left';
  return 'above';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function ObjectiveCoach({
  beat,
  onDismiss
}: {
  beat: CoachBeat | null;
  onDismiss: (id: string) => void;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    if (!beat) return;
    let frame = 0;
    const tick = () => {
      const element = coachElement(beat.pointAt);
      setRect(element ? element.getBoundingClientRect() : null);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [beat]);

  useEffect(() => {
    if (!beat) return;
    const dismiss = () => onDismiss(beat.id);
    const targets = beat.dismissOn ?? [beat.pointAt];
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      const hit = targets.some(id => {
        const element = coachElement(id);
        return element?.contains(event.target as Node);
      });
      if (hit) dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (beat.dismissOnDrive && DRIVE_KEYS.has(event.code)) dismiss();
    };
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [beat, onDismiss]);

  if (!beat || !rect || rect.width === 0) return null;

  const captionWidth = Math.min(260, viewport.w - MARGIN * 2);

  if (!beat.hand) {
    let left = rect.left + rect.width / 2 - captionWidth / 2;
    left = clamp(left, MARGIN, viewport.w - captionWidth - MARGIN);
    let top = rect.top - 78;
    if (top < MARGIN) top = clamp(rect.bottom + GAP, MARGIN, viewport.h - 52);
    return (
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <p
          role="status"
          className="absolute rounded-lg border border-amber-300/80 bg-slate-950/95 px-3 py-2 text-sm font-semibold leading-snug text-slate-100 shadow-lg"
          style={{ left, top, width: captionWidth }}
        >
          {beat.text}
        </p>
      </div>
    );
  }

  const side = chooseSide(rect, viewport.w, viewport.h);
  const nudge = { above: [0, 7], below: [0, -7], left: [7, 0], right: [-7, 0] }[side];
  const rotation = { above: 225, below: 45, left: 135, right: 315 }[side];
  let handLeft = rect.left + rect.width / 2 - HAND / 2;
  let handTop = rect.top - HAND - GAP;
  if (side === 'below') {
    handLeft = rect.left + rect.width / 2 - HAND / 2;
    handTop = rect.bottom + GAP;
  } else if (side === 'left') {
    handLeft = rect.left - HAND - GAP;
    handTop = rect.top + rect.height / 2 - HAND / 2;
  } else if (side === 'right') {
    handLeft = rect.right + GAP;
    handTop = rect.top + rect.height / 2 - HAND / 2;
  }
  handLeft = clamp(handLeft, MARGIN, viewport.w - HAND - MARGIN);
  handTop = clamp(handTop, MARGIN, viewport.h - HAND - MARGIN);

  let captionLeft = side === 'left' ? handLeft - captionWidth - GAP : handLeft + HAND + GAP;
  if (captionLeft + captionWidth > viewport.w - MARGIN) captionLeft = handLeft - captionWidth - GAP;
  captionLeft = clamp(captionLeft, MARGIN, viewport.w - captionWidth - MARGIN);
  const captionTop = clamp(handTop + (HAND - 52) / 2, MARGIN, viewport.h - 56);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div
        className="coach-hand absolute"
        style={{
          left: handLeft,
          top: handTop,
          width: HAND,
          height: HAND,
          ['--coach-x' as string]: `${nudge[0]}px`,
          ['--coach-y' as string]: `${nudge[1]}px`
        }}
      >
        <svg
          viewBox="-8 -8 116 116"
          className="h-full w-full overflow-visible"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
          aria-hidden="true"
        >
          <path
            fill="#fbbf24"
            stroke="#0f172a"
            strokeWidth="5.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            d="M0 5.8 L0.8 3.3 L3.3 0.8 L6.2 0 L8.6 0.4 L95.5 31 L99.2 33.9 L100 36.8 L99.6 39.3 L98.8 40.9 L95.9 43 L57.2 54.5 L53.9 58.3 L42.8 96.3 L42 97.9 L39.1 100 L35 100 L33.3 99.2 L30.9 95.9 L0 6.2 Z"
          />
        </svg>
      </div>
      <p
        role="status"
        className="absolute rounded-lg border border-amber-300/80 bg-slate-950/95 px-3 py-2 text-sm font-semibold leading-snug text-slate-100 shadow-lg"
        style={{ left: captionLeft, top: captionTop, width: captionWidth }}
      >
        {beat.text}
      </p>
    </div>
  );
}
