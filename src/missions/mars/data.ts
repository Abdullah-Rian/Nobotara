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

const assistant = (text: string): DialogueMessage => ({ speaker: 'Mission Assistant', text });
const narrator = (text: string): DialogueMessage => ({ speaker: 'Narrator-02', text });
const science = (text: string): DialogueMessage => ({ speaker: 'Scientific Voice', text });

export const MARS_RANGE = 44;

export const ROVER_START = { x: 0, z: 36 };
export const PERSEVERANCE_SITE = { x: 5.4, z: -6.2 };
export const PLAN_SITE = { x: -8.5, z: -12 };

export const SITES: Record<MarsSiteId, { x: number; z: number; label: string }> = {
  igneous: { x: 6, z: 16, label: 'FLOOR' },
  sedimentary: { x: -22, z: 10, label: 'DELTA' },
  mudstone: { x: 14, z: -16, label: 'LAKE' },
  tubes: { x: 0, z: 0, label: 'CACHE' },
  terminal: { x: 9, z: 8, label: 'TERMINAL' },
  water: { x: -16, z: -15, label: 'WATER' },
  biosignature: { x: 20, z: 8, label: 'SIGNS' },
  laboratory: { x: -12, z: 20, label: 'LAB' }
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
  igneous: 'Drive to the crater-floor rock',
  sedimentary: 'Drive to the delta rock',
  mudstone: 'Drive to the lake-bed rock',
  tubes: 'Inspect the sealed sample tubes',
  sequence: 'Open the terminal and reconstruct the return',
  reveal: 'The original return plan',
  water: 'Inspect the evidence of ancient water',
  biosignature: 'Inspect the potential biosignatures',
  laboratory: 'Inspect why the samples were meant for Earth',
  board: 'Link each kind of evidence to its meaning',
  question: 'Return to the sealed tubes',
  choice: 'Choose the legacy of this unfinished mission',
  closing: 'Three journeys, one archive'
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
  biosignature: 'BIOSIGNATURES',
  laboratory: 'EARTH LAB',
  board: 'EVIDENCE',
  question: 'SAMPLE TUBES',
  choice: 'LEGACY',
  closing: 'ARCHIVE'
};

export const MARS_APPROACH = narrator(
  'We have travelled beyond the boundaries of our familiar world. We have sent machines into the unknown, carrying questions that humanity has yet to answer. But sometimes, the greatest discoveries are not found in the farthest corners of space. Sometimes, they are waiting on a neighbouring world. A world that once may have held rivers, lakes, and conditions suitable for life. Mars. NASA\'s Mars 2020 mission carried the rover Perseverance. It launched in July 2020 and landed in Jezero Crater in February 2021, to read the rocks a lake left behind and to seal selected samples for a journey home.'
);

export const MARS_ARRIVAL = assistant(
  'Jezero Crater once held a lake. A river carried sediment into that water and built a delta. The lake is gone. What remains is the rock it left behind.'
);

export const MARS_ARRIVAL_NARRATOR = narrator(
  'Photographs can show the shape of that story. They cannot bring the rocks home. That is why Perseverance cached selected samples on the crater floor.'
);

