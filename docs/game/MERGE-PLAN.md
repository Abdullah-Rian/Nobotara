# Plan: one repo, one site, Get Started opens the game

Goal: the website (`web/Nobotara`, GitHub `aviothicc/Nobotara`) and the game (`NobotaraGame`, GitHub `ferdouseOahid/NobotaraGame`) become one repository and one site. The game's own landing page (TitleScreen) is dropped. On the home page, **Get Started** starts the selected mission directly, and the home page shows the mission details the game's landing page has today.

Out of scope for now: the SpaceAI chat. Its issues are parked in `docs/SPACEAI-NOTES.md`. The chat moves into the new repo unchanged.

## What we start from

| | Website | Game |
|---|---|---|
| Stack | React 19, Vite 8, Tailwind 4, three 0.187, motion | the same, plus nothing extra |
| Extra deps | react-markdown, remark-gfm, ws | none |
| Server (local dev) | `server.ts`, chat APIs, port 3000 hard-coded | `server.ts`, `/api/narrator`, `/api/mars-archive`, compression, port 3000 |
| Hosting | Cloudflare Pages (nobotara.pages.dev) + Worker | Netlify (nobotara-71.netlify.app), static only |
| public/ | `manus-storage/`, `team/`, `assets/aistudio/` (18 MB) | `models/`, `draco/`, `assets/audio/`, `assets/images/`, zips (28 MB) |
| Branch | `main-game-inclusion` | `website-merge` |

Dependencies match almost exactly, so this becomes **one Vite app with one package.json**. A monorepo with workspaces would add complexity we don't need. Public folders don't clash: both have `assets/aistudio/`, but with different file names.

How the game starts today:
- `App.tsx` builds the Apollo scene as soon as the page loads, so it can serve as the title backdrop.
- Picking Voyager or Mars then throws that scene away. Players of Missions 2 and 3 download the Moon models for nothing.
- The title screen's buttons call `requestStart('apollo' | 'voyager' | 'mars')`.
- The end screens' replay returns to the title (`handleReplay`, `setPhase('title')`).
- GO BACK is a hard link to nobotara.pages.dev.

## Decisions

1. **Home repo: `aviothicc/Nobotara` (decided).** No new repo. The game comes in with its full history. Afterwards `ferdouseOahid/NobotaraGame` is archived on GitHub, with a README note pointing to the new home.
   - Cloudflare Pages most likely deploys from this repo: the Worker's CORS list and the game's GO BACK link both point to nobotara.pages.dev. Confirm in the Cloudflare dashboard.
   - Teammates (Abdullah-Rian, aviothicc) commit to its `main`, so the merge goes on a branch and lands through a PR.

Decisions 2–5 below follow the recommendation unless you say otherwise.
2. **Game URLs.** Recommendation: `/play/apollo-11`, `/play/voyager-1`, `/play/mars-sample-return`. They can be shared, and the browser Back button returns to the home page.
3. **The old Netlify address.** Recommendation: redirect `nobotara-71.netlify.app/*` to the new home page so old links keep working.
4. **Download files in the game's `public/`.** These are `nobotara-voiceovers-offline.zip` (5.9 MB) and `nobotara-apollo11-project.tar.gz` / `.zip` (2.1 MB each). Keep them as downloads, or leave them out of the site?
5. **Mars "curious" archive (shared vote counts).** Keep it as a shared archive (needs a Cloudflare Pages Function + KV), or keep the votes on each player's device only? Production on Netlify has no server, so today the votes already fall back to the player's device.

## Phase 1 — Bring the repos together, with history

0. In the website repo, create branch `game-merge` from `main`. `main` was at f407e88 on 2026-11-12. The empty `main-game-inclusion` branch can be deleted.
1. In a scratch clone of the game repo's `website-merge` branch, move everything into its new place in one commit (`git mv`). That branch is 3 commits ahead of the game's `main`.
   - `src/*` → `src/play/` (game code: `App.tsx` becomes `PlayApp.tsx`; `game/`, `components/`, `missions/`, `audio/`, `tutorials/`, `data/`, `utils/`, `types/`)
   - `public/models`, `public/draco`, `public/assets/audio`, `public/assets/images` keep their paths, so no asset URL changes.
   - `scripts/` → `scripts/` (voiceover and terrain builders); `model-sources/` → `model-sources/`
   - `EXPERIENCE.md`, `MISSION-3-PLAN.md`, `DRAFT-VS-BUILD.md`, this plan → `docs/game/`. `SPACEAI-NOTES.md` lives in `docs/`.
