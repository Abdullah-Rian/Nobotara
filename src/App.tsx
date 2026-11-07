/**
 * NoboTara-71: Mission 01 — APOLLO 11
 * Main Game Application Shell
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApolloThreeEngine } from './game/threeEngine';
import { gameInputs } from './game/controls';
import { apolloAudio } from './audio/apolloAudio';
import { GamePhase, ArtifactId, MarkerId, ObjectiveStep, DialogueMessage, RoverTelemetry } from './types/game';
import { ARTIFACTS, OBJECTIVE_MARKER, markersForObjective } from './data/artifactsData';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { InspectionModal } from './components/InspectionModal';
import { RangingOverlay } from './components/RangingOverlay';
import { MatchingPuzzle } from './components/MatchingPuzzle';
import { OutroScreen } from './components/OutroScreen';
import { RotateOverlay } from './components/RotateOverlay';
import { isPortraitHandheld, onOrientationChange } from './utils/displayMode';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ApolloThreeEngine | null>(null);
  const readPlaquePoint = useCallback(() => engineRef.current?.plaqueScreenPoint, []);
  const phaseRef = useRef<GamePhase>('title');
  const roverLockedRef = useRef(true);
  const introVoiceRef = useRef({ cancelled: false });
  const objectiveHoldRef = useRef(false);
  const inspectVoiceRef = useRef({ cancelled: false, step: 'neil' as 'neil' | 'scientific' });

  // Game Phases: 'title' | 'intro' | 'explore' | 'inspect' | 'puzzle' | 'outro'
  const [phase, setPhase] = useState<GamePhase>('title');
  phaseRef.current = phase;
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [nearArtifact, setNearArtifact] = useState<MarkerId | null>(null);
  const [objective, setObjective] = useState<ObjectiveStep>('lander');
  const [roverHeld, setRoverHeld] = useState(false);
  const [rangingOpen, setRangingOpen] = useState(false);
  const [laserCompleted, setLaserCompleted] = useState(false);
  const [inspectNarrationDone, setInspectNarrationDone] = useState(false);
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
    position: { x: 8, y: 0, z: 7 },
    lander: { x: -17.331, z: -5.862 },
    rangeRadius: 0
  });

  // Dynamic dialogue & subtitles
  const [activeDialogue, setActiveDialogue] = useState<DialogueMessage | null>(null);
  const [roverBooting, setRoverBooting] = useState(false);
  roverLockedRef.current =
    phase === 'intro' ||
    phase === 'inspect' ||
    rangingOpen ||
    roverHeld ||
    roverBooting ||
    (phase === 'explore' && activeDialogue !== null);

  const [outroProgress, setOutroProgress] = useState<number>(0);
  const [orientationHold, setOrientationHold] = useState<null | 'start' | 'play'>(null);
  const pendingStartRef = useRef(false);
  const beginMissionRef = useRef(() => {});

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new ApolloThreeEngine(canvasMountRef.current);
    engineRef.current = engine;

    engine.onTelemetryUpdate = (t) => {
      setTelemetry(t);
      apolloAudio.updateRoverSpeed(t.speed / 10.4);
    };

    engine.onNearArtifact = (artId) => {
      setNearArtifact(artId);
    };
    engine.onRoverBootComplete = () => setRoverBooting(false);
    engine.onIntroCameraSettled = () => {
      engine.beginRoverBoot();
      setRoverBooting(engine.isRoverBooting());
      setPhase('explore');
    };

    // Continuous input poll loop connecting gameInputs to Three.js engine
    let inputFrameId = 0;
    const pollInputs = () => {
      if (engineRef.current) {
        if (roverLockedRef.current) {
          engineRef.current.setRoverInputs(0, 0);
        } else {
          const { forward, turn } = gameInputs.getInputs();
          engineRef.current.setRoverInputs(forward, turn);
        }
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

  useEffect(() => {
    engineRef.current?.setVisibleMarkers(markersForObjective(objective));
  }, [objective]);

  // Update Three.js camera mode when phase changes
  useEffect(() => {
    if (!engineRef.current) return;

    if (rangingOpen) {
      engineRef.current.setCameraMode({ mode: 'ranging' });
    } else if (phase === 'title') {
      engineRef.current.setCameraMode({ mode: 'title' });
    } else if (phase === 'intro') {
      engineRef.current.beginIntroFlyby();
    } else if (phase === 'explore') {
      engineRef.current.setCameraMode({ mode: 'explore' });
    } else if (phase === 'inspect' && activeInspectArtifact) {
      engineRef.current.setCameraMode({ mode: 'inspect', targetArtifact: activeInspectArtifact });
    } else if (phase === 'outro') {
      engineRef.current.setCameraMode({ mode: 'outro', outroProgress: 0 });
    }
  }, [phase, activeInspectArtifact, rangingOpen]);

  const holdRover = () => {
    roverLockedRef.current = true;
    setRoverHeld(true);
    gameInputs.setVirtualJoystick(0, 0);
    engineRef.current?.setRoverInputs(0, 0);
  };

  const beginRanging = () => {
    holdRover();
    setRangingOpen(true);
  };

  const finishRanging = () => {
    setRangingOpen(false);
    setRoverHeld(false);
    setLaserCompleted(true);
    objectiveHoldRef.current = false;
    setObjective(current => (current === 'laser' ? 'plaque' : current));
  };

  // Wire keyboard actions (Space / E for interact, Escape for modal close)
  useEffect(() => {
    gameInputs.setCallbacks(
      () => {
        // Triggered on 'E' or 'Space'
        if (phase === 'title') {
          handleStartMission();
        } else if (phase === 'explore' && objective === 'free' && nearArtifact) {
          if (nearArtifact === 'laser_station') beginRanging();
          else handleInspect(nearArtifact);
        }
      },
      () => {
        // Triggered on 'Escape'
        if (phase === 'inspect') {
          handleCloseInspect();
        }
      }
    );
  }, [phase, nearArtifact, objective]);

  // Guided objectives start as soon as the rover enters the one live marker.
  useEffect(() => {
    if (phase !== 'explore' || objective === 'free' || objectiveHoldRef.current) return;
    const target = OBJECTIVE_MARKER[objective];
    if (nearArtifact !== target) return;

    objectiveHoldRef.current = true;
    holdRover();
    engineRef.current?.setVisibleMarkers([]);
    if (target === 'laser_station') beginRanging();
    else handleInspect(target);
  }, [phase, objective, nearArtifact]);

  // Handle Mute Toggle
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    apolloAudio.setMuted(nextMuted);
  };

  // Phase 1: Start Mission & Intro Sequence
  beginMissionRef.current = () => {
    apolloAudio.init();
    introVoiceRef.current = { cancelled: false };
    setPhase('intro');
    gameInputs.setVirtualJoystick(0, 0);

    const introSpeech = "Hey, Neil Armstrong here. On July 16, 1969, we rode a Saturn V built from math, sweat, and nerve. 384,000 km to test physics where mistakes could kill. We didn’t just chase a rock in the sky; we went to learn what people can do when they dare.";

    setActiveDialogue({
      speaker: 'Neil Armstrong (Narrator-01)',
      text: introSpeech
    });
  };

  const handleStartMission = () => {
    if (isPortraitHandheld()) {
      apolloAudio.init();
      pendingStartRef.current = true;
      setOrientationHold('start');
      return;
    }
    pendingStartRef.current = false;
    beginMissionRef.current();
  };

  useEffect(() => {
    return onOrientationChange(() => {
      if (isPortraitHandheld()) {
        if (pendingStartRef.current) setOrientationHold('start');
        else if (phaseRef.current !== 'title') setOrientationHold('play');
        else setOrientationHold(null);
        return;
      }
      setOrientationHold(null);
      if (pendingStartRef.current && phaseRef.current === 'title') {
        pendingStartRef.current = false;
        beginMissionRef.current();
      }
    });
  }, []);

  const handleIntroTyped = () => {
    if (introVoiceRef.current.cancelled || !activeDialogue) return;
    apolloAudio.speakDialogue(activeDialogue.text, activeDialogue.speaker, () => {
      setActiveDialogue(null);
    }, 'intro_neil');
  };

  // Skip Intro button for immediate play
  const handleSkipIntro = () => {
    introVoiceRef.current.cancelled = true;
    apolloAudio.stopSpeaking();
    setActiveDialogue(null);
    engineRef.current?.cancelIntroFlyby();
    engineRef.current?.snapRoverReady();
    engineRef.current?.snapExploreCamera();
    setRoverBooting(false);
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
    inspectVoiceRef.current.cancelled = true;
    inspectVoiceRef.current = { cancelled: false, step: 'neil' };
    setInspectNarrationDone(false);
    apolloAudio.stopSpeaking();
    setActiveDialogue({
      speaker: 'Neil Armstrong (Narrator-01)',
      text: artData.neilQuote
    });
  };

  const handleInspectTyped = () => {
    const session = inspectVoiceRef.current;
    if (session.cancelled || !activeInspectArtifact) return;
    const art = ARTIFACTS[activeInspectArtifact];
    const step = session.step;
    apolloAudio.speakDialogue(
      step === 'neil' ? art.neilQuote : art.scientificQuote,
      step === 'neil' ? 'Neil Armstrong (Narrator-01)' : 'Scientific Voice',
      () => {
        if (session.cancelled || inspectVoiceRef.current !== session || session.step !== step) return;
        if (step === 'neil') {
          session.step = 'scientific';
          setActiveDialogue({
            speaker: 'Scientific Voice',
            text: art.scientificQuote
          });
          return;
        }
        setInspectNarrationDone(true);
      },
      `${art.id}_${step}`
    );
  };

  const handleCloseInspect = () => {
    inspectVoiceRef.current.cancelled = true;
    apolloAudio.stopSpeaking();
    setActiveDialogue(null);
    const completed = activeInspectArtifact;
    setActiveInspectArtifact(null);
    setPhase('explore');
    setRoverHeld(false);
    objectiveHoldRef.current = false;

    if (objective === 'free' || !completed) return;
    if (completed === 'descent_stage') setObjective('retroreflector');
    else if (completed === 'retroreflector') setObjective('laser');
    else if (completed === 'plaque') setObjective('free');
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

    const completionSpeech = "Good work, explorer. You understand why we left these pieces behind: for science, for survival, and for peace. The lunar surface keeps our story safe.";
    setActiveDialogue({
      speaker: 'Neil Armstrong (Narrator-01)',
      text: completionSpeech
    });

    apolloAudio.speakDialogue(completionSpeech, 'Neil Armstrong (Narrator-01)', () => {
      const outroSpeech = "The footprints at Tranquility Base proved that humanity could leave Earth. But our journey didn't stop at the Moon. We aimed further—beyond the planets, into interstellar space.";
      setActiveDialogue({
        speaker: 'Neil Armstrong (Narrator-01)',
        text: outroSpeech
      });
      apolloAudio.speakDialogue(outroSpeech, 'Neil Armstrong (Narrator-01)', () => {
        setActiveDialogue(null);
      }, 'outro_voyager');
    }, 'puzzle_complete_neil');

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
    inspectVoiceRef.current.cancelled = true;
    setInspectNarrationDone(false);
    setObjective('lander');
    setRoverHeld(false);
    setRangingOpen(false);
    setLaserCompleted(false);
    objectiveHoldRef.current = false;
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
          objective={objective}
          laserCompleted={laserCompleted}
          artifactsVisited={artifactsVisited}
          activeDialogue={activeDialogue}
          onInteract={() => {
            if (objective !== 'free' || !nearArtifact) return;
            if (nearArtifact === 'laser_station') beginRanging();
            else handleInspect(nearArtifact);
          }}
          onJoystickMove={(f, t) => gameInputs.setVirtualJoystick(f, t)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenChallenge={() => setPhase('puzzle')}
          canOpenChallenge={allVisited}
          showJoystick={phase === 'explore' && !activeDialogue && !roverHeld && !roverBooting}
          showMap={phase === 'explore'}
          typeDialogue={phase === 'intro'}
          onDialogueTyped={handleIntroTyped}
        />
      )}

      {/* Inspection Modal */}
      {phase === 'inspect' && activeInspectArtifact && (
        <InspectionModal
          artifact={ARTIFACTS[activeInspectArtifact]}
          dialogue={activeDialogue}
          narrationDone={inspectNarrationDone}
          onTyped={handleInspectTyped}
          onClose={handleCloseInspect}
          readPlaquePoint={activeInspectArtifact === 'plaque' ? readPlaquePoint : undefined}
        />
      )}

      {rangingOpen && (
        <RangingOverlay
          isLaserFiring={isLaserFiring}
          onFire={handleFireLaser}
          onContinue={finishRanging}
        />
      )}

      {/* Phase 3: Logic Matching Puzzle */}
      {phase === 'puzzle' && (
        <MatchingPuzzle onComplete={handleChallengeCompleted} />
      )}

      {/* Phase 4: Emotional Outro */}
      {phase === 'outro' && (
        <OutroScreen onReplay={handleReplay} outroProgress={outroProgress} />
      )}

      {orientationHold && <RotateOverlay />}
    </div>
  );
}
