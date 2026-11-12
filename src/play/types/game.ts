/**
 * NoboTara-71: Mission 01 — Apollo 11
 * Game types and state definitions
 */

export type GamePhase = 
  | 'title'
  | 'intro'
  | 'explore'
  | 'inspect'
  | 'puzzle'
  | 'outro'
  | 'preview';

export type ArtifactId = 'descent_stage' | 'retroreflector' | 'plaque';

export type MarkerId = ArtifactId | 'laser_station';

export type ObjectiveStep = 'lander' | 'retroreflector' | 'laser' | 'plaque' | 'free';

export interface ArtifactInfo {
  id: ArtifactId;
  name: string;
  shortName: string;
  position: [number, number, number];
  radius: number;
  markerPosition: [number, number, number];
  markerRadius: number;
  purpose: string;
  status: string;
  legacy: string;
  description: string;
  neilQuote: string;
  scientificQuote: string;
  actionLabel: string;
}

export interface DialogueMessage {
  speaker: 'Neil Armstrong (Narrator-01)' | 'Scientific Voice' | 'Apollo CAPCOM' | 'Narrator-02' | 'Mission Control' | 'Mission Assistant' | 'Tara · Mission Assistant' | 'Narrator';
  text: string;
  audioDuration?: number;
  historicAudio?: boolean;
}

export interface MatchingOption {
  id: string;
  artifactId: ArtifactId;
  text: string;
}

export interface RoverTelemetry {
  speed: number;
  heading: number;
  distanceToTarget: number;
  nearestArtifact: MarkerId | null;
  position: { x: number; y: number; z: number };
  lander: { x: number; z: number };
  rangeRadius: number;
}
