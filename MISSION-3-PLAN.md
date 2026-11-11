# Mission 03 (Mars Sample Return): playtest findings and completion plan

Played **11 November 2026** on `http://localhost:3000/`, start to finish, at desktop size and at phone-landscape size (812×375). Compared against the draft script (`NoboTara-71.docx.pdf`, pages 9–17) and the code in `src/missions/mars/data.ts`, `src/game/marsEngine.ts`, `src/App.tsx` and the Mars components.

## Verdict

Mission 3 runs end to end and nothing crashes. The science is careful and mostly right. But it is a first pass, not a finished mission:

- **The player listens far more than they play.** A full run is about 7 minutes. Roughly 30 seconds of that is driving. Every stop is the same loop: drive 3–6 seconds, press E, wait 15–20 seconds for two voice lines, press Continue.
- **Three of the eight sites are empty ground.** Ancient water, biosignatures and Earth laboratories have a marker and a text panel pointing at bare dirt.
- **The big moments are placeholders.** The "open question" shot and the closing "three missions" shot are untextured spheres, a ring and a cylinder floating in brown fog.
- **The story's turn is given away early and then not shown.** The puzzle header tells the player the plan never flew before they have even rebuilt it, and "Witness the plan" shows no plan.
- **The last line of the whole game never plays** (bug, details below).

## 1. Bugs found while playing

| # | What happens | Where |
| --- | --- | --- |
| B1 | **The final narration line never plays.** "The universe does not owe us an answer…" is never shown or spoken. `mars_closing_final.mp3` was never requested in a full run. The closing shot is a fixed 16 s; when it ends `marsCurious` turns on, `MarsHUD` unmounts, and the dialogue panel that would trigger the second line is gone. | `App.tsx:1261`, `App.tsx:1871` |
| B2 | **The rover gets stuck on two of the eight routes.** The straight line from the lake-bed rock to the tubes passes through the centre of Perseverance. The straight line from the terminal to the water site passes through the centre of the tube cache. Hitting a round obstacle head-on is a dead stop with no slide. A player following the marker stops and has to work out that they must reverse. | `SITES` in `data.ts:73`, `updateRover` in `marsEngine.ts:1043` |
| B3 | **Heading readout is not wrapped.** After a few turns the HUD showed `HDG: -561°`. | `marsEngine.ts:1202` |
| B4 | **"SKIP OBJECTIVE" test button is always on screen** and sits on top of "SKIP CINEMATIC [ESC]" during the intro. | `App.tsx:1678` |
| B5 | **Skipping the intro also skips the arrival briefing.** The player lands with no welcome, no instruction and no context. | `App.tsx:1532` |
| B6 | **Evidence board marks wrong links with a green tick.** I linked all three wrong and all three showed as "Linked ✓". The error then said "One link is off" and listed the answers. | `EvidenceBoard.tsx:70`, `:33` |
| B7 | **HUD shows driving data during cinematics.** "Drive to the crater-floor rock (20.9m)" and `VEL / HDG` are on screen while the camera is still in space. "Return to the sealed tubes (5.8m)" sits over the open-question shot. | `MarsHUD` is mounted for every phase |
| B8 | **Camera passes through models.** Perseverance and the tubes fill the screen corner when the chase camera swings past them. | `applyCamera`, no camera collision |
| B9 | **Phone landscape: the Continue button is hidden.** The scan panel is taller than the screen, so Continue is below the fold inside a scroll area with a default white scrollbar. Same white scrollbar on the "Still curious?" card and the intro dialogue. | `MarsInspect.tsx:65`, `CuriousCard.tsx:52` |
| B10 | **Sequence puzzle rows jump under the pointer.** The dialog is vertically centred, so it re-centres when the error box appears or clears, shifting every row about 30 px. | `SequencePuzzle.tsx:106` |
| B11 | **The answer to the follow-up question appears below the fold** with no scroll to it. | `CuriousCard.tsx:92` |

## 2. What is missing compared with the draft

