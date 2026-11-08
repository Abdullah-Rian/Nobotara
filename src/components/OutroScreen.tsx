import React from 'react';
import { RotateCcw, ArrowRight, Compass, Sparkles } from 'lucide-react';

interface OutroScreenProps {
  onReplay: () => void;
  onContinue: () => void;
  outroProgress: number; // 0 to 1
}

export const OutroScreen: React.FC<OutroScreenProps> = ({ onReplay, onContinue, outroProgress }) => {
  const isVoyagerRevealed = outroProgress > 0.55;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 z-20">
      {/* Top Banner */}
      <div className="flex justify-between items-center">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono-num text-slate-300">
          <span>MISSION 01: APOLLO 11 · COMPLETE</span>
        </div>
      </div>

      {/* Outro Cinematic Narrative Card */}
      {isVoyagerRevealed && (
        <div className="max-w-xl mx-auto my-auto bg-slate-950/90 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl text-center space-y-5 pointer-events-auto transition-all duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono-num text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TRANSITION TO DEEP SPACE</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">
            Beyond the Moon
          </h2>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            The footprints at Tranquility Base proved that humanity could leave Earth. But our journey didn't stop at the Moon. We aimed further—beyond the planets, into interstellar space.
          </p>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1">
            <div className="text-[11px] font-mono-num text-amber-400 font-bold">
              UPCOMING // MISSION 02
            </div>
            <div className="text-lg font-bold text-slate-100">
              VOYAGER 1: The Golden Record
            </div>
            <div className="text-xs text-slate-400">
              Traverse the edge of the heliosphere carrying humanity's sights, sounds, and greetings to the stars.
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>CONTINUE TO MISSION 02</span>
            </button>
            <button
              onClick={onReplay}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold rounded-lg text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REPLAY MISSION 01</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Subtitle / Camera note */}
      <div className="text-center text-xs text-slate-500 font-mono-num">
        {!isVoyagerRevealed ? (
          <span>DEPARTING SEA OF TRANQUILITY · ACCELERATING TO DEEP SPACE...</span>
        ) : (
          <span>VOYAGER 1 INTERSTELLAR PROBE · 24 BILLION KM FROM EARTH</span>
        )}
      </div>
    </div>
  );
};
