# Plan: play in portrait on iPhone

Goal: an iPhone held upright can play all three missions without turning sideways. Every other device keeps
today's behaviour: Android phones are still asked to turn sideways, where the game can also lock landscape.

**Why iPhone only:** iPhone Safari can neither go full screen (see the Home Screen how-to) nor lock landscape,
so turning the phone and holding it sideways is the most fragile there. Android can lock landscape with one tap.

## Decisions to make first

1. **iPad in portrait?** iPads are also "touch devices" and get the same "turn sideways" screen today. At
   768 px and wider the current layout already fits portrait well (checked at 768×1664), so allowing iPad
   portrait costs almost nothing. Recommendation: allow it too. This plan assumes iPhone only unless decided otherwise.
2. **Cinematics in portrait:** reframe each shot for a tall screen (more work, best result), or show them
   letterboxed, i.e. the landscape framing with dark bars above and below (little work). Recommendation:
   letterbox first, reframe later only the shots that look wrong.

## How it is switched on

- `isIPhone()` in `src/play/utils/displayMode.ts`: `iPhone`/`iPod` in the user agent. This also covers the
  Home Screen app.
- When it is true, the game skips the "Turn your phone sideways" hold (`orientationHold`, `RotateOverlay`)
  and hides the LANDSCAPE button, which can't work on iPhone.
- `play-portrait` class on `.play-root` while the phone is upright, updated live when it turns
  (`onOrientationChange`). **Every portrait layout change is scoped to that class**, so landscape, Android,
  iPad and desktop are untouched.
- Turning the phone mid-mission just swaps layouts. Nothing restarts.

## Work, in order

### 1. Camera: keep the side view (all three missions)
- Today the 3D cameras fix the vertical view (55–56°). On an upright iPhone (about 0.46 wide to 1 tall) that
  leaves about 27° side to side, so the rover fills the screen and the lander and rocks beside it disappear.
- In portrait, set the vertical view so the horizontal view stays about 60°, in `threeEngine.ts`,
  `voyagerEngine.ts` and `marsEngine.ts` (on resize).
- Chase cameras (Moon and Mars rovers): pull back and lift a little in portrait so the ground ahead shows.
- Cinematics: letterbox (decision 2), using the landscape framing in a 16:9 band in the middle.
- The plaque close-up holds the plaque in the right half of the screen for the photo on the left: in portrait,
  centre it and put the photo above.

### 2. Side panels become bottom sheets
Six panels take a share of the screen width and become unreadable at 390 px (the Mars reading panel measured
156 px wide):

- Mars reading (`MarsInspect`)
- Voyager reading (`VoyagerReading`)
- Golden Record (`VoyagerRecord`)
- final archive (`ArchivePuzzle`)
- signal sent (`VoyagerSignalSent`)
- the plaque photo (`InspectionModal`)

In portrait each one is a sheet across the full width, at most about 50% of the height, scrolling inside, with
its button pinned at the bottom (as the Golden Record panel already does). The 3D target stays visible above.

### 3. Portrait HUD layout (all three missions)
- **Top bar:** mission name shortened ("MISSION 03"), then HOME, sound and full screen in one row.
- **Goal lists** (8 in Mission 02, 3 in Mission 03): fold into a compact "2/8 ▸" pill that opens on tap.
- **Narration panel:** moves to the top, under the bar, at full width. The bottom stays free for thumbs.
- **Thumb controls:** joystick bottom-left, action button (SCAN ROCK, INSPECT…) bottom-right. Voyager's
  turning arrows and dish dial go bottom-centre.
- **Mini-map:** smaller, under the narration on the right.
- **Heights** use `100dvh` instead of `100vh` (`h-screen`), so Safari's toolbar never covers the controls.
  Safe-area padding already covers the Dynamic Island and the home bar.

### 4. Labels, hints and puzzles
- **3D labels** (Voyager's parts, Sun/Earth, the Apollo part labels): shorter text in portrait. If they still
  crowd, show only the nearest three.
- **Tutorial hints:** they already place themselves clear of their targets and of the narration panel. Check
  each in portrait.
- **Matching boards:** keep two columns (about 160 px cards), with smaller text and a narrower gap in portrait.
  Plan order, legacy choice and the final cards already stack.

### 5. Test
- **Sizes:**
  - iPhone SE (375×667)
  - iPhone 15 (393×852)
  - iPhone 15 Pro Max (430×932)
- **Two ways in:** in Safari, and from the Home Screen.
- **Each mission, start to end, upright.** Then turn the phone mid-mission, both ways, at:
  - driving;
  - an inspection;
  - a puzzle;
  - an ending.
- **Other devices unchanged:** Android phones still get "turn sideways"; landscape iPhone, iPad and desktop
  look the same as before (compare screenshots).
- **On a real iPhone, not just the browser emulator:**
  - the Safari toolbar showing and hiding;
  - the Dynamic Island;
  - performance on an older iPhone (an SE or an 11).

## What done looks like
- An upright iPhone plays each mission start to finish with nothing cut off, covered or unreadable.
- Turning the phone mid-mission works both ways without restarting anything.
- Android still asks to turn sideways; landscape, iPad and desktop layouts are unchanged.

## Size
| Step | Effort |
| :--- | :--- |
| Switch-on and camera side view (1) | about 1 day |
| Bottom sheets (2) | about 1 day |
| Portrait HUD (3) | 1 to 1.5 days |
| Labels, hints, puzzles (4) | about half a day |
| Testing and fixes (5) | 1 day, plus time on real iPhones |
| **Total** | **about 4.5 to 5 days** with letterboxed cinematics; add 1 to 2 days to reframe them |

## Risks
- **Real-device testing:** the browser emulator can't reproduce Safari's moving toolbar, the Dynamic Island or
  real iPhone performance. Someone has to play it on an iPhone.
- **Older iPhones:** a tall screen has the same pixel count as a wide one, so speed should not change. Check
  on an older model anyway.
- **iPad:** if iPad stays landscape-only, iPad users rotating to portrait still see the hold. That is expected,
  not a bug.
