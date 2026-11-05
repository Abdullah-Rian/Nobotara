# NoboTara-71: Game Design Document & AI Context
## Mission 01 — APOLLO 11: The mission that succeeded. The things it left behind.

### 1. Level Overview
*   **Setting:** The surface of the Moon (Sea of Tranquility).
*   **Player Character:** A small, remote-controlled lunar explorer rover.
*   **Core Objective:** Explore the landing site, inspect three specific artifacts left behind, and understand *why* they were left there.
*   **Target Emotion:** Awe, reverence, and scientific curiosity.

### 2. Required Assets (For Engine/AI Reference)
*   **3D Models:** Lunar surface terrain, Eagle Descent Stage, Laser Retroreflector, Commemorative Plaque (attached to descent stage leg), small player rover.
*   **Audio:** Ambient space silence, low hum of rover, simulated Apollo-era radio static.
*   **Voiceovers:** 
    *   `Narrator-01`: A gritty, inspiring voice simulating Neil Armstrong.
    *   `Scientific Voice`: A clear, modern, educational narrator.
*   **UI Elements:** "Interact" button, "Activate Laser" button, "Read Plaque" button, Data Tooltips, Matching Puzzle UI.

---

### 3. Scene-by-Scene Logic & Mechanics

#### Phase 1: The Arrival (Cinematic Intro - 15 seconds)
*   **Visuals:** Camera pans across the grey lunar surface. The Eagle descent stage is visible. Earth hangs in the dark sky in the distance.
*   **Audio/UI:** Sound of a rocket engine fades into silence. Title Card appears: *MISSION 01 — APOLLO 11 / The mission that succeeded. The things it left behind.*
*   **Dialogue (Narrator-01):** "Hey, Neil Armstrong here. On July 16, 1969, we rode a Saturn V built from math, sweat, and nerve. 384,000 km to test physics where mistakes could kill. We didn’t just chase a rock in the sky; we went to learn what people can do when they dare."
*   **Transition:** Camera snaps to behind the player's lunar rover. UI appears. Player gains movement control.

#### Phase 2: Exploration Phase (Gameplay - 45 seconds)
*   **Mechanic:** WASD/Joystick movement. When the rover enters a "trigger zone" near an object, an interaction prompt appears.

**Object A: Eagle’s Descent Stage**
*   **Trigger:** Player approaches the golden foil base of the lunar module. Presses [INTERACT].
*   **Narrator-01:** "This is the Eagle’s descent stage. It helped the Lunar Module land on the Moon. The ascent stage carried me and Aldrin back into lunar orbit, while the descent stage remained behind."
*   **UI Tooltip:** 
    *   *PURPOSE:* LUNAR LANDING 
    *   *STATUS:* LEFT ON THE MOON
*   **Scientific Voice:** "The Lunar Module had two parts. The descent stage contained the landing engine and landing gear. The astronauts used the ascent stage to return from the Moon; the descent stage remained."

**Object B: Laser Retroreflector**
*   **Trigger:** Player approaches the small angled mirror array. Presses [ACTIVATE LASER].
*   **Animation:** A bright green laser beam shoots from the sky (Earth), hits the reflector, and bounces back.
*   **Narrator-01:** "Not everything left behind became inactive. Apollo 11 astronauts placed this laser retroreflector. Scientists on Earth can send laser pulses toward it and measure the returning light to study the distance between Earth and the Moon."
*   **UI Tooltip:** 
    *   *PURPOSE:* SCIENTIFIC MEASUREMENT 
    *   *LEGACY:* EARTH–MOON DISTANCE RESEARCH

**Object C: Commemorative Plaque**
*   **Trigger:** Player approaches the ladder leg of the descent stage. Presses [READ PLAQUE].
*   **Visual:** Camera zooms in tightly on the plaque.
*   **Narrator-01:** "This plaque commemorates humanity’s first crewed lunar landing. It carries a message of peace from Earth. A message left behind for history to remember."
*   **UI Text Overlay:** "HERE MEN FROM THE PLANET EARTH FIRST SET FOOT UPON THE MOON JULY 1969 A.D. WE CAME IN PEACE FOR ALL MANKIND." (Play original audio clip: "That's one small step...")

#### Phase 3: The Challenge (Logic Puzzle - 30-45 seconds)
*   **Trigger:** Activates once all three objects have been inspected.
*   **UI Prompt:** "Why did these objects remain on the Moon?"
*   **Mechanic:** Drag-and-drop or select-and-match puzzle.
*   **Correct Matches:**
    1.  *Descent Stage* -> Required for landing, not designed to return.
    2.  *Laser Retroreflector* -> Designed to conduct continuous scientific measurements.
    3.  *Commemorative Plaque* -> Left as a historical marker for future generations.
*   **Success State:** On-screen text reads "Mission Complete." Short rewarding sound effect.

#### Phase 4: Emotional Outro (Cinematic - 20 seconds)
*   **Visuals:** Player loses control. Camera slowly pulls up and away from the landing site. The astronauts' footprints and the descent stage shrink into the grey surface. Earth comes into view. 
*   **Transition:** The camera accelerates, blurring the stars into lines (warp effect), transitioning seamlessly to deep space, slowing down to reveal Voyager 1 for Mission 02.

---
### AI Instructions (How to use this file)
If I ask you to "Build Phase 2", use this document to write the specific Three.js/JavaScript code for the rover movement, collision triggers, and the HTML/CSS for the UI tooltips based on the text provided above.