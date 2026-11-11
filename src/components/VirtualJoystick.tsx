import React, { useRef, useState, useEffect } from 'react';
import { useShortHeight } from '../utils/displayMode';

interface VirtualJoystickProps {
  onMove: (forward: number, turn: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const short = useShortHeight();
  const radius = short ? 32 : 48;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;
    if (distance > radius) {
      normX = (dx / distance) * radius;
      normY = (dy / distance) * radius;
    }

    setKnobPos({ x: normX, y: normY });

    // Invert Y for forward movement (+Y on joystick is downward)
    const forward = -(normY / radius);
    const turn = -(normX / radius); // Left/Right steering
    onMove(forward, turn);
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isDragging, onMove]);

  return (
    <div className="relative select-none pointer-events-auto touch-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`rounded-full bg-slate-900/70 border-2 border-slate-700/80 flex items-center justify-center shadow-lg relative cursor-grab active:cursor-grabbing ${short ? 'w-20 h-20' : 'w-28 h-28'}`}
      >
        {/* Cardinal Direction ticks */}
        <div className="absolute top-2 text-[9px] font-mono-num text-slate-500 font-bold">W</div>
        <div className="absolute bottom-2 text-[9px] font-mono-num text-slate-500 font-bold">S</div>
        <div className="absolute left-2 text-[9px] font-mono-num text-slate-500 font-bold">A</div>
        <div className="absolute right-2 text-[9px] font-mono-num text-slate-500 font-bold">D</div>

        {/* Center Knob */}
        <div
          className={`rounded-full bg-amber-500/90 border border-amber-300 shadow-md flex items-center justify-center transition-transform duration-75 ${short ? 'w-8 h-8' : 'w-12 h-12'}`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`
          }}
        >
          <div className="w-4 h-4 rounded-full bg-amber-200/50" />
        </div>
      </div>
      <div className="text-[10px] text-center text-slate-400 font-mono-num mt-1">
        JOYSTICK
      </div>
    </div>
  );
};
