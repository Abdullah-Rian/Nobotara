# NoboTara-71

An interactive 3D experience about what space missions leave behind. The player visits three real NASA stories — a landing site that is still on the Moon, a spacecraft that is still calling home, and a sample-return plan that was never flown as first drawn — and learns why the hardware, the data, and the unanswered questions still matter.

The three missions can be started in any order from the title screen. Played in sequence, Apollo 11 hands off to Voyager 1, and Voyager 1 hands off to Mars Sample Return.

## Mission 01 — Apollo 11

**The mission that succeeded. The things it left behind.**

The player drives a small rover across the Sea of Tranquility and inspects what Apollo 11 left at Tranquility Base: the Eagle’s descent stage, the laser retroreflector, and the commemorative plaque.

### Objectives

1. **Eagle descent stage.** Drive to the lander and hear why the descent stage stayed on the Moon after the ascent stage carried Armstrong and Aldrin back to orbit.
2. **Laser retroreflector.** Drive to the mirror array and learn that it still returns laser light sent from Earth.
3. **Laser ranging.** Drive to the ranging station and fire a simulated pulse. The return gives a round-trip time, an Earth–Moon distance, and the Moon’s drift of about 3.8 cm per year.
4. **Commemorative plaque.** Drive to the landing leg, read the 1969 inscription, and play “That’s one small step.”
5. **Why they remained.** Match each object to the reason it was left: the descent stage was built to land and not to return, the retroreflector was built to keep measuring, and the plaque was left as a historical marker.

### How to play

Use W A S D or the on-screen stick. A compass points at the one active marker. Driving into that marker starts the inspection. At the ranging station, press **Fire the laser**. In the closing puzzle, choose an object, then the reason it stayed. Enter or Space starts Mission 01 from the title screen. E or Space confirms an action. Esc closes a panel.

### What the mission teaches

- The Lunar Module was two machines. Only the ascent stage left the Moon.
- The Apollo 11 retroreflector still works without power. Observatories time the returning pulse and measure the Earth–Moon distance.
- The plaque is a message of peace, not a scientific instrument.
- Something left behind can still be doing its job.

## Mission 02 — Voyager 1

**The endless journey.**

The player is with Voyager 1 in interstellar space. The spacecraft itself does not fly across the scene. The player turns it until the high-gain antenna faces Earth, then reads the instruments, the power limit, and the Golden Record, and chooses which discoveries to send home.

### Objectives

1. **Point the dish at Earth.** Turn the spacecraft until the antenna faces Earth and a communication link appears. Turning spends a limited propellant supply.
2. **Plasma waves.** Open a reading of the plasma-wave instrument and what it can say about the gas around the craft.
3. **Magnetic field.** Compare the idea of the Sun’s magnetic bubble with the field beyond it.
4. **Charged particles.** Read how particle counts help mark the space outside the heliosphere.
5. **Power limit.** Hear why instruments are switched off as the power supply weakens, as an engineering trade-off rather than a sudden failure.
6. **Golden Record.** Page through sounds, greetings, and images carried on the disc.
7. **Final archive.** Choose the three findings Voyager actually made, from a list that also includes three things it did not do.
8. **Send the telemetry.** Turn the dish toward Earth and watch the light-time: how long that signal still needs to reach Earth.

The three true findings are Jupiter’s ring and previously unknown moons, Saturn’s rings and moons, and measurements of the interstellar environment.

### How to play

After the opening line, use the arrow keys or the on-screen arrows. Put the Earth marker on the dish. Each later reading starts with **Initiate**. The Golden Record is a short set of pages. In the archive, select the three real discoveries and press send. The closing card continues to Mars or returns to the mission menu.

### What the mission teaches

