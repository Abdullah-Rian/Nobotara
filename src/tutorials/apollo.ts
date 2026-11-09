import { CoachBeat } from '../components/ObjectiveCoach';
import { GamePhase, ObjectiveStep } from '../types/game';

const LANDER: CoachBeat = {
  id: 'apollo-lander',
  text: 'Drag the stick, or use W A S D, and drive into the marker.',
  pointAt: 'apollo-stick',
  hand: true,
  dismissOnDrive: true
};

const RESUME: CoachBeat = {
  id: 'apollo-resume',
  text: 'Continue when the line finishes.',
  pointAt: 'apollo-resume',
  hand: true
};

const RETRO: CoachBeat = {
  id: 'apollo-retro',
  text: 'Follow the compass to the next marker.',
  pointAt: 'apollo-compass',
  hand: true,
  dismissOn: ['apollo-stick'],
  dismissOnDrive: true
};

const LASER_DRIVE: CoachBeat = {
  id: 'apollo-laser-drive',
  text: 'Drive to the laser station.',
  pointAt: 'apollo-compass',
  hand: true,
  dismissOn: ['apollo-stick'],
  dismissOnDrive: true
};

const PLAQUE: CoachBeat = {
  id: 'apollo-plaque',
  text: 'Follow the compass to the next marker.',
  pointAt: 'apollo-compass',
  hand: true,
  dismissOn: ['apollo-stick'],
  dismissOnDrive: true
};

const FIRE: CoachBeat = {
  id: 'apollo-fire',
  text: 'Fire the laser.',
  pointAt: 'apollo-fire',
  hand: true
};

const LASER_CONTINUE: CoachBeat = {
  id: 'apollo-laser-continue',
  text: 'Press Continue.',
  pointAt: 'apollo-laser-continue',
  hand: true
};

const CHALLENGE: CoachBeat = {
  id: 'apollo-challenge',
  text: 'Match each object to why it stayed on the Moon.',
  pointAt: 'apollo-challenge',
  hand: true
};

const MATCH: CoachBeat = {
  id: 'apollo-match',
  text: 'Choose an object, then the reason it was left behind.',
  pointAt: 'apollo-match',
  hand: false
};

export function apolloCoachBeat(input: {
  mission: 'apollo' | 'voyager' | 'mars';
  phase: GamePhase;
  objective: ObjectiveStep;
  canDrive: boolean;
  inspectingDescent: boolean;
  inspectNarrationDone: boolean;
  rangingOpen: boolean;
  laserResultReady: boolean;
  challengeReady: boolean;
  orientationHold: boolean;
  seen: readonly string[];
}): CoachBeat | null {
  if (input.mission !== 'apollo' || input.orientationHold) return null;

  let beat: CoachBeat | null = null;
  if (input.phase === 'inspect' && input.inspectingDescent && input.inspectNarrationDone) {
    beat = RESUME;
  } else if (input.rangingOpen && input.laserResultReady) {
    beat = LASER_CONTINUE;
  } else if (input.rangingOpen) {
    beat = FIRE;
  } else if (input.phase === 'puzzle') {
    beat = MATCH;
  } else if (input.canDrive && input.objective === 'lander') {
    beat = LANDER;
  } else if (input.canDrive && input.objective === 'retroreflector') {
    beat = RETRO;
  } else if (input.canDrive && input.objective === 'laser') {
    beat = LASER_DRIVE;
  } else if (input.canDrive && input.objective === 'plaque') {
    beat = PLAQUE;
  } else if (input.canDrive && input.objective === 'free' && input.challengeReady) {
    beat = CHALLENGE;
  }

  if (!beat || input.seen.includes(beat.id)) return null;
  return beat;
}
