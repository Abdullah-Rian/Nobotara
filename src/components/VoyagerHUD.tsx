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
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRecord: () => void;
  onInspectCraft?: () => void;
  /** Part tour is open in flight, so yaw and pitch orbit the camera. */
  lookingAround?: boolean;
  lightSpeed: number | null;
}

const STEP_LABEL: Record<VoyagerStep, string> = {
  align: 'STABILISE ORIENTATION',
  cross: 'CROSS THE HELIOSPHERE',
  plasma: 'PLASMA WAVES',
  magnetic: 'MAGNETIC FIELD',
  particles: 'CHARGED PARTICLES',
  power: 'THE COST OF CONTINUING',
  record: 'THE GOLDEN RECORD',
  archive: 'FINAL ARCHIVE',
  outro: 'LAST TRANSMISSION'
};

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
  isMuted,
  onToggleMute,
  onOpenRecord,
  onInspectCraft,
  lookingAround = false,
  lightSpeed
}) => {
  const earth = blip(telemetry.yawError, telemetry.pitchError, 52);
  const marker = blip(telemetry.markerYaw, telemetry.markerPitch, 52);

  const speedLabel = lightSpeed !== null && lightSpeed >= 0.995 ? '1c' : `${(lightSpeed ?? 0).toFixed(2)}c`;

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none md:p-6">
      {lightSpeed !== null && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-20 flex justify-center">
          <div className="rounded-xl bg-slate-950/80 px-5 py-3 text-center">
            <div className="font-mono-num text-4xl font-semibold tracking-wide text-white">{speedLabel}</div>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
              This picture is sped up. Light from Voyager takes about 22 hours.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 pointer-events-auto">
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-3">
          <div className="text-xs font-bold tracking-wider text-slate-200">MISSION 02: VOYAGER 1</div>
          <div className="mt-1 text-xs font-mono-num text-slate-400">
            SIGNAL {Math.round(telemetry.signal * 100)}% · EARTH {telemetry.headingErrorDeg.toFixed(0)}°
          </div>
          <div className="mt-1 max-w-56 text-[10px] font-mono-num leading-relaxed text-slate-500">
            24 BILLION KM · CROSSED AUG 2012 · RADIO DELAY MEASURED IN HOURS
          </div>
          <div className="mt-1 text-[10px] font-mono-num text-slate-500">
            {lookingAround ? '←→ YAW · ↑↓ PITCH LOOK AROUND' : '←→ YAW · ↑↓ PITCH · W/S THRUST'}
          </div>
          <div className="mt-1 max-w-56 text-[10px] leading-relaxed text-slate-500">
            {lookingAround
              ? 'Yaw and pitch move the camera around Voyager. Drag the view to turn it. Thrust returns to flight.'
              : 'Thrust flies along the dish. Pitch and yaw turn the craft to point it.'}
          </div>
          <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-emerald-400" style={{ width: `${Math.round(telemetry.signal * 100)}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="mx-auto rounded-full border border-slate-800/80 bg-slate-950/85 px-4 py-1.5 text-xs font-mono-num text-slate-200">
        {STEP_LABEL[step]}
        {telemetry.hasMarker ? ` · ${telemetry.distanceToMarker.toFixed(0)}` : ''}
        {telemetry.outsideShell && step === 'cross' ? ' · BOUNDARY CROSSED' : ''}
        {telemetry.aligned && step === 'align' ? ' · DISH ON EARTH' : ''}
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col items-start gap-3">
          {dialogue && (
            <DialoguePanel message={dialogue} typewriter={typeDialogue} onTyped={onDialogueTyped} />
          )}
          {onInspectCraft && (
            <button
              type="button"
              onClick={onInspectCraft}
              className="pointer-events-auto ml-6 rounded-lg border border-slate-500 bg-slate-950/90 px-4 py-2.5 text-sm font-bold text-white"
            >
              Inspect Voyager 1
            </button>
          )}
          {showJoystick && (
            <div className="pointer-events-auto mb-6 ml-6 flex items-end gap-3">
              <AxisPad label="YAW" positive="▶" negative="◀" axis="horizontal" knobClass="border-amber-300 bg-amber-400/90" onChange={onYaw} />
              <AxisPad label="PITCH" positive="▲" negative="▼" axis="vertical" knobClass="border-sky-300 bg-sky-400/90" onChange={onPitch} />
              <AxisPad label="THRUST" positive="W" negative="S" axis="vertical" knobClass="border-emerald-300 bg-emerald-400/90" onChange={onThrust} />
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
