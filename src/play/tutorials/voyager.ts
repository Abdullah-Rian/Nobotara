import { CoachBeat } from '../components/ObjectiveCoach';
import { VoyagerStep } from '../missions/voyager/data';
import { GamePhase } from '../types/game';

const AIM: CoachBeat = {
  id: 'voyager-aim',
  text: 'Press the arrows, or the arrow keys. Turn until the blue dot sits on the dish. Turning spends propellant.',
  pointAt: 'voyager-aim',
  hand: true,
  dismissOnDrive: true
};

const INITIATE: CoachBeat = {
  id: 'voyager-initiate',
  text: 'Press Initiate. A light marks the instrument, then the reading opens.',
  pointAt: 'voyager-initiate',
  hand: true
};

const INITIATE_AGAIN: CoachBeat = {
  id: 'voyager-initiate-again',
  text: 'Initiate the next reading the same way.',
  pointAt: 'voyager-initiate',
  hand: false
};

const RECORD: CoachBeat = {
  id: 'voyager-record',
  text: 'Open the Golden Record.',
  pointAt: 'voyager-initiate',
  hand: true
};

const RECORD_NEXT: CoachBeat = {
  id: 'voyager-record-next',
  text: 'Turn the page.',
  pointAt: 'voyager-record-next',
  hand: true
};

const ARCHIVE: CoachBeat = {
  id: 'voyager-archive',
  text: 'Choose the three findings Voyager actually made.',
  pointAt: 'voyager-archive',
  hand: false
};

const SEND: CoachBeat = {
  id: 'voyager-send',
  text: 'Send the telemetry.',
  pointAt: 'voyager-send',
  hand: true
};

export function voyagerCoachBeat(input: {
  mission: 'apollo' | 'voyager' | 'mars';
  phase: GamePhase;
  step: VoyagerStep;
  linePlaying: boolean;
  showAim: boolean;
  showInitiate: boolean;
  recordOpen: boolean;
  recordNextReady: boolean;
  archiveOpen: boolean;
  archivePicked: number;
  orientationHold: boolean;
  seen: readonly string[];
}): CoachBeat | null {
  if (input.mission !== 'voyager' || input.orientationHold || input.phase === 'outro') return null;

  let beat: CoachBeat | null = null;
  if (input.recordOpen && input.recordNextReady) {
    beat = RECORD_NEXT;
  } else if (input.archiveOpen && input.archivePicked >= 3) {
    beat = SEND;
  } else if (input.archiveOpen) {
    beat = ARCHIVE;
  } else if (input.showInitiate && input.step === 'plasma') {
    beat = INITIATE;
  } else if (input.showInitiate && input.step === 'magnetic') {
    beat = INITIATE_AGAIN;
  } else if (input.showInitiate && input.step === 'record') {
    beat = RECORD;
  } else if (input.showAim && !input.linePlaying) {
    beat = AIM;
  }

  if (!beat || input.seen.includes(beat.id)) return null;
  return beat;
}