| Draft | Build today |
| --- | --- |
| Descent onto Jezero with Perseverance visible in the distance | Red fade, then the rover is already parked |
| Welcome line with the lake's age (more than 3.5 billion years) | Age removed |
| Explore, **find** formations, **scan** them | Fixed order, one marker at a time, press E |
| Discover Perseverance's sampling system; holographic record of its work | Perseverance is a labelled prop that cannot be inspected |
| Terminal briefing: NASA **and ESA**, several spacecraft and a rocket; "every step depended on the one before" | Cut. The puzzle opens cold. ESA is never mentioned anywhere |
| 3D reconstruction of all five stages in sequence | A wireframe lander and rocket that are visible from the first second of the mission, far from the terminal |
| Reveal: simulation freezes, parts vanish, the ascent vehicle fades, only tubes remain, "Was the effort wasted?" | One static wide shot. The fading hologram is tiny in the distance. The question is not asked |
| Three investigations unlocked by exploring geological clues | Three markers on empty ground |
| Question shot: tubes, holographic Earth over the horizon, the planned journey drawn and then erased | Plain spheres, a ring and a cylinder, unlabelled, on a brown background |
| Each legacy choice has its own short scene | Three camera moves. "Inspire future explorers" looks at empty sky |
| Ridge over Jezero, sunset, first stars, music | Not built. No music anywhere in the mission |
| "One journey showed us… Three missions. Three different legacies." and the final on-screen sentence | Replaced by two shorter lines, the second of which never plays (B1) |
| "Congratulations, Explorer!" and an open AI chatbot | Three fixed answers and one archive-limited follow-up |

