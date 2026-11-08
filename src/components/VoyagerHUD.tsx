import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DialogueMessage } from '../types/game';
import { VoyagerTelemetry } from '../game/voyagerEngine';
import { VoyagerStep } from '../missions/voyager/data';
import { DisplayControls } from './DisplayControls';
import { AxisPad } from './AxisPad';
import { DialoguePanel } from './HUD';

interface VoyagerHUDProps {
  telemetry: VoyagerTelemetry;
  step: VoyagerStep;
  dialogue: DialogueMessage | null;
  typeDialogue: boolean;
  onDialogueTyped?: () => void;
  showJoystick: boolean;
  onPitch: (pitch: number) => void;
  onYaw: (yaw: number) => void;
  onThrust: (thrust: number) => void;
  onStickGrab?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRecord: () => void;
  onInspectCraft?: () => void;
  /** Part tour is open in flight, so yaw and pitch orbit the camera. */
  lookingAround?: boolean;
  /** Mission Control's tour. Touching yaw, pitch, or thrust leaves it. */
  stickLeavesInspect?: boolean;
}

const OBJECTIVES: { id: VoyagerStep; label: string }[] = [
  { id: 'align', label: 'Point the dish at Earth' },
  { id: 'cross', label: 'Cross the heliosphere' },
  { id: 'plasma', label: 'Read the plasma waves' },
  { id: 'magnetic', label: 'Read the magnetic field' },
  { id: 'particles', label: 'Count the charged particles' },
  { id: 'power', label: 'Face the power limit' },
  { id: 'record', label: 'Open the Golden Record' },
  { id: 'archive', label: 'Complete the final archive' },
  { id: 'outro', label: 'Send the last transmission' }
];

function blip(yaw: number, pitch: number, radius: number) {
  const reach = Math.min(radius - 8, (Math.acos(Math.max(-1, Math.min(1, Math.cos(pitch) * Math.cos(yaw)))) / (Math.PI / 2)) * (radius - 8));
  return {
    x: Math.sin(yaw) * reach,
    y: -Math.cos(yaw) * reach
  };
}

