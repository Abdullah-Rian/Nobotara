# NoboTara-71: draft script vs the game as built

Compared **9 November 2026**.

- **Draft:** `NoboTara-71.docx.pdf` (17 pages). A game-and-narrative script: one prologue, then Apollo 11, Voyager 1, and Mars Sample Return in that order, ending on an open AI chatbot.
- **Build:** the Three.js game in this repo (`src/App.tsx` and the Apollo, Voyager, and Mars modules).

The learning goals survived. The way the player moves through them did not. The draft is one filmed story with short free-explore beats. The build is three selectable missions, each a guided route of markers, readings, and puzzles, with menu handoffs between them.

## What still matches

- Three missions, in the same order when played straight through: Apollo 11 at Tranquility Base, Voyager 1, Mars Sample Return at Jezero.
- The same question underneath all three: a mission can still matter after the hardware stays behind or the plan is never flown.
- Apollo’s three objects (Eagle descent stage, laser retroreflector, commemorative plaque), Neil’s intro, and the match of “why did this stay on the Moon?”
- Voyager’s antenna alignment, the three instrument ideas (plasma, magnetic field, charged particles), the power trade-off, the Golden Record’s sounds / greetings / images, and a closing archive of three real discoveries.
- Mars’s five-stage return architecture, the admission that the original campaign was not flown, three investigations (ancient water, potential biosignatures, Earth laboratories), an evidence board, the unanswered question “Did life ever exist on Mars?”, and three legacy choices that share one closing line.
- A last image that gathers the Moon, Voyager, and Mars, then a “still curious?” prompt.

## 1. The game is no longer one continuous story

| Draft | Build |
| --- | --- |
| Scene 0.1 opens in a dark archive. The Moon, Mars, and deep space appear as holograms. On-screen text says exploration leaves something behind. | No prologue archive and no three-hologram opening. |
| The player taps “Let’s begin with the Apollo 11…”, hears a rocket, and sees fire and smoke, then the Mission 01 title card. | The title screen is a mission picker. Apollo, Voyager, or Mars can start on its own. Apollo’s intro is a camera move over the landing site while Neil speaks. There is no launch shot. |
| Each mission hands off by itself: Apollo warps to Voyager, Voyager descends onto Jezero, Mars ends the game. | Each outro offers **Continue** to the next mission or **Back to missions / Replay**. The warp and the approach still play, then the player chooses. |
| Scene lengths are written as 15s, 45s, 30–45s, 10–15s, 20s. | Nothing is timed. Coach prompts tell the player the next stick, button, or match. |

Page 1 of the draft (the problem statement, ages 12–18, the central mystery, the intended feelings) never became a scene. The missions carry that idea. They do not state it.

## 2. Apollo 11

The Sea of Tranquility, the rover, Earth in the sky, the three artifacts, and the matching question are the same mission.

### How the site is explored

The draft’s 45-second explore beat is free. The rover can reach the three objects in any order. A prompt appears in range: **Interact**, **Activate Laser**, or **Read Plaque**.

The build is a locked route:

1. Eagle descent stage
2. Retroreflector, inspect only
3. A separate **laser ranging station**
4. Plaque
5. Free roam, then the match puzzle

A compass and an objective coach point at the one live marker. Driving into it starts the beat. The player does not choose the order.

### The laser

Draft: at the reflector, **Activate Laser** plays a beam from the sky. The script is explicit that the player only starts the interaction, and that the real laser is sent from Earth.

Build: the reflector inspection and the laser shot are two stops. The player drives to a ranging station and presses **Fire the laser**. The overlay says the pulse is a 532 nm shot from McDonald Observatory, then shows a round-trip of 2.56448 s, a distance of 384,402.1 km, and a recession of 3.8 cm per year. The result line still says the pulse left Earth. The action the player takes is firing it.

The scientific line at the reflector is also more specific than the draft (observatories in Texas, Hawaii, and France; the Moon drifting away at 3.8 cm per year).

### The plaque and the other copy

The inscription and the “one small step” line are both present. The draft asked for the real recording or the EVA scene if possible. The build speaks the line on a button. It is not the archival recording, and there is no EVA footage.

The draft’s plaque explanation names the Apollo 11 signatures and President Nixon, and says the plaque is a historical marker, not an instrument. The build’s spoken science line is the inscription plus the steel, radiation, and temperature. The signatures appear on the plaque photograph, not in that line.

Neil’s descent-stage and retroreflector lines are essentially the draft. The scientific descent-stage line is longer (throttleable engine, tanks, the weight limit on the ascent stage). Fact chips gained extra labels the draft did not use (`ACTIVE EXPERIMENT`, `PERMANENT MONUMENT`, `HUMANITY’S FIRST LUNAR BASE`, `MESSAGE OF GLOBAL PEACE`).

### The match and the exit

