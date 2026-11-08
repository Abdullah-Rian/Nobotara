import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DialogueMessage } from '../types/game';
import { DialoguePanel } from './HUD';
import { DisplayControls } from './DisplayControls';
import { VirtualJoystick } from './VirtualJoystick';
import { MarsTelemetry } from '../game/marsEngine';

interface MarsTarget {
  x: number;
  z: number;
  label: string;
}

interface MarsHUDProps {
  telemetry: MarsTelemetry;
  objective: string;
  target: MarsTarget | null;
  pulseCache: boolean;
  near: boolean;
  interactLabel: string;
  onInteract: () => void;
  onMissions: () => void;
  dialogue: DialogueMessage | null;
  typeDialogue: boolean;
  onDialogueTyped?: () => void;
  showJoystick: boolean;
  showMap: boolean;
  showContinue: boolean;
  onContinue: () => void;
  onJoystickMove: (forward: number, turn: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const SIZE = 168;
const MIN_SPAN = 70;

export const MarsHUD: React.FC<MarsHUDProps> = ({
  telemetry,
  objective,
  target,
  pulseCache,
  near,
  interactLabel,
  onInteract,
  onMissions,
  dialogue,
  typeDialogue,
  onDialogueTyped,
  showJoystick,
  showMap,
  showContinue,
  onContinue,
  onJoystickMove,
  isMuted,
  onToggleMute
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/85 px-4 py-2 shadow-lg">
          <div className="text-[10px] font-mono-num font-bold tracking-wider text-amber-300">MISSION 03 · JEZERO</div>
          <div className="mt-1 text-sm font-bold text-slate-100">{objective}</div>
          <div className="mt-1 text-[11px] font-mono-num text-slate-400">
            {telemetry.speed.toFixed(1)} m/s · range {Math.round(telemetry.rangeRadius)} m
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onMissions}
            className="rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2 text-[11px] font-mono-num text-slate-300"
          >
            MISSIONS
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg border border-slate-700 bg-slate-950/85 p-2 text-slate-200"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <DisplayControls compact />
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          {dialogue && (
            <DialoguePanel message={dialogue} typewriter={typeDialogue} onTyped={onDialogueTyped} />
          )}
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="pointer-events-auto rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              LEAVE THE CRATER
            </button>
          )}
          {showJoystick && (
            <div className="pointer-events-auto mb-4 ml-6 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-2.5">
              <VirtualJoystick onMove={onJoystickMove} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          {near && (
            <button
              type="button"
              onClick={onInteract}
              className="pointer-events-auto rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg"
            >
              <span className="mr-2 rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono-num text-emerald-400">E</span>
              {interactLabel}
            </button>
          )}
          {showMap && <MarsMap telemetry={telemetry} target={target} pulseCache={pulseCache} />}
        </div>
      </div>
    </div>
  );
};

function MarsMap({
  telemetry,
  target,
  pulseCache
}: {
  telemetry: MarsTelemetry;
  target: MarsTarget | null;
  pulseCache: boolean;
}) {
  const rover = telemetry.position;
  const cache = telemetry.cache;
  let minX = Math.min(rover.x, cache.x);
  let maxX = Math.max(rover.x, cache.x);
  let minZ = Math.min(rover.z, cache.z);
  let maxZ = Math.max(rover.z, cache.z);
  if (target) {
    minX = Math.min(minX, target.x);
    maxX = Math.max(maxX, target.x);
    minZ = Math.min(minZ, target.z);
    maxZ = Math.max(maxZ, target.z);
  }
  const span = Math.max(MIN_SPAN, Math.max(maxX - minX, maxZ - minZ) * 1.35);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const scale = (SIZE - 28) / span;
  const toX = (x: number) => SIZE / 2 + (x - centerX) * scale;
  const toY = (z: number) => SIZE / 2 - (z - centerZ) * scale;
  const cacheX = toX(cache.x);
  const cacheY = toY(cache.z);

  return (
    <div className="h-[168px] w-[168px] overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/85 shadow-lg">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Jezero navigation map">
        <circle
          cx={cacheX}
          cy={cacheY}
          r={telemetry.rangeRadius * scale}
          fill="rgba(251, 191, 36, 0.05)"
          stroke="rgba(148, 163, 184, 0.55)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {target && (
          <g>
            <circle cx={toX(target.x)} cy={toY(target.z)} r="4.5" fill="#e2e8f0" stroke="#34d399" strokeWidth="1.5" />
            <text
              x={toX(target.x)}
              y={toY(target.z) - 8}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              {target.label}
            </text>
          </g>
        )}
        <g className={pulseCache ? 'animate-pulse' : undefined}>
          <rect
            x={cacheX - 4}
            y={cacheY - 4}
            width="8"
            height="8"
            fill="#fbbf24"
            transform={`rotate(45 ${cacheX} ${cacheY})`}
          />
          {pulseCache && (
            <text x={cacheX} y={cacheY + 16} textAnchor="middle" fill="#fbbf24" fontSize="8" fontFamily="ui-monospace, monospace">
              RETURN
            </text>
          )}
        </g>
        <g transform={`translate(${toX(rover.x)} ${toY(rover.z)}) rotate(${telemetry.heading})`}>
          <polygon points="0,-8 5.5,6 -5.5,6" fill="#f8fafc" />
        </g>
      </svg>
    </div>
  );
}
