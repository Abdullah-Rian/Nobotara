import React, { useEffect, useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';

interface RangingOverlayProps {
  isLaserFiring: boolean;
  onFire: () => void;
  onContinue: () => void;
  onResult?: () => void;
  /** The laser was already fired once in this run: the player may leave without firing again. */
  canSkip?: boolean;
}

export const RangingOverlay: React.FC<RangingOverlayProps> = ({
  isLaserFiring,
  onFire,
  onContinue,
  canSkip = false,
  onResult
}) => {
  const [fired, setFired] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (fired && !isLaserFiring) setShowResult(true);
  }, [fired, isLaserFiring]);

  useEffect(() => {
    if (showResult) onResult?.();
  }, [showResult, onResult]);

  const handleFire = () => {
    if (fired) return;
    setFired(true);
    onFire();
  };

  return (
    // Phones (short screens): a compact panel in the empty sky at the top right, so Earth, the beam and the
    // reflector in the middle of the view stay clear. Larger screens keep the panel at the bottom left.
    <div className="absolute bottom-28 left-6 z-30 w-[min(32rem,calc(100vw-3rem))] pointer-events-auto short:bottom-auto short:left-auto short:top-[calc(env(safe-area-inset-top,0px)+3.25rem)] short:right-[max(0.75rem,calc(env(safe-area-inset-right,0px)+0.5rem))] short:w-[min(19rem,40vw)]">
      <div className="bg-slate-950/92 border border-emerald-700/70 rounded-xl p-4 shadow-2xl short:p-2.5">
        <div className="flex items-center gap-2 mb-2 short:mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse short:w-2 short:h-2" />
          <h3 className="text-sm font-bold text-emerald-300 font-mono-num uppercase tracking-wide short:text-xs">
            Lunar Laser Ranging
          </h3>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed mb-4 short:mb-2 short:text-xs short:leading-snug">
          {showResult
            ? 'The pulse left Earth, struck the retroreflector, and returned.'
            : isLaserFiring
              ? 'Transmitting a 532 nm pulse from McDonald Observatory.'
              : 'The reflector and Earth are in view. Fire the ranging laser.'}
        </p>

        {showResult && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-mono-num bg-slate-900/80 border border-emerald-900/60 p-3 rounded-lg short:mb-2 short:gap-1.5 short:p-2">
            <div>
              <span className="text-slate-400 text-[10px] short:hidden">ROUND-TRIP TIME</span><span className="hidden text-slate-400 text-[9px] short:inline">ROUND TRIP</span>
              <div className="text-emerald-300 font-bold text-sm short:text-[11px] short:whitespace-nowrap">2.56448 s</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] short:hidden">MEASURED DISTANCE</span><span className="hidden text-slate-400 text-[9px] short:inline">DISTANCE</span>
              <div className="text-emerald-300 font-bold text-sm short:text-[11px] short:whitespace-nowrap">384,402.1 km</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] short:hidden">ORBITAL RECESSION</span><span className="hidden text-slate-400 text-[9px] short:inline">RECESSION</span>
              <div className="text-emerald-300 font-bold text-sm short:text-[11px] short:whitespace-nowrap"><span className="short:hidden">+3.8 cm / year</span><span className="hidden short:inline">+3.8 cm/yr</span></div>
            </div>
          </div>
        )}

        <div className="short:flex short:items-center short:gap-2">
        {showResult ? (
          <button
            onClick={onContinue}
            data-coach="apollo-laser-continue"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm short:px-3 short:py-1.5 short:text-xs"
          >
            <span>CONTINUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFire}
            data-coach="apollo-fire"
            disabled={fired}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-lg text-sm short:px-3 short:py-1.5 short:text-xs"
          >
            <Zap className="w-4 h-4" />
            <span>{isLaserFiring ? 'TRANSMITTING...' : 'FIRE LASER'}</span>
          </button>
        )}
        {canSkip && !showResult && (
          <button
            onClick={onContinue}
            className="ml-2 flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-950/85 px-4 py-2.5 text-sm font-bold text-slate-100 hover:bg-slate-900 short:ml-0 short:px-3 short:py-1.5 short:text-xs"
          >
            <span>SKIP</span>
          </button>
        )}
        </div>
      </div>
    </div>
  );
};
