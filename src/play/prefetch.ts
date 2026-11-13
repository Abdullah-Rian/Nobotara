/**
 * Warm the game up from the home page, so Get Started feels instant on a good connection
 * and costs nothing on a poor one. Small on purpose: the home page imports it.
 */
import type { GameMission } from './routes';

/** The files each mission asks for first, in the order its scene needs them. */
const FIRST_FILES: Record<GameMission, string[]> = {
  apollo: [
    '/models/terrain-heights-v2.bin',
    '/models/regolith_tile.jpg',
    '/models/descent_stage.glb',
    '/models/retroreflector.glb',
    '/models/earth.glb',
    '/models/sun.glb'
  ],
  voyager: ['/models/voyager.glb'],
  mars: ['/models/nasa/mars-approach.glb', '/models/nasa/mars-lite.glb', '/models/nasa/perseverance-lite.glb?v=upright']
};

let codeRequested = false;
const filesRequested = new Set<string>();

/** Download the game's code (not run it). Safe to call often. */
export function prefetchGameCode() {
  if (codeRequested) return;
  codeRequested = true;
  void import('./PlayRoute.tsx').catch(() => {
    codeRequested = false;
  });
}

/** Ask the browser to fetch a mission's first models at low priority, into its cache. */
export function prefetchMissionFiles(mission: GameMission) {
  for (const href of FIRST_FILES[mission]) {
    if (filesRequested.has(href)) continue;
    filesRequested.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
}
