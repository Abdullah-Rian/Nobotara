import { useEffect, useRef, useState } from 'react';

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
  /**
   * 'hint' (default): caption, plus the hand if `hand`.
   * 'highlight': no caption or hand; the control itself pulses (used for buttons).
   * 'caption+highlight': the caption, and the control pulses.
   */
  style?: 'hint' | 'highlight' | 'caption+highlight';
};

/** The attribute play.css animates on a highlighted control. */
const ATTENTION = 'data-attention';

function clearAttention() {
  document.querySelectorAll(`[${ATTENTION}]`).forEach(node => node.removeAttribute(ATTENTION));
}

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

function chooseSide(rect: DOMRect, vw: number, vh: number, hand: number): Side {
  const need = hand + GAP + 8;
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
  /** Things the hint text must not cover, such as the narration panel (data-coach-avoid). */
  const [avoid, setAvoid] = useState<DOMRect[]>([]);
  /** Height of the caption as last drawn, so it can be kept clear of its target. */
  const captionHeightRef = useRef(0);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    if (!beat) return;
    let frame = 0;
    const highlight = beat.style === 'highlight' || beat.style === 'caption+highlight';
    const tick = () => {
      const element = coachElement(beat.pointAt);
      // Set every frame: React may re-create the control while the beat is showing.
      if (highlight && element && !element.hasAttribute(ATTENTION)) element.setAttribute(ATTENTION, '');
      setRect(element ? element.getBoundingClientRect() : null);
      setAvoid(
        [...document.querySelectorAll('[data-coach-avoid]')]
          .map(node => node.getBoundingClientRect())
          .filter(box => box.width > 0 && box.height > 0)
      );
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearAttention();
    };
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
  if (beat.style === 'highlight') return null;

  const short = viewport.h <= 500;
  const hand = short ? 40 : HAND;
  const captionWidth = Math.min(short ? 180 : 260, viewport.w - MARGIN * 2);
  const captionClass = short
    ? 'absolute rounded-lg border border-amber-300/80 bg-slate-950/95 px-2 py-1 text-xs font-semibold leading-snug text-slate-100 shadow-lg'
    : 'absolute rounded-lg border border-amber-300/80 bg-slate-950/95 px-3 py-2 text-sm font-semibold leading-snug text-slate-100 shadow-lg';

  if (!beat.hand) {
    let left = rect.left + rect.width / 2 - captionWidth / 2;
    left = clamp(left, MARGIN, viewport.w - captionWidth - MARGIN);
    let top = rect.top - (short ? 48 : 78);
    if (top < MARGIN) top = clamp(rect.bottom + GAP, MARGIN, viewport.h - 52);
    return (
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <p
          role="status"
          className={captionClass}
          style={{ left, top, width: captionWidth }}
        >
          {beat.text}
        </p>
      </div>
    );
  }

  const side = chooseSide(rect, viewport.w, viewport.h, hand);
  const nudge = { above: [0, 7], below: [0, -7], left: [7, 0], right: [-7, 0] }[side];
  const rotation = { above: 225, below: 45, left: 135, right: 315 }[side];
  let handLeft = rect.left + rect.width / 2 - hand / 2;
  let handTop = rect.top - hand - GAP;
  if (side === 'below') {
    handLeft = rect.left + rect.width / 2 - hand / 2;
    handTop = rect.bottom + GAP;
  } else if (side === 'left') {
    handLeft = rect.left - hand - GAP;
    handTop = rect.top + rect.height / 2 - hand / 2;
  } else if (side === 'right') {
    handLeft = rect.right + GAP;
    handTop = rect.top + rect.height / 2 - hand / 2;
  }
  handLeft = clamp(handLeft, MARGIN, viewport.w - hand - MARGIN);
  handTop = clamp(handTop, MARGIN, viewport.h - hand - MARGIN);

  let captionLeft = side === 'left' ? handLeft - captionWidth - GAP : handLeft + hand + GAP;
  if (captionLeft + captionWidth > viewport.w - MARGIN) captionLeft = handLeft - captionWidth - GAP;
  captionLeft = clamp(captionLeft, MARGIN, viewport.w - captionWidth - MARGIN);
  let captionTop = clamp(handTop + (hand - (short ? 36 : 52)) / 2, MARGIN, viewport.h - (short ? 40 : 56));

  // The text must never cover what it points at, the hand, or anything marked data-coach-avoid
  // (the narration panel). Try a few places in order and take the first that is clear;
  // if none is, take the one that covers least.
  const captionHeight = captionHeightRef.current || (short ? 32 : 40);
  const blockers = [
    { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
    { x: handLeft, y: handTop, w: hand, h: hand },
    ...avoid.map(box => ({ x: box.left, y: box.top, w: box.width, h: box.height }))
  ];
  const coverage = (left: number, top: number) =>
    blockers.reduce((sum, b) => {
      const w = Math.min(left + captionWidth, b.x + b.w + 4) - Math.max(left, b.x - 4);
      const h = Math.min(top + captionHeight, b.y + b.h + 4) - Math.max(top, b.y - 4);
      return w > 0 && h > 0 ? sum + w * h : sum;
    }, 0);
  const fitX = (x: number) => clamp(x, MARGIN, viewport.w - captionWidth - MARGIN);
  const fitY = (y: number) => clamp(y, MARGIN, viewport.h - captionHeight - MARGIN);
  const handOnRight = handLeft >= rect.left + rect.width / 2;
  const centredX = fitX(rect.left + rect.width / 2 - captionWidth / 2);
  const candidates: Array<[number, number]> = [
    [captionLeft, captionTop],
    // beside the target, on the side away from the hand
    [fitX(handOnRight ? rect.left - captionWidth - GAP : rect.right + GAP), fitY(rect.top + rect.height / 2 - captionHeight / 2)],
    // above the target and hand
    [centredX, fitY(Math.min(rect.top, handTop) - captionHeight - GAP)],
    // above, lined up with the target's far edge
    [fitX(handOnRight ? rect.right - captionWidth : rect.left), fitY(Math.min(rect.top, handTop) - captionHeight - GAP)],
    // below the target and hand
    [centredX, fitY(Math.max(rect.bottom, handTop + hand) + GAP)]
  ];
  let best = candidates[0];
  let bestCover = coverage(best[0], best[1]);
  for (const candidate of candidates) {
    if (bestCover === 0) break;
    const cover = coverage(candidate[0], candidate[1]);
    if (cover < bestCover) {
      best = candidate;
      bestCover = cover;
    }
  }
  [captionLeft, captionTop] = best;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div
        className="coach-hand absolute"
        style={{
          left: handLeft,
          top: handTop,
          width: hand,
          height: hand,
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
        ref={element => {
          if (element) captionHeightRef.current = element.offsetHeight;
        }}
        className={captionClass}
        style={{ left: captionLeft, top: captionTop, width: captionWidth }}
      >
        {beat.text}
      </p>
    </div>
  );
}
