/**
 * Callout anchors for the NASA Voyager model, in unscaled model space.
 * Same frame as the Golden Record camera aim: multiply by the craft scale,
 * then apply the craft rotation and position. The procedural stand-in does
 * not use these points.
 */
export interface VoyagerPart {
  id: string;
  name: string;
  description: string;
  anchor: [number, number, number];
}

export interface VoyagerPartPoint {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface VoyagerPartFrame {
  centerX: number;
  centerY: number;
  parts: VoyagerPartPoint[];
}

/** Bus, beside the dish, so the name chips radiate away from the body. */
export const VOYAGER_PART_CENTER: [number, number, number] = [0, -1.28, 0.45];

export const VOYAGER_PARTS: VoyagerPart[] = [
  {
    id: 'antenna',
    name: 'High-Gain Antenna',
    description:
      'The 3.7-meter dish. It is fixed to the body, so the whole craft turns to send data to Earth.',
    anchor: [-0.011, -1.283, 0.901]
  },
  {
    id: 'record',
    name: 'Golden Record',
    description:
      'A gold-plated copper disc of sounds, greetings, and images. It travels with Voyager. It does not transmit those sounds home.',
    anchor: [-0.018, -3.399, -1.682]
  },
  {
    id: 'power',
    name: 'Power generators',
    description:
      'Three radioisotope thermoelectric generators on a boom. Heat from plutonium-238 becomes electricity, and that supply slowly weakens.',
    anchor: [-0.02, -5.72, -0.6]
  },
  {
    id: 'magnetometer',
    name: 'Magnetometer boom',
    description:
      "The long boom that holds the magnetometers away from the craft, so the spacecraft's own electronics do not hide the weak magnetic field.",
    anchor: [-0.007, -13.544, 8.141]
  },
  {
    id: 'science',
    name: 'Science instruments',
    description:
      'The cameras, spectrometers, and particle detectors that studied the outer planets and the space beyond them.',
    anchor: [0.05, 2.45, -0.31]
  }
];