export const MARS_READINGS: Partial<Record<MarsStep, MarsReading>> = {
  igneous: {
    kicker: 'SAMPLE SCAN · CRATER FLOOR',
    title: 'Igneous floor rock',
    facts: [
      { label: 'Composition', text: 'Basaltic minerals, including olivine and pyroxene.' },
      { label: 'Geological character', text: 'Igneous stone, formed when molten material cooled.' },
      { label: 'Ancient environment', text: 'The crater floor records volcanic rock that the lake later covered and altered.' },
      { label: 'Why collect it', text: 'A dated igneous rock can place the lake, and the stones around it, in time.' }
    ],
    narrator: narrator('This is a rock from the crater floor. The scan reads it as igneous: stone that cooled from molten material.'),
    science: science('Its minerals include olivine and pyroxene. An igneous rock can be dated, and a date gives the lake a place in time. That is worth collecting.'),
    narratorClip: 'mars_igneous_narrator',
    scienceClip: 'mars_igneous_science',
    continueLabel: 'CONTINUE'
  },
  sedimentary: {
    kicker: 'SAMPLE SCAN · DELTA',
    title: 'Delta sandstone',
    facts: [
      { label: 'Composition', text: 'Cemented grains, with clays and salts.' },
      { label: 'Geological character', text: 'Sedimentary rock, built from pieces that were carried and laid down.' },
      { label: 'Ancient environment', text: 'A river brought this sediment into a standing lake and left it in the delta.' },
      { label: 'Why collect it', text: 'The grains keep a record of moving water and of the delta it built.' }
    ],
    narrator: narrator('This rock is sedimentary. It is made of grains that were carried and laid down, not cooled from magma.'),
    science: science('Clays and salts cement the grains. A river brought them into a standing lake. The rock keeps a record of that water.'),
    narratorClip: 'mars_sedimentary_narrator',
    scienceClip: 'mars_sedimentary_science',
    continueLabel: 'CONTINUE'
  },
  mudstone: {
    kicker: 'SAMPLE SCAN · LAKE BED',
    title: 'Fine lake sediment',
    facts: [
      { label: 'Composition', text: 'Very fine sediment and clay minerals.' },
      { label: 'Geological character', text: 'A quiet-water deposit, settled rather than dumped by a fast current.' },
      { label: 'Ancient environment', text: 'Still water in the lake could let fine material fall and remain.' },
      { label: 'Why collect it', text: 'Fine sediment is where scientists look for traces of ancient habitability. The sealed tubes are beside Perseverance.' }
    ],
    narrator: narrator('This is fine lake sediment, the kind that settles when water is quiet.'),
    science: science('Fine mud can hold chemical traces of an ancient habitable environment. It cannot, by itself, say that life was here. The sealed tubes are ahead, beside Perseverance.'),
    narratorClip: 'mars_mudstone_narrator',
    scienceClip: 'mars_mudstone_science',
    continueLabel: 'CONTINUE TO THE TUBES'
  },
  tubes: {
    kicker: 'SAMPLE CACHE',
    title: 'Sealed sample tubes',
    facts: [
      { label: 'What is here', text: 'A cache of sealed tubes, left beside Perseverance.' },
      { label: 'What is inside', text: 'Each tube holds one selected sample of rock or sediment.' },
      { label: 'Why these samples', text: 'They were chosen for their geology and for what they might say about ancient habitability.' },
      { label: 'What they are not', text: 'They are not a verdict on past life. They are material for a closer study.' }
    ],
    narrator: assistant('Each tube holds a selected sample. Perseverance chose them for their geology, and for what they might say about ancient habitability.'),
    science: narrator('Instruments on Mars cannot finish every story. That is why scientists wanted these samples in laboratories on Earth.'),
    narratorClip: 'mars_tubes_assistant',
    scienceClip: 'mars_tubes_narrator',
    continueLabel: 'DRIVE TO THE TERMINAL'
  },
  water: {
    kicker: 'LEGACY · WATER',
    title: 'Ancient water',
    facts: [
      { label: 'What remains', text: 'A delta, channels, and minerals that form where water lasts.' },
      { label: 'What it records', text: 'A geological history of a lake in Jezero.' },
      { label: 'What it supports', text: 'The crater once had a watery environment.' },
      { label: 'What it does not decide', text: 'A lake is a place where life could be asked about. It is not an answer.' }
    ],
    narrator: narrator('Ancient water left geological evidence here: a delta, channels, and minerals that form where water lasts.'),
    science: science('That evidence is a history of the environment. It says a lake was here. It does not, by itself, say what lived in it.'),
    narratorClip: 'mars_water_narrator',
    scienceClip: 'mars_water_science',
    continueLabel: 'CONTINUE'
  },
  biosignature: {
    kicker: 'LEGACY · BIOSIGNATURES',
    title: 'Potential biosignatures',
    facts: [
      { label: 'What the word means', text: 'A chemical or textural pattern that can be associated with life.' },
      { label: 'The caution', text: 'The same kinds of patterns can also come from chemistry that is not life.' },
      { label: 'Habitability', text: 'A habitable environment means life could have been possible there.' },
      { label: 'What it is not', text: 'Habitability is not proof that life existed.' }
    ],
    caution: 'Habitability is not proof that life existed. A potential biosignature is a reason to look, not a verdict.',
    narrator: narrator('Some rocks preserve potential biosignatures: patterns that can be associated with life, and also with chemistry that is not life.'),
    science: science('Habitability is not proof that life existed. A potential biosignature is a reason to look, not a verdict. The archive does not decide yes or no.'),
    narratorClip: 'mars_bio_narrator',
    scienceClip: 'mars_bio_science',
    continueLabel: 'CONTINUE'
  },
  laboratory: {
    kicker: 'LEGACY · LABORATORIES',
    title: 'Earth-laboratory analysis',
    facts: [
      { label: 'Why return anything', text: 'Some instruments are too large, too delicate, or not yet built to fly to Mars.' },
      { label: 'What a laboratory adds', text: 'The same grains can be studied again when a new question appears.' },
      { label: 'What the samples carry', text: 'Geology, and the chance to test ideas about ancient habitability.' },
      { label: 'What they still require', text: 'A way home. The original plan for that journey was never flown as first drawn.' }
    ],
    narrator: narrator('A returned sample can be studied with instruments too large, too delicate, or not yet invented to send to Mars.'),
    science: science('Earth laboratories can revisit the same grains for decades. The value of the sample is that later questions can still be asked of it.'),
    narratorClip: 'mars_lab_narrator',
    scienceClip: 'mars_lab_science',
    continueLabel: 'OPEN THE EVIDENCE BOARD'
  },
  question: {
    kicker: 'OPEN QUESTION',
    title: 'Did life ever exist on Mars?',
    facts: [
      { label: 'The question', text: 'Did life ever exist on Mars?' },
      { label: 'The archive', text: 'It has no conclusion.' },
      { label: 'What the samples are for', text: 'They were chosen so the question could be asked with geology in hand.' },
      { label: 'What they do not do', text: 'They do not answer it, and this mission will not invent an answer.' }
    ],
    caution: 'The archive has no conclusion. Habitability is not proof of life, and the absence of a returned sample is not proof against it.',
    narrator: assistant('Did life ever exist on Mars?'),
    science: narrator('The archive has no conclusion. The samples were chosen so that question could be asked more carefully. They do not answer it.'),
    narratorClip: 'mars_question',
    scienceClip: 'mars_no_conclusion',
    continueLabel: 'WITNESS THE QUESTION'
  }
};

