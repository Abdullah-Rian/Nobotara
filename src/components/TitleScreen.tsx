import React from 'react';
import { ArrowLeft, Play, Volume2, VolumeX } from 'lucide-react';
import { DisplayControls } from './DisplayControls';

interface TitleScreenProps {
  onStart: () => void;
  onStartVoyager: () => void;
  onStartMars: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onStartVoyager,
  onStartMars,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 md:p-12 short:p-3 z-20">
      {/* Top Header / Audio Toggle & 3D Models */}
      <div className="flex justify-between items-center pointer-events-auto">
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-xs" />
            <span className="text-xs uppercase tracking-widest text-slate-400 font-mono-num font-semibold">
              NOBOTARA-71 // HISTORIC SPACE SERIES
            </span>
          </div>
          <a
            href="https://nobotara.pages.dev/"
            className="flex items-center gap-3 rounded-md border border-slate-600/80 bg-slate-950/80 px-[1.125rem] py-[0.5625rem] text-lg font-semibold tracking-wide text-slate-200 transition-colors hover:bg-slate-800"
          >
            <ArrowLeft className="h-[1.3125rem] w-[1.3125rem]" />
            GO BACK
          </a>
        </div>
        <div className="flex items-center gap-2">
          <DisplayControls />
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
      <div className="mt-auto mb-6 w-full">
        <div className="max-w-2xl">
        {/* Inline SVG Title Graphic */}
        <div className="mb-4">
          <svg className="w-full max-w-lg h-auto" viewBox="0 0 520 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="24" fill="#334155" fontSize="13" letterSpacing="4" fontFamily="'Space Mono', monospace" fontWeight="bold">
              MISSION 01 — JULY 20, 1969
            </text>
            <text x="0" y="68" fill="#0f172a" fontSize="44" fontFamily="'Plus Jakarta Sans', sans-serif" fontWeight="800" letterSpacing="-1">
              APOLLO 11
            </text>
          </svg>
        </div>

        <p className="text-lg md:text-xl font-medium text-amber-800 mb-3 tracking-wide">
          The mission that succeeded. The things it left behind.
        </p>

        <p className="text-sm md:text-base text-slate-800 leading-relaxed max-w-xl mb-8 short:mb-3 short:line-clamp-2">
          Drive an explorer rover across the Sea of Tranquility. Inspect what Apollo 11 left behind, find out why each piece stayed, and time a laser pulse between Earth and the Moon.
        </p>
        </div>

        <div className="pointer-events-auto grid w-max max-w-full grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={onStart}
            className="rounded-xl border border-amber-300 bg-slate-950/90 p-4 text-left text-slate-100 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <div className="text-[11px] font-mono-num font-bold text-amber-300">MISSION 01</div>
            <div className="mt-1 flex items-center gap-2 whitespace-nowrap text-sm font-bold">
              <Play className="h-4 w-4 shrink-0 fill-amber-300 text-amber-300" />
              <span>Apollo 11 — ONE GREAT LEAP</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">Sea of Tranquility</div>
          </button>
          <button
            onClick={onStartVoyager}
            className="rounded-xl border border-sky-400/70 bg-slate-950/90 p-4 text-left text-slate-100 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <div className="text-[11px] font-mono-num font-bold text-sky-300">MISSION 02</div>
            <div className="mt-1 whitespace-nowrap text-sm font-bold">Voyager 1 — THE GOLDEN RECORD</div>
            <div className="mt-1 text-xs text-slate-400">The endless journey</div>
          </button>
          <button
            type="button"
            onClick={onStartMars}
            className="rounded-xl border border-orange-400/80 bg-slate-950/90 p-4 text-left text-slate-100 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <div className="text-[11px] font-mono-num font-bold text-orange-300">MISSION 03</div>
            <div className="mt-1 whitespace-nowrap text-sm font-bold">Mars Sample Return</div>
            <div className="mt-1 text-xs text-slate-400">Jezero Crater · An unfinished journey</div>
          </button>
        </div>
        <span className="mt-3 block text-xs text-slate-700 font-mono-num">
          Press [ENTER] or [SPACE] to launch Mission 01
        </span>
      </div>

      {/* Bottom Control Hint Strip */}
      <div className="flex items-center justify-between text-xs text-slate-800 font-mono-num border-t border-slate-700/70 pt-4 short:hidden">
        <span>SEA OF TRANQUILITY · 0.67408° N, 23.47297° E</span>
        <span>WASD Move · Space/E Interact · Esc Close</span>
      </div>
    </div>
  );
};
