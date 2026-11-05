/**
 * NoboTara-71: Mission 01 — APOLLO 11
 * Main Game Application Shell
 */

import React, { useEffect, useRef, useState } from 'react';
import { ApolloThreeEngine } from './game/threeEngine';
import { gameInputs } from './game/controls';
import { apolloAudio } from './audio/apolloAudio';
import { GamePhase, ArtifactId, DialogueMessage, RoverTelemetry } from './types/game';
import { ARTIFACTS } from './data/artifactsData';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { InspectionModal } from './components/InspectionModal';
import { MatchingPuzzle } from './components/MatchingPuzzle';
import { OutroScreen } from './components/OutroScreen';
import { ModelReplacementModal } from './components/ModelReplacementModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ApolloThreeEngine | null>(null);

  // Game Phases: 'title' | 'intro' | 'explore' | 'inspect' | 'puzzle' | 'outro'
  const [phase, setPhase] = useState<GamePhase>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [nearArtifact, setNearArtifact] = useState<ArtifactId | null>(null);
  const [activeInspectArtifact, setActiveInspectArtifact] = useState<ArtifactId | null>(null);
  const [isLaserFiring, setIsLaserFiring] = useState<boolean>(false);

  // Visited tracking
  const [artifactsVisited, setArtifactsVisited] = useState<Record<ArtifactId, boolean>>({
    descent_stage: false,
    retroreflector: false,
    plaque: false
  });

  // Rover telemetry
  const [telemetry, setTelemetry] = useState<RoverTelemetry>({
    speed: 0,
    heading: 0,
    distanceToTarget: 10,
    nearestArtifact: null,
    position: { x: 8, y: 0, z: 7 }
  });

  // Dynamic dialogue & subtitles
  const [activeDialogue, setActiveDialogue] = useState<DialogueMessage | null>(null);

  // Cinematic progress
  const [introProgress, setIntroProgress] = useState<number>(0);
  const [outroProgress, setOutroProgress] = useState<number>(0);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new ApolloThreeEngine(canvasMountRef.current);
    engineRef.current = engine;

    engine.onTelemetryUpdate = (t) => {
      setTelemetry(t);
      apolloAudio.updateRoverSpeed(t.speed / 5.2);
    };

    engine.onNearArtifact = (artId) => {
      setNearArtifact(artId);
    };

    // Continuous input poll loop connecting gameInputs to Three.js engine
    let inputFrameId = 0;
    const pollInputs = () => {
      if (engineRef.current) {
        const { forward, turn } = gameInputs.getInputs();
        engineRef.current.setRoverInputs(forward, turn);
      }
      inputFrameId = requestAnimationFrame(pollInputs);
    };
    inputFrameId = requestAnimationFrame(pollInputs);

    return () => {
      cancelAnimationFrame(inputFrameId);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Synchronize visited artifacts with glowing 3D markers
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setArtifactsVisited(artifactsVisited);
    }
  }, [artifactsVisited]);

  // Update Three.js camera mode when phase changes
  useEffect(() => {
    if (!engineRef.current) return;

    if (phase === 'title') {
      engineRef.current.setCameraMode({ mode: 'title' });
    } else if (phase === 'intro') {
      engineRef.current.setCameraMode({ mode: 'intro', introProgress: 0 });
    } else if (phase === 'explore') {
      engineRef.current.setCameraMode({ mode: 'explore' });
    } else if (phase === 'inspect' && activeInspectArtifact) {
      engineRef.current.setCameraMode({ mode: 'inspect', targetArtifact: activeInspectArtifact });
    } else if (phase === 'outro') {
      engineRef.current.setCameraMode({ mode: 'outro', outroProgress: 0 });
    }
  }, [phase, activeInspectArtifact]);

  // Wire keyboard actions (Space / E for interact, Escape for modal close)
  useEffect(() => {
    gameInputs.setCallbacks(
      () => {
        // Triggered on 'E' or 'Space'
        if (phase === 'title') {
          handleStartMission();
        } else if (phase === 'explore' && nearArtifact) {
          handleInspect(nearArtifact);
        }
      },
      () => {
        // Triggered on 'Escape'
        if (phase === 'inspect') {
          handleCloseInspect();
        }
      }
    );
  }, [phase, nearArtifact]);

  // Handle Mute Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    apolloAudio.setMuted(nextMuted);
  };

  // Phase 1: Start Mission & Intro Sequence
  const handleStartMission = () => {
    apolloAudio.init();
    apolloAudio.playQuindarTone('intro');
    setPhase('intro');
    setIntroProgress(0);

    const introSpeech = "Hey, Neil Armstrong here. On July 16, 1969, we rode a Saturn V built from math, sweat, and nerve. 384,000 km to test physics where mistakes could kill. We didn’t just chase a rock in the sky; we went to learn what people can do when they dare.";

    setActiveDialogue({
      speaker: 'Neil Armstrong (Narrator-01)',
      text: introSpeech
    });

    apolloAudio.speakDialogue(introSpeech, 'Neil Armstrong (Narrator-01)', () => {
      setActiveDialogue(null);
    });

    // 15-second cinematic timer
    const startTime = performance.now();
    const duration = 15000;

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      setIntroProgress(p);
      if (engineRef.current) {
        engineRef.current.setCameraMode({ mode: 'intro', introProgress: p });
      }

      if (p >= 1) {
        clearInterval(timer);
        setPhase('explore');
      }
    }, 50);
  };

  // Skip Intro button for immediate play
  const handleSkipIntro = () => {
    apolloAudio.stopSpeaking();
    setActiveDialogue(null);
    setPhase('explore');
    if (engineRef.current) {
      engineRef.current.setCameraMode({ mode: 'explore' });
    }
  };

  // Phase 2: Inspection of Artifacts
  const handleInspect = (artId: ArtifactId) => {
    setActiveInspectArtifact(artId);
    setPhase('inspect');

    // Mark visited
    setArtifactsVisited(prev => ({
      ...prev,
      [artId]: true
    }));

    const artData = ARTIFACTS[artId];
    setActiveDialogue({
      speaker: 'Neil Armstrong (Narrator-01)',
      text: artData.neilQuote
    });

    apolloAudio.speakDialogue(artData.neilQuote, 'Neil Armstrong (Narrator-01)', () => {
      // Follow with Scientific Voice
      setActiveDialogue({
        speaker: 'Scientific Voice',
        text: artData.scientificQuote
      });
      apolloAudio.speakDialogue(artData.scientificQuote, 'Scientific Voice', () => {
        setActiveDialogue(null);
      });
    });
  };

  const handleCloseInspect = () => {
    apolloAudio.stopSpeaking();
    setActiveDialogue(null);
    setActiveInspectArtifact(null);
    setPhase('explore');

    // Check if all 3 are now visited
    const allVisited = Object.values(artifactsVisited).filter(Boolean).length === 3;
    if (allVisited) {
      setTimeout(() => {
        setPhase('puzzle');
      }, 600);
    }
  };

  // Fire laser pulse
  const handleFireLaser = () => {
    if (!engineRef.current) return;
    setIsLaserFiring(true);
    engineRef.current.fireLaser();
    apolloAudio.playLaserPulse();

    setTimeout(() => {
      setIsLaserFiring(false);
    }, 3200);
  };

  // Phase 3 to Phase 4: Challenge completed -> Outro
  const handleChallengeCompleted = () => {
    setPhase('outro');
    setOutroProgress(0);

    const startTime = performance.now();
    const duration = 18000;

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      setOutroProgress(p);
      if (engineRef.current) {
        engineRef.current.setCameraMode({ mode: 'outro', outroProgress: p });
      }

      if (p >= 1) {
        clearInterval(timer);
      }
    }, 50);
  };

  // Replay Mission
  const handleReplay = () => {
    setArtifactsVisited({
      descent_stage: false,
      retroreflector: false,
      plaque: false
    });
    setPhase('title');
    setActiveDialogue(null);
    setActiveInspectArtifact(null);
  };

  const allVisited = Object.values(artifactsVisited).filter(Boolean).length === 3;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen
          onStart={handleStartMission}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenModels={() => setIsModelModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />
      )}

      {/* Intro Skip button */}
      {phase === 'intro' && (
        <div className="absolute top-6 right-6 z-20 pointer-events-auto">
          <button
            onClick={handleSkipIntro}
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-mono-num text-slate-300 rounded-lg transition-colors"
          >
            SKIP CINEMATIC [ESC]
          </button>
        </div>
      )}

      {/* Main Gameplay HUD */}
      {(phase === 'explore' || phase === 'intro') && (
        <HUD
          telemetry={telemetry}
          nearArtifact={nearArtifact}
          artifactsVisited={artifactsVisited}
          activeDialogue={activeDialogue}
          onInteract={() => nearArtifact && handleInspect(nearArtifact)}
          onJoystickMove={(f, t) => gameInputs.setVirtualJoystick(f, t)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenChallenge={() => setPhase('puzzle')}
          canOpenChallenge={allVisited}
          onOpenModels={() => setIsModelModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />
      )}

      {/* Inspection Modal */}
      {phase === 'inspect' && activeInspectArtifact && (
        <InspectionModal
          artifact={ARTIFACTS[activeInspectArtifact]}
          onClose={handleCloseInspect}
          onFireLaser={handleFireLaser}
          isLaserFiring={isLaserFiring}
        />
      )}

      {/* Custom 3D Models / Blender Import Modal */}
      {isModelModalOpen && (
        <ModelReplacementModal
          engine={engineRef.current}
          onClose={() => setIsModelModalOpen(false)}
        />
      )}

      {/* Export / Save to Kingston Drive Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Phase 3: Logic Matching Puzzle */}
      {phase === 'puzzle' && (
        <MatchingPuzzle onComplete={handleChallengeCompleted} />
      )}

      {/* Phase 4: Emotional Outro */}
      {phase === 'outro' && (
        <OutroScreen onReplay={handleReplay} outroProgress={outroProgress} />
      )}
    </div>
  );
}