The question and the three correct reasons are the draft’s. The build is select-an-object, then select-a-reason, with a correction if a pair is wrong. The draft’s optional animation on each correct pair is not there. A chime plays when all three are right.

The exit still pulls back, stretches the stars, and reveals Voyager. It then stops on a card, **Beyond the Moon**, and asks the player to continue or replay. The draft does not stop for that choice. The card’s Voyager blurb (“The Golden Record”) is new.

## 3. Voyager 1

The beats are the same list. The spacecraft is no longer something the player flies.

### Flight that the script asked for and the game does not do

The draft, after “Meet Voyager 1 — The Endless Journey”:

- The player steers, rotates, and inspects systems.
- Alignment is a rotation until the antenna meets an Earth marker. A weak signal stays weak until it is right. The console then unlocks.
- Scene 2 puts the player inside a glowing solar bubble. The player moves through the heliopause while Narrator-02 explains the August 2012 crossing.
- The three readings are holographic panels the player goes to: a changing waveform, magnetic-field indicators, and a particle count.

The build:

- There is no “Meet Voyager 1” card. The mission-select button says “The endless journey.”
- The craft stays put. Yaw and pitch are the only flight controls, and turning spends a propellant tank that can run out before the dish is on Earth. Thrust is accepted by the engine and then zeroed, so the ship never translates.
- A heliosphere shell is drawn around the parked craft. A `cross` step still exists in code and is never entered. After the dish locks, the game goes straight to the readings.
- Each reading is an **Initiate** button beside the spacecraft. The matching part on the model blinks, then a narrator line and a science line play. The player does not travel to a panel or read a live waveform, magnetometer, or particle counter.

Mission Control’s line is the draft’s, plus the instruction to turn the high-gain antenna toward Earth. The science line adds that the dish is fixed to the body, so the whole craft must turn, and that a message takes many hours. Narrator-02’s opening is the draft speech with the last movement cut (“millions of kilometres became billions… Into the vast unknown”).

An extra beat the draft does not have: a labeled tour of the real model (high-gain antenna, Golden Record, radioisotope generators, magnetometer boom, science instruments), open during the intro pan and again after alignment.

### Power, the record, and the last packet

The power speech and the “this is a real trade-off, not a sudden failure” science line match the draft. Staging does not. The draft makes the power loss the look of the scene: warnings, dead panels, a camera on aging hardware, and only then the Golden Record. The build makes power the fourth reading in the same Initiate sequence, and dims the model from that step onward.

The Golden Record content matches: sounds, greetings, images, and the warning that the disc does not transmit home. The draft is one narrator speech, then three symbols or panels on the craft. The build is a paged panel. The one speech is split across the three pages and rewritten into shorter lines.

The archive items match: Jupiter’s ring and moons, Saturn’s rings and moons, interstellar measurements. The draft asks the player to choose those three. The build asks the player to pick the three true findings out of six. The three decoys are a crewed landing on Neptune, a return of the spacecraft to Earth, and a live broadcast of the Golden Record.

The send is also heavier than the script. The draft shows a packet moving through stars and a long delay, then says in a note that this ending is fiction. The build turns the dish toward Earth, shows a light-time card (distance and one-way time from Voyager 1’s tracked position on 9 November 2026), and keeps the fiction disclaimer. The packet flight through the starfield is not a player-visible scene.

The exit still shrinks the craft, passes a Pale Blue Dot beat, and approaches Mars. It stops on **A neighbouring world** and offers Mission 03 or the menu. The draft’s descent, with Perseverance already visible and a fade to black, is the Mars opening that was not built.

## 4. Mars Sample Return

The scientific argument is the same. The visit is a checklist of named sites instead of two exploration scenes.

### Arrival and the rocks

Draft Scene 01 drops the player into Jezero after a descent that finds Perseverance in the distance. A mission assistant welcomes them and gives the lake an age: more than 3.5 billion years. The player explores, scans formations, finds the sampling system, and opens a holographic record of the rover’s earlier work. A scan can report composition, geology, ancient conditions, and why the rock is worth studying. Then the player finds the sealed tubes.

Build: the camera drops onto a basin and the player drives the series rover. Perseverance is a prop beside the cache, not the figure in the opening shot. The welcome and the 3.5-billion-year line are gone. The arrival is two shorter lines: the lake and the delta are gone and the rock remains; photographs cannot bring the rocks home.

There is no operations hologram. The “scan” is four required stops, in order:

1. Igneous crater-floor rock (olivine and pyroxene, a rock that can be dated)
2. Delta sandstone (clays, salts, river sediment)
3. Fine lake sediment (quiet water, habitability without a verdict)
4. The sealed tubes

Those four fact rows (composition, character, ancient environment, why collect it) are the draft’s scan panel, filled in with specific rocks the script never named. The habitability caution starts here, earlier than the draft, which saved it for Scene 04.

