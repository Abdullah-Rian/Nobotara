/**
 * The three missions, as the home page briefs them and the game names them.
 * One source for both, so the site and the game cannot disagree.
 * Small on purpose: the home page imports it without loading the game.
 */
import type { GameMission } from '../play/routes';

export interface MissionFact {
  label: string;
  value: string;
  unit?: string;
}

export interface MissionControls {
  keyboard: string[];
  touch: string[];
}

export interface MissionBrief {
  /** "MISSION 01" */
  number: string;
  /** Name as the game uses it. */
  name: string;
  /** The game's title for the mission. */
  title: string;
  /** Date line shown with the number, e.g. "JULY 20, 1969". */
  date: string;
  /** One line under the title. */
  tagline: string;
  /** The home page's original line about the mission, shown first on the card. */
  intro: string;
  /** One or two sentences for the home page card. */
  summary: string;
  /** Three short steps for the home page card. */
  steps: [string, string, string];
  /** Where the mission takes you. */
  place: string;
  /** What the player does, in order. */
  youWill: string[];
  controls: MissionControls;
  /** Facts about the real mission. */
  facts: MissionFact[];
  highlights: string[];
}

/**
 * Voyager 1's distance from Earth, from the tracked range the game uses
 * (25,880,381,236 km on 9 November 2026, NASA/JPL Horizons), carried forward at
 * its speed of 17 km/s. Earth's own orbit moves the true figure by up to about
 * 0.15 billion km over a year, so it is shown rounded, as "about".
 */
const VOYAGER_RANGE_KM = 25_880_381_236;
const VOYAGER_RANGE_AT = Date.UTC(2026, 10, 9);
const VOYAGER_SPEED_KM_S = 17;
const LIGHT_KM_S = 299_792.458;

export function voyagerRangeKm(now = Date.now()): number {
  return VOYAGER_RANGE_KM + ((now - VOYAGER_RANGE_AT) / 1000) * VOYAGER_SPEED_KM_S;
}

const voyagerBillionKm = () => (voyagerRangeKm() / 1e9).toFixed(1);
const voyagerLightHours = () => Math.round(voyagerRangeKm() / LIGHT_KM_S / 3600).toString();

