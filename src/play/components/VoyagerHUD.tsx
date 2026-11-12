import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DialogueMessage } from '../types/game';
import { VoyagerTelemetry } from '../game/voyagerEngine';
import { VoyagerStep, VOYAGER_RANGE_LABEL } from '../missions/voyager/data';
import { DisplayControls } from './DisplayControls';
import { LeaveMission } from './LeaveMission';
import { DialoguePanel } from './HUD';
import { useShortHeight } from '../utils/displayMode';

interface VoyagerHUDProps {
  telemetry: VoyagerTelemetry;
  step: VoyagerStep;
  dialogue: DialogueMessage | null;
  typeDialogue: boolean;
  onDialogueTyped?: () => void;
  showAim: boolean;
  onPitch: (pitch: number) => void;
  onYaw: (yaw: number) => void;
  onAimGrab?: () => void;
  fuelNote?: string | null;
  showInitiate?: boolean;
  onInitiate?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  /** Leave for the home page. */
  onMissions?: () => void;
  showInspectCraft?: boolean;
  onInspectCraft?: () => void;
  inspectCraftDisabled?: boolean;
  /** Part tour is open, so the camera walks around the craft. */
  lookingAround?: boolean;
  /** The archive has been beamed and is waiting on the light-time panel. */
  linkSent?: boolean;
}

const OBJECTIVES: { id: VoyagerStep; label: string }[] = [
  { id: 'align', label: 'Point the dish at Earth' },
  { id: 'plasma', label: 'Read the plasma waves' },
  { id: 'magnetic', label: 'Read the magnetic field' },
  { id: 'particles', label: 'Read the charged particles' },
  { id: 'power', label: 'Face the power limit' },
  { id: 'record', label: 'Open the Golden Record' },
  { id: 'archive', label: 'Complete the final archive' },
  { id: 'outro', label: 'Send the last transmission' }
];

/**
 * Where to draw Earth on the dish dial: the dot sits on the side of the key that turns toward it.
 * A positive yaw error is fixed with the left arrow, so it draws on the left; a positive pitch
 * error is fixed with the up arrow, so it draws above. Distance from the centre is how far off the dish is.
 */
