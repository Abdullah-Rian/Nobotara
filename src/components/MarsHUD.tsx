import React from 'react';
import { Check, Navigation, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { DialogueMessage } from '../types/game';
import { DialoguePanel } from './HUD';
import { DisplayControls } from './DisplayControls';
import { VirtualJoystick } from './VirtualJoystick';
import { MarsTelemetry } from '../game/marsEngine';
import { useShortHeight } from '../utils/displayMode';

interface MarsTarget {
  x: number;
  z: number;
  label: string;
}

interface MarsHUDProps {
  telemetry: MarsTelemetry;
  objective: string;
  objectiveShort: string;
  targets: MarsTarget[];
  /** Sites of the current act, ticked as they are finished. Empty outside an act. */
  log: { label: string; done: boolean }[];
  part: { index: number; total: number } | null;
  /** Present while a spoken line can be cut short. */
  onSkipLine?: () => void;
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
  /** Speed, heading and the objective pill only make sense while driving. */
  showStatus: boolean;
  showContinue: boolean;
  onContinue: () => void;
  onJoystickMove: (forward: number, turn: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const DEFAULT_SIZE = 168;
const MIN_SPAN = 70;

export const MarsHUD: React.FC<MarsHUDProps> = ({
  telemetry,
  objective,
  objectiveShort,
  targets,
  log,
  part,
  onSkipLine,
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
  showStatus,
  showContinue,
  onContinue,
  onJoystickMove,
  isMuted,
  onToggleMute
}) => {
  const short = useShortHeight();
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6 short:p-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="max-w-sm rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 short:p-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-mono-num text-xs font-bold uppercase tracking-wider text-slate-200">
                MISSION 03: MARS SAMPLE RETURN
              </span>
              {part && (
                <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono-num text-[10px] text-amber-300">
                  PART {part.index}/{part.total}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 font-mono-num text-xs text-slate-400">
              <span>JEZERO CRATER</span>
              {showStatus && (
                <>
                  <span>·</span>
                  <span>VEL: {telemetry.speed.toFixed(1)} m/s</span>
                  <span>·</span>
                  <span>HDG: {Math.round(telemetry.heading) % 360}°</span>
                </>
              )}
            </div>
          </div>

          {showStatus && (
          <div className="pointer-events-auto absolute left-4 top-1/2 flex items-center gap-4 rounded-full border border-slate-800/80 bg-slate-950/85 px-4 py-1.5 font-mono-num text-xs text-slate-300 short:static short:left-auto short:top-auto short:max-w-full short:-translate-y-0 short:gap-2 short:px-2.5 short:py-1 md:left-6 -translate-y-1/2">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 animate-bounce text-emerald-400" />
              <span className="text-slate-400 short:hidden">ZONE:</span>
              <span className="font-semibold text-slate-200">
                <span className="short:hidden">{objective}</span>
                <span className="hidden short:inline">{objectiveShort}</span>
              </span>
              <span className="ml-1 text-emerald-400">
                ({telemetry.distanceToTarget.toFixed(1)}m)
              </span>
            </div>
          </div>
          )}

          {log.length > 0 && (
            <div
              data-coach="mars-log"
              className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 font-mono-num text-[11px] short:px-1.5 short:py-1"
            >
              <span className="px-1 text-slate-400">
                {log.filter(item => item.done).length}/{log.length}
              </span>
              {log.map(item => (
                <span
                  key={item.label}
                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
                    item.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/80 text-slate-300'
                  }`}
                >
                  {item.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onMissions}
            className="rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2 font-mono-num text-xs text-slate-300"
          >
            MISSIONS
          </button>
          <DisplayControls compact labels="never" />
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-slate-300 transition-colors hover:bg-slate-900"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-auto flex items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          {dialogue && (
            <div className="mb-12 flex flex-col items-end gap-1.5 short:mb-1">
              {onSkipLine && (
                <button
                  type="button"
                  onClick={onSkipLine}
                  className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/85 px-2.5 py-1 font-mono-num text-[11px] text-slate-300 hover:border-slate-500"
                >
                  <SkipForward className="h-3 w-3" />
                  SKIP LINE
                </button>
              )}
              <DialoguePanel message={dialogue} typewriter={typeDialogue} onTyped={onDialogueTyped} />
            </div>
          )}
          {showJoystick && (
            <div data-coach="mars-stick" className="mb-8 ml-10 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-2.5 short:mb-0 short:ml-0 short:p-1.5">
              <VirtualJoystick onMove={onJoystickMove} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950"
            >
              LEAVE THE CRATER
            </button>
          )}
          {near && (
            <div className="flex animate-bounce-subtle flex-col items-end gap-2">
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/60 bg-emerald-950/90 px-3 py-1 font-mono-num text-[11px] text-emerald-300 shadow-lg shadow-emerald-950/50">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                <span>MARKER ZONE ENTERED</span>
              </div>
              <button
                type="button"
                data-coach="mars-interact"
                onClick={onInteract}
                className="flex cursor-pointer items-center gap-3 rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0 active:bg-emerald-600 md:text-base"
              >
                <span className="rounded bg-slate-950 px-2 py-0.5 font-mono-num text-xs font-bold text-emerald-400">
                  PRESS E
                </span>
                <span>{interactLabel}</span>
              </button>
              <span className="font-mono-num text-xs text-emerald-300/80">
                Press [SPACE] or [E] to begin
              </span>
            </div>
          )}
          {showMap && (
            <MarsMap
              telemetry={telemetry}
              targets={targets}
              pulseCache={pulseCache}
              size={short ? 104 : DEFAULT_SIZE}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function MarsMap({
  telemetry,
  targets,
  pulseCache,
  size
}: {
  telemetry: MarsTelemetry;
  targets: MarsTarget[];
  pulseCache: boolean;
  size: number;
}) {
  const rover = telemetry.position;
  const cache = telemetry.cache;
  let minX = Math.min(rover.x, cache.x);
  let maxX = Math.max(rover.x, cache.x);
  let minZ = Math.min(rover.z, cache.z);
  let maxZ = Math.max(rover.z, cache.z);
  for (const target of targets) {
    minX = Math.min(minX, target.x);
    maxX = Math.max(maxX, target.x);
    minZ = Math.min(minZ, target.z);
    maxZ = Math.max(maxZ, target.z);
  }
  const span = Math.max(MIN_SPAN, Math.max(maxX - minX, maxZ - minZ) * 1.35);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const scale = (size - Math.round(28 * size / DEFAULT_SIZE)) / span;
  const toX = (x: number) => size / 2 + (x - centerX) * scale;
  const toY = (z: number) => size / 2 - (z - centerZ) * scale;
  const cacheX = toX(cache.x);
  const cacheY = toY(cache.z);

  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950/85 shadow-lg"
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="Jezero navigation map">
        <circle
          cx={cacheX}
          cy={cacheY}
          r={telemetry.rangeRadius * scale}
          fill="rgba(251, 191, 36, 0.05)"
          stroke="rgba(148, 163, 184, 0.55)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {targets.map(target => (
          <g key={target.label}>
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
        ))}
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
