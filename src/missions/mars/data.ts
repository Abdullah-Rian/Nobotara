import { DialogueMessage } from '../../types/game';

export type MarsSiteId =
  | 'igneous'
  | 'sedimentary'
  | 'mudstone'
  | 'tubes'
  | 'terminal'
  | 'water'
  | 'biosignature'
  | 'laboratory';

export type MarsStep =
  | 'igneous'
  | 'sedimentary'
  | 'mudstone'
  | 'tubes'
  | 'sequence'
  | 'reveal'
  | 'water'
  | 'biosignature'
  | 'laboratory'
  | 'board'
  | 'question'
  | 'choice'
  | 'closing';

export type LegacyId = 'preserve' | 'questions' | 'inspire';

export interface MarsFact {
  label: string;
  text: string;
}

export interface MarsReading {
  kicker: string;
  title: string;
  facts: MarsFact[];
  caution?: string;
  narrator: DialogueMessage;
  science: DialogueMessage;
  narratorClip: string;
  scienceClip: string;
  continueLabel: string;
}

export interface SequenceStage {
  id: string;
  text: string;
}

export interface EvidenceItem {
  id: string;
  text: string;
}

export interface EvidenceReason {
  id: string;
  itemId: string;
  text: string;
}

/** Tara states the facts. The narrator carries the story. */
const assistant = (text: string): DialogueMessage => ({ speaker: 'Tara · Mission Assistant', text });
const narrator = (text: string): DialogueMessage => ({ speaker: 'Narrator', text });

export const MARS_RANGE = 44;

export const ROVER_START = { x: 0, z: 36 };
/** Kept off the straight line from the lake-bed rock to the cache. */
export const PERSEVERANCE_SITE = { x: 7.2, z: -4.2 };
/** The lander would have set down beside the tube depot. */
export const PLAN_SITE = { x: -4.5, z: -5.5 };

export const SITES: Record<MarsSiteId, { x: number; z: number; label: string }> = {
  igneous: { x: 6, z: 16, label: 'FLOOR' },
  sedimentary: { x: -28.5, z: 10, label: 'DELTA' },
  mudstone: { x: -5, z: 6, label: 'LAKE' },
  tubes: { x: 0, z: 0, label: 'CACHE' },
  terminal: { x: 9, z: 8, label: 'TERMINAL' },
  water: { x: -24, z: -15, label: 'WATER' },
  biosignature: { x: -15, z: -1.5, label: 'SPOTS' },
  laboratory: { x: 16, z: 13, label: 'LAB' }
};

export const LIVE_SITE: Partial<Record<MarsStep, MarsSiteId>> = {
  igneous: 'igneous',
  sedimentary: 'sedimentary',
  mudstone: 'mudstone',
  tubes: 'tubes',
  sequence: 'terminal',
  water: 'water',
  biosignature: 'biosignature',
  laboratory: 'laboratory',
  question: 'tubes'
};

export const NEXT_STEP: Partial<Record<MarsStep, MarsStep>> = {
  igneous: 'sedimentary',
  sedimentary: 'mudstone',
  mudstone: 'tubes',
  tubes: 'sequence',
  water: 'biosignature',
  biosignature: 'laboratory',
  laboratory: 'board'
};

export const MARS_OBJECTIVES: Record<MarsStep, string> = {
  igneous: 'Scan the dark rock on the crater floor',
  sedimentary: 'Scan the sandstone from the delta',
  mudstone: 'Scan the mudstone from the lake bed',
  tubes: 'Find the sealed sample tubes',
  sequence: 'Open the terminal and rebuild the plan',
  reveal: 'The plan to bring the samples home',
  water: 'Clue 1: find the signs of ancient water',
  biosignature: 'Clue 2: find the possible sign of life',
  laboratory: 'Clue 3: find out why the samples must go to Earth',
  board: 'Match each clue to what it means',
  question: 'Go back to the sealed tubes',
  choice: 'Choose what this mission is remembered for',
  closing: 'Three missions, three legacies'
};

