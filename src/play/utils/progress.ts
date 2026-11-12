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