function steerBlip(yaw: number, pitch: number, radius: number) {
  const reach = Math.min(radius - 8, (Math.acos(Math.max(-1, Math.min(1, Math.cos(pitch) * Math.cos(yaw)))) / (Math.PI / 2)) * (radius - 8));
  const dx = -Math.sin(yaw) * Math.cos(pitch);
  const dy = Math.sin(pitch);
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return { x: 0, y: -reach };
  return { x: (dx / length) * reach, y: -(dy / length) * reach };
}

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
  showAim,
  onPitch,
  onYaw,
  onAimGrab,
  fuelNote = null,
  showInitiate = false,
  onInitiate,
  isMuted,
  onToggleMute,
  onMissions,
  showInspectCraft = false,
  onInspectCraft,
  inspectCraftDisabled = false,
  lookingAround = false,
  linkSent = false
}) => {
  const short = useShortHeight();
  const dialRadius = short ? 35 : 52;
  const earth = steerBlip(telemetry.yawError, telemetry.pitchError, dialRadius);
  const marker = blip(telemetry.markerYaw, telemetry.markerPitch, dialRadius);
  // Once the telemetry is sent, the archive and the send are both done.
  const currentIndex = linkSent || step === 'outro'
    ? OBJECTIVES.length
    : Math.max(0, OBJECTIVES.findIndex(item => item.id === step));
  const completed = currentIndex;
  const objectiveNote =
    step === 'align' && telemetry.aligned
      ? 'Dish on Earth'
      : telemetry.hasMarker
          ? `${telemetry.distanceToMarker.toFixed(0)} away`
          : null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6 short:p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-stretch gap-3">
        <div className="pointer-events-auto rounded-lg border border-slate-800/80 bg-slate-950/80 p-3 short:p-2">
          <div className="text-xs font-bold tracking-wider text-slate-200">MISSION 02: VOYAGER 1</div>
          <div className="mt-1 text-xs font-mono-num text-slate-400">
            SIGNAL {Math.round(telemetry.signal * 100)}% · EARTH {telemetry.headingErrorDeg.toFixed(0)}°
          </div>
          <div className="mt-1 max-w-56 text-[10px] font-mono-num leading-relaxed text-slate-500 short:hidden">
            {VOYAGER_RANGE_LABEL} · CROSSED AUG 2012 · RADIO DELAY ABOUT A DAY
          </div>
          <div className="mt-1 text-[10px] font-mono-num text-slate-500">
            {linkSent ? 'TELEMETRY SENT' : lookingAround ? 'PANNING' : '← → YAW · ↑ ↓ PITCH'}
          </div>
          <div className="mt-1 max-w-56 text-[10px] leading-relaxed text-slate-500 short:hidden">
            {linkSent
              ? 'The radio signal is crossing the distance to Earth.'
              : lookingAround
                ? 'The camera pans around Voyager.'
                : 'Turn the craft until the dish points at Earth. Turning spends propellant.'}
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
              <li key={item.id} className={`flex items-center gap-2 ${current ? '' : 'short:hidden'}`}>
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
          {onMissions && <LeaveMission missionLabel="Mission 02" onLeave={onMissions} />}
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
          {(showAim || showInspectCraft || showInitiate) && (
            <div className="pointer-events-auto mb-6 ml-6 flex items-end gap-3">
              {showAim && (
                <AimPad
                  fuel={telemetry.fuel}
                  note={fuelNote}
                  onYaw={onYaw}
                  onPitch={onPitch}
                  onGrab={onAimGrab}
                />
              )}
              {showInspectCraft && onInspectCraft && (
                <button
                  type="button"
                  onClick={onInspectCraft}
                  disabled={inspectCraftDisabled}
                  className="rounded-lg border border-slate-500 bg-slate-950/90 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-950/50 disabled:text-slate-500"
                >
                  Inspect Voyager 1
                </button>
              )}
              {showInitiate && onInitiate && (
                <button
                  type="button"
                  data-coach="voyager-initiate"
                  onClick={onInitiate}
                  className="max-w-[22rem] rounded-lg bg-amber-500 px-4 py-2.5 text-left text-sm font-bold leading-snug text-slate-950"
                >
                  {`INITIATE OBJECTIVE ${currentIndex + 1}: ${OBJECTIVES[currentIndex]?.label ?? ''}`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="pointer-events-auto mb-4 flex flex-col items-end gap-3">
          <div className="relative h-36 w-36 short:h-24 short:w-24 rounded-full border border-slate-700 bg-slate-950/80">
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

function AimPad({
  fuel,
  note,
  onYaw,
  onPitch,
  onGrab
}: {
  fuel: number;
  note: string | null;
  onYaw: (yaw: number) => void;
  onPitch: (pitch: number) => void;
  onGrab?: () => void;
}) {
  const press = (axis: 'yaw' | 'pitch', value: number) => {
    onGrab?.();
    if (axis === 'yaw') onYaw(value);
    else onPitch(value);
  };
  const release = () => {
    onYaw(0);
    onPitch(0);
  };
  const key = (label: string, glyph: string, axis: 'yaw' | 'pitch', value: number) => (
    <button
      type="button"
      aria-label={label}
      onPointerDown={event => {
        event.preventDefault();
        press(axis, value);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-600 bg-slate-950/90 text-lg font-bold text-slate-100 active:bg-slate-700"
    >
      {glyph}
    </button>
  );
  const tank = Math.max(0, Math.min(1, fuel));
  return (
    <div data-coach="voyager-aim" className="flex flex-col items-center gap-2">
      <div className="w-[11rem]">
        <div className="mb-1 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400">
          <span>PROPELLANT</span>
          <span className="font-mono-num">{Math.round(tank * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="meter" aria-valuenow={Math.round(tank * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Propellant">
          <div className={`h-full ${tank < 0.2 ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${tank * 100}%` }} />
        </div>
        {note && <p className="mt-1 max-w-[11rem] text-[10px] font-semibold leading-snug text-rose-200">{note}</p>}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        {key('Up', '▲', 'pitch', 1)}
        <span />
        {key('Left', '◀', 'yaw', -1)}
        <span />
        {key('Right', '▶', 'yaw', 1)}
        <span />
        {key('Down', '▼', 'pitch', -1)}
        <span />
      </div>
    </div>
  );
}
