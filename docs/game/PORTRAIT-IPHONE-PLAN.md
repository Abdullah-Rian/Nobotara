# Implementation plan: portrait play on iPhone

**Goal:** an iPhone held upright plays all three missions without turning sideways.

**Rule:** every other device and orientation stays exactly as it is today. That covers landscape iPhone,
Android phones (still asked to turn sideways), iPad (still asked to turn sideways in portrait) and desktop.

**Status:** planned, not started.

## Guardrails (how "everything else stays the same" is enforced)

1. **One switch.** `isIPhone()` (`iPhone`/`iPod` in the user agent; also true in the Home Screen app).
   Portrait play is on only when `isIPhone()` and the screen is upright.
2. **One class.** While portrait play is on, `.play-root` gets the class `play-portrait`.
   - Every layout change uses a new Tailwind variant, `portrait-play:`, that only applies inside that class:
     `@custom-variant portrait-play (&:where(.play-portrait, .play-portrait *));` in `src/index.css`.
   - No existing class is edited or removed; portrait styles are only added beside them.
3. **One flag into the 3D engines.** `setPortrait(on)` on each engine. When it's off, every code path runs
   exactly as today.
4. **Regression check before and after.** Record the position and size of the key HUD elements in every
   mission at 1280×800 and 812×375, on desktop and on an Android-like touch phone. After each step, the
   numbers must be identical. Screenshots are compared too.
5. **Own branch.** All work goes on `iphone-portrait` from `main`, one commit per step, and is merged only
   after real-iPhone testing.
6. **Testing switch.** `?debug&portrait` forces portrait play in a desktop browser for testing. It does nothing
   without `?debug`.

## Step 1: switch on portrait for iPhone (about 45 min)

| File | Change |
| :--- | :--- |
| `src/play/utils/displayMode.ts` | Add `isIPhone()`; `portraitPlay()` (iPhone and upright, or `?debug&portrait`); `mustTurnSideways()` = today's `isPortraitHandheld()` and not `isIPhone()`. |
| `src/play/PlayApp.tsx` | The two places that decide on the "turn sideways" hold (the orientation listener and `requestStart`) use `mustTurnSideways()` instead of `isPortraitHandheld()`. |
| `src/play/PlayRoute.tsx` | A small hook follows the orientation and sets or clears `play-portrait` on `.play-root`; it tells the engine through `PlayApp` (see step 2). |
| `src/index.css` | The `portrait-play:` variant (guardrail 2). |
| `src/play/components/DisplayControls.tsx` | No change. LANDSCAPE already hides where it can't lock (iPhone). Confirm on device. |

**Done when:** on a simulated upright iPhone, each mission starts without "turn sideways". Android and iPad
still show it. The regression check shows no changes.

## Step 2: 3D cameras (about 60 min)

**Side view.** Today the cameras fix the vertical view (55–56°), so an upright phone sees about 27° side to
side. In portrait, each engine sets the vertical view so the side-to-side view stays about 60°.
- `threeEngine.ts`, `voyagerEngine.ts`, `marsEngine.ts`: in `onResize`, if `portrait`, compute
  `fov` from the target horizontal angle; else today's value.
- Each engine also watches its own container with a `ResizeObserver`. Today they listen only to the window,
  and the letterbox (below) resizes the container.
- **Chase cameras:**
  - Moon: `chaseCameraPose` distance 6.8 m and height 2.9 m become about 8.5 m and 3.6 m in portrait.
  - Mars: the same change, through its `desired` camera position.
  - Landscape keeps today's numbers.

**Cinematics: letterbox.** During cutscenes in portrait, the canvas container shrinks to a 16:9 band in the
middle of the screen, with black above and below. The cutscene keeps its landscape framing, and on-screen
labels stay correct, because they are projected from the canvas's own size.
- `PlayApp.tsx` knows when a cutscene runs:
  - Mission 01: the intro, the outro and its warp.
  - Mission 02: the intro, the outro and the part tour pan.
  - Mission 03: the intro and the plan, question, preserve, questions, inspire and closing shots.

  In portrait it adds `portrait-play:` letterbox classes to the canvas container only then.
- **The plaque close-up** (Mission 01): `holdPlaqueCamera` puts the plaque in the right half for the photo on
  the left. In portrait it is centred instead, and the photo moves above (see step 3).

**Done when:** upright, the rover drives with the scenery to both sides visible; every cutscene plays in the
band with its labels on target; the regression check shows no changes.

## Step 3: side panels to bottom sheets (about 60 min)

In portrait, each of these becomes a sheet across the bottom: full width, at most about 50% of the height
(`max-h-[50dvh]`), scrolling inside, with its button pinned at the bottom.