- Voyager 1 launched in 1977, passed the outer planets, and entered interstellar space in August 2012.
- The high-gain antenna is fixed to the body, so the whole craft turns to face Earth. At this range a radio message takes many hours.
- Plasma waves, the magnetic field, and charged particles are real instrument families. The panels explain them. They are not a new scan.
- NASA has turned instruments off to save a power supply that slowly weakens.
- The Golden Record carries sounds, greetings, and images. It rides with the spacecraft. It does not broadcast those contents home.
- The “last transmission” is a fictional ending. The distance and the light-time use Voyager 1’s tracked path.

## Mission 03 — Mars Sample Return

**Jezero Crater. An unfinished journey.**

The player drives across a reconstructed Jezero Crater, inspects rocks Perseverance would cache, rebuilds the original five-part plan to bring those samples to Earth, and then faces the fact that the plan was not flown. The question of past life stays open.

### Objectives

1. **Crater-floor rock.** Inspect an igneous rock that can be dated and can place the ancient lake in time.
2. **Delta rock.** Inspect sedimentary stone carried by a river into the lake.
3. **Lake-bed rock.** Inspect fine sediment from quiet water, and the limit of what it can say about life.
4. **Sealed sample tubes.** Inspect the cache beside Perseverance: selected samples, not a verdict.
5. **Reconstruct the return.** Put the original plan in order:
   - Perseverance caches the samples.
   - A Sample Retrieval Lander brings the Mars Ascent Vehicle.
   - The ascent vehicle launches the container into Mars orbit.
   - The Earth Return Orbiter captures it and carries it toward Earth.
   - The Earth Entry System delivers it for study.
6. **The plan that was not flown.** Watch the reconstruction stop, and hear that complexity, cost, and schedule kept the original architecture from flying as first drawn.
7. **Ancient water.** Connect the delta, channels, and water-formed minerals to a geological history, not to proof of life.
8. **Potential biosignatures.** Learn that a habitable environment and a possible biosignature are reasons to look, not a verdict.
9. **Earth laboratories.** Learn why some instruments never fly to Mars, and why the same grains can be studied again later.
10. **Evidence board.** Link ancient water to geological history, potential biosignatures to a search rather than proof, and returned samples to laboratory analysis.
11. **The open question.** Return to the tubes and hear that “Did life ever exist on Mars?” has no conclusion in this archive.
12. **Choose a legacy.** Pick one emphasis for the unfinished mission: preserve the evidence, continue asking questions, or inspire future explorers. All three keep the same record.
13. **Closing.** Watch the camera leave Jezero and frame the Moon, Voyager, and Mars together.

### How to play

Drive with W A S D or the on-screen stick to the active marker, then press **Inspect**. At the terminal, move the five stages until they are in the planned order and confirm. On the evidence board, select an item, then its meaning. At the end, choose one of the three legacy statements. If a Gemini key is configured, one follow-up question can be asked. The answer is limited to this mission’s archive.

### What the mission teaches

- Jezero once held a lake and a river delta. The water is gone. The rocks remain.
- Igneous floor rock, delta sandstone, and fine lake sediment record different parts of that history.
- Perseverance cached selected samples so Earth laboratories could study them more closely than the instruments on Mars can.
- The original sample-return campaign was a chain of several spacecraft. It was not carried out as first planned.
- Habitability is not proof that life existed. A potential biosignature is a reason to investigate, not a yes or a no.
- An unfinished mission can still leave evidence, a method, and a question worth keeping.

## Technology stack

Versions are the ones installed in `package-lock.json`.

| Layer | Technology | Version |
| --- | --- | --- |
| Language | TypeScript, target ES2022, JSX | 7.0.2 |
| UI | React and React DOM | 19.3.1 |
| 3D | Three.js, WebGL, GLTFLoader for `.glb` models | 0.187.0 |
| Styling | Tailwind CSS, via `@tailwindcss/vite` | 4.3.4 |
| Icons | lucide-react | 0.546.0 |
| Typefaces | Plus Jakarta Sans and Space Mono (Google Fonts) | — |
| Bundler and dev server | Vite, `@vitejs/plugin-react` | Vite 8.3.6, plugin 6.2.1 |
| Application server | Express | 4.22.3 |
| Server runner | tsx | 4.23.15 |
| Environment | dotenv (`GEMINI_API_KEY`, `PORT`) | 17.4.2 |
| Google API client | `@google/genai` | 2.32.0 |
| Node types | `@types/node` | 22.20.5 |
| Bundler used by tsx | esbuild | 0.25.12 |

