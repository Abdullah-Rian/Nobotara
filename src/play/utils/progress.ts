export type MissionId = 'apollo' | 'voyager' | 'mars';

const KEY = 'nobotara71.missionsDone';
const ALL: MissionId[] = ['apollo', 'voyager', 'mars'];

function read(): MissionId[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? ALL.filter(id => parsed.includes(id)) : [];
  } catch {
    return [];
  }
}

/** Remember, on this device, that a mission was played to its end. */
export function markMissionDone(id: MissionId) {
  try {
    const done = read();
    if (!done.includes(id)) window.localStorage.setItem(KEY, JSON.stringify([...done, id]));
  } catch {
    // Private windows and blocked storage: the game still works, the congratulation is just not shown.
  }
}

export function allMissionsDone() {
  const done = read();
  return ALL.every(id => done.includes(id));
}

/** Has this mission been played to its end on this device? */
export function missionDone(id: MissionId) {
  return read().includes(id);
}

const INTRO_KEY = 'nobotara71.introsSeen';

function readIntros(): MissionId[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(INTRO_KEY) ?? '[]');
    return Array.isArray(parsed) ? ALL.filter(id => parsed.includes(id)) : [];
  } catch {
    return [];
  }
}

/** Remember that a mission's opening cinematic was watched to its end. */
export function markIntroSeen(id: MissionId) {
  try {
    const seen = readIntros();
    if (!seen.includes(id)) window.localStorage.setItem(INTRO_KEY, JSON.stringify([...seen, id]));
  } catch {
    // Blocked storage: the opening simply stays unskippable.
  }
}

/** The opening cinematic can be skipped once it has been watched, or the mission finished, on this device. */
export function introSeen(id: MissionId) {
  return readIntros().includes(id) || missionDone(id);
}
