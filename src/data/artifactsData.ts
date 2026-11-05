import { ArtifactInfo, MatchingOption } from '../types/game';

export const ARTIFACTS: Record<string, ArtifactInfo> = {
  descent_stage: {
    id: 'descent_stage',
    name: "Apollo 11 Lunar Module Descent Stage ('Eagle')",
    shortName: 'Eagle Descent Stage',
    position: [0, 0, 0],
    radius: 4.5,
    markerPosition: [-4.2, 0, -1.8],
    markerRadius: 1.8,
    purpose: 'LUNAR LANDING',
    status: 'LEFT ON THE MOON',
    legacy: 'HUMANITY’S FIRST LUNAR BASE',
    description: 'The octagonal lower portion of the Apollo 11 Lunar Module. Clad in gold and aluminum thermal insulation foil, it housed the Descent Propulsion System (DPS) rocket and 4 trussed landing gear legs with dish footpads.',
    neilQuote: "This is the Eagle’s descent stage. It helped the Lunar Module land on the Moon. The ascent stage carried me and Aldrin back into lunar orbit, while the descent stage remained behind.",
    scientificQuote: "The Lunar Module was built in two distinct stages. The descent stage contained the throttleable rocket engine, landing gear, and propellant tanks. Since weight was critical for orbital rendezvous, only the lightweight ascent stage lifted off to return to Earth.",
    actionLabel: 'Inspect Descent Stage'
  },
  retroreflector: {
    id: 'retroreflector',
    name: 'Lunar Laser Ranging Retroreflector (LRRR)',
    shortName: 'Laser Retroreflector',
    position: [14, 0, -8],
    radius: 3.5,
    markerPosition: [12.2, 0, -7.0],
    markerRadius: 1.6,
    purpose: 'SCIENTIFIC MEASUREMENT',
    status: 'ACTIVE EXPERIMENT',
    legacy: 'EARTH–MOON DISTANCE RESEARCH',
    description: 'An array of 100 high-precision corner-cube fused silica prisms oriented toward Earth. It operates with zero power and remains active after more than half a century.',
    neilQuote: "Not everything left behind became inactive. Apollo 11 astronauts placed this laser retroreflector. Scientists on Earth can send laser pulses toward it and measure the returning light to study the distance between Earth and the Moon.",
    scientificQuote: "Observatories in Texas, Hawaii, and France still bounce high-energy pulsed lasers off this Apollo 11 reflector. By timing the ~2.5 second round-trip with picosecond accuracy, scientists proved the Moon is drifting away at 3.8 cm per year.",
    actionLabel: 'Activate Earth Laser'
  },
  plaque: {
    id: 'plaque',
    name: 'Apollo 11 Commemorative Lunar Plaque',
    shortName: 'Commemorative Plaque',
    position: [0, 0, 3.2],
    radius: 3.0,
    markerPosition: [2.8, 0, 2.8],
    markerRadius: 1.5,
    purpose: 'HISTORICAL RECORD',
    status: 'PERMANENT MONUMENT',
    legacy: 'MESSAGE OF GLOBAL PEACE',
    description: 'A 9x7 inch stainless steel plaque attached between the rungs of the ladder on the forward landing gear leg. It features maps of Earth’s hemispheres and signatures of the Apollo 11 crew and the President.',
    neilQuote: "This plaque commemorates humanity’s first crewed lunar landing. It carries a message of peace from Earth. A message left behind for history to remember.",
    scientificQuote: "Engraved on stainless steel to withstand cosmic radiation and 300°C temperature swings: 'HERE MEN FROM THE PLANET EARTH FIRST SET FOOT UPON THE MOON JULY 1969 A.D. WE CAME IN PEACE FOR ALL MANKIND.'",
    actionLabel: 'Read Plaque'
  }
};

export const MATCHING_CHALLENGES: {
  artifacts: { id: string; name: string }[];
  reasons: MatchingOption[];
} = {
  artifacts: [
    { id: 'descent_stage', name: "Eagle's Descent Stage" },
    { id: 'retroreflector', name: "Laser Retroreflector" },
    { id: 'plaque', name: "Commemorative Plaque" }
  ],
  reasons: [
    {
      id: 'reason_retro',
      artifactId: 'retroreflector',
      text: 'Designed to conduct continuous scientific measurements from Earth'
    },
    {
      id: 'reason_descent',
      artifactId: 'descent_stage',
      text: 'Required for landing, not designed to return to orbit'
    },
    {
      id: 'reason_plaque',
      artifactId: 'plaque',
      text: 'Left as a permanent historical marker for future generations'
    }
  ]
};
