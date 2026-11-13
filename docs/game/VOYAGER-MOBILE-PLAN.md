# Plan: Mission 02 (Voyager 1) on phone screens

**Status:** implemented (all six steps). Checked at 844×390, 667×375 and 1280×800 in the browser; a real-phone
try is still to do.

Notes from the implementation:
- There is no line that invites the player to look around, so Inspect Voyager 1 gets its one highlight at the
  start of the second reading (the player already knows INITIATE by then, so that hint was dropped there).
- The craft was not rescaled; the camera moved closer instead (tour radius 18 → 11, readings 8.5), which leaves the
  marker anchors, the record position and the outro untouched.
- On short screens the picture also rises by 12% of the height while a panel is open, because the narration box
  takes the lower left.
**Scope:** landscape phones (screens up to 500 px tall: the `short:` variant). Desktop and tablet layouts stay as
they are, except for two changes requested for every screen: Voyager's part markers only on request (step 3),
and button hints replaced by a highlight in all three missions (step 4).

## What I found

Reproduced at 1000×450 (the reported phone) and 844×390 (iPhone 13/14/15 landscape), at the first reading
("Read the plasma waves").

### Blockers

1. **Continue can't be tapped on an iPhone.** At 844×390 the reading panel's Continue button (y 335–371) sits
   under the narration box (y 264–378). The narration box is on a higher layer (z-40 against the panel's z-30),
   and the last line stays on screen after it ends. Every tap on Continue lands on the narration text, so a
   phone player is stuck at the first reading; only the keyboard (E / Space) moves on.
2. **Panels cover HOME, full screen and sound.** The reading panel (`VoyagerReading`) and the Golden Record
   (`VoyagerRecord`) are centred vertically. On a 390 px screen they are about 385 px tall, so they start at
   y = 3 and sit over the top-right buttons.

### Clutter: 17 things on one small screen

During a reading at 844×390 the screen shows:

| Element | Needed now? |
| :--- | :--- |
| Mission card (title, SIGNAL/EARTH, PANNING, signal bar) | Partly: the signal readout only matters while aiming |
| Objectives (progress bar + current item) | Yes, but small |
| HOME, full screen, sound | Yes |
| 5 part chips + 5 leader lines (`VoyagerParts`) | No: the reading is about one instrument, already marked by the green blink |
| SUN, EARTH, MARS chips + leader lines (`VoyagerSkyLabels`) | No: they matter while aiming at Earth |
| Dish dial | No: aiming is finished; it now sits half under the reading panel |
| Reading panel | Yes |
| Narration box | Yes |

The leader lines are drawn on a full-screen layer, so they cross the narration box and the panel (the long
line from the left edge in the screenshot). Chip placement keeps them off the screen edges but not off the
panels, so "Magnetometer boom" ends up under the objective list and "Power generators" under the panel.

The reading panel's own text is 10–11 px on a phone, and its "Drawn from published NASA results…" note ends
up under the narration box.

### Voyager is hard to see

- **Too small.** `fitCraft(7)` scales the model so its *longest* side is 7 units. On Voyager that is the 13 m
  magnetometer boom, so the dish and body come out about 2 units across. The tour camera orbits at 18 units
  with a 55° view: the body fills about 10% of the screen height, roughly 40 px on a phone.
- **Too dark.** The only lights are the Sun's direction (`DirectionalLight` 2.4) and a dim blue ambient
  (0.55). The tour camera circles the craft, so half the time it looks at the unlit side: a dark grey shape on
  black space.
- **Covered.** Five chips, five lines and dots sit on and around it, and during readings the panel takes the
  right 40% of the screen while the craft stays in the middle.

## The plan

### Step 1: fix the blockers (about 1 hour)

- **Panels fit between the top bar and the bottom edge.** On `short:` screens, `VoyagerReading`,
  `VoyagerRecord`, `ArchivePuzzle` and `VoyagerSignalSent` use `top: safe-area + 52px`, `bottom: safe-area + 8px`.
  The content scrolls inside, and the button stays pinned at the bottom (as `VoyagerRecord` already does).
- **The narration box never goes under a panel.** While a right-side panel is open on a `short:` screen, the
  narration box is limited to the free left part: `max-width: calc(100vw - panel width - gutters)`.
- **Panels' buttons sit on top.** The panel moves above the narration layer while its button is showing, so
  nothing can cover Continue again.
- **Check:** at 844×390, 932×430, 667×375 (iPhone SE) and 1000×450, `elementFromPoint` at the centre of every
  panel button returns the button itself.

### Step 2: show only what the moment needs (about 1.5 hours)

| Moment | Shown | Hidden |
| :--- | :--- | :--- |
| Aiming at Earth | Card with SIGNAL/EARTH, aim pad, dish dial, EARTH and SUN chips | Part markers |
| Inspecting Voyager 1 (player's choice, step 3) | All 5 part markers | Dish dial, sky chips |
| A reading | The instrument's green blink; the panel title names it | Part markers, sky chips, dish dial |
| Golden Record, archive, signal sent | The panel | Part markers, sky chips, dish dial |

- **Compact mission card on phones:** "MISSION 02 · 2/8" plus the current objective in one box. The
  SIGNAL/EARTH line and signal bar only while aiming; no "PANNING".
- **Leader lines go under the panels**, never over them, and stop at the panel edge.
- **Reading panel on phones:** text at least 12 px; the chart a little shorter; the "Drawn from published NASA
  results" note moves into a small ⓘ line under the title.
- Desktop keeps everything it shows today, except that the sky chips also hide during readings there. It reads
  better on desktop too.

### Step 3: part markers only when the player asks (about 1 hour)

**Today:** after the dish is aimed, the five part markers (chips, leader lines, dots) switch on by themselves and
stay on for the rest of the mission, through every reading and the Golden Record. The **Inspect Voyager 1**
button only exists during the aiming step. In the engine, `setPartLabels()` switches the markers *and* the
circling tour camera together, so markers off also means the camera stops circling.

**Change, on every screen size:**
- The markers are off by default for the whole mission, including after aiming.
- **Inspect Voyager 1** is available whenever the player is free: from the end of the aiming step until the
  final transmission, but not while a reading, the Golden Record, the archive or a narration line is open.
- Pressing it turns the markers on, with the circling camera and drag-to-look as today. Tapping a marker still
  shows its description. The button becomes **Done inspecting**, which turns them off again. Opening the next
  objective (INITIATE…) also closes the inspection.
- **Engine:** split `setPartLabels()` into two switches, `setPartMarkers(on)` and `setTour(on)`, so the camera
  can keep its slow circle around the craft (for the visuals) with no markers on screen. Outside an inspection
  the camera circles without markers; the arrow keys keep turning the view.
- **Narration that talks about the parts** (the line after aiming invites the player to look around): it now
  ends with the Inspect button highlighted (step 4's highlight), not with the markers already open.
- On phones, Inspect Voyager 1 sits with the objective button at the bottom left, in the space the dish dial
  leaves once aiming is done.

### Step 4: replace button hints with a highlight, in all three missions (about 1 hour)

**Today:** the tutorial coach shows a caption and a bouncing hand pointing at a control. Hints that point at a
**button** are removed. Instead the button itself gets a looped highlight while it is the next thing to press.

| Mission | Hint (id) | Button | Becomes |
| :--- | :--- | :--- | :--- |
| 01 | `apollo-resume` "Continue when the line finishes." | Continue (inspection) | Highlight |
| 01 | `apollo-fire` "Fire the laser." | FIRE LASER | Highlight |
| 01 | `apollo-laser-continue` "Press Continue." | Continue (laser) | Highlight |
| 01 | `apollo-challenge` "Match each object…" | SOLVE CHALLENGE | Highlight |
| 02 | `voyager-initiate`, `voyager-initiate-again`, `voyager-record` | INITIATE OBJECTIVE | Highlight |
| 02 | `voyager-record-next` "Turn the page." | NEXT PAGE | Highlight |
| 02 | `voyager-send` "Send the telemetry." | Send | Highlight |
| 02 | (new) | Inspect Voyager 1 | Highlight once, after the line that invites it |
| 03 | `mars-near-*` "Press E, or tap SCAN ROCK." | The action button | Highlight |
| 03 | `mars-scan` "Hold this button…" | HOLD TO SCAN (its label already says hold) | Highlight |
| 03 | `mars-continue` "When you have read it, press Continue." | Continue | Highlight |
| 03 | `mars-leave` "Press Leave the Crater…" | LEAVE THE CRATER | Highlight |

**Kept as they are**, because they teach something that isn't a button press:
- the joystick (`apollo-lander`, `mars-drive`);
- the compass (`apollo-retro`, `apollo-laser-drive`, `apollo-plaque`);
- the map and sample log (`mars-map`, `mars-clues`, `mars-goal-*`);
- the matching board (`apollo-match`).

**`voyager-aim` stays as text (decided).** It points at the four arrow buttons, but its text explains the goal
("turn until the blue dot sits on the dish"), which a highlight can't. It keeps its caption, loses the pointing
hand, and the arrow buttons get the highlight while it shows.

**The highlight:**
- One shared class, `.attention`: a gentle scale pop (100% → 106% → 100%) with a soft glow ring in the button's
  own colour, looping about every 1.6 seconds.
- With "reduce motion" switched on in the device settings, only the glow pulses (no scaling).
- It shows under the same conditions as the old hint: only when that button is the next thing to do, and not
  while a narration line is playing. It stops when the button is pressed, and, as before, a hint that has been
  used once in a mission doesn't come back.
- **Code:** the hint rules in `tutorials/*.ts` stay (they decide *when*). Each button beat gets
  `style: 'highlight'`. `ObjectiveCoach` then draws no caption and no hand; it only sets `data-attention` on the
  target, which the CSS animates.

### Step 5: make Voyager visible (about 1.5 hours)

- **Size by the body, not the boom.** Fit the craft so the dish (3.7 m) is about 3.5 units across (the boom
  then runs off to one side, as in NASA's own pictures). In the tour, set the orbit distance from the screen
  shape so the dish fills about 30% of the screen height on any phone or desktop.
- **Light it from the camera side too.** A soft light that follows the camera (so the side we look at is never
  black) plus a faint rim light from behind (a thin bright edge against space). The Sun light stays for the real
  shadows. Keep it modest, because Voyager is far from the Sun.
- **Move it out from under the panel.** While a panel covers the right side, shift the picture (camera view
  offset) so the craft sits in the middle of the free left part.
- **Close-up for readings.** When a reading starts, the camera eases closer to the instrument being read (the
  engine already has `setFocus` for this), so the blinking part is large and obvious. It eases back after
  Continue.

### Step 6: checks (about 1 hour)

- Play the whole mission at 844×390, 932×430, 667×375 and 1000×450 with touch emulation, plus 1280×800 desktop
  and 1024×768 tablet.
- At each panel, record the boxes of every visible element and confirm none overlap and every button is tappable.
- Screenshots before and after for each moment in the table.
- Desktop: same layout as today apart from the markers-on-request and the hidden sky chips during readings.
- Every highlighted button in all three missions: it pulses at the right moment, stops after the press, and the
  hints that were kept still appear.
- Then a quick try on a real phone.

## Time

About 6.5–7 hours, plus fixes after the real-phone try.

| Step | Time |
| :--- | :--- |
| 1. Blockers | 1 h |
| 2. Show only what each moment needs | 1.5 h |
| 3. Part markers only on request | 1 h |
| 4. Button highlight instead of hints (all missions) | 1 h |
| 5. Voyager visible | 1.5 h |
| 6. Checks | 1 h |

## Risks

- **Moving the camera for readings** changes how the mission looks on desktop too. If you prefer, only the
  size and lighting changes apply on desktop, and the close-up only on phones.
- **Bigger craft** may push the part chips to the screen edges in the part tour on very small phones. The chip
  layout already clamps to the edges; this is checked in step 6.
- **Fewer words on screen.** A highlight shows *what* to press but not *why*. Where a removed hint carried a
  reason, the button's own label or the narration already says it; step 6 checks each one.
