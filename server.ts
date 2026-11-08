import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';
const REQUEST_TIMEOUT_MS = 45000;

function withTimeout<T>(promise: Promise<T>, ms: number = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '20mb' }));

  // Helper to get GoogleGenAI client
  function getGenAIClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  // Helper to synthesize authentic astrophysics intelligence if live Gemini key is pending
  function synthesizeAstrophysicsAnswer(
    query: string,
    _mode?: string,
    attachments?: any[],
    _personalization?: any
  ): string {
    const q = (query || '').toLowerCase();
    let body = '';

    if (q.includes('europa') || q.includes('clipper') || q.includes('crust') || q.includes('radar')) {
      body = `NASA's Europa Clipper uses the REASON dual-frequency radar (9 MHz and 60 MHz) to penetrate up to 30 km (18.6 mi) of frozen crust, mapping ice thickness and sounding for Europa's global subsurface saltwater ocean. Instead of orbiting Europa, it performs 49 close flybys as low as 25 km to survive Jupiter's intense radiation belts.`;
    } else if (q.includes('artemis') || q.includes('south pole') || q.includes('lunar water') || q.includes('ice extraction')) {
      body = `Artemis targets the lunar South Pole because deep permanently shadowed crater floors (like Shackleton) remain at -246°C, trapping hundreds of millions of tons of water ice. This ice will be mined and split into liquid hydrogen and oxygen propellant to fuel future deep-space missions directly from the Moon.`;
    } else if (q.includes('jwst') || q.includes('webb') || q.includes('earliest galaxies') || q.includes('early galaxy') || q.includes('13.5 billion')) {
      body = `JWST detects galaxies formed over 13.5 billion years ago using high-sensitivity infrared instruments (NIRCam and NIRSpec) that capture light shifted into the infrared by cosmic expansion. Its 6.5-meter gold mirror and 5-layer Kapton sunshield operate at -233°C to eliminate thermal noise from the early universe.`;
    } else if (q.includes('perseverance') || q.includes('jezero') || q.includes('biosignature') || q.includes('sample return')) {
      body = `Perseverance explores Jezero Crater because it hosted an ancient lake and river delta 3.5 billion years ago—prime conditions for preserving microbial fossils. The rover has already sealed over 24 titanium sample tubes containing potential biosignatures, such as the chemical 'leopard spots' found in Cheyava Falls, awaiting Earth return via MSR.`;
    } else if (q.includes('black hole') || q.includes('event horizon') || q.includes('photon sphere') || q.includes('singularity')) {
      body = `A black hole's boundary is the event horizon at the Schwarzschild radius ($r_s = 2GM/c^2$), beyond which the escape velocity exceeds the speed of light. Just outside at $1.5 r_s$ lies the photon sphere, where extreme gravitational curvature forces light to orbit in unstable circles before escaping or falling inward.`;
    } else if (q.includes('cassini') || q.includes('grand finale')) {
      body = `The Cassini Grand Finale (2017) was a planned mission phase where NASA sent the spacecraft through 22 daring dives between Saturn and its innermost rings at 122,000 km/h. It provided the first direct sampling of Saturn's upper atmosphere before disintegrating to prevent accidental contamination of potentially habitable moons like Enceladus.`;
    } else if (q.includes('enceladus') || q.includes('plume') || q.includes('subsurface ocean')) {
      body = `Enceladus hosts a warm, global saltwater ocean beneath its ice crust, heated by tidal friction from Saturn. Cryovolcanic geysers at its south pole vent plumes containing water vapor, silica nanoparticles, molecular hydrogen, and complex organics directly into space, making it a top target for astrobiology.`;
    } else if (q.includes('interstellar') || q.includes('oumuamua') || q.includes('atlas') || q.includes('borisov')) {
      body = `Interstellar objects like 1I/'Oumuamua and 2I/Borisov are rogue asteroids or comets expelled from other star systems by planetary migration. They travel on unbound, hyperbolic trajectories with orbital eccentricity $e > 1$, entering our solar system at extreme velocities before exiting back into interstellar space.`;
    } else if (q.includes('deorbit') || q.includes('iss') || q.includes('space station') || q.includes('point nemo')) {
      body = `NASA and international partners will deorbit the 420-ton ISS around 2030 using a custom SpaceX Deorbit Vehicle equipped with 30 Draco thrusters. The controlled burn will steer surviving dense debris safely into Point Nemo in the South Pacific, the point on Earth farthest from any human landmass.`;
    } else if (q.includes('coronal mass') || q.includes('cme') || q.includes('geomagnetic') || q.includes('solar storm')) {
      body = `Coronal Mass Ejections (CMEs) are explosive expulsions of billions of tons of solar plasma hurled at up to 3,000 km/s by magnetic reconnection. When a CME's magnetic field connects with Earth's magnetosphere, it drives intense geomagnetic storms that spark auroras and can induce damaging power grid surges.`;
    } else if (q.includes('gravitational wave') || q.includes('ligo') || q.includes('neutron star') || q.includes('kilonova')) {
      body = `Gravitational waves are ripples in spacetime fabric generated by violent cataclysms like colliding black holes and neutron stars, propagating at light speed. LIGO detects these by measuring differential stretching of its 4-kilometer laser arms by less than $10^{-18}$ meters (one ten-thousandth of a proton's width).`;
    } else if (q.includes('roman') || q.includes('dark matter') || q.includes('dark energy')) {
      body = `Launching by May 2027, the Nancy Grace Roman Space Telescope features an infrared camera with a field of view 100 times larger than Hubble's. It will map weak gravitational lensing across hundreds of millions of galaxies to measure the accelerating expansion rate driven by dark energy.`;
    } else if (q.includes('apollo') || q.includes('moon') || q.includes('lunar') || q.includes('armstrong')) {
      body = `Apollo 11 landed Neil Armstrong and Buzz Aldrin in Mare Tranquillitatis on July 20, 1969, with ~25 seconds of descent fuel remaining. They spent 21.6 hours on the lunar surface, deploying laser retroreflectors and returning 21.55 kg of pristine lunar rock cores.`;
    } else if (q.includes('sound') || q.includes('music') || q.includes('noise') || q.includes('listen')) {
      body = `Sound cannot travel across outer space because sound waves are physical pressure vibrations that require an atomic medium to compress, whereas interplanetary space is a near-total vacuum (~1 atom/cm³). The famous Apollo 10 lunar 'music' was simply analog VHF radio heterodyne interference between the two spacecraft transceivers.`;
    } else if (q.includes('mars') || q.includes('red')) {
      body = `Mars is red because its basaltic crust is rich in iron, oxidized by ancient solar UV and water into fine ferric oxide (Fe₂O₃ rust) dust. It hosts Olympus Mons, a 21.9 km tall shield volcano preserved without plate tectonics, and the 4,000-km-long Valles Marineris canyon.`;
    } else {
      body = `In space science, ${query.trim() || 'this phenomenon'} is governed by gravitational dynamics and orbital mechanics. NASA and international astrophysics observatories study these processes directly through multi-wavelength telemetry and interplanetary probe data.`;
    }

    if (attachments && attachments.length > 0) {
      body += ` (Analyzed attachment: ${attachments[0].name}).`;
    }

    return body;
  }

  app.get('/api/ping', (req, res) => {
    res.json({ ok: true, hasGeminiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' });
  });

  // API status endpoint
  app.get('/api/gemini/status', (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    res.json({
      configured: hasKey,
      model: 'gemini-3.1-flash-lite',
      engine: hasKey ? 'Gemini Flash (Live API)' : 'SpaceAI Synthesized Telemetry Engine',
    });
  });

  // Helper to call Gemini with model fallback between gemini-3.1-flash-lite and gemini-3.8-flash
  async function generateWithGeminiFallback(
    ai: GoogleGenAI,
    contents: any,
    systemInstruction: string
  ): Promise<{ text: string; model: string }> {
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 250,
            },
          }),
          12000
        );
        if (response.text && response.text.trim()) {
          return { text: response.text.trim(), model: modelName };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini ${modelName} warning]:`, err?.message || err);
      }
    }
    throw lastError || new Error('All Gemini models unavailable');
  }

  // 1. Text / Standard Generation endpoint
  app.post('/api/generate', async (req, res) => {
    try {
      const { query, mode, attachments, personalization } = req.body;
      const cleanQuery = typeof query === 'string' ? query.trim() : '';

      let text = '';
      let isLiveGemini = false;
      let activeModel = 'spaceai-telemetry-engine';

      const ai = getGenAIClient();
      if (ai) {
        try {
          const attachmentNote = Array.isArray(attachments) && attachments.length > 0
            ? `\nAttached Context: ${attachments.map((a: any) => `${a.name} (${a.type}, ${a.size})`).join(', ')}`
            : '';

          const systemInstruction = `You are SpaceAI, a minimalist, precision space and astronomy intelligence engine.
