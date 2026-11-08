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
    science: 'Plasma-wave measurements can reveal properties of the surrounding environment. What you see is an educational reading of an instrument Voyager really carries. The game is not performing a new scan.',
    narratorClip: 'voyager_plasma_narrator',
    scienceClip: 'voyager_plasma_science',
    note: 'Educational reading of a real Voyager instrument. Not a new scan.'
  },
  {
    id: 'magnetic',
    name: 'Magnetic field',
    position: [-8, 4, 28],
    narrator: 'The next reading is the magnetic field. Scientists compare its strength and direction with what the heliosphere would produce.',
    science: 'Magnetic-field measurements help scientists tell the solar bubble from the interstellar medium beyond it. This panel is an interpretation of that investigation, not a fresh measurement made for the game.',
    narratorClip: 'voyager_magnetic_narrator',
    scienceClip: 'voyager_magnetic_science',
    note: 'Educational reading of a real Voyager instrument. Not a new scan.'
  },
  {
    id: 'particles',
    name: 'Charged particles',
    position: [-24, -2, -6],
    narrator: 'The third reading counts charged particles. Their numbers change as the spacecraft leaves the Sun\'s wind behind.',
    science: 'Particle measurements help scientists investigate the space beyond the heliosphere. The display explains that capability. It does not claim Voyager is taking a new sample right now.',
    narratorClip: 'voyager_particles_narrator',
    scienceClip: 'voyager_particles_science',
    note: 'Educational reading of a real Voyager instrument. Not a new scan.'
  },
  {
    id: 'power',
    name: 'Power system',
    position: [12, -3, -24],
    narrator: 'Every mission has limits. Voyager was never designed to operate forever. Its power supply slowly weakens, and engineers must decide which systems can continue and which must be switched off. Sometimes, keeping a mission alive means learning to do less.',
    science: 'NASA has made real decisions to switch off Voyager instruments to conserve power. This is a long-term engineering trade-off, not a sudden failure of the spacecraft.',
    narratorClip: 'voyager_power_narrator',
    scienceClip: 'voyager_power_science',
    note: 'A real power trade-off. Not a sudden catastrophe.'
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
}

export const ARCHIVE_ITEMS: ArchiveItem[] = [
  { id: 'jupiter', text: "Jupiter's ring and previously unknown moons.", correct: true },
  { id: 'saturn', text: "Saturn's rings and moons.", correct: true },
  { id: 'interstellar', text: 'Measurements of the interstellar environment.', correct: true },
  { id: 'neptune-landing', text: 'A crewed landing on Neptune.', correct: false },
  { id: 'return-home', text: 'A planned return of the spacecraft to Earth.', correct: false },
  { id: 'record-broadcast', text: 'A live broadcast of the Golden Record back to Earth.', correct: false }
];

export const ARCHIVE_DISCLAIMER = 'This is a fictional ending for the game. It is not a claim that Voyager 1 has sent its final real-world transmission.';

export const LIVE_MARKER: Partial<Record<VoyagerStep, VoyagerMarkerId>> = {
  plasma: 'plasma',
  magnetic: 'magnetic',
  particles: 'particles',
  power: 'power'
};

export function markerById(id: VoyagerMarkerId): VoyagerMarker {
  const marker = VOYAGER_MARKERS.find(item => item.id === id);
  if (!marker) throw new Error(`Unknown Voyager marker ${id}`);
  return marker;
}