/** Short zone-pill names for a phone in landscape. */
export const MARS_OBJECTIVE_SHORT: Record<MarsStep, string> = {
  igneous: 'CRATER FLOOR',
  sedimentary: 'DELTA ROCK',
  mudstone: 'LAKE BED',
  tubes: 'SAMPLE TUBES',
  sequence: 'RETURN PLAN',
  reveal: 'RETURN PLAN',
  water: 'ANCIENT WATER',
  biosignature: 'SIGN OF LIFE?',
  laboratory: 'EARTH LAB',
  board: 'EVIDENCE',
  question: 'SAMPLE TUBES',
  choice: 'LEGACY',
  closing: 'ARCHIVE'
};

export const MARS_APPROACH = narrator(
  'We have travelled beyond the edge of our familiar world. We have sent machines into the unknown, carrying questions we still cannot answer. But sometimes the greatest discoveries are not in the farthest corners of space. Sometimes they are waiting on a neighbouring world. A world that once had rivers and lakes, and may once have been a place where life could survive. Mars. In February 2021, a NASA rover named Perseverance landed here, in Jezero Crater. Its job: to read the rocks an ancient lake left behind, and to seal the best pieces in tubes for a journey home.'
);

export const MARS_ARRIVAL = assistant(
  'Welcome to Jezero Crater, Mars. I am Tara, your mission assistant. More than three and a half billion years ago, this crater was a lake. A river flowed in and dropped sand and mud here, layer upon layer. The water is long gone. The rocks are still here.'
);

export const MARS_ARRIVAL_NARRATOR = narrator(
  'A photograph can show us a rock. It cannot tell us how old it is, or what once lived beside it. For that, you need the rock itself. Drive to the green marker and scan your first one.'
);

