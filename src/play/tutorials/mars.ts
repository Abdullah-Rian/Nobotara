import { CoachBeat } from '../components/ObjectiveCoach';
import { MarsStep } from '../missions/mars/data';
import { GamePhase } from '../types/game';

const DRIVE: CoachBeat = {
  id: 'mars-drive',
  text: 'Drive with W A S D, or drag the stick. Three rocks are marked in green. Visit them in any order.',
  pointAt: 'mars-stick',
  hand: true,
  dismissOnDrive: true
};

const START_SCAN: CoachBeat = {
  id: 'mars-interact',
  text: 'You are close enough. Press E, or tap here.',
  pointAt: 'mars-interact',
  hand: true
};

const HOLD_SCAN: CoachBeat = {
  id: 'mars-scan',
  text: 'Hold this button, or hold E, to sweep the scanner over the rock.',
  pointAt: 'mars-scan',
  hand: true
};

const CLUES: CoachBeat = {
  id: 'mars-clues',
  text: 'Three clues are marked now. Find them in any order.',
  pointAt: 'mars-log',
  hand: false,
  dismissOnDrive: true
};

export function marsCoachBeat(input: {
  mission: 'apollo' | 'voyager' | 'mars';
  phase: GamePhase;
  step: MarsStep;
  near: boolean;
  /** Nothing in this act has been finished yet. */
  firstSite: boolean;
  linePlaying: boolean;
  scanning: boolean;
  orientationHold: boolean;
  seen: readonly string[];
}): CoachBeat | null {
  if (input.mission !== 'mars' || input.orientationHold) return null;

  let beat: CoachBeat | null = null;
  if (input.phase === 'inspect' && input.scanning) {
    beat = HOLD_SCAN;
  } else if (input.phase === 'explore' && input.near && input.step === 'rocks' && input.firstSite) {
    beat = START_SCAN;
  } else if (input.phase === 'explore' && !input.linePlaying && input.step === 'rocks') {
    beat = DRIVE;
  } else if (input.phase === 'explore' && !input.linePlaying && input.step === 'clues') {
    beat = CLUES;
  }

  if (!beat || input.seen.includes(beat.id)) return null;
  return beat;
}
