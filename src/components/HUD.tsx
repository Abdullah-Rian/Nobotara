import React from 'react';
import { Volume2, VolumeX, Compass, Radio, CheckCircle, Navigation, Box, HardDrive } from 'lucide-react';
import { ArtifactId, DialogueMessage, RoverTelemetry } from '../types/game';
import { ARTIFACTS } from '../data/artifactsData';
import { VirtualJoystick } from './VirtualJoystick';

interface HUDProps {
  telemetry: RoverTelemetry;
  nearArtifact: ArtifactId | null;
  artifactsVisited: Record<ArtifactId, boolean>;
  activeDialogue: DialogueMessage | null;
  onInteract: () => void;
  onJoystickMove: (forward: number, turn: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenChallenge: () => void;
  canOpenChallenge: boolean;
  onOpenModels?: () => void;
  onOpenExport?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  nearArtifact,
  artifactsVisited,
  activeDialogue,
  onInteract,
  onJoystickMove,
  isMuted,
  onToggleMute,
  onOpenChallenge,
  canOpenChallenge,
  onOpenModels,
  onOpenExport
}) => {
  const visitedCount = Object.values(artifactsVisited).filter(Boolean).length;
  const activeArtifactData = nearArtifact ? ARTIFACTS[nearArtifact] : null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-10 overflow-hidden">
      {/* Top Bar: Mission Info & Telemetry Status */}
      <div className="flex justify-between items-start gap-4 pointer-events-auto">
        {/* Mission Cluster */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 max-w-sm">
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
                className="ml-2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] transition-colors"
              >
                SOLVE CHALLENGE
              </button>
            )}
          </div>

          {/* Export / Save to PC Button */}
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono-num text-amber-300 transition-colors"
              title="Save project to Kingston drive / local PC"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">SAVE TO PC</span>
            </button>
          )}

          {/* Custom 3D Models Button */}
          {onOpenModels && (
            <button
              onClick={onOpenModels}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono-num text-slate-300 transition-colors"
              title="Replace 3D models with Blender assets"
            >
              <Box className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">3D MODELS</span>
            </button>
          )}

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

      {/* Target Navigational Compass Beacon (Points towards unvisited artifacts) */}
      <div className="mx-auto bg-slate-950/85 border border-slate-800/80 rounded-full px-4 py-1.5 flex items-center gap-4 text-xs font-mono-num text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
          <span className="text-slate-400">ZONE:</span>
          <span className={`font-semibold ${activeArtifactData ? 'text-emerald-300' : 'text-slate-200'}`}>
            {activeArtifactData ? `${activeArtifactData.shortName} [IN MARKER]` : 'AREA MARKER'}
          </span>
          <span className="text-emerald-400 ml-1">
            ({telemetry.distanceToTarget.toFixed(1)}m)
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-2 text-[11px]">
          <span className={artifactsVisited.descent_stage ? 'text-emerald-400' : 'text-slate-400'}>
            Descent Stage {artifactsVisited.descent_stage && '✓'}
          </span>
          <span>·</span>
          <span className={artifactsVisited.retroreflector ? 'text-emerald-400' : 'text-slate-400'}>
            Retroreflector {artifactsVisited.retroreflector && '✓'}
          </span>
          <span>·</span>
          <span className={artifactsVisited.plaque ? 'text-emerald-400' : 'text-slate-400'}>
            Plaque {artifactsVisited.plaque && '✓'}
          </span>
        </div>
      </div>

      {/* Middle/Bottom: Subtitle Dialogue Box */}
      {activeDialogue && (
        <div className="mx-auto max-w-2xl w-full bg-slate-950/90 border border-slate-700/80 rounded-lg p-4 shadow-xl pointer-events-auto transition-all">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-bold font-mono-num text-amber-400 uppercase tracking-wider">
                {activeDialogue.speaker}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono-num">
              TRANSMISSION LINK ACTIVE
            </span>
          </div>
          <p className="text-sm md:text-base text-slate-100 font-medium leading-relaxed">
            "{activeDialogue.text}"
          </p>
        </div>
      )}

      {/* Bottom Area: Controls & Action Triggers */}
      <div className="flex justify-between items-end gap-4 pointer-events-auto">
        {/* Virtual Joystick for Touch / Mouse */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-2.5">
          <VirtualJoystick onMove={onJoystickMove} />
        </div>

        {/* Action Prompt Button when inside an inspection area marker */}
        {activeArtifactData && (
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
              <span>{activeArtifactData.actionLabel.toUpperCase()}</span>
            </button>
            <span className="text-xs text-emerald-300/80 font-mono-num">
              Press [SPACE] or [E] to begin inspection
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
