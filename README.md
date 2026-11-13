# Nobotara71

Three NASA missions kids can play in the browser — Apollo 11, Voyager 1 and Mars Sample Return —
plus SpaceAI, a chat guide that answers from NASA sources.
Built for the NASA Space Apps Challenge 2026, *Abandoned but not Forgotten*.

Live site: https://nobotara.pages.dev

## What is where

| Path | What it is |
| :--- | :--- |
| `src/App.tsx`, `src/components/` | Home page (mission brief cards, dock, menu, team, FAQ, policy) and the SpaceAI chat |
| `src/missions/catalog.ts` | The three missions' names, dates, briefs and facts, shared by the home page and the game |
| `src/play/` | The game. `PlayApp.tsx` runs a mission; `game/` holds the three 3D engines (three.js) |
| `src/main.tsx` | Routes `/` (home) and `/play/apollo-11`, `/play/voyager-1`, `/play/mars-sample-return` |
| `public/models`, `public/draco` | 3D models (see `public/models/README.md`) |
| `public/assets/audio/voiceovers` | Pre-rendered narration (AI voices, Gemini TTS) and `manifest.json` |
| `public/manus-storage` | Home page hero videos and stills |
| `nobotara-worker/` | Cloudflare Worker for SpaceAI (retrieval + Gemini) |
| `server.ts`, `server/gameApi.ts` | Local dev server: Vite, chat API, game API (`/api/mars-archive`) |
| `scripts/` | Voiceover, retroreflector-model and terrain build scripts |
| `docs/` | Plans and notes (`docs/game/MERGE-PLAN.md`, `docs/SPACEAI-NOTES.md`, `docs/video/`) |

## Run it locally

```bash
npm ci
npm run dev            # http://localhost:3000 (set PORT to change it)
```

Add `GEMINI_API_KEY=...` to `.env` for the local chat and the Mars archive. Without it the site still runs.

Open a mission directly with `/play/apollo-11?debug` (or `voyager-1`, `mars-sample-return`) to get
a SKIP OBJECTIVE button for testing.

## Build and deploy (Cloudflare Pages)

```bash
npm run build          # output: dist/
```

Cloudflare Pages settings:

- Build command: `npm ci && npm run build`
- Output directory: `dist`
- Node version: 22 (from `.nvmrc`)

`public/_redirects` sends `/play/*` to the app, and `public/_headers` sets the cache rules
(hashed files in `/static` for a year; models, audio, video and images for a day).

The game's API route exists only on the local server. On Pages the Mars archive question box stays off.
Every spoken line is a pre-recorded clip; nothing is synthesized while playing.
`npx tsx scripts/check-voiceovers.ts` checks that every line has a clip whose recorded text matches.

SpaceAI calls the Worker in `nobotara-worker/` (`npx wrangler deploy` there). It answers only
`https://nobotara.pages.dev`, its branch previews and localhost, and limits requests per visitor and overall.

### SpaceAI's Gemini keys

The Worker can hold several Gemini API keys. For each model it tries the keys in order; when Google says a
key is out of quota (or the key is wrong), that key rests and the next one is used. A key that hit a
per-minute limit rests for a minute, a daily limit for an hour, a wrong key for ten minutes.

Make each key in a **different Google Cloud project**: quotas are counted per project, so two keys from one
project run out together. Then, in `nobotara-worker/`:

```bash
npx wrangler secret put GEMINI_API_KEY      # the first key (already set)
npx wrangler secret put GEMINI_API_KEY_2    # the second
npx wrangler secret put GEMINI_API_KEY_3    # and so on, numbered without gaps
```

Secrets take effect at once; no redeploy is needed after adding one. `npx wrangler secret list` shows which
are set (not their values). Logs name keys only by position ("key 2"), never the key itself.

## Rebuilding generated files

```bash
npm run voiceovers                    # narration (needs GEMINI_API_KEY; free tier: 10 requests a day per model)
npm run terrain                       # Moon terrain height map
/Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/build-retroreflector.py -- public/models/retroreflector.glb
```

All narration in the game is AI-generated and is labelled AI VOICE on screen.
