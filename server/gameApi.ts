/**
 * The game's server pieces, used by the root server.ts:
 * - /api/mars-archive: Mission 03's "ask the archive" question (rate limited)
 * - compressed static files with cache headers, for production
 */
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DIST_DIR = path.join(ROOT, 'dist');
const isProduction = process.env.NODE_ENV === 'production';

function gameAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({ apiKey });
}

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

/** Adds the game's API routes. Call after express.json(). Voices are never generated here: every line is a pre-recorded clip. */
export function registerGameApi(app: express.Express) {
  const ai = gameAi();
  app.get('/api/mars-archive', (_req, res) => {
    res.json({ available: Boolean(ai) });
  });

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
      const { MARS_ARCHIVE } = await import('../src/play/missions/mars/data.ts');
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
    } catch {
      console.error('Mars archive question failed');
      return res.json({ available: true, answer: 'The archive cannot answer that right now.' });
    }
  });

  app.get('/health', (_req, res) => {
    res.status(200).send('OK');
  });
}

/** Types worth compressing. Images, MP3, MP4 and zip files are already compressed. */
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
 * Models, audio, video and images may be replaced under the same name, so they are reused for
 * a day and refreshed in the background for a week. The page itself is always rechecked.
 */
function cacheControlFor(file: string) {
  const rel = file.replace(/\\/g, '/');
  if (rel.endsWith('/index.html')) return 'no-cache';
  if (rel.includes('/dist/static/')) return 'public, max-age=31536000, immutable';
  if (/\.(glb|gltf|mp3|mp4|bin|jpg|jpeg|png|webp|wasm|svg|ico|zip|gz)$/i.test(rel)) {
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

/** Production: serve dist/ compressed with cache headers; page routes fall back to index.html. */
export function serveBuiltSite(app: express.Express) {
  const distHtml = path.join(DIST_DIR, 'index.html');
  app.use(serveCompressed(DIST_DIR));
  app.use(express.static(DIST_DIR, staticOptions));
  app.get('*', (req, res) => {
    // A missing file is a 404, not the page. Only page routes fall back to index.html.
    if (path.extname(req.path)) return res.status(404).send('Not found');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(distHtml);
  });
  warmCompression();
}