export const MISSION_BRIEFS: Record<GameMission, MissionBrief> = {
  apollo: {
    number: 'MISSION 01',
    name: 'Apollo 11',
    title: 'One Giant Leap',
    date: 'JULY 20, 1969',
    tagline: 'The mission that succeeded. The things it left behind.',
    intro: "Humanity's first lunar landing on July 20, 1969. Explore the historic Sea of Tranquility landing site and Eagle lunar module.",
    summary: "Go back to the first Moon landing site and find out why Apollo 11 left things behind.",
    steps: ["Drive a rover across Tranquility Base", "Inspect what the astronauts left", "Time a laser pulse to the Moon"],
    place: 'Sea of Tranquility, the Moon · 0.674° N, 23.473° E',
    youWill: [
      'Drive an explorer rover across the Apollo 11 landing site.',
      'Inspect what the astronauts left behind, and find out why each piece stayed.',
      'Time a laser pulse from Earth to the Moon and back.',
      'Match each object to the reason it was left.'
    ],
    controls: {
      keyboard: ['W A S D or arrow keys: drive', 'E or Space: inspect', 'Esc: close a panel'],
      touch: ['Drag the stick to drive', 'Tap the on-screen buttons']
    },
    facts: [
      { label: 'Landing', value: '20:17:40', unit: 'UTC' },
      { label: 'Time on the surface', value: '21.6', unit: 'HOURS' },
      { label: 'Landing site', value: '0.674° N', unit: '23.473° E' },
      { label: 'Moon rock brought home', value: '21.55', unit: 'KG' }
    ],
    highlights: [
      'Eagle touched down in the Sea of Tranquility with less than a minute of landing fuel left.',
      'Neil Armstrong and Buzz Aldrin became the first people to walk on the Moon.',
      'Only the light ascent stage lifted off, to meet the command module Columbia in lunar orbit.'
    ]
  },
  voyager: {
    number: 'MISSION 02',
    name: 'Voyager 1',
    title: 'The Golden Record',
    date: 'LAUNCHED SEPTEMBER 5, 1977',
    tagline: 'The endless journey.',
    intro: "Humanity's farthest emissary in interstellar space, carrying the Golden Record past the heliopause into the cosmic deep.",
    summary: "Take the controls of the farthest spacecraft ever sent from Earth, now in interstellar space.",
    steps: ["Turn the dish back toward Earth", "Read its last instruments", "Open the Golden Record"],
    get place() {
      return `Interstellar space · about ${voyagerBillionKm()} billion km from Earth`;
    },
    youWill: [
      'Turn the spacecraft until its dish points at Earth.',
      'Read its instruments: plasma waves, the magnetic field, charged particles.',
      'Face the power limit, and open the Golden Record.',
      'Send one last archive home.'
    ],
    controls: {
      keyboard: ['Arrow keys: turn the spacecraft', 'Click the buttons on screen'],
      touch: ['Tap the on-screen arrows to turn', 'Tap the on-screen buttons']
    },
    get facts() {
      return [
        { label: 'Distance from Earth', value: `≈ ${voyagerBillionKm()}`, unit: 'BILLION KM' },
        { label: 'Speed (relative to the Sun)', value: '17', unit: 'KM/S' },
        { label: 'Radio signal, one way', value: `≈ ${voyagerLightHours()}`, unit: 'HOURS' },
        { label: 'Golden Record', value: '115', unit: 'IMAGES' }
      ];
    },
    get highlights() {
      return [
        'Crossed the heliopause into interstellar space on August 25, 2012, about 121 AU from the Sun.',
        'Carries a 12-inch gold-plated copper record of Earth sounds, music, greetings and pictures.',
        `Still talks to Earth through the Deep Space Network, from more than ${Math.floor(voyagerRangeKm() / 1e9)} billion km away.`
      ];
    }
  },
  mars: {
    number: 'MISSION 03',
    name: 'Mars Sample Return',
    title: 'The Lost Dream',
    date: 'PERSEVERANCE LANDED FEBRUARY 18, 2021',
    tagline: 'Jezero Crater. An unfinished journey.',
    intro: "Humanity's first planned interplanetary sample return: Martian rock cores from Jezero Crater, still waiting for their journey to Earth.",
    summary: "Perseverance sealed pieces of an ancient Martian lake in tubes. They are still waiting to come home.",
    steps: ["Drive Perseverance through Jezero", "Scan rocks from an old lake", "Plan the journey home"],
    place: 'Jezero Crater, Mars · 18.38° N, 77.58° E',
    youWill: [
      'Drive Perseverance across an old lake bed and river delta.',
      'Scan three kinds of rock and learn what each one remembers.',
      'Put the plan to bring the samples home in order.',
      'Weigh the evidence, and decide what this mission leaves behind.'
    ],
    controls: {
      keyboard: ['W A S D or arrow keys: drive', 'E: interact (hold E to scan)', 'Esc: skip the opening'],
      touch: ['Drag the stick to drive', 'Tap, or hold, the on-screen buttons']
    },
    facts: [
      { label: 'Landing site', value: '18.38° N', unit: '77.58° E' },
      { label: 'Perseverance landed', value: 'FEB 18', unit: '2021' },
      { label: 'Sample tubes carried', value: '43', unit: 'TUBES' },
      { label: 'Tubes left at Three Forks', value: '10', unit: 'TUBES' }
    ],
    highlights: [
      'Perseverance seals rock and soil cores from an ancient lake and river delta in titanium tubes.',
      'The return plan needed a lander, a Mars Ascent Vehicle (the first rocket launch from another planet), and an orbiter to carry the samples to Earth.',
      'The samples are waiting on Mars. The trip to bring them home has not flown.'
    ]
  }
};
