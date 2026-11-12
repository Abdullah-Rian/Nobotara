import { DialogueMessage } from '../../types/game';

export type VoyagerMarkerId = 'plasma' | 'magnetic' | 'particles' | 'power';

export type VoyagerStep =
  | 'align'
  | 'cross'
  | 'plasma'
  | 'magnetic'
  | 'particles'
  | 'power'
  | 'record'
  | 'archive'
  | 'outro';

export const SHELL_RADIUS = 22;
export const VOYAGER_BUBBLE = 46;
export const EARTH_DIRECTION = { x: 0, y: 0.15, z: 1 };

/**
 * Voyager 1 travels about 35° north of Earth's orbital plane, toward Ophiuchus.
 * On 9 November 2026 the angle at the Sun between Earth and Voyager is 136°.
 * Earth is near heliocentric longitude 48°, Mars near 103°, Voyager near 256°.
 * Marker distances are scene units, not to scale, so the lights stay apart.
 * At true scale they would be a fraction of a degree apart as seen from the spacecraft.
 */
export const VOYAGER_ECLIPTIC_LAT_DEG = 35;
export const SUN_EARTH_VOYAGER_DEG = 136;
const VOYAGER_ECLIPTIC_LON_DEG = 256;
const MARS_ECLIPTIC_LON_DEG = 103;
const MARS_SUN_AU = 1.524;
const SUN_MARKER_RANGE = 340;
const EARTH_SUN_MARKER = 36;

export function voyagerSunEarthPositions(craft: { x: number; y: number; z: number }) {
  const lat = (VOYAGER_ECLIPTIC_LAT_DEG * Math.PI) / 180;
  const atSun = (SUN_EARTH_VOYAGER_DEG * Math.PI) / 180;
  const deltaLon = Math.acos(Math.cos(atSun) / Math.cos(lat));
  const marsAz = ((MARS_ECLIPTIC_LON_DEG - VOYAGER_ECLIPTIC_LON_DEG) * Math.PI) / 180;
  const sun = {
    x: craft.x,
    y: craft.y - SUN_MARKER_RANGE * Math.sin(lat),
    z: craft.z - SUN_MARKER_RANGE * Math.cos(lat)
  };
  const earth = placeInEcliptic(sun, deltaLon, EARTH_SUN_MARKER);
  const mars = placeInEcliptic(sun, marsAz, EARTH_SUN_MARKER * MARS_SUN_AU);
  const desired = normalize(EARTH_DIRECTION);
  const aligned = alignTo(craft, sun, earth, mars, desired);
  const leveled = levelCluster(craft, aligned.sun, aligned.mars, desired);
  const earthRange = length(sub(aligned.earth, craft));
  return {
    sun: leveled.sun,
    earth: {
      x: craft.x + desired.x * earthRange,
      y: craft.y + desired.y * earthRange,
      z: craft.z + desired.z * earthRange
    },
    mars: leveled.mars
  };
}

/** Roll around Earth so the Sun and Mars stay near its height and share the frame. */
function levelCluster(
  craft: { x: number; y: number; z: number },
  sun: { x: number; y: number; z: number },
  mars: { x: number; y: number; z: number },
  axis: { x: number; y: number; z: number }
) {
  const target = Math.asin(clamp(axis.y, -1, 1));
  let best: { score: number; sun: { x: number; y: number; z: number }; mars: { x: number; y: number; z: number } } | null = null;
  for (let step = 0; step < 360; step++) {
    const angle = (step * Math.PI) / 180;
    const nextSun = add(craft, rotateAround(sub(sun, craft), axis, angle));
    const nextMars = add(craft, rotateAround(sub(mars, craft), axis, angle));
    const score = Math.max(
      Math.abs(elevation(nextSun, craft) - target),
      Math.abs(elevation(nextMars, craft) - target)
    );
    if (!best || score < best.score) best = { score, sun: nextSun, mars: nextMars };
  }
  return best ?? { score: 0, sun, mars };
}

function elevation(point: { x: number; y: number; z: number }, craft: { x: number; y: number; z: number }) {
  return Math.asin(clamp(normalize(sub(point, craft)).y, -1, 1));
}

function placeInEcliptic(
  sun: { x: number; y: number; z: number },
  azimuth: number,
  distance: number
) {
  return {
    x: sun.x + distance * Math.sin(azimuth),
    y: sun.y,
    z: sun.z + distance * Math.cos(azimuth)
  };
}

function alignTo(
  craft: { x: number; y: number; z: number },
  sun: { x: number; y: number; z: number },
  earth: { x: number; y: number; z: number },
  mars: { x: number; y: number; z: number },
  desired: { x: number; y: number; z: number }
) {
  const from = normalize(sub(earth, craft));
  const axis = cross(from, desired);
  const axisLen = length(axis);
  const angle = Math.acos(clamp(dot(from, desired), -1, 1));
  if (axisLen < 1e-8 || angle < 1e-8) return { sun, earth, mars };
  const k = scale(axis, 1 / axisLen);
  const turn = (point: { x: number; y: number; z: number }) => add(craft, rotateAround(sub(point, craft), k, angle));
  return { sun: turn(sun), earth: turn(earth), mars: turn(mars) };
}

function sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: { x: number; y: number; z: number }, s: number) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function length(v: { x: number; y: number; z: number }) {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize(v: { x: number; y: number; z: number }) {
  return scale(v, 1 / length(v));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rotateAround(
  v: { x: number; y: number; z: number },
  axis: { x: number; y: number; z: number },
  angle: number
) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
}

export interface VoyagerMarker {
  id: VoyagerMarkerId;
  name: string;
  position: [number, number, number];
  narrator: string;
  science: string;
  narratorClip: string;
  scienceClip: string;
  note: string;
}

export const VOYAGER_INTRO: DialogueMessage = {
  speaker: 'Narrator-02',
  text: 'Humanity once stood on the Moon, leaving behind the marks of its first steps. But exploration was never meant to end there. Beyond the Moon, beyond Mars, beyond the familiar boundaries of our Solar System, another journey continued. A machine built on Earth, launched in 1977, sent to explore the outer planets. It travelled farther than any human-made spacecraft before it. In August 2012, Voyager 1 entered interstellar space. It had crossed a boundary humanity had never crossed before.'
};

export const VOYAGER_ALIGN_CONTROL: DialogueMessage = {
  speaker: 'Mission Control',
  text: 'Voyager 1, your signal is faint, but we are listening. You have travelled farther than we ever imagined. Turn the spacecraft until the high-gain antenna points at Earth.'
};

export const VOYAGER_ALIGN_SCIENCE: DialogueMessage = {
  speaker: 'Scientific Voice',
  text: 'Voyager uses a high-gain antenna fixed to the body of the spacecraft. The whole craft has to turn so that dish faces Earth. That link is how its instruments send scientific data home. At this distance a radio message takes many hours to arrive.'
};

export const VOYAGER_SHELL_LINE: DialogueMessage = {
  speaker: 'Narrator-02',
  text: 'The Sun\'s influence reaches far beyond the planets. But there is a frontier where its protective bubble gives way to the interstellar environment. Voyager 1 crossed that frontier in August 2012. Now it is exploring a region no human-made spacecraft had entered before.'
};

export const VOYAGER_MARKERS: VoyagerMarker[] = [
  {
    id: 'plasma',
    name: 'Plasma waves',
    position: [26, 2, 8],
    narrator: 'The first reading is a plasma wave. Out here the instrument listens to the thin electrical tremble of the gas around the spacecraft.',
    science: 'In 2012 and 2013, bursts from the Sun made that gas ring like a bell. The pitch showed the gas was about forty times denser than inside the Sun\'s bubble. That was the proof Voyager had reached interstellar space.',
    narratorClip: 'voyager_plasma_narrator',
    scienceClip: 'voyager_plasma_science',
    note: 'Plasma-wave instrument · still working'
  },
  {
    id: 'magnetic',
    name: 'Magnetic field',
    position: [-8, 4, 28],
    narrator: 'The next reading is the magnetic field. Scientists compare its strength and direction with what the heliosphere would produce.',
    science: 'Scientists expected the field\'s direction to change sharply at the edge. It barely changed. That surprise is still being studied, and it shows how much we learn by going to look.',
    narratorClip: 'voyager_magnetic_narrator',
    scienceClip: 'voyager_magnetic_science',
    note: 'Magnetometer · still working'
  },
  {
    id: 'particles',
    name: 'Charged particles',
    position: [-24, -2, -6],
    narrator: 'The third reading is charged particles. When Voyager crossed the edge in 2012, particles from the Sun almost vanished, and particles from the rest of the galaxy jumped up.',
    science: 'That swap was the clearest sign that Voyager had left the Sun\'s bubble. Its particle instruments have since been switched off to save power, the last one in April 2026, but their record remains.',
    narratorClip: 'voyager_particles_narrator',
    scienceClip: 'voyager_particles_science',
    note: 'Particle instruments · switched off to save power'
  },
  {
    id: 'power',
    name: 'Power system',
    position: [12, -3, -24],
    narrator: 'Every mission has limits. Voyager was never designed to operate forever. Its power supply slowly weakens, and engineers must decide which systems can continue and which must be switched off. Sometimes, keeping a mission alive means learning to do less.',
    science: 'NASA has switched off Voyager 1 instruments one by one to save power. Today only two still work: the plasma-wave instrument and the magnetometer. It is a careful trade-off, not a sudden failure.',
    narratorClip: 'voyager_power_narrator',
    scienceClip: 'voyager_power_science',
    note: 'A real power trade-off, not a sudden failure.'
  }
];

export interface RecordPage {
  id: 'sounds' | 'greetings' | 'images';
  title: string;
  narrator: string;
  science: string;
  narratorClip: string;
  scienceClip: string;
}

export const RECORD_PAGES: RecordPage[] = [
  {
    id: 'sounds',
    title: 'Sounds',
    narrator: 'Voyager carries something more than instruments. The Golden Record holds sounds from our world: wind, surf, animals, and tools.',
    science: 'The Golden Record is real. Its sound essay was chosen to represent Earth. The record is not a device that transmits those sounds back to Earth.',
    narratorClip: 'voyager_record_sounds',
    scienceClip: 'voyager_record_sounds_science'
  },
  {
    id: 'greetings',
    title: 'Greetings',
    narrator: 'It also carries greetings in human languages. A civilisation wanted to say, across every barrier of speech: we were here.',
    science: 'The greetings were recorded in dozens of languages. They are a message to whoever might one day find the spacecraft. They are not a live broadcast.',
    narratorClip: 'voyager_record_greetings',
    scienceClip: 'voyager_record_greetings_science'
  },
  {
    id: 'images',
    title: 'Images',
    narrator: 'The record also stores images: people, animals, the planet, and how we build. Scientists and collaborators chose them to represent life on Earth.',
    science: 'The images were encoded on the disc with music and the sounds. The record rides with Voyager. It does not send its contents home.',
    narratorClip: 'voyager_record_images',
    scienceClip: 'voyager_record_images_science'
  }
];

export interface ArchiveItem {
  id: string;
  text: string;
  correct: boolean;
  /** For a wrong choice: who really did it. */
  note?: string;
}

/**
 * The wrong choices are real discoveries by other spacecraft, so a wrong pick still teaches something.
 * The list is mixed so the right answers are not simply the first three.
 */
export const ARCHIVE_ITEMS: ArchiveItem[] = [
  { id: 'jupiter', text: "Jupiter's ring and previously unknown moons.", correct: true },
  { id: 'neptune', text: "Neptune's Great Dark Spot, a storm the size of Earth.", correct: false, note: 'Neptune was Voyager 2. Voyager 1 never went there.' },
  { id: 'saturn', text: "Saturn's rings and moons, up close.", correct: true },
  { id: 'titan-landing', text: "A landing on Saturn's moon Titan.", correct: false, note: "The Huygens probe landed on Titan in 2005. Voyager 1 only flew past it." },
  { id: 'interstellar', text: 'Measurements of the interstellar environment.', correct: true },
  { id: 'uranus', text: 'The first close look at Uranus.', correct: false, note: 'Uranus was Voyager 2, in 1986.' }
];

export const ARCHIVE_DISCLAIMER = 'This is a fictional ending for the game. It is not a claim that Voyager 1 has sent its final real-world transmission.';

/** Speed of light in vacuum, used to turn the Earth range into a one-way radio time. */
export const LIGHT_SPEED_KM_S = 299_792.458;

/**
 * Voyager 1's distance from Earth on 9 November 2026, from the tracked
 * trajectory published through NASA/JPL Horizons. One light-day, 25.902 billion
 * km, comes on 18 November 2026.
 */
export const VOYAGER_EARTH_RANGE_KM = 25_880_381_236;
/** Voyager 1's speed relative to the Sun, the figure published with its status. */
export const VOYAGER_SUN_SPEED_KM_S = 17;
export const VOYAGER_RANGE_DATE = '9 November 2026';
export const VOYAGER_LIGHT_DAY_DATE = '18 November 2026';
export const VOYAGER_LIGHT_DAY_BILLION_KM = 25.9;
/** The same moment as a date, so text can say "will reach" before it and "reached" after. */
export const VOYAGER_LIGHT_DAY = new Date('2026-11-18T00:00:00Z');
/** Short distance label for headers, from the same tracked range. */
export const VOYAGER_RANGE_LABEL = `${(VOYAGER_EARTH_RANGE_KM / 1_000_000_000).toFixed(1)} BILLION KM`;

export const VOYAGER_INTRO_TITLE = 'VOYAGER 1';
export const VOYAGER_INTRO_STATUS = `Distance from Earth: ${(VOYAGER_EARTH_RANGE_KM / 1_000_000_000).toFixed(2)} billion km ; Speed: ${VOYAGER_SUN_SPEED_KM_S.toFixed(1)} km/s`;

export const LIVE_MARKER: Partial<Record<VoyagerStep, VoyagerMarkerId>> = {
  plasma: 'plasma',
  magnetic: 'magnetic',
  particles: 'particles',
  power: 'power'
};

/** Part id in `VOYAGER_PARTS` that lights up for a reading. */
export const READING_BLINK: Record<VoyagerMarkerId, string> = {
  plasma: 'science',
  magnetic: 'magnetometer',
  particles: 'science',
  power: 'power'
};

export function markerById(id: VoyagerMarkerId): VoyagerMarker {
  const marker = VOYAGER_MARKERS.find(item => item.id === id);
  if (!marker) throw new Error(`Unknown Voyager marker ${id}`);
  return marker;
}