### The return plan

The five stages match, including the Sample Retrieval Lander, the Mars Ascent Vehicle, the Earth Return Orbiter, and the Earth Entry System. The build says up front, on the puzzle itself, that this campaign was not flown as first drawn. The draft withholds that until after the puzzle.

The draft’s terminal speech is a long assistant briefing (NASA and ESA, several spacecraft, a rocket) and a narration that walks the chain: sample, rocket, orbiter, home, each step depending on the one before. The build’s puzzle is a reorder list. Success is one line: “Sequence reconstructed. This was the original plan for bringing the tubes home.” A holographic lander and ascent vehicle sit at the terminal.

The reveal is shorter too. The draft freezes the hologram, removes the lander, fades the ascent vehicle until only the tubes remain, and asks whether the effort was wasted. The build freezes the hologram and says the architecture met complexity, cost, and schedule trouble, then: “An unfinished journey is still a record of the question.” The “was it meaningless?” questions are not spoken.

### The three investigations

Draft Scene 04 is a hidden archive. The player unlocks three research questions by exploring: water in sedimentary rock and clay, what a potential biosignature is and why habitability is not proof, and why Earth laboratories can do what the rover cannot. A narration about billions of years and evidence that could change our understanding of life plays over that search.

The build sends the player to three more marked sites, in order (water, biosignatures, laboratory), each another reading panel. The science is the same, worded more tightly, and the “billions of years” narration is not used. The evidence board that follows is the draft’s board:

- Ancient water → geological history of the lake and the delta
- Potential biosignatures → a search, not proof
- Returned samples → Earth-laboratory analysis, so later questions can still be asked

### The question, the choice, and the end

The open question is the same, and the archive still refuses to answer it. The draft’s longer speech (ancient rivers, a world that may have been more like ours, “whether we were ever alone”) is replaced by “The archive has no conclusion” and “One unfinished mission does not end discovery.” A question stage does show Mars with a rocket, an orbiter, and Earth, and those extras can fade. That is the draft’s visualization in a shorter form.

The three choices keep the draft’s titles: **Preserve the evidence**, **Continue asking questions**, **Inspire future explorers**. The draft gives each a different cinematic result (records catalogued, questions sent into the explorer’s archive, a reconstruction left for future researchers) and then the same assistant close. The build plays a different camera for each choice (in on the tubes, around the terminal, up over the plan) and then the same line every time. The choice screen says so: “All three endings keep the same record.” The assistant close matches the draft: evidence preserved, questions unanswered, exploration continues.

The proper ending diverges in the words and in who the camera belongs to.

- Draft: the player stands on a ridge over Jezero. Sunset, stars, a rise over the crater, then a narration that science sometimes returns a new question instead of an answer. The Moon, Voyager, and Mars form a constellation. The last sentence is “The universe does not run out of mysteries. We simply run out of questions to ask until we discover another.”
- Build: there is no on-foot character and no ridge. The camera lifts off the basin and frames a Moon, a small Voyager model, and Mars. The narration is new: Apollo left tools, Voyager carried a record, Mars keeps a cache of stone, and “The universe does not owe us an answer. It leaves us the work of asking, and the patience to keep the evidence.”

### “Still curious?”

The draft ends on an AI assistant that invites any further question about space.

The build shows three written answers (life was not proved, the five-part plan was not flown, why cache samples if instruments are already on Mars). If `/api/mars-archive` is available, the player may ask one follow-up, answered only from this mission’s archive text, and only once. It is not an open chatbot, and it will not leave the Jezero story.

## 5. Differences that matter most

If the script is the target, these are the breaks that change the game, not the wording:

1. **No shared opening.** The archive prologue, the launch, and the forced Apollo-first path are gone. Any mission can start from the title screen.
2. **Apollo’s laser is a fourth station the player fires**, with observatory numbers, instead of a beam the player triggers at the reflector.
3. **Voyager does not fly.** The heliopause crossing and the trip to holographic instrument panels were replaced by aiming the dish, then pressing Initiate.
4. **Mars is a fixed site list**, not open scanning plus a hidden archive. The rover’s operations hologram, the long terminal briefing, and the “was it meaningless?” fade of the ascent vehicle are not in the spoken script.
5. **Endings were flattened.** Legacy choices differ by camera, not by what the archive does. The ridge monologue and the draft’s last sentence were replaced. The chatbot is one archive-bound follow-up after three fixed answers.
6. **The player is coached and can leave.** Untimed objectives, skip-ahead in Voyager, and a menu between missions replace the draft’s short timed scenes and automatic handoffs.

Copy inside a beat (Neil on the descent stage, the five return stages, the power trade-off, the fiction disclaimer on Voyager’s last packet) is close to the script even where the staging around it changed.