export const MARS_READINGS: Partial<Record<MarsStep, MarsReading>> = {
  igneous: {
    kicker: 'ROCK SCAN · CRATER FLOOR',
    title: 'Volcanic floor rock',
    facts: [
      { label: 'Made of', text: 'Dark volcanic minerals. Two of them are called olivine and pyroxene.' },
      { label: 'Rock type', text: 'Igneous. It formed when melted rock cooled and hardened.' },
      { label: 'What it tells us', text: 'Volcanic rock was here before the lake. Later, water soaked in and changed it.' },
      { label: 'Why collect it', text: 'Volcanic rock holds a natural clock. A laboratory on Earth could read its exact age.' }
    ],
    narrator: narrator('This rock was born in fire. It is igneous: melted rock that cooled and turned hard.'),
    science: assistant('It holds dark minerals called olivine and pyroxene. Rocks like this carry a natural clock. A laboratory on Earth could read that clock, and tell us exactly how old this crater floor is.'),
    narratorClip: 'mars_igneous_narrator',
    scienceClip: 'mars_igneous_science',
    continueLabel: 'CONTINUE'
  },
  sedimentary: {
    kicker: 'ROCK SCAN · DELTA',
    title: 'Delta sandstone',
    facts: [
      { label: 'Made of', text: 'Grains of sand, glued together by clay and salt.' },
      { label: 'Rock type', text: 'Sedimentary. It is built from pieces that were carried here and dropped.' },
      { label: 'What it tells us', text: 'A river flowed into the lake and left its sand at the river mouth. That pile is called a delta.' },
      { label: 'Why collect it', text: 'Each layer is a page in the story of the river.' }
    ],
    narrator: narrator('This rock was not born in fire. It was built grain by grain, from sand that a river carried here.'),
    science: assistant('Where a river meets a lake, it slows down and drops its sand. The pile it leaves is called a delta. This sandstone is a piece of that delta. It shows that water once flowed here.'),
    narratorClip: 'mars_sedimentary_narrator',
    scienceClip: 'mars_sedimentary_science',
    continueLabel: 'CONTINUE'
  },
  mudstone: {
    kicker: 'ROCK SCAN · LAKE BED',
    title: 'Lake-bed mudstone',
    facts: [
      { label: 'Made of', text: 'Very fine mud and clay.' },
      { label: 'Rock type', text: 'Mudstone. It forms when mud settles slowly in still water.' },
      { label: 'What it tells us', text: 'The lake here was calm, and it lasted a long time.' },
      { label: 'Why collect it', text: 'Fine mud traps traces of the past and keeps them. If tiny living things were ever here, this is where to look.' }
    ],
    narrator: narrator('This is mud from the bottom of the lake, now hard as stone.'),
    science: assistant('Fine mud buries things gently and keeps them safe. On Earth, rocks like this hold some of the oldest signs of life. That does not mean life was here. It means this is the right place to look. The sample tubes are next, beside Perseverance.'),
    narratorClip: 'mars_mudstone_narrator',
    scienceClip: 'mars_mudstone_science',
    continueLabel: 'CONTINUE TO THE TUBES'
  },
  tubes: {
    kicker: 'SAMPLE TUBES',
    title: 'Sealed sample tubes',
    facts: [
      { label: 'What is here', text: 'A backup set of sealed tubes, left on the ground. Perseverance carries more on board.' },
      { label: 'What is inside', text: 'Each tube holds a piece of rock about the size of a stick of chalk.' },
      { label: 'Why these rocks', text: 'Scientists chose each one for the story it could tell about Mars.' },
      { label: 'What they need', text: 'A ride to Earth.' }
    ],
    narrator: assistant('These are samples collected by Perseverance. Each tube holds a piece of Mars about the size of a stick of chalk. The rover left this set on the ground as a backup, and carries the rest on board.'),
    science: narrator('Every sample tells a story. But some stories cannot be read by a robot millions of kilometres from home. Scientists wanted to bring these tubes to Earth. Drive to the terminal to see how.'),
    narratorClip: 'mars_tubes_assistant',
    scienceClip: 'mars_tubes_narrator',
    continueLabel: 'DRIVE TO THE TERMINAL'
  },
  water: {
    kicker: 'CLUE 1 · WATER',
    title: 'Ancient water',
    facts: [
      { label: 'What is here', text: 'A dried-up delta, old river channels, and minerals that only form in water.' },
      { label: 'What it tells us', text: 'Jezero was a lake, and it lasted a long time.' },
      { label: 'Why it matters', text: 'Every living thing we know of needs water.' },
      { label: 'What it is', text: 'A record of the place. The rocks remember the lake.' }
    ],
    narrator: narrator('Clue one. Water. It left its marks everywhere here: a delta, dry river channels, and minerals that only form in water.'),
    science: assistant('Every living thing we know of needs water. So a lake that lasted is exactly where scientists want to look. The rocks here are the record of that lake.'),
    narratorClip: 'mars_water_narrator',
    scienceClip: 'mars_water_science',
    continueLabel: 'CONTINUE'
  },
  biosignature: {
    kicker: 'CLUE 2 · A SIGN OF LIFE?',
    title: 'The leopard-spot rock',
    facts: [
      { label: 'The word', text: 'A biosignature is a mark that living things can leave behind in rock.' },
      { label: 'The find', text: 'In 2024, Perseverance drilled a rock named Cheyava Falls. It has small dark spots, like a leopard’s.' },
      { label: 'Why it is exciting', text: 'On Earth, spots like these can form when tiny living things feed on mud.' },
      { label: 'The catch', text: 'Chemistry without life can make them too. Only a laboratory on Earth can tell which.' }
    ],
    narrator: narrator('Clue two. In 2024, in the old river valley that fed this lake, Perseverance drilled a rock named Cheyava Falls. It is covered in small dark spots, like a leopard’s.'),
    science: assistant('On Earth, spots like these can form when tiny living things feed on mud. But chemistry without life can make them too. Scientists call this a possible biosignature. To know for sure, they need that sample in a laboratory on Earth. It is still on Mars, sealed in a tube.'),
    narratorClip: 'mars_bio_narrator',
    scienceClip: 'mars_bio_science',
    continueLabel: 'CONTINUE'
  },
  laboratory: {
    kicker: 'CLUE 3 · EARTH LABORATORIES',
    title: 'Why bring them home?',
    facts: [
      { label: 'A rover’s limit', text: 'Perseverance carries a few small instruments. They had to be light enough to fly to Mars.' },
      { label: 'A laboratory’s power', text: 'The best instruments on Earth are as big as a room. Some are as big as a building.' },
      { label: 'Second chances', text: 'A sample on Earth can be studied again and again, with tools not yet invented.' },
      { label: 'What is missing', text: 'A way home.' }
    ],
    narrator: narrator('Clue three. A rover can only carry small, light tools. The best instruments on Earth are as big as a room, and some are as big as a building. They cannot fly to Mars.'),
    science: assistant('Samples on Earth can be studied again and again. Scientists still study Moon rocks from Apollo, using tools that did not exist in 1969. That is why these samples were meant to come home.'),
    narratorClip: 'mars_lab_narrator',
    scienceClip: 'mars_lab_science',
    continueLabel: 'OPEN THE EVIDENCE BOARD'
  },
  question: {
    kicker: 'THE OPEN QUESTION',
    title: 'Did life ever exist on Mars?',
    facts: [
      { label: 'What we know', text: 'Jezero was once a lake where life could have survived.' },
      { label: 'What we found', text: 'A rock with a possible sign of life.' },
      { label: 'What we do not know', text: 'Whether anything ever lived here.' },
      { label: 'What would help', text: 'These samples, in a laboratory on Earth.' }
    ],
    caution: 'No sample has come home yet. That does not mean yes, and it does not mean no.',
    narrator: assistant('Final record found. Did life ever exist on Mars?'),
    science: narrator('We have found ancient rivers. We have explored a world that may once have been more like our own. We have collected pieces of its history. But we still do not know if we were ever alone in the universe.'),
    narratorClip: 'mars_question',
    scienceClip: 'mars_no_conclusion',
    continueLabel: 'CONTINUE'
  }
};