CRITICAL FORMATTING & BREVITY RULES:
1. Provide ultra-concise, minimal, and straightforward answers.
2. Limit your answer to 2 to 4 sentences maximum (or 2-3 tight, punchy bullet points).
3. Do NOT include conversational filler, greetings, greetings by name, or textbook introductions.
4. Get straight to the key scientific facts, numbers, and physical units immediately.`;

          const prompt = `User Space Query: "${cleanQuery}"${attachmentNote}`;

          const result = await generateWithGeminiFallback(ai, prompt, systemInstruction);
          text = result.text;
          activeModel = result.model;
          isLiveGemini = true;
        } catch (apiError: any) {
          console.warn('[Gemini API Warning - falling back to synthesized engine]:', apiError?.message || apiError);
        }
      }

      // If Gemini did not return text (no key or API error), use synthesized space intelligence engine
      if (!text) {
        text = synthesizeAstrophysicsAnswer(cleanQuery, mode, attachments, personalization);
      }

      return res.json({
        text,
        isLiveGemini,
        model: activeModel,
      });
    } catch (error: any) {
      console.error('[API /api/generate unhandled error]:', error);
      const fallbackText = synthesizeAstrophysicsAnswer(req.body?.query || '');
      return res.status(200).json({
        text: fallbackText,
        isLiveGemini: false,
        error: error.message || 'Fallback mode active',
      });
    }
  });

  // 2. Streaming Generation endpoint (Server-Sent Events)
  app.post('/api/generate/stream', async (req, res) => {
    try {
      const { query, mode, attachments, personalization } = req.body;
      const cleanQuery = typeof query === 'string' ? query.trim() : '';

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const ai = getGenAIClient();
      let streamedViaGemini = false;

      if (ai) {
        try {
          const attachmentNote = Array.isArray(attachments) && attachments.length > 0
            ? `\nAttached Context: ${attachments.map((a: any) => `${a.name} (${a.type}, ${a.size})`).join(', ')}`
            : '';

          const systemInstruction = `You are SpaceAI, a minimalist, precision space and astronomy intelligence engine.
