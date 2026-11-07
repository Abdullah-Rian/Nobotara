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

    // Fenrir is the voice used for the opening line. Every line uses it so the
    // narration stays one clear studio voice instead of a second, thinner one.
    const voiceName = 'Fenrir';
    const cacheKey = `${voiceName}:${text}`;

    if (audioCache.has(cacheKey)) {
      return res.json({ audioData: audioCache.get(cacheKey), mimeType: 'audio/wav' });
    }

    const speechStyle =
      'Calm, clear, natural male voice with a warm full tone and a steady pace. Studio recording, the same voice as the opening narration. No radio filter, no static, no distortion.';

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

// Explicitly serve public assets (models, images, icons)
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