export const MARS_BRIEFING = assistant(
  'This terminal holds the plan. NASA and the European Space Agency designed it together. It was not one spacecraft. It was a relay of several machines, including the first rocket ever meant to launch from another planet.'
);

export const MARS_BRIEFING_NARRATOR = narrator(
  'Imagine the challenge. A sample picked up on Mars. A rocket launched from its surface. A spacecraft waiting in orbit. And then the long journey home. Every step depended on the one before it. Put the steps in order.'
);

export const RETURN_SEQUENCE: SequenceStage[] = [
  { id: 'cache', text: 'Perseverance collects the samples and seals them in tubes' },
  { id: 'lander', text: 'A lander arrives on Mars, carrying a small rocket (Sample Retrieval Lander)' },
  { id: 'ascent', text: 'The rocket launches the samples into Mars orbit (Mars Ascent Vehicle)' },
  { id: 'orbiter', text: 'An orbiter from Europe catches them and flies to Earth (Earth Return Orbiter)' },
  { id: 'entry', text: 'A capsule brings the samples down to the ground (Earth Entry System)' }
];

export const SEQUENCE_START = ['entry', 'lander', 'cache', 'orbiter', 'ascent'];

export const MARS_SEQUENCE_LINE = assistant(
  'Plan rebuilt. Five machines, each with one job. Together, they would have made one of the boldest journeys ever planned.'
);

export const MARS_UNFINISHED = assistant(
  'Warning. Mission record found. The plan grew too complicated, too slow, and too expensive. In 2026, its funding was stopped. The original plan was never flown.'
);

export const MARS_UNFINISHED_NARRATOR = narrator(
  'Years of work. Thousands of people. An extraordinary plan to bring another world’s secrets home. And yet the journey was never finished.'
);

export const MARS_MEANING = narrator(
  'So was it all wasted? Or was something important left behind? Three clues are waiting in this crater. Go and find them.'
);

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: 'water', text: 'Ancient water' },
  { id: 'bio', text: 'The leopard-spot rock' },
  { id: 'samples', text: 'The sealed samples' }
];

export const EVIDENCE_REASONS: EvidenceReason[] = [
  { id: 'lab', itemId: 'samples', text: 'Meant for Earth laboratories, where they can be studied for generations' },
  { id: 'history', itemId: 'water', text: 'This crater was once a lake where life could have survived' },
  { id: 'search', itemId: 'bio', text: 'A possible sign of life. It must be tested on Earth to be sure' }
];

export const MARS_UNANSWERED = assistant(
  'One mission may stay unfinished. But discovery does not end with a single mission.'
);

export const LEGACY_CHOICES: { id: LegacyId; title: string; detail: string }[] = [
  {
    id: 'preserve',
    title: 'Preserve the evidence',
    detail: 'Keep the samples safe, and keep the record of why each one was chosen.'
  },
  {
    id: 'questions',
    title: 'Continue asking questions',
    detail: 'Send the unanswered questions on, so that others keep searching.'
  },
  {
    id: 'inspire',
    title: 'Inspire future explorers',
    detail: 'Leave the plan for the next explorers. They may finish the journey.'
  }
];