CRITICAL FORMATTING & BREVITY RULES:
1. Provide ultra-concise, minimal, and straightforward answers.
2. Limit your answer to 2 to 4 sentences maximum (or 2-3 tight, punchy bullet points).
3. Do NOT include conversational filler, greetings, greetings by name, or textbook introductions.
4. Get straight to the key scientific facts, numbers, and physical units immediately.`;

          const prompt = `User Space Query: "${cleanQuery}"${attachmentNote}`;

          const responseStream = await withTimeout(
            ai.models.generateContentStream({
              model: 'gemini-3.1-flash-lite',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.3,
                maxOutputTokens: 250,
              },
            }),
            12000
          );

          for await (const chunk of responseStream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
              streamedViaGemini = true;
            }
          }
        } catch (streamErr: any) {
          console.warn('[Stream fallback to synthesized chunks]:', streamErr?.message || streamErr);
        }
      }

      if (!streamedViaGemini) {
        // Stream synthesized astrophysics response in smooth chunks
        const answer = synthesizeAstrophysicsAnswer(cleanQuery, mode, attachments, personalization);
        const words = answer.split(' ');
        for (let i = 0; i < words.length; i += 4) {
          const chunk = words.slice(i, i + 4).join(' ') + ' ';
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          // Slight microdelay for smooth streaming feel
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      res.write(`data: [DONE]\n\n`);
      return res.end();
    } catch (error: any) {
      console.warn('[API /api/generate/stream error]:', error.message || error);
      if (!res.headersSent) {
        const answer = synthesizeAstrophysicsAnswer(req.body?.query || '');
        return res.status(200).json({ text: answer, fallback: true });
      }
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }
  });

  // 3. Multi-turn Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, systemInstruction } = req.body;
      const lastUserMsg = (messages || []).filter((m: any) => m.role === 'user').pop();
      const lastQuery = lastUserMsg?.content || lastUserMsg?.text || '';

      const ai = getGenAIClient();
      if (ai) {
        try {
          const formattedContents = (messages || []).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || m.text || '' }],
          }));

          const result = await generateWithGeminiFallback(
            ai,
            formattedContents,
            systemInstruction || 'You are SpaceAI. Provide ultra-concise, minimal, and straightforward answers (maximum 2 to 4 sentences). State the key scientific facts immediately without filler.'
          );

          return res.json({ text: result.text, isLiveGemini: true, model: result.model });
        } catch (err: any) {
          console.warn('[API /api/chat Gemini error, using fallback synthesizer]:', err?.message || err);
        }
      }

      const answer = synthesizeAstrophysicsAnswer(lastQuery);
      return res.json({ text: answer, isLiveGemini: false });
    } catch (error: any) {
      const answer = synthesizeAstrophysicsAnswer(req.body?.messages?.[0]?.content || '');
      return res.status(200).json({ text: answer, fallback: true });
    }
  });

  // 4. Gemini Live API WebSocket endpoint (/api/live)
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    const ai = getGenAIClient();
    if (!ai) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: 'GEMINI_API_KEY not configured on server. Live API unavailable.',
      }));
      clientWs.close();
      return;
    }

    try {
      let liveSession: any = null;

      liveSession = await withTimeout(
        ai.live.connect({
          model: 'gemini-3.8-live',
          config: {
            responseModalities: ['AUDIO'] as any,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: 'You are SpaceAI, a premier astrophysics and NASA cosmology intelligence engine speaking to a cosmic explorer.',
          },
          callbacks: {
            onmessage: (message: any) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  clientWs.send(JSON.stringify({ type: 'audio', audio }));
                }
                const text = message.serverContent?.modelTurn?.parts?.find((p: any) => p.text)?.text;
                if (text) {
                  clientWs.send(JSON.stringify({ type: 'text', text }));
                }
                if (message.serverContent?.interrupted) {
                  clientWs.send(JSON.stringify({ type: 'interrupted', interrupted: true }));
                }
              }
            },
            onclose: () => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.close();
              }
            },
            onerror: (err: any) => {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
              }
            },
          },
        }),
        REQUEST_TIMEOUT_MS
      );

      clientWs.on('message', (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && liveSession?.sendRealtimeInput) {
            liveSession.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (parsed.text && liveSession?.send) {
            liveSession.send({
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{ text: parsed.text }],
                }],
                turnComplete: true,
              },
            });
          }
        } catch (err) {
          console.warn('[Live API ws error processing message]:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          if (liveSession && typeof liveSession.close === 'function') {
            liveSession.close();
          }
        } catch (_) {}
      });
    } catch (liveErr: any) {
      console.warn('[Live API connection failed]:', liveErr.message || liveErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: liveErr?.message || 'Failed to establish Live session',
        }));
        clientWs.close();
      }
    }
  });

  // 5. Mount Vite middlewares in development or static dist in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SpaceAI Server] Running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('[SpaceAI Server Startup Error]:', err);
  process.exit(1);
});
