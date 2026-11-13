# NASA material used in the game

The three missions (`/play/...`) only. The website and the SpaceAI chat are not included.

The game uses NASA models, photos and textures, and facts and figures from NASA's published results. It
does not use live NASA data feeds or raw datasets.

## 1. Models, photos and textures

### Source confirmed

From [NASA 3D Resources](https://science.nasa.gov/3d-resources/mars-2020-perseverance-rover/).
Credit: NASA/Jet Propulsion Laboratory. Recorded in `public/models/nasa/SOURCES.txt`.

| File | What it is | Where |
| :--- | :--- | :--- |
| `public/models/nasa/perseverance-lite.glb` | NASA's Perseverance rover model, reduced for the game | Mission 03 |
| `public/models/nasa/mars-approach.glb` | NASA Mars globe | Mission 03 opening |
| `public/models/nasa/mars-lite.glb` | Smaller NASA Mars globe | Mission 03 final shot |

### Probably NASA, source not recorded

| File | What it is | Why it looks like NASA's |
| :--- | :--- | :--- |
| `public/models/voyager.glb` | Voyager 1 model | Likely NASA 3D Resources' Voyager |
| `public/models/descent_stage.glb` | Eagle descent stage | Textures include `Apollo11_plaque_face`; likely NASA 3D Resources' Lunar Module |
| `public/models/earth.glb` | Earth | Texture named `Earth_BlueMarble` (NASA's Blue Marble imagery) |
| `public/assets/images/apollo11-plaque.jpg` | Photo of the Apollo 11 plaque | Shown in the Mission 01 inspection |
| `public/assets/images/voyager-golden-record.jpg` | Golden Record cover photo | Alt text says "NASA photograph" |

### Not NASA

- The Moon ground (made in Blender).
- The laser retroreflector (our own model).
- The Sun and the regolith texture.
- The Mars crater, rocks and sample tubes (built in code).
- All narration (AI voices).
- The game uses no NASA audio.

## 2. Facts and figures from NASA's published results

### Mission 01: Apollo 11

- The objects left behind (descent stage, laser retroreflector, plaque): their descriptions, the plaque's
  wording and the landing details.

### Mission 02: Voyager 1

- **Distance from Earth:** 25,880,381,236 km on 9 November 2026, from NASA/JPL Horizons.
  - It reaches one light-day on 18 November 2026.
  - Its speed is about 17 km/s.
- **The four readings.** The game draws them as simple charts "from published NASA results". It does not
  take new readings.
  - **Plasma:** electron density about 0.002 inside the Sun's bubble and 0.08 outside (2013).
  - **Magnetic field:** a few tenths of a nanotesla beyond the boundary.
  - **Charged particles:** the August 2012 change.
  - **Power:** 470 W at launch, falling by about 4 W a year.
- **The spacecraft's parts:** what each part does.
- **The Golden Record:** its pages (sounds, greetings, images).
- **The archive quiz:** Jupiter, Saturn and the interstellar measurements, and what Voyager 2 and Huygens
  did instead.
- **Sky positions:** approximate directions of the Sun, Earth and Mars as seen from Voyager.

### Mission 03: Mars Sample Return

- **Jezero Crater geology:**
  - volcanic rock with olivine and pyroxene;
  - the river delta;
  - the mudstone;
  - the "leopard-spot" rock.
- **The sample tubes:** Perseverance's sealed sample tubes.
- **The return plan:** the NASA–ESA plan (sample lander, Mars Ascent Vehicle, orbiter), and that its funding
  was stopped in 2026.

## To do before the submission

1. **Record the sources** of the five "probably NASA" items. Find the original download pages and add them to
   `public/models/nasa/SOURCES.txt` with the NASA credit line.
2. **Reword the website's Policy page.** It says all images, data, audio and videos are "sourced directly from
   NASA". That is not accurate: the Moon ground, the retroreflector and the narration are ours.