export const VoyagerHUD: React.FC<VoyagerHUDProps> = ({
  telemetry,
  step,
  dialogue,
  typeDialogue,
  onDialogueTyped,
  showJoystick,
  onPitch,
  onYaw,
  onThrust,
  onStickGrab,
  isMuted,
  onToggleMute,
  onOpenRecord,
  onInspectCraft,
  lookingAround = false,
  stickLeavesInspect = false
}) => {
  const earth = blip(telemetry.yawError, telemetry.pitchError, 52);
  const marker = blip(telemetry.markerYaw, telemetry.markerPitch, 52);
  const currentIndex = Math.max(0, OBJECTIVES.findIndex(item => item.id === step));
  const completed = currentIndex;
  const objectiveNote =
    step === 'align' && telemetry.aligned
      ? 'Dish on Earth'
      : step === 'cross' && telemetry.outsideShell
        ? 'Boundary crossed'
        : telemetry.hasMarker
          ? `${telemetry.distanceToMarker.toFixed(0)} away`
          : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-stretch gap-3">
        <div className="pointer-events-auto rounded-lg border border-slate-800/80 bg-slate-950/80 p-3">
          <div className="text-xs font-bold tracking-wider text-slate-200">MISSION 02: VOYAGER 1</div>
          <div className="mt-1 text-xs font-mono-num text-slate-400">
            SIGNAL {Math.round(telemetry.signal * 100)}% · EARTH {telemetry.headingErrorDeg.toFixed(0)}°
          </div>
          <div className="mt-1 max-w-56 text-[10px] font-mono-num leading-relaxed text-slate-500">
            24 BILLION KM · CROSSED AUG 2012 · RADIO DELAY MEASURED IN HOURS
          </div>
          <div className="mt-1 text-[10px] font-mono-num text-slate-500">
            {lookingAround
              ? !showJoystick
                ? 'PANNING'
                : stickLeavesInspect
                  ? 'PANNING · STICK OR KEYS TO FLY'
                  : 'PANNING · ←→ YAW · ↑↓ PITCH STEER'
              : '←→ YAW · ↑↓ PITCH · W/S THRUST'}
          </div>
          <div className="mt-1 max-w-56 text-[10px] leading-relaxed text-slate-500">
            {lookingAround
              ? !showJoystick
                ? 'The camera pans around Voyager.'
                : stickLeavesInspect
                  ? 'The camera pans around Voyager. A stick or the flight keys returns you to flight.'
                  : 'The camera pans around Voyager. Yaw, pitch, and dragging steer that view. Thrust returns to flight.'
              : 'Thrust flies along the dish. Pitch and yaw turn the craft to point it.'}
          </div>
          <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-emerald-400" style={{ width: `${Math.round(telemetry.signal * 100)}%` }} />
          </div>
        </div>
        <div className="pointer-events-none relative z-40">
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400">
            <span>Mission Objectives</span>
            <span className="font-mono-num">{completed}/{OBJECTIVES.length}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={OBJECTIVES.length}
            aria-valuenow={completed}
            aria-label="Mission progress"
          >
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${(completed / OBJECTIVES.length) * 100}%` }}
            />
          </div>
        </div>
        <ol aria-label="Objectives" className="flex flex-col gap-1.5">
          {OBJECTIVES.map((item, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li key={item.id} className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                    done
                      ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                      : current
                        ? 'border-amber-200/80 bg-slate-950/80 text-transparent'
                        : 'border-slate-700 bg-slate-950/50 text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : ''}
                </span>
                <span
                  className={`min-w-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${
                    done
                      ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                      : current
                        ? 'border-slate-500 bg-slate-950/90 text-white'
                        : 'border-slate-800/80 bg-slate-950/55 text-slate-500'
                  }`}
                >
                  {item.label}
                  {current && objectiveNote ? (
                    <span className="mt-0.5 block text-[10px] font-medium tracking-wide text-emerald-300">{objectiveNote}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
        </div>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <DisplayControls compact labels="never" />
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-slate-300"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          {dialogue && (
            <div className="pointer-events-auto relative z-40">
              <DialoguePanel message={dialogue} typewriter={typeDialogue} onTyped={onDialogueTyped} />
            </div>
          )}
          {(showJoystick || onInspectCraft) && (
            <div className="pointer-events-auto mb-6 ml-6 flex items-start gap-3">
              {showJoystick && (
                <>
                  <AxisPad label="YAW" positive="▶" negative="◀" axis="horizontal" knobClass="border-amber-300 bg-amber-400/90" onChange={onYaw} onGrab={onStickGrab} />
                  <AxisPad label="PITCH" positive="▲" negative="▼" axis="vertical" knobClass="border-sky-300 bg-sky-400/90" onChange={onPitch} onGrab={onStickGrab} />
                  <AxisPad label="THRUST" positive="W" negative="S" axis="vertical" knobClass="border-emerald-300 bg-emerald-400/90" onChange={onThrust} onGrab={onStickGrab} />
                </>
              )}
              {onInspectCraft && (
                <div className="flex h-28 items-center">
                  <button
                    type="button"
                    onClick={onInspectCraft}
                    className="rounded-lg border border-slate-500 bg-slate-950/90 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Inspect Voyager 1
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-auto mb-4 flex flex-col items-end gap-3">
          {step === 'record' && (
            <button
              type="button"
              onClick={onOpenRecord}
              className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950"
            >
              OPEN THE GOLDEN RECORD
            </button>
          )}
          <div className="relative h-36 w-36 rounded-full border border-slate-700 bg-slate-950/80">
            <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] font-mono-num text-slate-500">DISH</div>
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-0">
              <div className="mx-auto h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-slate-100" />
            </div>
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-sky-400"
              style={{ left: `calc(50% + ${earth.x}px - 5px)`, top: `calc(50% + ${earth.y}px - 5px)` }}
              title="Earth"
            />
            {telemetry.hasMarker && (
              <div
                className="absolute h-2 w-2 rounded-full bg-emerald-300"
                style={{ left: `calc(50% + ${marker.x}px - 4px)`, top: `calc(50% + ${marker.y}px - 4px)` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