export const RETURN_SEQUENCE: SequenceStage[] = [
  { id: 'cache', text: 'Perseverance caches the selected samples' },
  { id: 'lander', text: 'A Sample Retrieval Lander brings the Mars Ascent Vehicle' },
  { id: 'ascent', text: 'The ascent vehicle launches the container into Mars orbit' },
  { id: 'orbiter', text: 'The Earth Return Orbiter captures it and carries it toward Earth' },
  { id: 'entry', text: 'The Earth Entry System delivers it for study' }
];

export const SEQUENCE_START = ['entry', 'lander', 'cache', 'orbiter', 'ascent'];

export const MARS_SEQUENCE_LINE = assistant(
  'Sequence reconstructed. This was the original plan for bringing the tubes home.'
);

export const MARS_UNFINISHED = narrator(
  'The original architecture met complexity, cost, and schedule trouble. It was not carried out as first planned.'
);

export const MARS_MEANING = narrator(
  'An unfinished journey is still a record of the question. The samples, and the reasons they were chosen, remain. Follow the scientific legacy.'
);

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: 'water', text: 'Ancient water' },
  { id: 'bio', text: 'Potential biosignatures' },
  { id: 'samples', text: 'Returned samples' }
];

export const EVIDENCE_REASONS: EvidenceReason[] = [
  { id: 'lab', itemId: 'samples', text: 'Earth-laboratory analysis, so later questions can still be asked' },
  { id: 'history', itemId: 'water', text: 'Geological history of the lake and the delta' },
  { id: 'search', itemId: 'bio', text: 'A search for possible past life, not proof that life existed' }
];

