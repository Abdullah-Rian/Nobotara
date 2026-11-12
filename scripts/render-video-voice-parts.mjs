/**
 * Renders the demo video's voice-over one part at a time with Gemini TTS (voice Aoede),
 * at a slower, more natural pace than render-video-voice.mjs.
 *
 *   node scripts/render-video-voice-parts.mjs [outDir] [Voice]
 *
 * Defaults: outDir docs/video/voiceover-slow, Voice Aoede.
 * Writes one MP3 per part (01-team ... 06-outcome-hope) and all-parts.mp3 with 0.6 s gaps.
 * Needs GEMINI_API_KEY in .env and ffmpeg. The voice is AI-generated and must be declared as such.
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
const PARTS = [
  ['01-team', "Hi! We're Team Nobotara Seventy-One."],
  ['02-challenge', 'NASA left machines and signs of human beings on the Moon, Mars and beyond. Left behind, but not forgotten. Yet few kids know their stories.'],
  ['03-approach', 'So we made their stories playable, because kids remember what they do.'],
  ['04-missions', 'Explore what Apollo eleven left on the Moon. Join Voyager one, now in interstellar space. Follow Mars samples, still waiting for a ride home.'],
  ['05-ai-guide', 'Questions? Ask SpaceAI, our guide built on NASA sources.'],
  ['06-outcome-hope', 'Free and easy to access for everyone and more missions coming soon. Because every machine left behind still has a story to tell.']
];
const STYLE =
  'A warm, confident young woman in her twenties, the team lead, presenting her team\'s project to judges and to curious kids. ' +
  'Mid-range pitch, natural and friendly, like talking to a ten-year-old, not a trailer voice. ' +
  'Relaxed, unhurried conversational pace, about two and a half words a second, with natural pauses at commas and full breaths between sentences. ' +
  'Gentle smile in the voice. Keep the same voice, tone and loudness from part to part. ' +
  'The final sentence is slower still and heartfelt. Studio recording, no music, no effects.';

const outDir = path.resolve(root, process.argv[2] || 'docs/video/voiceover-slow');
const voice = process.argv[3] || 'Aoede';
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY is not set.'); process.exit(1); }
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
function run(args) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', ...args]);
  if (r.status !== 0) throw new Error(String(r.stderr));
}

const mp3s = [];
for (const [index, [name, text]] of PARTS.entries()) {
  if (index > 0) await sleep(21000);
  process.stdout.write(`rendering ${name}...\n`);
  let response;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text, speechMetadata: { style: STYLE } }] }],
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
  if (!inline) throw new Error(`${name}: no audio`);
  const bytes = Buffer.from(inline.data, 'base64');
  const rate = Number(/rate=(\d+)/i.exec(inline.mimeType || '')?.[1] || 24000);
  const wavPath = path.join(outDir, `${name}.wav`);
  fs.writeFileSync(wavPath, bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : wav(bytes, rate));
  const mp3 = path.join(outDir, `${name}-${voice}-slow.mp3`);
  // trim leading/trailing silence, keep a short natural tail
  run(['-i', wavPath, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15',
       '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', mp3]);
  fs.unlinkSync(wavPath);
  mp3s.push(mp3);
  process.stdout.write(`  wrote ${path.relative(root, mp3)}\n`);
}

// all parts in one file, 0.6 s between parts
const gap = path.join(outDir, '.gap.mp3');
run(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.6', '-codec:a', 'libmp3lame', '-b:a', '128k', gap]);
const list = path.join(outDir, '.list.txt');
fs.writeFileSync(list, mp3s.flatMap((m, i) => (i ? [gap, m] : [m])).map((m) => `file '${m.replace(/'/g, "'\\''")}'`).join('\n'));
const all = path.join(outDir, `all-parts-${voice}-slow.mp3`);
run(['-f', 'concat', '-safe', '0', '-i', list, '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '128k', all]);
fs.unlinkSync(gap); fs.unlinkSync(list);
process.stdout.write(`  wrote ${path.relative(root, all)}\n`);
