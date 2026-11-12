import React, { useEffect, useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';

interface RangingOverlayProps {
  isLaserFiring: boolean;
  onFire: () => void;
  onContinue: () => void;
  onResult?: () => void;
}

export const RangingOverlay: React.FC<RangingOverlayProps> = ({
  isLaserFiring,
  onFire,
  onContinue,
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
    <div className="absolute bottom-28 left-6 z-30 w-[min(32rem,calc(100vw-3rem))] pointer-events-auto">
      <div className="bg-slate-950/92 border border-emerald-700/70 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold text-emerald-300 font-mono-num uppercase tracking-wide">
            Lunar Laser Ranging
          </h3>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed mb-4">
          {showResult
            ? 'The pulse left Earth, struck the retroreflector, and returned.'
            : isLaserFiring
              ? 'Transmitting a 532 nm pulse from McDonald Observatory.'
              : 'The reflector and Earth are in view. Fire the ranging laser.'}
        </p>

        {showResult && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs font-mono-num bg-slate-900/80 border border-emerald-900/60 p-3 rounded-lg">
            <div>
              <span className="text-slate-400 text-[10px]">ROUND-TRIP TIME</span>
              <div className="text-emerald-300 font-bold text-sm">2.56448 s</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">MEASURED DISTANCE</span>
              <div className="text-emerald-300 font-bold text-sm">384,402.1 km</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px]">ORBITAL RECESSION</span>
              <div className="text-emerald-300 font-bold text-sm">+3.8 cm / year</div>
            </div>
          </div>
        )}

        {showResult ? (
          <button
            onClick={onContinue}
            data-coach="apollo-laser-continue"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm"
          >
            <span>CONTINUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFire}
            data-coach="apollo-fire"
            disabled={fired}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-bold rounded-lg text-sm"
          >
            <Zap className="w-4 h-4" />
            <span>{isLaserFiring ? 'TRANSMITTING...' : 'FIRE LASER'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
