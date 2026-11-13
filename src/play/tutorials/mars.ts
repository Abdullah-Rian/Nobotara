import { CoachBeat } from '../components/ObjectiveCoach';
import { MarsStep } from '../missions/mars/data';
import { GamePhase } from '../types/game';

/**
 * Mission 03's tutorial. Each hint shows once per play, never while a line is being spoken,
 * and never over a panel that already explains itself (the plan puzzle, the evidence board,
 * the legacy choice and the last card all say what to do).
 */

const DRIVE: CoachBeat = {
  id: 'mars-drive',
  text: 'Drive with W A S D, or drag the stick. Three rocks are marked in green. Visit them in any order.',
  pointAt: 'mars-stick',
  hand: true,
  dismissOnDrive: true
};

const HOLD_SCAN: CoachBeat = {
  id: 'mars-scan',
  text: 'Hold this button, or hold E, to sweep the scanner over the rock.',
  pointAt: 'mars-scan',
  hand: false,
  style: 'highlight'
};

const READ_CONTINUE: CoachBeat = {
  id: 'mars-continue',
  text: 'When you have read it, press Continue.',
  pointAt: 'mars-continue',
  hand: false,
  style: 'highlight'
};

const MAP: CoachBeat = {
  id: 'mars-map',
  text: 'Two rocks to go. Green dots on the map are the ones left.',
  pointAt: 'mars-map',
  hand: true,
  dismissOnDrive: true
};

const CLUES: CoachBeat = {
  id: 'mars-clues',
  text: 'Three clues are marked now. Find them in any order.',
  pointAt: 'mars-log',
  hand: false,
  dismissOnDrive: true
};

const LEAVE: CoachBeat = {
  id: 'mars-leave',
  text: 'Press Leave the Crater when you are ready.',
  pointAt: 'mars-leave',
  hand: false,
  style: 'highlight'
};

/** The first time the rover reaches a site in each step: press E, or tap the button (named as on screen). */
function nearBeat(step: MarsStep, label: string): CoachBeat {
  return {
    id: `mars-near-${step}`,
    text: `You are close enough. Press E, or tap ${label}.`,
    pointAt: 'mars-interact',
    hand: false,
    style: 'highlight'
  };
}

/** A new place to drive to: say where, and that the map shows it. */
const GOALS: Partial<Record<MarsStep, string>> = {
  tubes: 'New goal: find the sealed sample tubes. Follow the green dot on the map.',
  sequence: 'New goal: open the terminal. Follow the green dot on the map.',
  question: 'New goal: go back to the sealed tubes. Follow the green dot on the map.'
};

function goalBeat(step: MarsStep): CoachBeat | null {
  const text = GOALS[step];
  if (!text) return null;
  return { id: `mars-goal-${step}`, text, pointAt: 'mars-map', hand: true, dismissOnDrive: true };
}

export function marsCoachBeat(input: {
  mission: 'apollo' | 'voyager' | 'mars';
  phase: GamePhase;
  step: MarsStep;
  near: boolean;
  /** The action button's label, e.g. SCAN ROCK or OPEN TERMINAL. */
  interactLabel: string;
  /** Sites finished inside the current step. */
  doneInStep: number;
  linePlaying: boolean;
  /** A voice line is being spoken right now (a finished line can stay on screen). */
  speaking: boolean;
  scanning: boolean;
  /** A reading is open and its narration has finished. */
  readingDone: boolean;
  /** LEAVE THE CRATER is on screen. */
  canLeave: boolean;
  orientationHold: boolean;
  seen: readonly string[];
}): CoachBeat | null {
  if (input.mission !== 'mars' || input.orientationHold) return null;

  let beat: CoachBeat | null = null;
  if (input.phase === 'inspect' && input.scanning) {
    beat = HOLD_SCAN;
  } else if (input.phase === 'inspect' && input.readingDone) {
    beat = READ_CONTINUE;
  } else if (input.canLeave && !input.speaking) {
    beat = LEAVE;
  } else if (input.phase === 'explore' && input.near && !input.linePlaying) {
    beat = nearBeat(input.step, input.interactLabel);
  } else if (input.phase === 'explore' && !input.linePlaying) {
    if (input.step === 'rocks') beat = input.doneInStep === 0 ? DRIVE : input.doneInStep === 1 ? MAP : null;
    else if (input.step === 'clues') beat = CLUES;
    else beat = goalBeat(input.step);
  }

  if (!beat || input.seen.includes(beat.id)) return null;
  return beat;
}