| Component | Today |
| :--- | :--- |
| `MarsInspect.tsx` (rock and site readings) | right side, `min(22rem, 40vw)`, 156 px on an iPhone |
| `VoyagerReading.tsx` | right side, `min(22rem, 40vw)` |
| `VoyagerRecord.tsx` (Golden Record) | right side, `min(24rem, 42vw)`, button already pinned |
| `ArchivePuzzle.tsx` (final archive) | right side, `min(24rem, 42vw)` |
| `VoyagerSignalSent.tsx` | right side, `min(24rem, 42vw)` |
| `InspectionModal.tsx` (plaque photo and dialogue, bottom-left) | photo `min(22rem, 46vw)`, tilted |

- **The style for each:** `portrait-play:inset-x-0 portrait-play:bottom-0 portrait-play:top-auto
  portrait-play:w-full portrait-play:translate-y-0 portrait-play:rounded-b-none` and the height limit.
- **Leader lines** (from a rock or part to its panel) follow the panel, as they are computed from its position.
- **Plaque photo:** above the sheet, untilted, at most about 30% of the height.

**Done when:** every reading, record page, archive and signal panel is readable at 375 px wide with its
button visible.

## Step 4: portrait HUD (about 75 min)

The HUD files are `HUD.tsx` (Mission 01), `VoyagerHUD.tsx` (Mission 02) and `MarsHUD.tsx` (Mission 03).

| Part | Portrait layout |
| :--- | :--- |
| Top bar | "MISSION 01" without the long name; HOME, full screen and sound in one row |
| Goal lists (Voyager's 8, Mars's 3) | A compact "2/8 ▸" pill that opens the list on tap (new small component, used only in portrait) |
| Narration (`DialoguePanel`) | Moves to the top, under the bar, at full width (so thumbs keep the bottom) |
| Joystick (Missions 01, 03) | Bottom-left |
| Action button (SCAN ROCK, INSPECT…) | Bottom-right |
| Voyager's turning arrows and dish dial | Bottom-centre |
| Mini-map | Smaller, top-right under the narration |
| Screen height | The game root uses `portrait-play:h-dvh`, so Safari's toolbar never covers the controls (landscape keeps `h-screen`) |

**Done when:** at 375×667 and 430×932, nothing overlaps or is cut off while driving, steering or reading.

## Step 5: labels, hints, puzzles (about 40 min)

- **3D labels:**
  - `VoyagerParts.tsx`: label distance (`CHIP_GAP`) 104 becomes about 70 in portrait; top and bottom clearances follow the new HUD.
  - `ApolloParts.tsx`: smaller offsets in portrait.
  - `VoyagerSkyLabels.tsx`: same.
  - Each gets a `portrait` prop from `PlayApp`.
- **Tutorial hints** (`ObjectiveCoach.tsx`): they already avoid their targets and the narration panel. The
  check covers every hint in Mission 03 and the first ones in Missions 01 and 02. The narration panel moves to
  the top in portrait, so some hints will land in new places.
- **Matching boards** (`MatchBoard.tsx`): two columns stay. In portrait the column gap drops from `gap-x-14` to
  about `gap-x-6`, with slightly smaller text, so cards are about 160 px wide and the lines still show.
- **Already fine in portrait:** plan order, legacy choice, the end cards and the loading bar. These are only
  checked.

## Step 6: my checks (about 60 min)

- **Simulated upright iPhone** (`?debug&portrait`, touch emulation) at 375×667, 393×852 and 430×932: each mission
  from start to end with the debug shortcuts.
- **Turning mid-mission, both ways**, at four moments: driving, an inspection, a puzzle and a cutscene.
- **The regression check** (guardrail 4) at the end of every step, plus screenshots of landscape, Android,
  iPad and desktop.

## Then: your team on real iPhones

- **Safari and the Home Screen app.** Watch Safari's toolbar showing and hiding, and the Dynamic Island.
- **An older iPhone** (SE or 11), for speed.
- **Their notes come back to me** for one round of fixes, usually 30–60 minutes.
- **Merge `iphone-portrait` into `main`** once it passes.

## Time

| Part | My time |
| :--- | :--- |
| Steps 1–5 | about 4.5 hours |
| Step 6 (checks) | about 1 hour |
| Fixes after real-iPhone testing | 30–60 minutes |

Reframing a cutscene instead of letterboxing it, only for shots the team asks for, adds 15–30 minutes each.

## Risks

- **Real devices.** The emulator can't show Safari's moving toolbar, the Dynamic Island or real performance.
  The real-iPhone round is required.
- **Letterboxed cutscenes** look smaller on a tall screen. This is a deliberate trade-off; reframe later
  only what the team finds too small.
- **iPad** stays as today: portrait shows "turn sideways". That is by request, not a bug.
