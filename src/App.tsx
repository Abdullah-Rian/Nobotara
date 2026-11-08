/**
 * NoboTara-71: Mission 01 — APOLLO 11
 * Main Game Application Shell
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApolloThreeEngine } from './game/threeEngine';
import { VoyagerEngine, VoyagerTelemetry } from './game/voyagerEngine';
import { MarsEngine, MarsShot, MarsTelemetry } from './game/marsEngine';
import { gameInputs } from './game/controls';
import { apolloAudio } from './audio/apolloAudio';
import { GamePhase, ArtifactId, MarkerId, ObjectiveStep, DialogueMessage, RoverTelemetry } from './types/game';
import { ARTIFACTS, OBJECTIVE_MARKER, markersForObjective } from './data/artifactsData';
import {
  LIVE_MARKER,
  VOYAGER_ALIGN_CONTROL,
  VOYAGER_ALIGN_SCIENCE,
  VOYAGER_INTRO,
  VOYAGER_SHELL_LINE,
  VoyagerMarkerId,
  VoyagerStep,
  markerById
} from './missions/voyager/data';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { InspectionModal } from './components/InspectionModal';
import { RangingOverlay } from './components/RangingOverlay';
import { MatchingPuzzle } from './components/MatchingPuzzle';
import { OutroScreen } from './components/OutroScreen';
import { RotateOverlay } from './components/RotateOverlay';
import { VoyagerHUD } from './components/VoyagerHUD';
import { VoyagerParts } from './components/VoyagerParts';
import { VoyagerRecord } from './components/VoyagerRecord';
import { ArchivePuzzle } from './components/ArchivePuzzle';
import { VoyagerOutro } from './components/VoyagerOutro';
import { MarsHUD } from './components/MarsHUD';
import { MarsInspect } from './components/MarsInspect';
import { SequencePuzzle } from './components/SequencePuzzle';
import { EvidenceBoard } from './components/EvidenceBoard';
import { LegacyChoice } from './components/LegacyChoice';
import { CuriousCard } from './components/CuriousCard';
import {
  LIVE_SITE,
  MARS_ARRIVAL,
  MARS_ARRIVAL_NARRATOR,
  MARS_CLOSING,
  MARS_CLOSING_FINAL,
  MARS_LEGACY_LINE,
  MARS_MEANING,
  MARS_OBJECTIVES,
  MARS_READINGS,
  MARS_SEQUENCE_LINE,
  MARS_UNANSWERED,
  MARS_UNFINISHED,
  NEXT_STEP,
  LEGACY_CHOICES,
  SITES,
  LegacyId,
  MarsReading,
  MarsStep,
  interactLabel
} from './missions/mars/data';
import { isPortraitHandheld, onOrientationChange } from './utils/displayMode';

const EMPTY_VOYAGER_TELEMETRY: VoyagerTelemetry = {
  thrust: 0,
  headingErrorDeg: 180,
  signal: 0,
  aligned: false,
  distanceToMarker: 0,
  outsideShell: false,
  yawError: 0,
  pitchError: 0,
  markerYaw: 0,
  markerPitch: 0,
  hasMarker: false
};

const EMPTY_MARS_TELEMETRY: MarsTelemetry = {
  speed: 0,
  heading: 180,
  distanceToTarget: 20,
  position: { x: 0, z: 36 },
  cache: { x: 0, z: 0 },
  rangeRadius: 44
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ApolloThreeEngine | null>(null);
  const voyagerRef = useRef<VoyagerEngine | null>(null);
  const marsRef = useRef<MarsEngine | null>(null);
  const missionRef = useRef<'apollo' | 'voyager' | 'mars'>('apollo');
  const wireApolloRef = useRef<(engine: ApolloThreeEngine) => void>(() => {});
  const readPlaquePoint = useCallback(() => engineRef.current?.plaqueScreenPoint, []);
  const readVoyagerParts = useCallback(() => voyagerRef.current?.partFrame, []);
  const phaseRef = useRef<GamePhase>('title');
  const roverLockedRef = useRef(true);
  const introVoiceRef = useRef({ cancelled: false });
  const objectiveHoldRef = useRef(false);
  const inspectVoiceRef = useRef({ cancelled: false, step: 'neil' as 'neil' | 'scientific' });

  // Game Phases: 'title' | 'intro' | 'explore' | 'inspect' | 'puzzle' | 'outro'
  const [phase, setPhase] = useState<GamePhase>('title');
  phaseRef.current = phase;
  const [mission, setMission] = useState<'apollo' | 'voyager' | 'mars'>('apollo');
  missionRef.current = mission;
  const [voyagerStep, setVoyagerStep] = useState<VoyagerStep>('align');
  const voyagerStepRef = useRef<VoyagerStep>('align');
  voyagerStepRef.current = voyagerStep;
  const [voyagerTelemetry, setVoyagerTelemetry] = useState<VoyagerTelemetry>(EMPTY_VOYAGER_TELEMETRY);
  const [nearVoyager, setNearVoyager] = useState<VoyagerMarkerId | null>(null);
  const [voyagerHeld, setVoyagerHeld] = useState(false);
  const [voyagerIntroBeat, setVoyagerIntroBeat] = useState<'depart' | 'hold' | 'pan'>('depart');
  const [voyagerLightSpeed, setVoyagerLightSpeed] = useState<number | null>(null);
  const [voyagerPartsOpen, setVoyagerPartsOpen] = useState(false);
  const [voyagerPartId, setVoyagerPartId] = useState<string | null>(null);
  const [voyagerPartTour, setVoyagerPartTour] = useState(false);
  const voyagerPartsOpenRef = useRef(false);
  voyagerPartsOpenRef.current = voyagerPartsOpen;
  const voyagerPartTourRef = useRef(false);
  voyagerPartTourRef.current = voyagerPartTour;
  const [voyagerPanel, setVoyagerPanel] = useState<VoyagerMarkerId | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const voyagerCueRef = useRef<string | null>(null);
  const voyagerSpeakRef = useRef(0);
  const [marsStep, setMarsStep] = useState<MarsStep>('igneous');
  const marsStepRef = useRef<MarsStep>('igneous');
  marsStepRef.current = marsStep;
  const [marsTelemetry, setMarsTelemetry] = useState<MarsTelemetry>(EMPTY_MARS_TELEMETRY);
  const [marsNear, setMarsNear] = useState(false);
  const [marsReading, setMarsReading] = useState<MarsReading | null>(null);
  const marsReadingRef = useRef<MarsReading | null>(null);
  marsReadingRef.current = marsReading;
  const [marsNarrationDone, setMarsNarrationDone] = useState(false);
  const [marsChoice, setMarsChoice] = useState<LegacyId | null>(null);
  const [marsCurious, setMarsCurious] = useState(false);
  const marsCueRef = useRef<string | null>(null);
  const marsSpeakRef = useRef(0);
  const revealReadyRef = useRef({ shot: false, line: false });
  const alignHandledRef = useRef(false);
  const crossHandledRef = useRef(false);
  const voyagerHoldRef = useRef(false);
  const pendingMissionRef = useRef<'apollo' | 'voyager' | 'mars'>('apollo');
  const outroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beginVoyagerRef = useRef(() => {});
  const beginMarsRef = useRef(() => {});
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [nearArtifact, setNearArtifact] = useState<MarkerId | null>(null);
  const [objective, setObjective] = useState<ObjectiveStep>('lander');
  const [roverHeld, setRoverHeld] = useState(false);
  const [rangingOpen, setRangingOpen] = useState(false);
  const [laserCompleted, setLaserCompleted] = useState(false);
  const [inspectNarrationDone, setInspectNarrationDone] = useState(false);
  const inspectDoneRef = useRef(false);
  inspectDoneRef.current = inspectNarrationDone;
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
    phase === 'puzzle' ||
    phase === 'outro' ||
    rangingOpen ||
    roverHeld ||
    roverBooting ||
    voyagerHeld ||
    (mission === 'apollo' && phase === 'explore' && activeDialogue !== null);

  const [outroProgress, setOutroProgress] = useState<number>(0);
  const [orientationHold, setOrientationHold] = useState<null | 'start' | 'play'>(null);
  const pendingStartRef = useRef(false);
  const beginMissionRef = useRef(() => {});

  wireApolloRef.current = (engine) => {
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
  };

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new ApolloThreeEngine(canvasMountRef.current);
    engineRef.current = engine;
    wireApolloRef.current(engine);

    // Continuous input poll loop connecting gameInputs to the live mission.
    let inputFrameId = 0;
    const pollInputs = () => {
      if (missionRef.current === 'voyager' && voyagerRef.current) {
        if (roverLockedRef.current) voyagerRef.current.setInputs(0, 0, 0);
        else {
          const { thrust, yaw, pitch } = gameInputs.getFlightInputs();
          if (voyagerPartsOpenRef.current) {
            if (Math.abs(thrust) > 0.2) {
              voyagerPartsOpenRef.current = false;
              voyagerRef.current.setPartLabels(false);
              setVoyagerPartsOpen(false);
              setVoyagerPartId(null);
            }
            voyagerRef.current.setInputs(0, yaw, pitch);
          } else {
            voyagerRef.current.setInputs(thrust, yaw, pitch);
          }
        }
      } else if (missionRef.current === 'mars' && marsRef.current) {
        if (roverLockedRef.current) marsRef.current.setInputs(0, 0);
        else {
          const { forward, turn } = gameInputs.getInputs();
          marsRef.current.setInputs(forward, turn);
        }
      } else if (engineRef.current) {
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
      if (outroTimerRef.current) clearInterval(outroTimerRef.current);
      engineRef.current?.dispose();
      voyagerRef.current?.dispose();
      marsRef.current?.dispose();
      engineRef.current = null;
      voyagerRef.current = null;
      marsRef.current = null;
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
    if (mission !== 'apollo' || !engineRef.current) return;

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
  }, [phase, activeInspectArtifact, rangingOpen, mission]);

  useEffect(() => {
    if (mission !== 'mars') return;
    marsRef.current?.setLive(LIVE_SITE[marsStep] ?? null);
  }, [mission, marsStep]);

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
        if (phase === 'title') {
          handleStartMission();
        } else if (mission === 'voyager' && phase === 'explore' && voyagerStep === 'record') {
          openRecord();
        } else if (mission === 'voyager') {
          return;
        } else if (mission === 'mars' && phase === 'explore' && marsNear) {
          handleMarsInteract();
        } else if (mission === 'mars' && phase === 'inspect' && marsNarrationDone) {
          resumeMarsReading();
        } else if (phase === 'explore' && objective === 'free' && nearArtifact) {
          if (nearArtifact === 'laser_station') beginRanging();
          else handleInspect(nearArtifact);
        }
      },
      () => {
        if (mission === 'mars' && phase === 'intro') {
          handleSkipIntro();
        } else if (mission === 'mars' && phase === 'inspect' && marsNarrationDone) {
          resumeMarsReading();
        } else if (mission === 'voyager' && phase === 'intro') {
          handleSkipIntro();
        } else if (mission === 'voyager' && recordOpen) {
          finishRecord();
        } else if (mission === 'voyager' && phase === 'inspect') {
          closeVoyagerInspect();
        } else if (mission !== 'mars' && mission !== 'voyager' && phase === 'inspect') {
          handleCloseInspect();
        }
      }
    );
  }, [phase, nearArtifact, objective, mission, voyagerStep, recordOpen, marsNear, marsNarrationDone, marsStep]);

  // Guided objectives start as soon as the rover enters the one live marker.
  useEffect(() => {
    if (mission !== 'apollo' || phase !== 'explore' || objective === 'free' || objectiveHoldRef.current) return;
    const target = OBJECTIVE_MARKER[objective];
    if (nearArtifact !== target) return;

    objectiveHoldRef.current = true;
    holdRover();
    engineRef.current?.setVisibleMarkers([]);
    if (target === 'laser_station') beginRanging();
    else handleInspect(target);
  }, [phase, objective, nearArtifact, mission]);

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

  const handleStartMission = () => requestStart('apollo');

  useEffect(() => {
    return onOrientationChange(() => {
      if (isPortraitHandheld()) {
        if (pendingStartRef.current) setOrientationHold('start');
        else if (phaseRef.current !== 'title') setOrientationHold('play');
        else setOrientationHold(null);
        return;
      }
      setOrientationHold(null);
      if (!pendingStartRef.current) return;
      if (phaseRef.current !== 'title' && pendingMissionRef.current === 'apollo') return;
      pendingStartRef.current = false;
      if (pendingMissionRef.current === 'voyager') beginVoyagerRef.current();
      else if (pendingMissionRef.current === 'mars') beginMarsRef.current();
      else beginMissionRef.current();
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
    if (missionRef.current === 'mars') {
      marsCueRef.current = null;
      marsSpeakRef.current += 1;
      apolloAudio.stopSpeaking();
      setActiveDialogue(null);
      marsRef.current?.skipIntro();
      setPhase('explore');
      return;
    }
    if (missionRef.current === 'voyager') {
      introVoiceRef.current.cancelled = true;
      voyagerCueRef.current = null;
      voyagerSpeakRef.current += 1;
      apolloAudio.stopSpeaking();
      setActiveDialogue(null);
      voyagerRef.current?.skipIntro();
      return;
    }
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
    if (outroTimerRef.current) clearInterval(outroTimerRef.current);

    outroTimerRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(1, elapsed / duration);
      setOutroProgress(p);
      if (engineRef.current) {
        engineRef.current.setCameraMode({ mode: 'outro', outroProgress: p });
      }

      if (p >= 1 && outroTimerRef.current) {
        clearInterval(outroTimerRef.current);
        outroTimerRef.current = null;
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

  const clearOutroTimer = () => {
    if (!outroTimerRef.current) return;
    clearInterval(outroTimerRef.current);
    outroTimerRef.current = null;
  };

  const attachVoyager = (engine: VoyagerEngine) => {
    engine.onTelemetry = setVoyagerTelemetry;
    engine.onNearMarker = setNearVoyager;
    engine.onAligned = () => {
      if (alignHandledRef.current) return;
      alignHandledRef.current = true;
      roverLockedRef.current = true;
      setVoyagerHeld(true);
      gameInputs.setVirtualJoystick(0, 0);
      voyagerSpeakRef.current += 1;
      voyagerCueRef.current = 'align-science';
      setActiveDialogue(VOYAGER_ALIGN_SCIENCE);
    };
    engine.onCrossedShell = () => {
      if (crossHandledRef.current || voyagerStepRef.current !== 'cross') return;
      crossHandledRef.current = true;
      voyagerCueRef.current = 'shell';
      setActiveDialogue(VOYAGER_SHELL_LINE);
    };
    engine.onIntroCue = ({ beat, lightSpeed }) => {
      setVoyagerIntroBeat(beat);
      setVoyagerLightSpeed(beat === 'depart' ? lightSpeed : null);
      if (beat === 'pan' && voyagerPartTourRef.current) {
        voyagerPartsOpenRef.current = true;
        engine.setPartLabels(true);
        setVoyagerPartsOpen(true);
      }
    };
    engine.onCraftReady = (nasa) => {
      voyagerPartTourRef.current = nasa;
      setVoyagerPartTour(nasa);
      if (!nasa) {
        voyagerPartsOpenRef.current = false;
        engine.setPartLabels(false);
        setVoyagerPartsOpen(false);
        setVoyagerPartId(null);
      }
    };
    engine.onIntroSettled = () => {
      roverLockedRef.current = false;
      setVoyagerHeld(false);
      voyagerPartsOpenRef.current = false;
      engine.setPartLabels(false);
      setVoyagerPartsOpen(false);
      setVoyagerPartId(null);
      setPhase('explore');
      apolloAudio.stopSpeaking();
      voyagerSpeakRef.current += 1;
      voyagerCueRef.current = 'align-control';
      setActiveDialogue(VOYAGER_ALIGN_CONTROL);
    };
  };

  beginVoyagerRef.current = () => {
    const mount = canvasMountRef.current;
    if (!mount) return;
    clearOutroTimer();
    apolloAudio.init();
    apolloAudio.stopSpeaking();
    introVoiceRef.current.cancelled = true;
    inspectVoiceRef.current.cancelled = true;
    voyagerSpeakRef.current += 1;
    marsSpeakRef.current += 1;
    marsCueRef.current = null;
    engineRef.current?.dispose();
    engineRef.current = null;
    voyagerRef.current?.dispose();
    voyagerRef.current = null;
    marsRef.current?.dispose();
    marsRef.current = null;
    const engine = new VoyagerEngine(mount);
    voyagerRef.current = engine;
    attachVoyager(engine);
    missionRef.current = 'voyager';
    setMission('voyager');
    alignHandledRef.current = false;
    crossHandledRef.current = false;
    voyagerHoldRef.current = false;
    setVoyagerStep('align');
    setNearVoyager(null);
    setVoyagerPanel(null);
    setRecordOpen(false);
    setVoyagerHeld(false);
    setRangingOpen(false);
    setActiveInspectArtifact(null);
    setInspectNarrationDone(false);
    voyagerCueRef.current = 'intro';
    setVoyagerIntroBeat('depart');
    setVoyagerLightSpeed(null);
    voyagerPartsOpenRef.current = false;
    voyagerPartTourRef.current = false;
    setVoyagerPartsOpen(false);
    setVoyagerPartId(null);
    setVoyagerPartTour(false);
    setActiveDialogue(VOYAGER_INTRO);
    setPhase('intro');
    engine.setStep('align');
    engine.beginIntro();
  };

  useEffect(() => {
    if (mission !== 'voyager' || !voyagerPartTour) return;
    if (phase === 'intro' && voyagerIntroBeat === 'pan') {
      voyagerPartsOpenRef.current = true;
      voyagerRef.current?.setPartLabels(true);
      setVoyagerPartsOpen(true);
    }
  }, [mission, voyagerPartTour, phase, voyagerIntroBeat]);

  useEffect(() => {
    if (!voyagerPartsOpen) return;
    const pan = mission === 'voyager' && phase === 'intro' && voyagerIntroBeat === 'pan';
    const flight = mission === 'voyager' && phase === 'explore';
    if (!pan && !flight) {
      voyagerPartsOpenRef.current = false;
      voyagerRef.current?.setPartLabels(false);
      setVoyagerPartsOpen(false);
      setVoyagerPartId(null);
    }
  }, [voyagerPartsOpen, mission, phase, voyagerIntroBeat]);

  const requestStart = (which: 'apollo' | 'voyager' | 'mars') => {
    pendingMissionRef.current = which;
    if (isPortraitHandheld()) {
      apolloAudio.init();
      pendingStartRef.current = true;
      setOrientationHold('start');
      return;
    }
    pendingStartRef.current = false;
    if (which === 'voyager') beginVoyagerRef.current();
    else if (which === 'mars') beginMarsRef.current();
    else beginMissionRef.current();
  };

  const speakVoyager = (text: string, speaker: DialogueMessage['speaker'], clipId: string, after: () => void) => {
    const token = ++voyagerSpeakRef.current;
    apolloAudio.speakDialogue(text, speaker, () => {
      if (token !== voyagerSpeakRef.current) return;
      after();
    }, clipId);
  };

  const onVoyagerTyped = () => {
    const cue = voyagerCueRef.current;
    if (!cue) return;
    if (cue === 'intro') {
      voyagerCueRef.current = null;
      speakVoyager(VOYAGER_INTRO.text, VOYAGER_INTRO.speaker, 'voyager_intro', () => setActiveDialogue(null));
      return;
    }
    if (cue === 'align-control') {
      voyagerCueRef.current = null;
      speakVoyager(VOYAGER_ALIGN_CONTROL.text, VOYAGER_ALIGN_CONTROL.speaker, 'voyager_align_control', () => {
        setActiveDialogue(null);
      });
      return;
    }
    if (cue === 'align-science') {
      voyagerCueRef.current = null;
      speakVoyager(VOYAGER_ALIGN_SCIENCE.text, VOYAGER_ALIGN_SCIENCE.speaker, 'voyager_align_science', () => {
        setActiveDialogue(null);
        roverLockedRef.current = false;
        setVoyagerHeld(false);
        voyagerStepRef.current = 'cross';
        setVoyagerStep('cross');
        voyagerRef.current?.setStep('cross');
      });
      return;
    }
    if (cue === 'shell') {
      voyagerCueRef.current = null;
      speakVoyager(VOYAGER_SHELL_LINE.text, VOYAGER_SHELL_LINE.speaker, 'voyager_shell', () => {
        setActiveDialogue(null);
        if (voyagerStepRef.current !== 'cross') return;
        voyagerStepRef.current = 'plasma';
        setVoyagerStep('plasma');
        voyagerRef.current?.setStep('plasma');
      });
      return;
    }
    if ((cue === 'inspect-narrator' || cue === 'inspect-science') && voyagerPanel) {
      const marker = markerById(voyagerPanel);
      const science = cue === 'inspect-science';
      voyagerCueRef.current = null;
      speakVoyager(
        science ? marker.science : marker.narrator,
        science ? 'Scientific Voice' : 'Narrator-02',
        science ? marker.scienceClip : marker.narratorClip,
        () => {
          if (!science) {
            voyagerCueRef.current = 'inspect-science';
            setActiveDialogue({ speaker: 'Scientific Voice', text: marker.science });
            return;
          }
          setInspectNarrationDone(true);
        }
      );
    }
  };

  const openVoyagerPanel = (id: VoyagerMarkerId) => {
    if (voyagerHoldRef.current) return;
    voyagerHoldRef.current = true;
    roverLockedRef.current = true;
    voyagerPartsOpenRef.current = false;
    voyagerRef.current?.setPartLabels(false);
    setVoyagerPartsOpen(false);
    setVoyagerPartId(null);
    setVoyagerHeld(true);
    setVoyagerPanel(id);
    setPhase('inspect');
    setInspectNarrationDone(false);
    voyagerRef.current?.setFocus(id);
    const marker = markerById(id);
    voyagerCueRef.current = 'inspect-narrator';
    apolloAudio.stopSpeaking();
    voyagerSpeakRef.current += 1;
    setActiveDialogue({ speaker: 'Narrator-02', text: marker.narrator });
  };

  useEffect(() => {
    if (mission !== 'voyager' || phase !== 'explore' || voyagerHoldRef.current) return;
    const live = LIVE_MARKER[voyagerStep];
    if (!live || nearVoyager !== live) return;
    openVoyagerPanel(live);
  }, [mission, phase, voyagerStep, nearVoyager]);

  const closeVoyagerInspect = () => {
    const finished = inspectDoneRef.current;
    const current = voyagerStepRef.current;
    apolloAudio.stopSpeaking();
    voyagerSpeakRef.current += 1;
    voyagerCueRef.current = null;
    setActiveDialogue(null);
    voyagerRef.current?.setFocus(null);
    setVoyagerPanel(null);
    setPhase('explore');
    roverLockedRef.current = false;
    setVoyagerHeld(false);
    voyagerHoldRef.current = false;
    if (!finished) return;
    const order: VoyagerStep[] = ['plasma', 'magnetic', 'particles', 'power'];
    const index = order.indexOf(current);
    if (index < 0) return;
    const next: VoyagerStep = index === order.length - 1 ? 'record' : order[index + 1];
    voyagerStepRef.current = next;
    setVoyagerStep(next);
    voyagerRef.current?.setStep(next);
  };

  const openRecord = () => {
    if (missionRef.current !== 'voyager' || voyagerStepRef.current !== 'record') return;
    voyagerPartsOpenRef.current = false;
    voyagerRef.current?.setPartLabels(false);
    setVoyagerPartsOpen(false);
    setVoyagerPartId(null);
    apolloAudio.stopSpeaking();
    voyagerSpeakRef.current += 1;
    voyagerCueRef.current = null;
    setActiveDialogue(null);
    setRecordOpen(true);
    setPhase('inspect');
    roverLockedRef.current = true;
    setVoyagerHeld(true);
    voyagerRef.current?.setFocus('record');
  };

  const finishRecord = () => {
    apolloAudio.stopSpeaking();
    voyagerSpeakRef.current += 1;
    setRecordOpen(false);
    voyagerRef.current?.setFocus(null);
    roverLockedRef.current = false;
    setVoyagerHeld(false);
    setVoyagerStep('archive');
    voyagerRef.current?.setStep('archive');
    setPhase('puzzle');
  };

  const beginVoyagerOutro = () => {
    setPhase('outro');
    setVoyagerStep('outro');
    setOutroProgress(0);
    const start = performance.now();
    clearOutroTimer();
    outroTimerRef.current = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / 20000);
      setOutroProgress(progress);
      voyagerRef.current?.setOutroProgress(progress);
      if (progress >= 1) clearOutroTimer();
    }, 50);
  };

  const handleBackToMissions = () => {
    clearOutroTimer();
    apolloAudio.stopSpeaking();
    voyagerSpeakRef.current += 1;
    marsSpeakRef.current += 1;
    marsCueRef.current = null;
    voyagerRef.current?.dispose();
    voyagerRef.current = null;
    marsRef.current?.dispose();
    marsRef.current = null;
    missionRef.current = 'apollo';
    setMission('apollo');
    setActiveDialogue(null);
    setRecordOpen(false);
    setVoyagerHeld(false);
    setVoyagerPanel(null);
    voyagerPartsOpenRef.current = false;
    voyagerPartTourRef.current = false;
    setVoyagerPartsOpen(false);
    setVoyagerPartId(null);
    setVoyagerPartTour(false);
    setMarsReading(null);
    setMarsNarrationDone(false);
    setMarsChoice(null);
    setMarsCurious(false);
    setMarsNear(false);
    setOutroProgress(0);
    setPhase('title');
    if (canvasMountRef.current && !engineRef.current) {
      const engine = new ApolloThreeEngine(canvasMountRef.current);
      engineRef.current = engine;
      wireApolloRef.current(engine);
    }
  };

  const speakMars = (text: string, speaker: DialogueMessage['speaker'], clipId: string, after: () => void) => {
    const token = ++marsSpeakRef.current;
    let settled = false;
    const done = () => {
      if (settled || token !== marsSpeakRef.current) return;
      settled = true;
      after();
    };
    const words = text.split(/\s+/).length;
    window.setTimeout(done, Math.min(45000, Math.max(8000, words * 700)));
    void apolloAudio.speakDialogue(text, speaker, done, clipId);
  };

  const runMarsShot = (shot: MarsShot, seconds: number, onDone: () => void) => {
    clearOutroTimer();
    const start = performance.now();
    marsRef.current?.setCinematic(shot, 0);
    setOutroProgress(0);
    outroTimerRef.current = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / (seconds * 1000));
      setOutroProgress(progress);
      marsRef.current?.setCinematic(shot, progress);
      if (progress >= 1) {
        clearOutroTimer();
        onDone();
      }
    }, 40);
  };

  const maybeReleaseLegacy = () => {
    if (!revealReadyRef.current.shot || !revealReadyRef.current.line) return;
    setActiveDialogue(null);
    marsStepRef.current = 'water';
    setMarsStep('water');
    setPhase('explore');
    marsRef.current?.setCinematic('drive', 0);
  };

  const startReveal = () => {
    revealReadyRef.current = { shot: false, line: false };
    setPhase('outro');
    marsStepRef.current = 'reveal';
    setMarsStep('reveal');
    marsRef.current?.setHologramFrozen(true);
    marsRef.current?.setFocus(null);
    marsCueRef.current = 'unfinished';
    setActiveDialogue(MARS_UNFINISHED);
    runMarsShot('reveal', 9, () => {
      revealReadyRef.current.shot = true;
      maybeReleaseLegacy();
    });
  };

  const beginQuestionShot = () => {
    setMarsReading(null);
    setMarsNarrationDone(false);
    setPhase('outro');
    marsRef.current?.setFocus(null);
    marsSpeakRef.current += 1;
    apolloAudio.stopSpeaking();
    setActiveDialogue(null);
    runMarsShot('question', 8, () => {
      marsCueRef.current = 'unanswered';
      setActiveDialogue(MARS_UNANSWERED);
    });
  };

  const beginClosing = () => {
    setMarsNarrationDone(false);
    setMarsCurious(false);
    marsStepRef.current = 'closing';
    setMarsStep('closing');
    setPhase('outro');
    marsCueRef.current = 'closing-a';
    setActiveDialogue(MARS_CLOSING);
    runMarsShot('closing', 16, () => setMarsCurious(true));
  };

  const onMarsTyped = () => {
    const cue = marsCueRef.current;
    if (!cue) return;
    const reading = marsReadingRef.current;
    if (cue === 'arrival') {
      marsCueRef.current = null;
      speakMars(MARS_ARRIVAL.text, MARS_ARRIVAL.speaker, 'mars_arrival', () => {
        marsCueRef.current = 'arrival-narrator';
        setActiveDialogue(MARS_ARRIVAL_NARRATOR);
      });
      return;
    }
    if (cue === 'arrival-narrator') {
      marsCueRef.current = null;
      speakMars(MARS_ARRIVAL_NARRATOR.text, MARS_ARRIVAL_NARRATOR.speaker, 'mars_arrival_narrator', () => {
        setActiveDialogue(null);
      });
      return;
    }
    if (cue === 'narrator' && reading) {
      marsCueRef.current = null;
      speakMars(reading.narrator.text, reading.narrator.speaker, reading.narratorClip, () => {
        marsCueRef.current = 'science';
        setActiveDialogue(reading.science);
      });
      return;
    }
    if (cue === 'science' && reading) {
      marsCueRef.current = null;
      speakMars(reading.science.text, reading.science.speaker, reading.scienceClip, () => {
        setMarsNarrationDone(true);
      });
      return;
    }
    if (cue === 'sequence') {
      marsCueRef.current = null;
      speakMars(MARS_SEQUENCE_LINE.text, MARS_SEQUENCE_LINE.speaker, 'mars_sequence', startReveal);
      return;
    }
    if (cue === 'unfinished') {
      marsCueRef.current = null;
      speakMars(MARS_UNFINISHED.text, MARS_UNFINISHED.speaker, 'mars_unfinished', () => {
        marsCueRef.current = 'meaning';
        setActiveDialogue(MARS_MEANING);
      });
      return;
    }
    if (cue === 'meaning') {
      marsCueRef.current = null;
      speakMars(MARS_MEANING.text, MARS_MEANING.speaker, 'mars_meaning', () => {
        revealReadyRef.current.line = true;
        maybeReleaseLegacy();
      });
      return;
    }
    if (cue === 'unanswered') {
      marsCueRef.current = null;
      speakMars(MARS_UNANSWERED.text, MARS_UNANSWERED.speaker, 'mars_unanswered', () => {
        setActiveDialogue(null);
        marsStepRef.current = 'choice';
        setMarsStep('choice');
        setPhase('puzzle');
      });
      return;
    }
    if (cue === 'choice') {
      marsCueRef.current = null;
      speakMars(MARS_LEGACY_LINE.text, MARS_LEGACY_LINE.speaker, 'mars_legacy', () => {
        setMarsNarrationDone(true);
      });
      return;
    }
    if (cue === 'closing-a') {
      marsCueRef.current = null;
      speakMars(MARS_CLOSING.text, MARS_CLOSING.speaker, 'mars_closing', () => {
        marsCueRef.current = 'closing-b';
        setActiveDialogue(MARS_CLOSING_FINAL);
      });
      return;
    }
    if (cue === 'closing-b') {
      marsCueRef.current = null;
      speakMars(MARS_CLOSING_FINAL.text, MARS_CLOSING_FINAL.speaker, 'mars_closing_final', () => {
        setActiveDialogue(null);
      });
    }
  };

  const handleMarsInteract = () => {
    const step = marsStepRef.current;
    if (step === 'sequence') {
      marsRef.current?.setFocus('terminal');
      marsRef.current?.setHologramFrozen(false);
      setPhase('puzzle');
      return;
    }
    const reading = MARS_READINGS[step];
    if (!reading) return;
    marsReadingRef.current = reading;
    setMarsReading(reading);
    setMarsNarrationDone(false);
    marsCueRef.current = 'narrator';
    setActiveDialogue(reading.narrator);
    setPhase('inspect');
    const site = LIVE_SITE[step];
    if (site) marsRef.current?.setFocus(site);
  };

  const resumeMarsReading = () => {
    const step = marsStepRef.current;
    if (step === 'question') {
      beginQuestionShot();
      return;
    }
    const next = NEXT_STEP[step];
    marsRef.current?.setFocus(null);
    marsReadingRef.current = null;
    setMarsReading(null);
    setMarsNarrationDone(false);
    setActiveDialogue(null);
    marsCueRef.current = null;
    marsSpeakRef.current += 1;
    apolloAudio.stopSpeaking();
    if (!next) return;
    marsStepRef.current = next;
    setMarsStep(next);
    setPhase(next === 'board' ? 'puzzle' : 'explore');
    if (next !== 'board') marsRef.current?.setCinematic('drive', 0);
  };

  const finishSequence = () => {
    marsRef.current?.setHologramFrozen(true);
    marsCueRef.current = 'sequence';
    setActiveDialogue(MARS_SEQUENCE_LINE);
    setPhase('outro');
  };

  const finishBoard = () => {
    marsStepRef.current = 'question';
    setMarsStep('question');
    setPhase('explore');
    marsRef.current?.setCinematic('drive', 0);
  };

  const chooseLegacy = (id: LegacyId) => {
    setMarsChoice(id);
    setMarsNarrationDone(false);
    setActiveDialogue(null);
    setPhase('outro');
    runMarsShot(id, 5.5, () => {
      marsCueRef.current = 'choice';
      setActiveDialogue(MARS_LEGACY_LINE);
    });
  };

  const beginMars = () => {
    const mount = canvasMountRef.current;
    if (!mount) return;
    clearOutroTimer();
    apolloAudio.init();
    apolloAudio.stopSpeaking();
    introVoiceRef.current.cancelled = true;
    inspectVoiceRef.current.cancelled = true;
    voyagerSpeakRef.current += 1;
    marsSpeakRef.current += 1;
    marsCueRef.current = null;
    engineRef.current?.dispose();
    engineRef.current = null;
    voyagerRef.current?.dispose();
    voyagerRef.current = null;
    marsRef.current?.dispose();
    const engine = new MarsEngine(mount);
    marsRef.current = engine;
    engine.onTelemetry = telemetry => {
      setMarsTelemetry(telemetry);
      apolloAudio.updateRoverSpeed(telemetry.speed / 7.4);
    };
    engine.onNear = setMarsNear;
    engine.onIntroDone = () => {
      if (missionRef.current !== 'mars') return;
      setPhase('explore');
    };
    missionRef.current = 'mars';
    setMission('mars');
    marsStepRef.current = 'igneous';
    setMarsStep('igneous');
    setMarsNear(false);
    setMarsReading(null);
    marsReadingRef.current = null;
    setMarsNarrationDone(false);
    setMarsChoice(null);
    setMarsCurious(false);
    setOutroProgress(0);
    revealReadyRef.current = { shot: false, line: false };
    marsCueRef.current = 'arrival';
    setActiveDialogue(MARS_ARRIVAL);
    setPhase('intro');
    engine.setLive('igneous');
    engine.beginIntro();
  };
  beginMarsRef.current = beginMars;

  const allVisited = Object.values(artifactsVisited).filter(Boolean).length === 3;
  const marsSiteId = LIVE_SITE[marsStep];
  const marsTarget = marsSiteId ? { ...SITES[marsSiteId] } : null;
  const marsObjective =
    marsChoice && marsStep === 'choice'
      ? LEGACY_CHOICES.find(choice => choice.id === marsChoice)?.title ?? MARS_OBJECTIVES.choice
      : MARS_OBJECTIVES[marsStep];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <TitleScreen
          onStart={handleStartMission}
          onStartVoyager={() => requestStart('voyager')}
          onStartMars={() => requestStart('mars')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Intro Skip button */}
      {phase === 'intro' && (
        <div className={`absolute z-20 pointer-events-auto ${mission === 'voyager' || mission === 'mars' ? 'top-6 left-1/2 -translate-x-1/2' : 'top-6 right-6'}`}>
          <button
            onClick={handleSkipIntro}
            className="px-4 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-mono-num text-slate-300 rounded-lg transition-colors"
          >
            SKIP CINEMATIC [ESC]
          </button>
        </div>
      )}

      {/* Main Gameplay HUD */}
      {(phase === 'explore' || phase === 'intro') && mission === 'apollo' && (
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

      {mission === 'voyager' && phase === 'intro' && voyagerIntroBeat !== 'depart' && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-20 px-6 text-center">
          <h1 className="text-3xl font-extrabold text-white drop-shadow md:text-5xl">
            Meet Voyager 1 — The Endless Journey
          </h1>
        </div>
      )}

      {(phase === 'explore' || phase === 'intro' || (phase === 'inspect' && !recordOpen)) && mission === 'voyager' && (
        <VoyagerHUD
          telemetry={voyagerTelemetry}
          step={voyagerStep}
          dialogue={activeDialogue}
          typeDialogue
          onDialogueTyped={onVoyagerTyped}
          showJoystick={phase === 'explore' && !voyagerHeld}
          onPitch={(pitch) => gameInputs.setVirtualPitch(pitch)}
          onYaw={(yaw) => gameInputs.setVirtualYaw(yaw)}
          onThrust={(thrust) => gameInputs.setVirtualThrust(thrust)}
          lightSpeed={phase === 'intro' ? voyagerLightSpeed : null}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenRecord={openRecord}
          lookingAround={phase === 'explore' && voyagerPartsOpen}
          onInspectCraft={
            phase === 'explore' && !voyagerPartsOpen && voyagerPartTour && voyagerStep !== 'record'
              ? () => {
                  voyagerPartsOpenRef.current = true;
                  voyagerRef.current?.setPartLabels(true);
                  setVoyagerPartId(null);
                  setVoyagerPartsOpen(true);
                }
              : undefined
          }
        />
      )}

      {mission === 'voyager' && voyagerPartsOpen && (
        <VoyagerParts
          readFrame={readVoyagerParts}
          selectedId={voyagerPartId}
          onSelect={id => setVoyagerPartId(current => (current === id ? null : id))}
          clearTop={84}
          clearBottom={phase === 'explore' ? 200 : 28}
        />
      )}

      {mission === 'voyager' && phase === 'inspect' && voyagerPanel && !recordOpen && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-30 flex items-start justify-center gap-3 px-4">
          <div className="max-w-md rounded-lg border border-slate-800 bg-slate-950/85 px-4 py-2 text-center text-xs text-slate-300">
            {markerById(voyagerPanel).note}
          </div>
          {inspectNarrationDone && (
            <button
              type="button"
              onClick={closeVoyagerInspect}
              className="pointer-events-auto rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
            >
              RESUME FLIGHT
            </button>
          )}
        </div>
      )}

      {recordOpen && <VoyagerRecord onComplete={finishRecord} />}

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
      {phase === 'puzzle' && mission === 'apollo' && (
        <MatchingPuzzle onComplete={handleChallengeCompleted} />
      )}

      {phase === 'puzzle' && mission === 'voyager' && (
        <ArchivePuzzle onComplete={beginVoyagerOutro} />
      )}

      {phase === 'outro' && mission === 'apollo' && (
        <OutroScreen
          onReplay={handleReplay}
          onContinue={() => requestStart('voyager')}
          outroProgress={outroProgress}
        />
      )}

      {phase === 'outro' && mission === 'voyager' && (
        <VoyagerOutro
          progress={outroProgress}
          onContinue={() => requestStart('mars')}
          onMissions={handleBackToMissions}
        />
      )}

      {mission === 'mars' && !marsCurious && phase !== 'puzzle' && (
        <MarsHUD
          telemetry={marsTelemetry}
          objective={marsObjective}
          target={marsTarget}
          pulseCache={marsStep === 'question' && marsTelemetry.distanceToTarget > 16}
          near={phase === 'explore' && marsNear}
          interactLabel={interactLabel(marsStep)}
          onInteract={handleMarsInteract}
          onMissions={handleBackToMissions}
          dialogue={activeDialogue}
          typeDialogue
          onDialogueTyped={onMarsTyped}
          showJoystick={phase === 'explore'}
          showMap={phase === 'explore'}
          showContinue={phase === 'outro' && marsStep === 'choice' && marsNarrationDone}
          onContinue={beginClosing}
          onJoystickMove={(forward, turn) => gameInputs.setVirtualJoystick(forward, turn)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {mission === 'mars' && phase === 'inspect' && marsReading && (
        <MarsInspect reading={marsReading} narrationDone={marsNarrationDone} onClose={resumeMarsReading} />
      )}

      {mission === 'mars' && phase === 'puzzle' && marsStep === 'sequence' && (
        <SequencePuzzle onComplete={finishSequence} />
      )}

      {mission === 'mars' && phase === 'puzzle' && marsStep === 'board' && (
        <EvidenceBoard onComplete={finishBoard} />
      )}

      {mission === 'mars' && phase === 'puzzle' && marsStep === 'choice' && (
        <LegacyChoice onChoose={chooseLegacy} />
      )}

      {mission === 'mars' && marsCurious && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4">
          <CuriousCard onMissions={handleBackToMissions} />
        </div>
      )}

      {orientationHold && <RotateOverlay />}
    </div>
  );
}
