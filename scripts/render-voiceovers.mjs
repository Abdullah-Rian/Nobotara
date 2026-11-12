/**
 * Re-render every voiceover except the opening line with Gemini TTS (Fenrir; Kore for Tara;
 * Aoede for the Science Narrator),
 * then encode it for the web: mono, 24 kHz, 64 kbps. The text-to-speech output is 24 kHz, so nothing is lost, and the clips are half the size.
 *
 * The opening clip is already the reference and is left untouched.
 * Requires GEMINI_API_KEY in .env or .env.local.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

const voiceDir = path.join(root, 'public', 'assets', 'audio', 'voiceovers');
const manifestPath = path.join(voiceDir, 'manifest.json');
const workDir = path.join(root, '.tmp-vo');
const KEEP_ID = 'intro_neil';
const MODEL = process.env.TTS_MODEL || 'gemini-3.8-flash-lite-tts';
/**
 * Two voices. Everything is Fenrir except Tara, the Mission 03 assistant, who is a young woman.
 * Her voice is Kore unless TARA_VOICE says otherwise (Aoede, Leda, Zephyr and Sulafat are other female choices).
 */
const NARRATOR_VOICE = 'Fenrir';
const TARA_VOICE = process.env.TARA_VOICE || 'Kore';
const NARRATOR_STYLE =
  'Calm, clear, natural male voice with a warm full tone and a steady pace. Studio recording, the same voice as the opening narration. No radio filter, no static, no distortion.';
const TARA_STYLE =
  'Clear, friendly, natural young woman\'s voice, warm and bright, with a steady, patient pace, like a helpful guide speaking to a student. Studio recording. No radio filter, no static, no distortion.';

/** The Science Narrator (Missions 01 and 02) has her own voice, so she never sounds like Neil. */
const SCIENCE_VOICE = process.env.SCIENCE_VOICE || 'Aoede';
const SCIENCE_STYLE =
  "Clear, calm, natural woman's voice, like a science teacher explaining something exciting to a class. Even pace, precise, warm. Studio recording. No radio filter, no static, no distortion.";

const voiceFor = (clip) => {
  const speaker = clip.speaker || '';
  if (/Tara/.test(speaker)) return { name: TARA_VOICE, style: TARA_STYLE };
  if (/Scientific Voice|Science Narrator/.test(speaker)) return { name: SCIENCE_VOICE, style: SCIENCE_STYLE };
  return { name: NARRATOR_VOICE, style: NARRATOR_STYLE };
};

const key = process.env.GEMINI_API_KEY;
if (!key || key === 'MY_GEMINI_API_KEY') {
  console.error('GEMINI_API_KEY is not set. Add it to .env, then run this script again.');
  process.exit(1);
}

function ffmpegPath() {
  const enc = path.join(workDir, 'enc');
  const lookup = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', "import p from 'ffmpeg-static'; process.stdout.write(p || '')"],
    { cwd: enc, encoding: 'utf8' }
  );
  if (lookup.status === 0 && lookup.stdout.trim() && fs.existsSync(lookup.stdout.trim())) {
    return lookup.stdout.trim();
  }
  const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) return which.stdout.trim();
  return null;
}

function ensureFfmpeg() {
  const existing = ffmpegPath();
  if (existing) return existing;
  const enc = path.join(workDir, 'enc');
  fs.mkdirSync(enc, { recursive: true });
  if (!fs.existsSync(path.join(enc, 'package.json'))) {
    fs.writeFileSync(path.join(enc, 'package.json'), JSON.stringify({ name: 'vo-enc', private: true }));
  }
  const install = spawnSync('npm', ['install', '--silent', 'ffmpeg-static'], {
    cwd: enc,
    stdio: 'inherit'
  });
  if (install.status !== 0) {
    throw new Error('Could not install ffmpeg-static, and ffmpeg is not on PATH.');
  }
  const bin = ffmpegPath();
  if (!bin) throw new Error('ffmpeg-static installed but its binary was not found.');
  return bin;
}

function wavFromPcm(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function audioToWav(base64, mime) {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF') return bytes;
  const rate = Number(/rate=(\d+)/i.exec(mime || '')?.[1] || 24000);
  return wavFromPcm(bytes, rate);
}

function encodeMp3(ffmpeg, wavPath, mp3Path) {
  const result = spawnSync(
    ffmpeg,
    ['-y', '-i', wavPath, '-ac', '1', '-ar', '24000', '-codec:a', 'libmp3lame', '-b:a', '64k', mp3Path],
    { encoding: 'utf8' }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr?.slice(-500) || 'ffmpeg failed');
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function renderClip(clip) {
  const voice = voiceFor(clip);
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              MODEL.includes('3.8')
                ? { text: clip.text, speechMetadata: { style: voice.style } }
                : { text: clip.text }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.name } } }
        }
      });
    } catch (error) {
      const status = error?.status || error?.code;
      const message = String(error?.message || error);
      const limited = status === 429 || message.includes('RESOURCE_EXHAUSTED');
      if (!limited || attempt === 6) throw error;
      const wait = 22000 * attempt;
      process.stdout.write(`  rate limit, waiting ${Math.round(wait / 1000)}s\n`);
      await sleep(wait);
    }
  }
}

const requested = new Set(process.argv.slice(2));
const ai = new GoogleGenAI({ apiKey: key });
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const clips = manifest.clips.filter((clip) => clip.id !== KEEP_ID && (requested.size === 0 || requested.has(clip.id)));
const ffmpeg = ensureFfmpeg();
fs.mkdirSync(path.join(workDir, 'wav'), { recursive: true });

for (const clip of clips) {
  process.stdout.write(`rendering ${clip.id}...\n`);
  const response = await renderClip(clip);
  await sleep(21000);

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((part) => part.inlineData?.data)?.inlineData;
  if (!inline?.data) {
    const reason = response.candidates?.[0]?.finishReason || 'no audio part';
    throw new Error(`${clip.id}: ${reason}`);
  }

  const wavPath = path.join(workDir, 'wav', `${clip.id}.wav`);
  const mp3Path = path.join(voiceDir, `${clip.id}.mp3`);
  fs.writeFileSync(wavPath, audioToWav(inline.data, inline.mimeType));
  encodeMp3(ffmpeg, wavPath, mp3Path);
  clip.engine = `Gemini TTS (${voiceFor(clip).name}, ${MODEL})`;
  clip.size = fs.statSync(mp3Path).size;
  // Write only this clip, into the file as it is now, so two runs at once do not erase each other.
  const latest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entry = latest.clips.find((item) => item.id === clip.id);
  if (entry) Object.assign(entry, { engine: clip.engine, size: clip.size });
  fs.writeFileSync(manifestPath, JSON.stringify(latest, null, 2) + '\n');
  process.stdout.write(`  wrote ${clip.filename} (${clip.size} bytes, ${inline.mimeType || 'audio'})\n`);
}

const zipPath = path.join(root, 'public', 'nobotara-voiceovers-offline.zip');
const zipped = spawnSync('zip', ['-r', '-FS', zipPath, 'audio/voiceovers'], {
  cwd: path.join(root, 'public', 'assets'),
  encoding: 'utf8'
});
if (zipped.status !== 0) {
  throw new Error(zipped.stderr || 'zip failed');
}
process.stdout.write('updated voiceover archive\n');
