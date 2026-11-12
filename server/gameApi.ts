import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Audio cache to avoid re-generating identical speech lines
const audioCache = new Map<string, string>();

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint to generate Neil Armstrong / Scientific narration
app.post('/api/narrator', async (req, res) => {
  try {
    const { text, speaker } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!ai) {
      return res.json({ useFallback: true, reason: 'No API key configured' });
    }

    // Fenrir is the voice used for the opening line, and every line uses it so the narration stays
    // one clear studio voice. The one exception is Tara, the Mission 03 assistant, who is a young woman.
    const isTara = /Tara/.test(String(speaker || ''));
    const voiceName = isTara ? process.env.TARA_VOICE || 'Kore' : 'Fenrir';
    const cacheKey = `${voiceName}:${text}`;

    if (audioCache.has(cacheKey)) {
      return res.json({ audioData: audioCache.get(cacheKey), mimeType: 'audio/wav' });
    }

    const speechStyle = isTara
      ? "Clear, friendly, natural young woman's voice, warm and bright, with a steady, patient pace, like a helpful guide speaking to a student. Studio recording. No radio filter, no static, no distortion."
      : 'Calm, clear, natural male voice with a warm full tone and a steady pace. Studio recording, the same voice as the opening narration. No radio filter, no static, no distortion.';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      audioCache.set(cacheKey, base64Audio);
      return res.json({ audioData: base64Audio, mimeType: 'audio/wav' });
    }

    return res.json({ useFallback: true, reason: 'No audio generated' });
  } catch (error) {
    console.error('Error generating narration:', error);
    return res.json({ useFallback: true, error: String(error) });
  }
});

app.get('/api/mars-archive', (_req, res) => {
  res.json({ available: Boolean(ai) });
});

// Each question costs a model call. Cap them per visitor and across the whole server.
const ARCHIVE_WINDOW_MS = 10 * 60 * 1000;
const ARCHIVE_PER_VISITOR = 9;
const ARCHIVE_TOTAL = 300;
const archiveHits = new Map<string, number[]>();
let archiveTotal: number[] = [];

function archiveAllowed(visitor: string) {
  const now = Date.now();
  const fresh = (stamps: number[]) => stamps.filter(stamp => now - stamp < ARCHIVE_WINDOW_MS);
  archiveTotal = fresh(archiveTotal);
  const mine = fresh(archiveHits.get(visitor) ?? []);
  if (archiveHits.size > 5000) archiveHits.clear();
  if (mine.length >= ARCHIVE_PER_VISITOR || archiveTotal.length >= ARCHIVE_TOTAL) {
    archiveHits.set(visitor, mine);
    return false;
  }
  mine.push(now);
  archiveTotal.push(now);
  archiveHits.set(visitor, mine);
  return true;
}

app.post('/api/mars-archive', async (req, res) => {
  if (!ai) return res.json({ available: false, answer: '' });
  if (!archiveAllowed(req.ip || 'unknown')) {
    return res.status(429).json({
      available: true,
      answer: 'The archive is busy. Please try again in a few minutes.'
    });
  }
  const question = String(req.body?.question || '').trim().slice(0, 280);
  if (!question) return res.status(400).json({ error: 'A question is required' });

  try {
    const { MARS_ARCHIVE } = await import('./src/missions/mars/data.ts');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You answer one follow-up about the game mission Mars Sample Return. Use only the archive. Write for a 12-year-old, in two or three short sentences. If the archive does not contain the answer, say that this mission's archive does not cover it, and name one thing from the archive that is close to the question. Do not claim life was found on Mars. Do not claim the original sample-return campaign flew. Stay under 80 words.\n\nARCHIVE:\n${MARS_ARCHIVE}\n\nQUESTION:\n${question}`
            }
          ]
        }
      ]
    });
    const answer =
      response.text ||
      response.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() ||
      'The archive does not answer that.';
    return res.json({ available: true, answer: answer.slice(0, 600) });
  } catch (error) {
    console.error('Mars archive question failed');
    return res.json({ available: true, answer: 'The archive cannot answer that right now.' });
  }
});

let port = Number(process.env.PORT) || 3000;
const portArgIndex = process.argv.indexOf('--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  const parsed = Number(process.argv[portArgIndex + 1]);
  if (!isNaN(parsed) && parsed > 0) port = parsed;
}

let host = '0.0.0.0';
const hostArgIndex = process.argv.indexOf('--host');
if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
  host = process.argv[hostArgIndex + 1];
}

// Health check endpoint for container and proxy readiness probes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const isProduction = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DIST_DIR = path.resolve(__dirname, 'dist');

/** Types worth compressing. Images, MP3 and zip files are already compressed. */
const COMPRESSIBLE = new Set(['.js', '.css', '.html', '.json', '.svg', '.wasm', '.glb', '.gltf', '.txt', '.map', '.bin']);
const compressed = new Map<string, Promise<Buffer>>();