2. In the website repo, on `game-merge`: `git merge --allow-unrelated-histories` from that clone. Both histories are kept; `git log --follow` still works on game files.
3. **The website's files stay where they are.** Teammates are editing them, and moving them would break their open work. The website's `src/App.tsx` gets the `/play/...` route; nothing else in the website moves.
4. Merge the config files:
   - **package.json:** one file, named `nobotara`. Set `esbuild` to `^0.28` so a plain `npm ci` works again (no more `--legacy-peer-deps`).
   - **tsconfig and vite.config:** one of each.
   - **index.css:** one file with both sets of styles. The game's `body { user-select: none; overflow: hidden }` must only apply while a mission is open, not to the scrolling home page.
   - **server.ts:** one local server with the website's chat routes (unchanged), the game's `/api/narrator` and `/api/mars-archive`, and the game's compression and cache headers. The port comes from `PORT`, default 3000.
   - **index.html:** keep the website's. The game's viewport meta (`user-scalable=no, viewport-fit=cover`) is set only while a mission is open, so the home page stays zoomable.
5. Check: `npm ci`, `tsc`, `vite build`. The home page looks as before, and the game opens at a temporary route.
6. **Pushing:** this machine has no GitHub login in the shell (`gh` isn't signed in), so I commit locally and you push. Alternatively, run `gh auth login` first and I'll push the branch and open the PR.

## Phase 2 — Get Started opens the mission

1. Home and game are one single-page app. Get Started:
   - starts the game's audio (`apolloAudio.init()`) inside the same click, so the browser allows sound;
   - changes the URL to `/play/<mission>` without reloading the page;
   - loads the game code as a separate chunk (`React.lazy`), so the home page stays light.

   Navigating to the old Netlify page with a full reload would lose that click, and the first voice line would stay silent.
2. `PlayApp` takes the props `mission` and `onExit`:
   - it boots straight into that mission's intro;
   - it builds only that mission's scene, so the Apollo scene is never built for Voyager or Mars;
   - the portrait-phone "turn your device" hold stays.
3. Remove the game's title-screen pieces:
   - `TitleScreen.tsx`
   - the `phase === 'title'` overlay
   - Enter/Space to start Mission 01
   - the `'title'` camera mode for the backdrop
   - the GO BACK link

   The end screens get two buttons: **Play again** (restarts the same mission) and **Back to missions** (`onExit`).
4. Leaving a mission (Back button, `onExit`, or the browser's Back) disposes the scene (the existing `disposeScene`), stops audio and clears inputs. Returning to the home page must not leak the WebGL context.
5. Opening a `/play/...` link directly (no click yet) shows a small "Start mission" button first. Its tap unlocks audio and fullscreen on phones.
6. The game's `?debug` keeps working on `/play/...`.

## Phase 3 — Mission details on the home page

1. **One source of truth.** Create `src/missions/catalog.ts`, used by both the home page and the game, with one entry per mission:
   - number and date (MISSION 01 — JULY 20, 1969)
   - title and tagline ("The mission that succeeded. The things it left behind.")
   - what you'll do (the game's blurb, as 2–3 short points)
   - place and coordinates
   - controls (keyboard and touch)
   - the website's existing facts and highlights
2. **Layout.** Under the hero, a mission briefing panel for the selected dock mission. It sits on the page itself, not only in the dossier modal. Its contents:
   - the details listed in step 1
   - "About 10–15 min" playing time (measure it while testing)
   - the sound on/off toggle, shared with the game through one saved setting
   - a full-screen hint for phones

   Get Started sits right next to it. The dossier modal can then reuse the same panel or be removed.
3. **Make the two sites agree, and fix facts.** The two sites currently disagree:

   | Item | Website says | Game says | Fix |
   |---|---|---|---|
   | Apollo 11 title | ONE GIANT LEAP | "ONE GREAT LEAP" | "One giant leap" (Armstrong's words) |
   | Voyager title | THE GOLDEN DISK | THE GOLDEN RECORD | pick one, likely The Golden Record |
   | Voyager distance | 165.2 AU | 25.9 billion km (≈173 AU) | work it out from the date, like the game's `VOYAGER_LIGHT_DAY` |
   | Voyager signal time | 22.9 hours | — | about 24 hours now; also work it out from the date |
   | "Escape Velocity 17.0 km/s" | — | — | it's Voyager's speed relative to the Sun; relabel |
   | MSR blurb | "Humanity's first interplanetary sample return, retrieving…" | an unfinished journey | describe it as a plan that has not flown, as the game's story does |
   | MSR "Transit Distance 1.524 AU" | — | — | that's Mars's average distance from the Sun, not a transit distance |
   | MSR "Sample Tubes 43" | — | — | 43 tubes were carried, not all filled; say which |
   | Apollo "25 seconds of fuel" | — | the game has a fuel note | later analysis put it nearer 45 seconds; use the same wording as the game |

4. *(Moved to the chat work: the alerts are shown only inside SpaceAI, which is parked. See docs/SPACEAI-NOTES.md.)* Clean up the mission alerts:
   - Artemis II: launched 2026-04-01, splashed down 2026-04-10.
   - Voyager numbers: work them out from the date.
   - Thumbnails: copy them into `public/` instead of hot-linking someone else's cloudfront account.

## Phase 4 — Fast on slow connections

1. **Home bundle (1.1 MB today):**
   - three.js and the game load only in the `/play` chunk;
   - the chat component is imported lazily (only the import changes, not the chat itself);
   - the motion library stays for the home page.

   Target: under ~250 KB of JS before the hero shows.
2. **Hero videos (2–2.5 MB each):**
   - show the still image first;
   - play video only for the selected mission, and only after the page is idle;
   - no video when the browser reports Save-Data or a 2G/3G connection;
   - re-encode the 4K Voyager loop smaller.
3. **Warm-up:** when the dock selection settles and the connection is good, prefetch the game chunk and that mission's first models. Get Started then feels instant on good networks and costs nothing on bad ones.
4. **Mission loading screen:** a progress bar inside `/play` while models load, replacing a black screen.

## Phase 5 — Hosting

1. Cloudflare Pages builds the one app: `npm ci && npm run build`, output `dist/`. The largest file is 5.9 MB, under the 25 MB per-file limit.
2. Add `public/_redirects` (`/play/* /index.html 200`) and `public/_headers`:
   - long cache for `/assets/*`, `/models/*`, `/draco/*`, hashed JS and CSS;
   - short cache for `index.html`.

   Cloudflare compresses with Brotli itself.
3. Production APIs:
   - `/api/mars-archive`: a Pages Function + KV, or players' devices only (decision 5).
   - `/api/narrator`: not needed in production. Every line has a pre-rendered MP3. Check the manifest covers all speech; if so, skip the network call when a clip is missing.
4. Replace the Netlify site with a redirect (decision 3). Retire `nobotara-71.netlify.app`.
5. Worker CORS: no change. The site keeps the same origin.

## Phase 6 — Test

- From the home page, start each mission on desktop and on a phone (portrait and landscape). Sound plays on the first line.
- Back and forward buttons. Leave a mission midway and start another; WebGL contexts must not pile up.
- Open each `/play/...` link directly. Refresh while in a mission.
- Throttle to slow 3G: how long until the home page shows and until each mission starts.
- `?debug` skip buttons still work, so a full run of each mission can be checked quickly.
- Lighthouse on the home page, before and after.

## Order and size

Phases 1 and 2 are the core; do them in that order. Phase 3 can start once the catalog file exists. Phases 4 and 5 can follow, and 6 runs last. Each phase ends with a commit on the merge branch; nothing is pushed until you say so.