export const MARS_UNANSWERED = assistant('One unfinished mission does not end discovery.');

export const LEGACY_CHOICES: { id: LegacyId; title: string; detail: string }[] = [
  {
    id: 'preserve',
    title: 'Preserve the evidence',
    detail: 'Keep the samples sealed, and keep the record of why they were chosen.'
  },
  {
    id: 'questions',
    title: 'Continue asking questions',
    detail: 'Treat the unfinished plan as a reason to keep looking, not as a closed case.'
  },
  {
    id: 'inspire',
    title: 'Inspire future explorers',
    detail: 'Leave a clear trail for the people who will try to bring the samples home.'
  }
];

export const MARS_LEGACY_LINE = assistant(
  'Archive completed. The evidence is preserved. The questions are unanswered. Exploration continues.'
);

export const MARS_CLOSING = narrator(
  'Apollo left tools so the Moon could still be studied. Voyager carried a record beyond the planets. Mars keeps a cache of stone, waiting on a question no photograph can close.'
);

export const MARS_CLOSING_FINAL = narrator(
  'The universe does not owe us an answer. It leaves us the work of asking, and the patience to keep the evidence.'
);

export const CURIOUS_QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Did Perseverance prove that life once existed on Mars?',
    a: 'No. The rover found a crater that once held a lake, and rocks that can preserve potential biosignatures. Habitability is not proof that life existed. The archive has no conclusion.'
  },
  {
    q: 'Did the original five-part sample return fly as first planned?',
    a: 'No. The plan was that Perseverance would cache the samples, a lander would bring the ascent vehicle, that rocket would reach orbit, an orbiter would carry the container toward Earth, and an entry system would deliver it. The architecture met complexity, cost, and schedule trouble, and it was not carried out as first planned.'
  },
  {
    q: 'Why cache samples if instruments are already on Mars?',
    a: 'Photographs and the instruments on Mars cannot finish every story. The tubes hold selected rock and sediment so Earth laboratories can study the same grains again, including with instruments that will not fly to Mars.'
  }
];

export const MARS_ARCHIVE = [
  'Mission archive for Mars Sample Return at Jezero Crater. Answer only from this text.',
  'Jezero once held a lake and a river delta. The water is gone. The rocks remain.',
  'Perseverance cached sealed tubes. Each tube holds a selected sample, chosen for geology and for possible ancient habitability.',
  'Photographs are not enough, and instruments on Mars cannot finish every story. That is why scientists wanted the samples in Earth laboratories.',
  'The original return had five stages: Perseverance caches the samples; a Sample Retrieval Lander brings the Mars Ascent Vehicle; the ascent vehicle launches the container into orbit; the Earth Return Orbiter captures it and carries it toward Earth; the Earth Entry System delivers it for study.',
  'That original architecture met complexity, cost, and schedule trouble. It was not carried out as first planned. Do not say that this campaign flew.',
  'Ancient water is geological history. Potential biosignatures are a search for possible past life. Habitability is not proof that life existed. Returned samples are for Earth-laboratory analysis.',
  'The question "Did life ever exist on Mars?" has no conclusion in this archive. Do not answer yes or no.',
  'One unfinished mission does not end discovery. The evidence is preserved. The questions are unanswered. Exploration continues.',
  ...CURIOUS_QUESTIONS.flatMap(item => [`Question: ${item.q}`, `Answer: ${item.a}`])
].join('\n');

export function interactLabel(step: MarsStep): string {
  if (step === 'sequence') return 'OPEN TERMINAL';
  if (step === 'question') return 'OPEN THE ARCHIVE';
  return 'INSPECT';
}
