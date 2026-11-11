import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Compass, Radio, CheckCircle, Navigation } from 'lucide-react';
import { ArtifactId, DialogueMessage, MarkerId, ObjectiveStep, RoverTelemetry } from '../types/game';
import { ARTIFACTS } from '../data/artifactsData';
import { apolloAudio } from '../audio/apolloAudio';
import { VirtualJoystick } from './VirtualJoystick';
import { NavMap } from './NavMap';
import { DisplayControls } from './DisplayControls';
import { useShortHeight } from '../utils/displayMode';

interface HUDProps {
  telemetry: RoverTelemetry;
  nearArtifact: MarkerId | null;
  objective: ObjectiveStep;
  laserCompleted: boolean;
  artifactsVisited: Record<ArtifactId, boolean>;
  activeDialogue: DialogueMessage | null;
  onInteract: () => void;
  onJoystickMove: (forward: number, turn: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenChallenge: () => void;
  canOpenChallenge: boolean;
  showJoystick?: boolean;
  showMap?: boolean;
  typeDialogue?: boolean;
  onDialogueTyped?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  nearArtifact,
  objective,
  laserCompleted,
  artifactsVisited,
  activeDialogue,
  onInteract,
  onJoystickMove,
  isMuted,
  onToggleMute,
  onOpenChallenge,
  canOpenChallenge,
  showJoystick = true,
  showMap = false,
  typeDialogue = false,
  onDialogueTyped
}) => {
  const short = useShortHeight();
  const visitedCount = Object.values(artifactsVisited).filter(Boolean).length;
  const activeArtifactData = nearArtifact && nearArtifact !== 'laser_station' ? ARTIFACTS[nearArtifact] : null;
  const objectiveLabel: Record<Exclude<ObjectiveStep, 'free'>, string> = {
    lander: 'OBJECTIVE 1 · EAGLE DESCENT STAGE',
    retroreflector: 'OBJECTIVE 2 · LASER RETROREFLECTOR',
    laser: 'OBJECTIVE 3 · LASER RANGING',
    plaque: 'OBJECTIVE 4 · COMMEMORATIVE PLAQUE'
  };
  const objectiveShort: Record<Exclude<ObjectiveStep, 'free'>, string> = {
    lander: 'EAGLE',
    retroreflector: 'RETROREFLECTOR',
    laser: 'LASER',
    plaque: 'PLAQUE'
  };
  const zoneName = objective !== 'free'
    ? objectiveLabel[objective]
    : nearArtifact === 'laser_station'
      ? 'LASER STATION [IN MARKER]'
      : activeArtifactData
        ? `${activeArtifactData.shortName} [IN MARKER]`
        : 'AREA MARKER';
  const zoneShort = objective !== 'free'
    ? objectiveShort[objective]
    : nearArtifact === 'laser_station'
      ? 'LASER'
      : activeArtifactData
        ? activeArtifactData.shortName
        : 'MARKER';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 short:p-2 z-10 overflow-hidden">
      {/* Top Bar: Mission Info & Telemetry Status */}
      <div className="flex justify-between items-start gap-4 pointer-events-auto">
        {/* Mission Cluster */}
        <div className="flex min-w-0 flex-col items-start gap-2">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 short:p-2 max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-xs font-bold tracking-wider text-slate-200 font-mono-num uppercase">
              MISSION 01: APOLLO 11
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono-num flex items-center gap-2">
            <span>TRANQUILITY BASE</span>
            <span>·</span>
            <span>VEL: {telemetry.speed.toFixed(1)} m/s</span>
            <span>·</span>
            <span>HDG: {Math.round(telemetry.heading)}°</span>
          </div>
        </div>

        <div data-coach="apollo-compass" className="absolute left-4 top-1/2 -translate-y-1/2 md:left-6 short:static short:left-auto short:top-auto short:translate-y-0 short:max-w-full bg-slate-950/85 border border-slate-800/80 rounded-full px-4 py-1.5 short:px-2.5 short:py-1 flex items-center gap-4 short:gap-2 text-xs font-mono-num text-slate-300 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            <span className="text-slate-400 short:hidden">ZONE:</span>
            <span className={`font-semibold ${nearArtifact ? 'text-emerald-300' : 'text-slate-200'}`}>
              <span className="short:hidden">{zoneName}</span>
              <span className="hidden short:inline">{zoneShort}</span>
            </span>
            {telemetry.distanceToTarget < 400 && (
              <span className="text-emerald-400 ml-1">
                ({telemetry.distanceToTarget.toFixed(1)}m)
              </span>
            )}
          </div>
          {objective === 'free' && (
            <div className="h-3 w-px bg-slate-800 short:hidden" />
          )}
          {objective === 'free' && (
            <div className="flex items-center gap-2 text-[11px] short:hidden">
              <span className={artifactsVisited.descent_stage ? 'text-emerald-400' : 'text-slate-400'}>
                Descent Stage {artifactsVisited.descent_stage && '✓'}
              </span>
              <span>·</span>
              <span className={artifactsVisited.retroreflector ? 'text-emerald-400' : 'text-slate-400'}>
                Retroreflector {artifactsVisited.retroreflector && '✓'}
              </span>
              <span>·</span>
              <span className={laserCompleted ? 'text-emerald-400' : 'text-slate-400'}>
                Laser {laserCompleted && '✓'}
              </span>
              <span>·</span>
              <span className={artifactsVisited.plaque ? 'text-emerald-400' : 'text-slate-400'}>
                Plaque {artifactsVisited.plaque && '✓'}
              </span>
            </div>
          )}
        </div>
        </div>

        {/* Progress & Controls Cluster */}
        <div className="flex items-center gap-2">
          {/* Artifacts Counter */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg px-3 py-2 text-xs font-mono-num flex items-center gap-2">
            <span className="text-slate-400">ARTIFACTS:</span>
            <span className={`font-bold ${visitedCount === 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {visitedCount}/3
            </span>
            {canOpenChallenge && (
              <button
                onClick={onOpenChallenge}
                data-coach="apollo-challenge"
                className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors"
              >
                SOLVE CHALLENGE
              </button>
            )}
          </div>

          <DisplayControls compact labels="never" />

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            className="p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Bottom Area: Dialogue, joystick, and action triggers */}
      <div className="flex justify-between items-end gap-4 pointer-events-auto">
        <div className="flex flex-col items-start gap-3">
          {activeDialogue && (
            <div className="mb-12 short:mb-1">
              <DialoguePanel
                message={activeDialogue}
                typewriter={typeDialogue}
                onTyped={onDialogueTyped}
              />
            </div>
          )}
          {showJoystick && (
            <div data-coach="apollo-stick" className="ml-10 mb-8 short:ml-0 short:mb-0 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2.5 short:p-1.5">
              <VirtualJoystick onMove={onJoystickMove} />
            </div>
          )}
        </div>

        {/* Action prompt sits above the navigation map */}
        {(showMap || (objective === 'free' && (activeArtifactData || nearArtifact === 'laser_station'))) && (
          <div className="flex flex-col items-end gap-3">
            {objective === 'free' && (activeArtifactData || nearArtifact === 'laser_station') && (
              <div className="flex flex-col items-end gap-2 animate-bounce-subtle">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/90 border border-emerald-500/60 rounded-md text-[11px] font-mono-num text-emerald-300 shadow-lg shadow-emerald-950/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>MARKER ZONE ENTERED</span>
                </div>
                <button
                  onClick={onInteract}
                  className="flex items-center gap-3 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-lg shadow-xl shadow-emerald-500/30 text-sm md:text-base transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <span className="px-2 py-0.5 bg-slate-950 text-emerald-400 rounded text-xs font-mono-num font-bold">
                    PRESS E
                  </span>
                  <span>{nearArtifact === 'laser_station' ? 'FIRE LASER' : activeArtifactData!.actionLabel.toUpperCase()}</span>
                </button>
                <span className="text-xs text-emerald-300/80 font-mono-num">
                  Press [SPACE] or [E] to begin
                </span>
              </div>
            )}
            {showMap && (
              <NavMap
                telemetry={telemetry}
                objective={objective}
                artifactsVisited={artifactsVisited}
                laserCompleted={laserCompleted}
                size={short ? 104 : 168}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TYPE_INTERVAL_MS = 12;

export function DialoguePanel({
  message,
  typewriter,
  onTyped,
  className = ''
}: {
  message: DialogueMessage;
  typewriter: boolean;
  onTyped?: () => void;
  className?: string;
}) {
  const [count, setCount] = useState(typewriter ? 0 : message.text.length);
  const onTypedRef = useRef(onTyped);
  onTypedRef.current = onTyped;

  useEffect(() => {
    if (!typewriter) {
      setCount(message.text.length);
      return;
    }

    setCount(0);
    let revealed = 0;
    let alive = true;
    const timer = window.setInterval(() => {
      if (!alive) return;
      revealed += 1;
      if (revealed % 4 === 1) apolloAudio.playTypeBeep();
      if (revealed >= message.text.length) {
        setCount(message.text.length);
        window.clearInterval(timer);
        onTypedRef.current?.();
        return;
      }
      setCount(revealed);
    }, TYPE_INTERVAL_MS);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [message.text, typewriter]);

  const shown = message.text.slice(0, count);

  return (
    <div className={`w-[min(36rem,calc(100vw-3rem))] bg-slate-950/90 border border-slate-700/80 rounded-lg p-4 short:max-h-[30vh] thin-scroll short:overflow-y-auto short:p-2 shadow-xl ${className}`}>
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold font-mono-num text-amber-400 uppercase tracking-wider">
            {message.speaker}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono-num">
          TRANSMISSION LINK ACTIVE
        </span>
      </div>
      <p className="relative text-sm md:text-base short:text-xs text-slate-100 font-medium leading-relaxed">
        {typewriter ? (
          <>
            <span className="invisible" aria-hidden="true">
              "{message.text}"
              <span className="dialogue-cursor" />
            </span>
            <span className="absolute inset-0">
              "{shown}"
              <span className="dialogue-cursor" aria-hidden="true" />
            </span>
          </>
        ) : (
          <>
            "{shown}"
            <span className="dialogue-cursor" aria-hidden="true" />
          </>
        )}
      </p>
    </div>
  );
}