The game is a single-page app. `server.ts` serves it: Vite middleware in development, and the `dist` build in production when `NODE_ENV=production`. The default listen address is `http://0.0.0.0:3000`.

3D scenes are three separate engines (Apollo, Voyager, Mars), each with its own `WebGLRenderer`. Apollo and Voyager load Blender exports from `public/models` (`terrain.glb`, `descent_stage.glb`, `retroreflector.glb`, `earth.glb`, `sun.glb`, `voyager.glb`, and an optional `rover.glb`). Missing optional models fall back to geometry built in code. Mars is built from code. Input is keyboard plus an on-screen stick. Sound effects (rover hum, Quindar tones, laser, UI) are synthesized in the Web Audio API.

`motion` 12.43.0 and `autoprefixer` 10.6.2 are declared dependencies. The game source does not import them.

Offline voice clips are encoded with ffmpeg (mono, 44.1 kHz, 128 kbps MP3) by `scripts/render-voiceovers.mjs`.

## Use of AI

AI is used for speech and for one grounded follow-up question. It does not drive the rover, generate the missions, or decide puzzle answers.

The client is `@google/genai` **2.32.0**. Every call needs `GEMINI_API_KEY`. With no key, narration falls through to the browser, and the Mars follow-up box stays hidden.

### Language model

| Use | Model | Where |
| --- | --- | --- |
| One follow-up after Mission 03 | **Gemini 2.5 Flash** (`gemini-2.5-flash`) | `POST /api/mars-archive` |

The model may answer only from the mission archive text in `src/missions/mars/data.ts`. The prompt tells it to stay under 80 words, to refuse anything the archive does not contain, and to avoid claiming that life was found on Mars or that the original sample-return campaign flew. The player may ask once, up to 280 characters. The reply is cut at 600 characters. `GET /api/mars-archive` only reports whether a key is configured.

### Speech models

Narration is pre-written. Models speak those lines. They do not write new mission dialogue during play.

Playback order for every spoken line:

1. A local MP3 in `public/assets/audio/voiceovers/`, when that clip exists.
2. Live speech from `POST /api/narrator`.
3. The browser Web Speech API, using an English male voice when the device has one.

Apollo 11 and Voyager 1 ship as local MP3s, so a normal playthrough of those two missions does not call the live speech API. Mars Sample Return has no local clips. Its lines use live speech when a key is set, and the browser voice when it is not.

| Use | Model | Voice |
| --- | --- | --- |
| Live narration, any line without a local MP3 | **Gemini 3.8 Flash Lite TTS** (`gemini-3.8-flash-lite-tts`) | Fenrir |
| Offline render script, default | `gemini-3.8-flash-lite-tts` (`TTS_MODEL` can override it) | Fenrir |
| Pre-rendered Voyager opening | `gemini-3.8-flash-lite-tts` | Fenrir |
| Pre-rendered Voyager alignment, instruments, and power lines | `gemini-3.8-flash-tts` | Fenrir |
| Pre-rendered Golden Record pages | `gemini-3.1-flash-tts-preview` | Fenrir |

The Apollo MP3s, including Neil’s opening line, are labeled in the voiceover manifest as Gemini TTS with the Fenrir voice. The manifest does not record a model id for those clips. The live endpoint and the render script both use `gemini-3.8-flash-lite-tts`.

The speech style sent with the 3.8 models is a calm, clear male studio voice at a steady pace, with no radio filter. Apollo-era radio color, when it plays, is added afterward by the Web Audio engine (Quindar tones at 2525 Hz and 2475 Hz), not by the speech model.