function compressFile(file: string, mtime: number, encoding: 'br' | 'gzip') {
  const key = `${file}|${mtime}|${encoding}`;
  let job = compressed.get(key);
  if (!job) {
    job = new Promise<Buffer>((resolve, reject) => {
      fs.readFile(file, (readError, data) => {
        if (readError) return reject(readError);
        const done = (error: Error | null, out: Buffer) => (error ? reject(error) : resolve(out));
        if (encoding === 'br') {
          zlib.brotliCompress(
            data,
            { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } },
            done
          );
        } else {
          zlib.gzip(data, { level: 9 }, done);
        }
      });
    });
    compressed.set(key, job);
    job.catch(() => compressed.delete(key));
  }
  return job;
}

/**
 * Caching. Files whose names carry a hash never change, so they are kept for a year.
 * Models, audio and images may be replaced under the same name, so they are reused for
 * a day and refreshed in the background for a week. The page itself is always rechecked.
 */
function cacheControlFor(file: string) {
  const rel = file.replace(/\\/g, '/');
  if (rel.endsWith('/index.html')) return 'no-cache';
  if (rel.includes('/dist/assets/')) return 'public, max-age=31536000, immutable';
  if (/\.(glb|gltf|mp3|bin|jpg|jpeg|png|webp|wasm|svg|ico)$/i.test(rel)) {
    return 'public, max-age=86400, stale-while-revalidate=604800';
  }
  return 'public, max-age=3600';
}

/** Serve a file compressed, when the browser accepts it and the type benefits. Otherwise fall through. */
function serveCompressed(root: string): express.RequestHandler {
  return (req, res, next) => {
    if (!isProduction || (req.method !== 'GET' && req.method !== 'HEAD')) return next();
    let rel: string;
    try {
      rel = decodeURIComponent(req.path);
    } catch {
      return next();
    }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep) || !COMPRESSIBLE.has(path.extname(file).toLowerCase())) return next();
    const accepted = String(req.headers['accept-encoding'] || '');
    const encoding = /\bbr\b/.test(accepted) ? 'br' : /\bgzip\b/.test(accepted) ? 'gzip' : null;
    if (!encoding) return next();
    fs.stat(file, (statError, stat) => {
      if (statError || !stat.isFile() || stat.size < 1024) return next();
      void compressFile(file, stat.mtimeMs, encoding).then(
        body => {
          const etag = `W/"${stat.size.toString(16)}-${Math.round(stat.mtimeMs).toString(16)}-${encoding}"`;
          res.setHeader('ETag', etag);
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('Cache-Control', cacheControlFor(file));
          res.setHeader('Last-Modified', stat.mtime.toUTCString());
          if (req.headers['if-none-match'] === etag) return res.status(304).end();
          res.type(path.extname(file));
          res.setHeader('Content-Encoding', encoding);
          res.setHeader('Content-Length', String(body.length));
          if (req.method === 'HEAD') return res.end();
          res.end(body);
        },
        () => next()
      );
    });
  };
}

const staticOptions = {
  setHeaders: (res: express.Response, file: string) => {
    if (isProduction) res.setHeader('Cache-Control', cacheControlFor(file));
  }
};

/** Compress the big files once, in the background, so the first visitor does not wait for it. */
function warmCompression() {
  const walk = (dir: string): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
          entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]
        )
      : [];
  const files = [...walk(path.join(PUBLIC_DIR, 'models')), ...walk(path.join(PUBLIC_DIR, 'draco')), ...walk(DIST_DIR)].filter(
    file => COMPRESSIBLE.has(path.extname(file).toLowerCase())
  );
  void (async () => {
    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        if (stat.size >= 1024) await compressFile(file, stat.mtimeMs, 'br');
      } catch {
        // A file that cannot be read is served uncompressed.
      }
    }
  })();
}

// Explicitly serve public assets (models, images, icons)
app.use(serveCompressed(PUBLIC_DIR));
app.use(express.static(PUBLIC_DIR, staticOptions));

async function startServer() {
  const distHtml = path.resolve(__dirname, 'dist', 'index.html');
  const hasDist = fs.existsSync(distHtml);

  if (process.env.NODE_ENV === 'production' && hasDist) {
    console.log('Production mode: Serving static files from dist/');
    app.use(serveCompressed(DIST_DIR));
    app.use(express.static(DIST_DIR, staticOptions));
    app.get('*', (req, res) => {
      // A missing file is a 404, not the game page. Only page routes fall back to index.html.
      if (path.extname(req.path)) return res.status(404).send('Not found');
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(distHtml);
    });
    warmCompression();
  } else {
    console.log('Development mode (or missing dist): Starting Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Fallback error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).send('Internal Server Error');
  });

  app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
}

startServer();
