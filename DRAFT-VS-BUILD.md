# NoboTara-71: draft script vs the game as built

Compared **9 November 2026**. Mission 03 was rebuilt after that, and section 4 was rewritten on **12 November 2026**.

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

The scientific line at the reflector is also more specific than the draft (observatories in New Mexico, Texas, France, and Italy; the Moon drifting away at about 3.8 cm per year).

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

The archive items match: Jupiter’s ring and moons, Saturn’s rings and moons, interstellar measurements. The draft asks the player to choose those three. The build asks the player to pick the three true findings out of six. The three wrong choices are real discoveries by other spacecraft: Neptune's Great Dark Spot and the first close look at Uranus (Voyager 2), and the landing on Titan (Huygens).

The send is also heavier than the script. The draft shows a packet moving through stars and a long delay, then says in a note that this ending is fiction. The build turns the dish toward Earth, shows a light-time card (distance and one-way time from Voyager 1’s tracked position on 9 November 2026), and keeps the fiction disclaimer. The packet flight through the starfield is not a player-visible scene.

The exit still shrinks the craft, passes a Pale Blue Dot beat, and approaches Mars. It stops on **A neighbouring world** and offers Mission 03 or the menu. The draft’s descent, with Perseverance already visible and a fade to black, is the Mars opening that was not built.

## 4. Mars Sample Return

Mission 03 was rebuilt against the draft. Most of what the first build had cut is back. What follows is what still differs.

### Arrival and the rocks

Back from the draft: the assistant's welcome with the lake's age (more than 3.5 billion years), and scanning as something the player does. The player now holds a scan button while a ring sweeps the rock and the four facts fill in.

Still different:

- The draft descends onto Jezero with Perseverance in the distance. The build fades from the approach globe to the rover already on the crater floor.
- The draft's scanning is open exploration. The build marks three named rocks (volcanic floor rock, delta sandstone, lake-bed mudstone). The player chooses the order, not the rocks.
- The draft has a holographic record of Perseverance's earlier work. The build has none. Perseverance is a labelled model that cannot be inspected.
- The assistant has a name, Tara, which the draft does not give.

### The return plan

Back from the draft: the briefing before the puzzle (NASA and ESA, several machines, "every step depended on the one before it"), a reconstruction of all five stages, and the reveal that follows the puzzle instead of preceding it.

Still different:

- The draft shows the spacecraft "arranged in their intended sequence". The build plays them: the lander comes down, the rocket launches, the orbiter catches the samples, a capsule falls to Earth, each step captioned.
- The reveal follows the draft's beats (simulation stops, parts disappear, the ascent vehicle fades last, only the tubes remain, "was it wasted?"). The record line is more specific than the draft's: it says the plan's funding was stopped in 2026.

### The three investigations

Back from the draft: the player now finds them by exploring, in any order, and each has something to look at (the layered delta front and its boulders, a spotted outcrop, a laboratory hologram).

Still different:

- There is no "hidden archive". The three are marked on the map as clues.
- Investigation 2 is built around a real find the draft does not mention: the Cheyava Falls rock and its leopard spots.
- The draft's narration over this scene ("For billions of years, Mars has preserved clues…") is not used. Its place is taken by "Three clues are waiting in this crater."

### The question, the choice, and the end

Back from the draft: the narrator's "we still do not know whether we were ever alone" speech, Earth over the Martian horizon, the planned journey drawn and then erased, a different scene for each legacy choice, a sunset, the "three missions, three legacies" speech, the three objects as a constellation, and the final sentence on screen.

Still different:

- The legacy scenes are the build's own: tags over the tubes, three lights sent up from the terminal, the route to Earth drawn across the sky. The draft describes cataloguing, transmitting, and a displayed reconstruction.
- There is no player character standing on a ridge. The sunset is seen from the top of the delta, with the rover and Perseverance below.
- The sunset is blue around the sun, as it is on Mars. The draft does not say so.
- The spoken ending adds a line the draft does not have: "Someone will go and bring them home. Perhaps it will be you."

### "Still curious?"

The draft ends on an open AI chatbot. The build shows three answered questions and lets the player ask the mission archive three questions of their own. It still answers only from this mission's text. The draft's congratulation appears once all three missions have been finished on the same device.

## 5. Differences that matter most

If the script is the target, these are the breaks that change the game, not the wording:

1. **No shared opening.** The archive prologue, the launch, and the forced Apollo-first path are gone. Any mission can start from the title screen.
2. **Apollo’s laser is a fourth station the player fires**, with observatory numbers, instead of a beam the player triggers at the reflector.
3. **Voyager does not fly.** The heliopause crossing and the trip to holographic instrument panels were replaced by aiming the dish, then pressing Initiate.
4. **Mars is marked sites in a free order**, not open scanning plus a hidden archive. The rover’s operations hologram is the one Mars beat that was not built.
5. **The chatbot is not open.** It answers three questions from the Mars archive only. Apollo and Voyager still end on a card, not on the draft’s automatic handoff.
6. **The player is coached and can leave.** Untimed objectives, skip-ahead in Voyager, and a menu between missions replace the draft’s short timed scenes and automatic handoffs.

Copy inside a beat (Neil on the descent stage, the five return stages, the power trade-off, the fiction disclaimer on Voyager’s last packet) is close to the script even where the staging around it changed.
