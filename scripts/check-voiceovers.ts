/**
 * Every line the game speaks must have a pre-recorded clip whose text matches the line.
 *   npx tsx scripts/check-voiceovers.ts
 * Lists lines with no clip, clips missing from disk, and clips whose recorded text differs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS } from '../src/play/data/artifactsData';
import * as V from '../src/play/missions/voyager/data';
import * as M from '../src/play/missions/mars/data';

const root = path.resolve(import.meta.dirname, '..');
const voiceDir = path.join(root, 'public/assets/audio/voiceovers');
const manifest = JSON.parse(fs.readFileSync(path.join(voiceDir, 'manifest.json'), 'utf8'));
const clips = new Map<string, { text: string; filename: string; speaker: string }>(
  manifest.clips.map((c: { id: string; text: string; filename: string; speaker: string }) => [c.id, c])
);
const app = fs.readFileSync(path.join(root, 'src/play/PlayApp.tsx'), 'utf8');
const inspection = fs.readFileSync(path.join(root, 'src/play/components/InspectionModal.tsx'), 'utf8');

type Line = { where: string; clip: string | null; text: string };
const lines: Line[] = [];
const add = (where: string, clip: string | null, text: string) => lines.push({ where, clip, text });

// Mission 01
const intro = /APOLLO_INTRO_DIALOGUE: DialogueMessage = \{[\s\S]*?text: "([^"]+)"/.exec(app);
add('Apollo intro', 'intro_neil', intro?.[1] ?? '?');
for (const art of Object.values(ARTIFACTS)) {
  add(`${art.id} (Neil)`, `${art.id}_neil`, art.neilQuote);
  add(`${art.id} (science)`, `${art.id}_scientific`, art.scientificQuote);
}
add('Apollo completion', 'puzzle_complete_neil', /const completionSpeech = "([^"]+)"/.exec(app)?.[1] ?? '?');
add('Apollo outro', 'outro_voyager', /const outroSpeech = "([^"]+)"/.exec(app)?.[1] ?? '?');
const smallStep = /speakDialogue\(\s*"([^"]+)",\s*'[^']+',\s*\(\) => [^,]+,?\s*('([^']+)')?/.exec(inspection);
add('Plaque: one small step', smallStep?.[3] ?? null, smallStep?.[1] ?? '?');

// Literal calls: speakMars(CONST.text, CONST.speaker, 'clip' and speakVoyager(... ) in PlayApp
const all: Record<string, unknown> = { ...V, ...M };
for (const match of app.matchAll(/speak(?:Mars|Voyager)\((\w+)\.text, \1\.speaker, '([^']+)'/g)) {
  const value = all[match[1]] as { text?: string } | undefined;
  add(match[1], match[2], value?.text ?? `? (${match[1]} not found)`);
}
const approach = all.MARS_APPROACH as { text: string };
add('MARS_APPROACH', 'mars_approach', approach.text);

// Mission 02 markers and record pages
for (const marker of V.VOYAGER_MARKERS) {
  add(`voyager ${marker.id} (narrator)`, marker.narratorClip, marker.narrator);
  add(`voyager ${marker.id} (science)`, marker.scienceClip, marker.science);
}
for (const page of V.RECORD_PAGES) {
  add(`record ${page.id} (narrator)`, page.narratorClip, page.narrator);
  add(`record ${page.id} (science)`, page.scienceClip, page.science);
}

// Mission 03 readings
for (const [id, reading] of Object.entries(M.MARS_READINGS)) {
  add(`reading ${id} (narrator)`, reading.narratorClip, reading.narrator.text);
  add(`reading ${id} (science)`, reading.scienceClip, reading.science.text);
}

const norm = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
let problems = 0;
for (const line of lines) {
  const clip = line.clip ? clips.get(line.clip) : undefined;
  let issue = '';
  if (!line.clip) issue = 'NO CLIP (spoken at runtime)';
  else if (!clip) issue = `clip "${line.clip}" not in manifest`;
  else if (!fs.existsSync(path.join(voiceDir, clip.filename))) issue = `file ${clip.filename} missing`;
  else if (norm(clip.text) !== norm(line.text)) issue = `recorded text differs\n      game: ${line.text}\n      clip: ${clip.text}`;
  if (issue) {
    problems += 1;
    console.log(`✗ ${line.where}: ${issue}`);
  }
}
console.log(`${lines.length} lines checked, ${problems} problem(s).`);
process.exit(problems ? 1 : 0);
