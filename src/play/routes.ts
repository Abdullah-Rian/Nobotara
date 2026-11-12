/**
 * Game addresses. Small on purpose: the home page imports this without loading the game.
 *
 *   /play/apollo-11              Mission 01
 *   /play/voyager-1              Mission 02
 *   /play/mars-sample-return     Mission 03
 */

export type GameMission = 'apollo' | 'voyager' | 'mars';
/** The home page's own names for the missions (its ?mission= values). */
export type SiteMission = 'apollo11' | 'voyager1' | 'msr';

const SLUGS: Record<GameMission, string> = {
  apollo: 'apollo-11',
  voyager: 'voyager-1',
  mars: 'mars-sample-return'
};

const FROM_SITE: Record<SiteMission, GameMission> = { apollo11: 'apollo', voyager1: 'voyager', msr: 'mars' };
const TO_SITE: Record<GameMission, SiteMission> = { apollo: 'apollo11', voyager: 'voyager1', mars: 'msr' };

export const gameMissionFor = (site: SiteMission): GameMission => FROM_SITE[site];
export const siteMissionFor = (game: GameMission): SiteMission => TO_SITE[game];

/** /play/<slug>, keeping ?debug when the current page has it. */
export function playPath(mission: GameMission): string {
  const debug = new URLSearchParams(window.location.search).has('debug');
  return `/play/${SLUGS[mission]}${debug ? '?debug' : ''}`;
}

/** The mission a path asks for, or null when it is not a game page. Plain /play opens Mission 01. */
export function missionFromPath(pathname: string): GameMission | null {
  const match = /^\/play(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!match) return null;
  if (!match[1]) return 'apollo';
  const entry = (Object.entries(SLUGS) as [GameMission, string][]).find(([, slug]) => slug === match[1]);
  return entry ? entry[0] : null;
}
