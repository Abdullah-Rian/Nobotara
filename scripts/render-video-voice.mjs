/**
 * Renders the 30-second demo video's voice-over (docs/video/Nobotara71 video script v2) with Gemini TTS.
 *
 *   node scripts/render-video-voice.mjs [--part N] <outDir> <Voice> [<Voice> ...]
 *
 * One MP3 per voice, the whole script in one take, so the voices can be compared by ear.
 * The style asks for a warm, brisk, mid-pitched young woman, to sit close to the team lead's own voice.
 * Needs GEMINI_API_KEY in .env. Every voice it makes is AI-generated and must be declared as such.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-lite-tts';
const LINES = [
  "Hi! We're Team Nobotara Seventy-One.",
  'NASA left machines and signs of human beings on the Moon, Mars and beyond. Left behind, but not forgotten. Yet few kids know their stories.',
  'So we made their stories playable, because kids remember what they do.',
  "Explore what Apollo eleven left on the Moon. Join Voyager one, now in interstellar space. Follow Mars samples, still waiting for a ride home.",
  'Questions? Ask SpaceAI, our guide built on NASA sources.',
  'Free and easy to access for everyone. Because every machine left behind still has a story to tell.'
];
const STYLE =
  'A warm, confident young woman in her twenties, the team lead, presenting her team\'s project to judges and to curious kids. ' +
  'Mid-range pitch, natural and friendly. Brisk and energetic, about three and a half words a second, with only short breaths between sentences and paragraphs. ' +
  'Gentle smile in the voice. The last line is slower and heartfelt. Studio recording, no music, no effects.';

const args = process.argv.slice(2);
// --part N renders only that part of the script (1-6), named ...-partN.mp3.
const partFlag = args.indexOf('--part');
const PART = partFlag >= 0 ? Number(args.splice(partFlag, 2)[1]) : 0;
const [outDir, ...voices] = args;
if (!outDir || voices.length === 0) {
  console.error('usage: node scripts/render-video-voice.mjs <outDir> <Voice> [<Voice> ...]');
  process.exit(1);
}
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_API_KEY is not set.');
  process.exit(1);
}
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
fs.mkdirSync(outDir, { recursive: true });
const ai = new GoogleGenAI({ apiKey: key });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wav(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

for (const [index, voice] of voices.entries()) {
  if (index > 0) await sleep(21000);
  process.stdout.write(`rendering ${voice}...\n`);
  let response;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: PART ? LINES[PART - 1] : LINES.join('\n\n'), speechMetadata: { style: STYLE } }] }],
        config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } }
      });
      break;
    } catch (error) {
      const limited = error?.status === 429 || String(error?.message).includes('RESOURCE_EXHAUSTED');
      if (!limited || attempt === 5) throw error;
      process.stdout.write('  rate limit, waiting\n');
      await sleep(22000 * attempt);
    }
  }
  const inline = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline) throw new Error(`${voice}: no audio`);
  const bytes = Buffer.from(inline.data, 'base64');
  const rate = Number(/rate=(\d+)/i.exec(inline.mimeType || '')?.[1] || 24000);
  const wavPath = path.join(outDir, `${voice}.wav`);
  fs.writeFileSync(wavPath, bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : wav(bytes, rate));
  const mp3 = path.join(outDir, `video-voice-${voice}${PART ? `-part${PART}` : ''}.mp3`);
  const enc = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', wavPath, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', mp3]);
  if (enc.status !== 0) throw new Error(String(enc.stderr));
  fs.unlinkSync(wavPath);
  process.stdout.write(`  wrote ${mp3}\n`);
}
