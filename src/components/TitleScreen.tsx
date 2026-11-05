import React from 'react';
import { Play, Volume2, VolumeX, Box, HardDrive } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenModels?: () => void;
  onOpenExport?: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
  onOpenModels,
  onOpenExport
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 z-20">
      {/* Top Header / Audio Toggle & 3D Models */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-xs" />
          <span className="text-xs uppercase tracking-widest text-slate-400 font-mono-num font-semibold">
            NOBOTARA-71 // HISTORIC SPACE SERIES
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
              title="Save project to Kingston drive / local PC"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>SAVE TO PC</span>
            </button>
          )}
          {onOpenModels && (
            <button
              onClick={onOpenModels}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
              title="Import custom Blender 3D models"
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span>3D MODELS</span>
            </button>
          )}
          <button
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isMuted ? 'AUDIO OFF' : 'AUDIO ON'}</span>
          </button>
        </div>
      </div>

      {/* Main Title Centerpiece Lockup */}
      <div className="max-w-2xl my-auto">
        {/* Inline SVG Title Graphic */}
        <div className="mb-4">
          <svg className="w-full max-w-lg h-auto" viewBox="0 0 520 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="24" fill="#94a3b8" fontSize="13" letterSpacing="4" fontFamily="'Space Mono', monospace" fontWeight="bold">
              MISSION 01 — JULY 20, 1969
            </text>
            <text x="0" y="68" fill="#f8fafc" fontSize="44" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" letterSpacing="-1">
              APOLLO 11
            </text>
          </svg>
        </div>

        <p className="text-lg md:text-xl font-medium text-amber-300/90 mb-3 tracking-wide">
          The mission that succeeded. The things it left behind.
        </p>

        <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl mb-8">
          Pilot an autonomous lunar explorer rover across the Sea of Tranquility. Inspect the artifacts left behind at the historic landing site, discover the scientific reasons they remained, and conduct a live laser measurement between Earth and the Moon.
        </p>

        {/* Start Mission CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pointer-events-auto">
          <button
            onClick={onStart}
            className="flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-amber-500/20 transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 text-base tracking-wide"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            START MISSION
          </button>
          <span className="text-xs text-slate-400 font-mono-num">
            Press [ENTER] or [SPACE] to launch
          </span>
        </div>
      </div>

      {/* Bottom Control Hint Strip */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num border-t border-slate-800/80 pt-4">
        <span>SEA OF TRANQUILITY · 0.67408° N, 23.47297° E</span>
        <span>WASD Move · Space/E Interact · Esc Close</span>
      </div>
    </div>
  );
};
