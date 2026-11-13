# SpaceAI chat: open issues (parked)

Found while reviewing the web project on 2026-11-12. Not worked on yet; the chat is parked until the home page and game merge is done.

## Cost and security
- The worker (`nobotara-worker`) has no auth and no rate limit. The CORS allowlist only stops browsers, not scripts, so anyone can spend the Gemini quota.
- `/api/chat` in `server.ts` accepts `systemInstruction` from the client (prompt override), takes bodies up to 20 MB and has no rate limit.
- The voice mode WebSocket `/api/live` needs the Express server; it cannot work on static Cloudflare Pages.

## Voice on free hosting (options discussed)
GitHub Pages and Netlify do not help: neither can hold a WebSocket open (Netlify Functions are short request/response).
1. **Ephemeral tokens (recommended).** The existing Worker gets a `/live-token` endpoint that uses the real key to mint a short-lived, single-session token locked to the model, voice and system instruction. The browser connects to the Gemini Live API directly with it. Protect the endpoint with Cloudflare Turnstile and a per-visitor limit.
2. Proxy the WebSocket through a Worker / Durable Object. Works on the free plan but every audio packet passes through the Worker; more work, no advantage.
3. Browser speech recognition + the existing RAG text worker + speech synthesis. Free and grounded in the indexed sources; robotic voices; no speech recognition in Firefox. Good fallback when Live fails or the free quota runs out.

## Accuracy
- `synthesizeAstrophysicsAnswer()` in `server.ts` returns canned keyword answers; the catch-all ("governed by gravitational dynamics") is invented.
- `generateAIResponse` in `src/services/aiAdvisor.ts`: when the Worker fails, it shows canned keyword answers dressed as real ones (with made-up metrics), including the inaccurate 'about 25 seconds of fuel' and an invented catch-all. (Corrected 2026-11-13: it is not an empty answer.)
- The "Data Verification: NASA Telemetry" label is not true; answers come from indexed web pages.
- `streamAIResponse` ignores the `sources` event the worker sends.
- Answers quote their snapshot date ("As of Nov. 18, 2026" for Voyager's distance). There is no ingestion script in the repo to rebuild the Vectorize index.

## Repo
- `nobotara-worker/test/index.spec.js` is the untouched Hello World template and fails.
- Worker models: gemini-3.1-flash-lite, 3.6-flash, 3.5-flash-lite, 3.8-flash; topK 8, MIN_SCORE 0.6, maxOutputTokens 1000.

## Home page items (handled in the merge plan, docs/game/MERGE-PLAN.md)
- Mission alerts: Artemis II still "T-Minus Integration / Late 2025–Early 2026" (it launched 2026-04-01, splashed down 2026-04-10); Voyager 1 numbers hard-coded and stale; thumbnails hot-linked from a third-party cloudfront account.

## Re-check, 2026-11-13
- Confirmed: the Worker answers a plain script (no website, no origin): anyone can spend the quota.
- Answers are accurate and sourced, but written for adults (jargon like "CSM", times in UT); the source is listed twice.
- The microphone button only toggles its own glow ("Stop listening"); it records nothing.
- The NASA Live Updates panel shows dated or invented "news" (Artemis II pre-launch avionics power-on, after the
  April 2026 flight; a "Sample #25 at Neretva Vallis"), presented as live.
- `MissionAlerts.tsx` is not used anywhere. `createLiveSessionSocket`, and server.ts's /api/generate, /api/generate/stream,
  /api/chat and /api/live are not used by the site either (it calls the Worker).
