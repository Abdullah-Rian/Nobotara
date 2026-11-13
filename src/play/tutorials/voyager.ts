import { CoachBeat } from '../components/ObjectiveCoach';
import { VoyagerStep } from '../missions/voyager/data';
import { GamePhase } from '../types/game';

const AIM: CoachBeat = {
  id: 'voyager-aim',
  text: 'Press the arrows, or the arrow keys. Turn until the blue dot sits on the dish. Turning spends propellant.',
  pointAt: 'voyager-aim',
  // The text explains the goal, which a highlight can't, so it stays, without the hand; the arrows pulse.
  hand: false,
  style: 'caption+highlight',
  dismissOnDrive: true
};

const INITIATE: CoachBeat = {
  id: 'voyager-initiate',
  text: 'Press Initiate. A light marks the instrument, then the reading opens.',
  pointAt: 'voyager-initiate',
  hand: false,
  style: 'highlight'
};

/** Once, at the second reading: the part markers are there only when the player asks for them. */
const INSPECT: CoachBeat = {
  id: 'voyager-inspect',
  text: 'Inspect Voyager 1 to see its parts.',
  pointAt: 'voyager-inspect',
  hand: false,
  style: 'highlight'
};

const RECORD: CoachBeat = {
  id: 'voyager-record',
  text: 'Open the Golden Record.',
  pointAt: 'voyager-initiate',
  hand: false,
  style: 'highlight'
};

const RECORD_NEXT: CoachBeat = {
  id: 'voyager-record-next',
  text: 'Turn the page.',
  pointAt: 'voyager-record-next',
  hand: false,
  style: 'highlight'
};

const SEND: CoachBeat = {
  id: 'voyager-send',
  text: 'Send the telemetry.',
  pointAt: 'voyager-send',
  hand: false,
  style: 'highlight'
};

export function voyagerCoachBeat(input: {
  mission: 'apollo' | 'voyager' | 'mars';
  phase: GamePhase;
  step: VoyagerStep;
  linePlaying: boolean;
  showAim: boolean;
  showInitiate: boolean;
  /** Inspect Voyager 1 can be pressed now. */
  canInspect: boolean;
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
    // The archive explains itself (its subtitle says three were Voyager 1's), so no hint here.
    beat = null;
  } else if (input.showInitiate && input.step === 'plasma') {
    beat = INITIATE;
  } else if (input.canInspect && input.step === 'magnetic' && !input.linePlaying) {
    beat = INSPECT;
  } else if (input.showInitiate && input.step === 'record') {
    beat = RECORD;
  } else if (input.showAim && !input.linePlaying) {
    beat = AIM;
  }

  if (!beat || input.seen.includes(beat.id)) return null;
  return beat;
}