export const MARS_LEGACY_LINE = assistant(
  'Archive complete. The evidence is safe. The questions are still open. Exploration continues.'
);

export const MARS_CLOSING = narrator(
  'One journey showed us that people could reach another world. Another showed us that our curiosity could travel beyond the Solar System. And this one taught us that even an unfinished journey can leave behind something worth going back for. Three missions. Three different legacies. One endless human wish to discover.'
);

export const MARS_CLOSING_FINAL = narrator(
  'The tubes are still on Mars, sealed and waiting. Someone will go and bring them home. Perhaps it will be you.'
);

/** The draft's last sentence, shown on the end card. */
export const MARS_LAST_WORD =
  'The universe does not run out of mysteries. We simply run out of questions to ask until we discover another.';

export const CURIOUS_QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Did Perseverance find life on Mars?',
    a: 'No. It found a crater that was once a lake, and a rock with spots that could be a sign of ancient life. Nobody can be sure until that sample is tested in a laboratory on Earth.'
  },
  {
    q: 'Did the plan to bring the samples home ever fly?',
    a: 'No. The plan needed a lander, a rocket, an orbiter and a capsule, built by NASA and the European Space Agency. It became too complicated and too expensive, and in 2026 its funding was stopped. The samples are still on Mars.'
  },
  {
    q: 'Why not just study the rocks on Mars?',
    a: 'A rover can only carry small, light instruments. Laboratories on Earth have machines as big as a room, and they can study the same sample again and again as new tools are invented.'
  }
];

export const MARS_ARCHIVE = [
  'Mission archive for Mars Sample Return at Jezero Crater. Answer only from this text, in simple words a 12-year-old can follow.',
  'Jezero Crater on Mars was a lake more than 3.5 billion years ago. A river flowed in and built a delta. The water is gone today. The rocks remain.',
  'NASA’s rover Perseverance launched in July 2020 and landed in Jezero in February 2021. It collects rock samples and seals them in tubes. Each sample is about the size of a stick of chalk.',
  'Perseverance left a backup set of ten tubes on the ground at a place called Three Forks. It carries the other samples on board.',
  'Three kinds of rock in the game: volcanic (igneous) floor rock with olivine and pyroxene, which a laboratory on Earth could date; delta sandstone, laid down by a river; and lake-bed mudstone, which is good at keeping traces of the past.',
  'In 2024 Perseverance drilled a rock named Cheyava Falls in the old river valley that fed the lake. It has dark leopard-like spots. In 2025 NASA scientists called it a possible biosignature. Spots like these can be made by tiny living things, and also by chemistry without life. The sample, named Sapphire Canyon, is still on Mars.',
  'The plan to bring the samples home had five steps: Perseverance collects and seals the samples; a Sample Retrieval Lander brings a small rocket; the rocket, the Mars Ascent Vehicle, launches the samples into Mars orbit; the Earth Return Orbiter, built by Europe, catches them and flies to Earth; the Earth Entry System, a capsule, brings them to the ground. It would have been the first rocket launched from another planet.',
  'NASA and the European Space Agency designed the plan together. It became too complicated, too slow and too expensive. In 2026 its funding was stopped. The original plan was never flown. Do not say that it flew. The archive does not know when or how the samples will come home.',
  'Rovers can only carry small instruments. Laboratories on Earth have much bigger and better ones, and can study the same sample again for many years. Scientists still study Moon rocks from Apollo.',
  'The question "Did life ever exist on Mars?" is still open. Do not answer yes or no.',
  'One unfinished mission does not end discovery. The evidence is safe. The questions are still open. Exploration continues.',
  ...CURIOUS_QUESTIONS.flatMap(item => [`Question: ${item.q}`, `Answer: ${item.a}`])
].join('\n');

export function interactLabel(step: MarsStep): string {
  if (step === 'sequence') return 'OPEN TERMINAL';
  if (step === 'question') return 'OPEN THE RECORD';
  if (step === 'igneous' || step === 'sedimentary' || step === 'mudstone') return 'SCAN ROCK';
  return 'INSPECT';
}
