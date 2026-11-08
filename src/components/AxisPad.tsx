import React, { useEffect, useRef, useState } from 'react';

interface AxisPadProps {
  label: string;
  positive: string;
  negative: string;
  axis: 'vertical' | 'horizontal';
  knobClass: string;
  onChange: (value: number) => void;
  onGrab?: () => void;
}

export const AxisPad: React.FC<AxisPadProps> = ({ label, positive, negative, axis, knobClass, onChange, onGrab }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onGrabRef = useRef(onGrab);
  onGrabRef.current = onGrab;
  const [knob, setKnob] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const travel = 36;
  const horizontal = axis === 'horizontal';
  onChangeRef.current = onChange;

  const release = () => {
    setIsDragging(false);
    setKnob(0);
    onChangeRef.current(0);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const delta = horizontal
      ? clientX - (rect.left + rect.width / 2)
      : clientY - (rect.top + rect.height / 2);
    const clamped = Math.max(-travel, Math.min(travel, delta));
    setKnob(clamped);
    onChangeRef.current(horizontal ? clamped / travel : -(clamped / travel));
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    onGrabRef.current?.();
    setIsDragging(true);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    updatePosition(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(event.clientX, event.clientY);
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) release();
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isDragging]);

  return (
    <div className="relative select-none touch-none">
      <div className={`flex items-center justify-center ${horizontal ? 'h-28 w-28' : 'h-28 w-14'}`}>
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={release}
          className={`relative flex cursor-grab items-center justify-center rounded-full border-2 border-slate-700/80 bg-slate-900/70 shadow-lg active:cursor-grabbing ${horizontal ? 'h-14 w-28' : 'h-28 w-14'}`}
          aria-label={label}
        >
          {horizontal ? (
            <>
              <div className="absolute left-2 text-[9px] font-bold font-mono-num text-slate-500">{negative}</div>
              <div className="absolute right-2 text-[9px] font-bold font-mono-num text-slate-500">{positive}</div>
            </>
          ) : (
            <>
              <div className="absolute top-2 text-[9px] font-bold font-mono-num text-slate-500">{positive}</div>
              <div className="absolute bottom-2 text-[9px] font-bold font-mono-num text-slate-500">{negative}</div>
            </>
          )}
          <div
            className={`h-10 w-10 rounded-full border shadow-md ${knobClass}`}
            style={{ transform: horizontal ? `translateX(${knob}px)` : `translateY(${knob}px)` }}
          />
        </div>
      </div>
      <div className="mt-1 text-center text-[10px] font-mono-num text-slate-400">{label}</div>
    </div>
  );
};
