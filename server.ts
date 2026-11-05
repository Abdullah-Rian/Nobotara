import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

    const isNeil = speaker && String(speaker).toLowerCase().includes('neil');
    // Fenrir is a deep, calm, grounded male voice ideal for Neil Armstrong
    const voiceName = isNeil ? 'Fenrir' : 'Puck';
    const cacheKey = `${voiceName}:${text}`;

    if (audioCache.has(cacheKey)) {
      return res.json({ audioData: audioCache.get(cacheKey), mimeType: 'audio/wav' });
    }

    const speechStyle = isNeil
      ? "Calm, deliberate, midwestern American male astronaut speaking over Apollo radio communication link with quiet confidence and historical reverence"
      : "Clear, articulated, professional male science narrator";

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

// Explicit binary download endpoints with strict attachment headers
app.get(['/nobotara-apollo11-project.zip', '/api/download-zip'], (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'nobotara-apollo11-project.zip');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('ZIP archive not found');
  }
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="nobotara-apollo11-project.zip"');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(filePath);
});

app.get(['/nobotara-apollo11-project.tar.gz', '/api/download-targz'], (req, res) => {
  const filePath = path.resolve(__dirname, 'public', 'nobotara-apollo11-project.tar.gz');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('TAR.GZ archive not found');
  }
  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', 'attachment; filename="nobotara-apollo11-project.tar.gz"');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(filePath);
});

// JSON Base64 endpoint for rock-solid in-browser blob creation (bypasses all iframe download blocks)
app.get('/api/download-base64', (req, res) => {
  try {
    const format = req.query.format === 'targz' ? 'tar.gz' : 'zip';
    const filename = `nobotara-apollo11-project.${format}`;
    const filePath = path.resolve(__dirname, 'public', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    res.json({
      filename,
      format,
      size: fileBuffer.length,
      base64,
    });
  } catch (error) {
    console.error('Error sending base64 archive:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Explicitly serve public assets (models, zip downloads, icons)
app.use(express.static(path.resolve(__dirname, 'public')));

async function startServer() {
  const distHtml = path.resolve(__dirname, 'dist', 'index.html');
  const hasDist = fs.existsSync(distHtml);

  if (process.env.NODE_ENV === 'production' && hasDist) {
    console.log('Production mode: Serving static files from dist/');
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(distHtml);
    });
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