Assets already in the repo that the mission does not use: `mars-lite.glb` (textured Mars), `sample-tube.stl` (NASA's real tube), `voyager.glb`, `earth.glb`.

## 3. Storytelling

1. **The twist is spoiled.** The puzzle header says "This campaign was not flown as first drawn" before the player rebuilds the plan. The hologram hardware is also on view from the start with no explanation.
2. **The puzzle tests things nobody taught.** The briefing was cut, so a student meets "Sample Retrieval Lander", "Earth Return Orbiter" and "Earth Entry System" for the first time as text rows to sort.
3. **"Witness the plan" shows nothing.** The button leads straight to "it was not carried out". The player never sees the rocket leave Mars or the orbiter catch the container, so there is nothing to lose when it is taken away.
4. **The same caution is repeated about nine times.** "Habitability is not proof", "not a verdict", "not an answer" appear in the lake-bed, tubes, water, biosignature (three times in one panel), board, question and Q&A text. The first time it is a lesson. By the fifth it reads as a lecture.
5. **The language is too abstract for a 12-year-old.** Examples: "waiting on a question no photograph can close", "An unfinished journey is still a record of the question", "this mission will not invent an answer", "A dated igneous rock can place the lake, and the stones around it, in time". Olivine and pyroxene are named and never explained.
6. **The choice is declared meaningless on its own screen** ("All three endings keep the same record"), and the scenes that follow do not show anything about the choice.
7. **No one is talking to the player.** The Mission Assistant has no face or presence. The narrator is labelled `NARRATOR-02`, a leftover from Voyager. Three speaker names share one voice.
8. **The best true story is not in the game.** In July 2024 Perseverance drilled a rock called Cheyava Falls. The sample, Sapphire Canyon, has "leopard spot" markings that NASA described in a September 2025 *Nature* paper as a potential biosignature, the strongest candidate the mission has. It is sitting in a tube on the rover right now. That one sample is the whole argument for bringing the tubes home, and it is real.
9. **The ending has no hope and no handoff.** It stops on "the plan did not fly". It never says what happens next or that the player's generation may be the one to fetch the tubes. That is the draft's "inspire" message and its core message.

## 4. Science check

Correct as written: launch July 2020 and landing February 2021; Jezero held a lake and a delta; igneous floor rock with olivine and pyroxene; delta sediment with clays and salts; fine lake mud; what a biosignature is; why Earth laboratories matter; the five-stage order.

Needs fixing:

| # | Issue | Fix |
| --- | --- | --- |
| S1 | **Tube cache is wrong.** The game shows 8 tubes standing upright in a round tray beside the rover. The real Three Forks depot is 10 tubes lying flat on the ground in a zigzag, several metres apart. Most samples, including Sapphire Canyon, are still inside the rover. | Lay 10 tubes flat using the NASA tube model. Say that the depot is the backup set and the rover carries the rest. |
| S2 | **Mission status is out of date and vague.** The game says the plan "met complexity, cost, and schedule trouble". In January 2026 the US Congress spending agreement stated it "does not support the existing Mars Sample Return program" and funded a smaller Mars Future Missions line instead. China's Tianwen-3 aims to launch in 2028 and return samples around 2031. | Add one dated, plain line ("As of 2026…"). Re-check NASA's page before release, because sources still differ on the wording "cancelled". |
| S3 | **"An igneous rock can be dated"** reads as if the scan dated it. Precise dating needs a laboratory on Earth. | Say so. It links the very first rock to the reason for the return. |
| S4 | **Lake age was dropped.** | Restore "more than 3.5 billion years ago". |
| S5 | **ESA is missing.** The orbiter was Europe's contribution. | Restore the NASA and ESA line. |
| S6 | **Intro says Mars "once may have held rivers, lakes".** Rivers and lakes are established. Only life is uncertain. | "once held rivers and lakes, and may have had conditions suitable for life". |
| S7 | **"Returned samples" on the evidence board.** Nothing has been returned. | "Samples, once returned" or "The sealed samples". |
| S8 | **Speed.** The HUD shows 7.4 m/s (about 27 km/h). Perseverance's top speed is about 0.15 km/h. | Either drop the number, or keep the fast explorer and add a one-line fact comparing it with the real rover. |
| S9 | **Scale.** Jezero is about 45 km wide. The game's rim is 54 m from the centre and visible all round. Students may leave thinking Jezero is a small bowl. | Present the play area as "a small patch of the crater floor near the delta", and put the delta cliff and rim far away as backdrop. |
| S10 | **Places do not match their names.** The "lake-bed rock" is outside the dark lake-bed disc. The "delta rock" is on a flat plain with no delta. The three rocks are the same shape in three colours. | See phase 2. |
| S11 | **Space is brown.** The question and closing shots show Mars, Earth and the Moon against the dust-coloured fog. | Black sky and stars for those shots. |
| S12 | **Missed fact.** Sunsets on Mars are blue. The draft's sunset ending is a free science moment. | Use it in the ending. |

Sources for S2 and item 8 above: [Scientific American](https://scientificamerican.com/article/the-fate-of-nasas-mars-sample-return-program-may-be-decided-in-2026), [Live Science](https://www.livescience.com/space/mars/nasas-mars-sample-return-is-dead-leaving-china-to-retrieve-signs-of-life-from-the-red-planet), [Universe Today](https://www.universetoday.com/articles/nasas-mars-sample-return-is-dead-paving-the-way-for-china), [NASA/JPL release on Sapphire Canyon](https://www.jpl.nasa.gov/news/nasa-says-mars-rover-discovered-potential-biosignature-last-year/), [The Planetary Society](https://www.planetary.org/articles/a-biosignature-on-mars-unpacking-perseverances-cheyava-falls-find), [NPR](https://www.npr.org/2025/09/10/nx-s1-5536552/nasa-mars-rover-life-biosignature-rock-sample).

## 5. UI and UX

1. No tutorial or coach prompts for Mars. Apollo and Voyager have them (`src/tutorials/`); there is no `mars.ts`.
2. No way to skip or speed a voice line. Continue appears only after both lines finish.
3. No progress indicator across 13 steps.
4. The objective pill sits mid-left over the scene and overlaps the rover during a scan.
5. The "Perseverance" label draws on top of the scan panel, and its pointer lands beside the model, not on it.
6. The scan panel jumps when the Continue button appears.
7. The map is fixed north-up, so "forward" is "down" at the start. Labels are 8 px. The cache diamond has no label.
8. "PRESS E" and "Press [SPACE] or [E]" show on touch devices too.
9. Sequence puzzle is text only, drag only on touch, and gives no hint about which row is wrong.
10. "MISSIONS" leaves instantly with no confirmation and no saved progress.
11. The mission has three names: "MARS — THE UNFINISHED PROMISE" (title screen), "MISSION 03: MARS SAMPLE RETURN" (HUD), "MARS" (opening card).
12. The end card has no "mission complete" moment and no Replay.
13. Title screen overflows at phone-landscape size (heading overlaps, Mars card text is cut off). Outside Mission 3, noted because it is the way in.

## 6. Code notes

- Cinematics run on fixed timers (`runMarsShot(shot, seconds)`), not on narration length. The reveal already waits for both; the closing does not (B1).
- `MarsEngine.dispose()` frees the renderer only. Geometries, materials and textures leak on replay.
- `THREE.PCFSoftShadowMap` is removed in this three.js version (console warning on every start).
- `public/models/nasa/` holds about 60 MB of `.blend` and `.blend1` files plus an unused 5 MB `perseverance.glb`. Everything in `public/` ships in the build.
- `/api/mars-archive` has no rate limit. The "one question" limit is client-side and resets on refresh.
- `EXPERIENCE.md` is stale: it says Mars has no local voice clips and is built only from code.
- Five files have uncommitted changes. Commit them before starting.

## 7. Plan

Ordered so that each phase leaves a playable build. Sizes are rough: S is hours, M is a day or two, L is several days.

### Phase 0. Fix what is broken (S)

- B1: drive the closing from narration. Show the end card only after `closing-b` has finished, with the shot timer as a floor, not a cutoff.
- B2: move sites so no leg crosses a collider, and make round obstacles slide the rover around them.
- B3: wrap heading to 0–359.
- B4: put the skip-objective button behind a dev flag (`import.meta.env.DEV` or `?debug`).
- B5: play the arrival briefing after a skipped intro.
- B6: on the evidence board, neutral "linked" style until checked; then mark each row right or wrong; no answers in the error text.
- B7: hide the objective pill and telemetry during intro and cinematics.
- B9, B10, B11: pin Continue to the panel footer, style scrollbars, top-align the puzzle dialog, scroll the answer into view.
- S6, S7 and the "Returned samples" wording: text-only fixes that need no new audio except the intro line.

Done when: a full run with no skip button, no stuck spot, the final line audible, and a clean pass at 812×375.

### Phase 1. Script rewrite and re-record (M)

Do this before art, because it decides what must be built.

- Rewrite every Mars line for a 12-year-old: one idea per sentence, concrete nouns, each new term explained once.
- Restore the cut beats: lake age, NASA and ESA briefing before the puzzle, "every step depended on the one before", "Was the effort wasted?", the "three missions" closing and the final sentence.
- Remove the spoilers from the puzzle header and the laboratory panel.
- Say the caution once at the lake bed, once at biosignatures, once at the open question. Cut the rest.
- Add the Cheyava Falls / Sapphire Canyon beat at the biosignature site.
- Add the dated status line (S2) and a hopeful last beat: the tubes are sealed and waiting, new plans are being drawn, and the people who fetch them may be in school now.
- Fix S1, S3, S4, S5 in the text.
- Give the Mission Assistant a name and its own voice; rename `NARRATOR-02` for Mars.
- Re-render the changed clips with `scripts/render-voiceovers.mjs` and update the manifest.

Done when: the script reads aloud in under about 4 minutes total, a teacher or student reader signs off on the wording, and every claim has a source.

### Phase 2. Make the places real (L)

- Terrain: a small patch of crater floor, with a layered delta cliff on one side and the rim as distant backdrop. Dry channel leading from the cliff. Daytime sky gradient with a small sun.
- Three distinct rocks: dark blocky basalt, layered sandstone at the foot of the delta, pale flat mudstone on the lake bed. Move the lake-bed rock onto the lake bed.
- Water site: the delta cliff itself, with visible layers and a boulder bed.
- Biosignature site: a pale outcrop with leopard-spot texture and a drill hole.
- Laboratory site: a holographic lab bench by the terminal comparing rover instruments with Earth instruments.
- Tubes: 10 NASA tubes lying flat in a zigzag (S1). Perseverance inspectable, with its sample-handling arm called out.
- Hide the plan hologram until the terminal is opened.
- Camera collision against Perseverance and the terminal (B8).

Done when: every marker points at a thing you can see, and a screenshot of each site is recognisably different.

### Phase 3. Give the player something to do (M to L)

- Free order within each act. Show all three rocks at once (Act 1) and all three investigations at once (Act 3), each with a tick when done.
- A scan the player performs: hold the scan button while a beam sweeps the rock and the four fact rows fill in one by one. Voice plays over it. Tap to finish a line early.
- A sample log in the HUD (for example "Samples 2 / 3") that doubles as the progress indicator.
- Mars coach prompts in `src/tutorials/mars.ts`: drive, scan, open terminal, drag, link.
- Sequence puzzle: icon for each vehicle, up and down buttons for touch, and each correctly placed row locks in green after a check.
- Optional small extras: a find-the-drill-hole moment on the biosignature rock; a "would you bring this one home?" pick at the tubes.

Done when: a first-time player can finish without help, and no stretch is longer than about 12 seconds without input.

### Phase 4. Cinematics (L)

- **Plan reconstruction** after the puzzle: lander sets down, the rover hands over tubes, the ascent vehicle launches (the first rocket ever launched from another planet), the orbiter catches the container, the capsule lands on Earth. Each stage labelled as it plays.
- **Reveal**: freeze mid-launch, parts flicker out one by one, the ascent vehicle fades last, camera settles on the tubes in the dust, then the "was it wasted?" line.
- **Open question**: tubes in the foreground, textured Earth rising over the horizon, the route drawn Mars → orbit → Earth and then erased, "DID LIFE EVER EXIST ON MARS?" on screen. Black sky (S11).
- **Legacy choice**: remove "all three keep the same record". Give each choice a visible scene. Preserve: tubes tagged and catalogued one by one. Questions: the three research questions rise from the terminal as a signal. Inspire: the full return route drawn in the sky over the crater.
- **Ending**: ridge view, blue Martian sunset, stars, music. Pull back to the Moon (textured), `voyager.glb`, and `mars-lite.glb`, each labelled, joined as a constellation. Final sentence on screen. All timed to the narration.

Done when: each shot can be understood with the sound off.

### Phase 5. Wrap-up and polish (M)

- End card: "Mission complete", what you collected, the three fixed questions as tappable cards, Replay, Missions. If all three missions are done, the draft's congratulations.
- Follow-up box: allow a few questions, widen the archive text to cover the obvious ones (water today, when the tubes come home, Cheyava Falls, Tianwen-3), keep the no-invention guard, add a server-side rate limit.
- HUD: move the objective pill to the top bar, heading-up map with readable labels, touch-aware prompts, confirm before leaving, one mission name everywhere.
- Add an ambient wind bed and a short music cue for the reveal and the ending.

### Phase 6. Release hygiene (S)

- `dispose()` frees scene resources; replace the removed shadow type; move `.blend` sources out of `public/`.
- Update `EXPERIENCE.md` and `DRAFT-VS-BUILD.md`.
- Test pass: desktop, phone landscape, touch only, muted, no API key, intro skipped, replay twice.
- Try it with two or three students in the target age range and watch where they stop.

## 8. Decisions to make

1. **How open should exploration be?** Recommended: free order inside each act (phase 3), not a fully open map. It restores choice without losing the story order.
2. **Open chatbot or archive-limited?** Recommended: stay archive-limited for a school audience, but widen the archive and allow a few questions.
3. **Name the 2026 status directly?** Recommended: yes, one dated line, checked again just before release.
4. **Re-record budget.** Phase 1 changes most Mars clips. Confirm that re-rendering about 25 clips is acceptable.
