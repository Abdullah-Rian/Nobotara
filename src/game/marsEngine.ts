import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildApolloSceneModels } from './apolloModels';
import { isSoftwareGl } from './threeEngine';
import {
  MARS_RANGE,
  MarsSiteId,
  PERSEVERANCE_SITE,
  PLAN_SITE,
  ROVER_START,
  SITES
} from '../missions/mars/data';

export type MarsShot =
  | 'intro'
  | 'drive'
  | 'focus'
  | 'plan'
  | 'reveal'
  | 'question'
  | 'preserve'
  | 'questions'
  | 'inspire'
  | 'closing';

/** When each of the five return steps begins inside the `plan` shot, as a share of the shot. */
export const PLAN_STAGE_STARTS = [0, 0.18, 0.47, 0.62, 0.88];

export interface MarsTelemetry {
  speed: number;
  heading: number;
  distanceToTarget: number;
  position: { x: number; z: number };
  cache: { x: number; z: number };
  rangeRadius: number;
}

const DRIVE_SPEED = 7.4;
/** Jezero, 18.45°N 77.45°E, on the NASA globe after the glTF axis conversion. */
const JEZERO_DIR = new THREE.Vector3(0.206, 0.317, -0.926).normalize();
/**
 * Viewpoint for the opening shot. The camera sits south-west of Jezero so the
 * crater rests up and to the right of center, on the shoulder of the dark
 * region, matching the approach photograph. The globe itself does not spin.
 */
const APPROACH_DIR = new THREE.Vector3(0.515, 0.0175, -0.857).normalize();
const MARS_GLOBE_RADIUS = 500;
const APPROACH_START = 1680;
const APPROACH_END = 860;
/** Red fade, the opaque hold, and the fade back to the crater. */
const APPROACH_FADE = 0.7;
const APPROACH_TAIL = 1;
const APPROACH_HOLD = 1;
const APPROACH_REVEAL = 0.8;
/** Length of the rendered approach line, used when playback does not report one. */
const APPROACH_SPEECH = 39.84;
/** Half-width of the explorer, added to each object's footprint. */
const ROVER_BODY = 0.95;
/** Opening-shot turn, marked on the globe. YXZ euler in radians. */
const GLOBE_EULER = new THREE.Euler(0.08234375, -3.500546875, 0, 'YXZ');

const smooth = THREE.MathUtils.smoothstep;
/** Where the sun sets, as seen from the delta top looking across the crater. */
const SUNSET_DIR = new THREE.Vector3(0.95, 0.05, -0.3).normalize();
/** Earth, low over the horizon beyond the tubes. */
const EARTH_SPOT = new THREE.Vector3(-70, 20, -150);
/** Where the last shot's Moon, Voyager and Mars hang, far above the crater. */
const TRIO_SPOT = new THREE.Vector3(0, 620, 0);
const DELTA_HEIGHT = 6.5;
const DELTA_STEPS = 4;
const DELTA_RAMP = 8;

/** Where the old river left the delta and ran down to the lake. */
function channelZ(x: number) {
  return -14 + 10 * smooth(x, -31, -9) + 1.2 * Math.sin(x * 0.45);
}

/** 0 on open ground, up to 1 in the middle of the dry river channel. */
export function channelDepth(x: number, z: number): number {
  if (x > -8 || x < -52) return 0;
  const across = (z - channelZ(x)) / 2.1;
  return Math.exp(-across * across) * smooth(x, -8, -13);
}

/**
 * 0 on the crater floor, rising to 1 on top of the delta. The delta front is
 * the west wall of the play area. The river channel cuts a notch through it.
 */
export function deltaRise(x: number, z: number): number {
  const edge = -31 - 2.5 * Math.sin(z * 0.13 + 0.6) - 1.5 * Math.sin(z * 0.31);
  const inside = edge - x;
  if (inside <= 0) return 0;
  const notch = (z - channelZ(Math.min(x, -31))) / 3.4;
  const cut = 1 - 0.9 * Math.exp(-notch * notch);
  const ends = 1 - smooth(Math.abs(z), 40, 56);
  return THREE.MathUtils.clamp(inside / DELTA_RAMP, 0, 1) * cut * ends;
}

/** The delta front as flat treads and steep risers, so its layers read as layers. */
function deltaHeight(rise: number) {
  const scaled = rise * DELTA_STEPS;
  const tread = Math.min(Math.floor(scaled), DELTA_STEPS);
  const riser = smooth(scaled - tread, 0.5, 1);
  return (DELTA_HEIGHT * (tread + riser)) / DELTA_STEPS;
}

export function marsHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const near = Math.min(r, 75);
  const bowl = (near * near) / 1400;
  const dune =
    Math.sin(x * 0.33 + 1.7) * Math.cos(z * 0.29) * 0.18 +
    Math.sin(x * 0.12 - z * 0.08) * 0.12;
  const hills = smooth(r, 60, 150) * (Math.sin(x * 0.05 + 0.4) * Math.cos(z * 0.045) * 2.4 + 1.2);
  return bowl + dune + hills + deltaHeight(deltaRise(x, z)) - channelDepth(x, z) * 0.55;
}

/**
 * Jezero basin for Mission 03. The driven vehicle is the series rover.
 * Perseverance, the tubes, and the return hardware are props.
 */
export class MarsEngine {
  private readonly container: HTMLDivElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly rover: THREE.Group;
  private readonly wheels: THREE.Mesh[];
  private readonly beacons: { group: THREE.Group; diamond: THREE.Mesh; beam: THREE.MeshBasicMaterial }[] = [];
  private readonly scanRing: THREE.Mesh;
  private scan: number | null = null;
  private readonly holoRing: THREE.Object3D;
  private readonly holoMat: THREE.MeshBasicMaterial;
  private readonly planGroup: THREE.Group;
  private readonly planMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly holoLander = new THREE.Group();
  private readonly holoMav = new THREE.Group();
  private readonly holoOrbiter = new THREE.Group();
  private readonly holoEarth = new THREE.Group();
  private readonly holoCapsule = new THREE.Group();
  private readonly holoContainer = new THREE.Group();
  private readonly earth = new THREE.Group();
  private readonly routeLine: THREE.Line;
  private readonly routeCount = 160;
  private readonly tags: THREE.Mesh[] = [];
  private readonly tubeSpots: THREE.Vector3[] = [];
  private readonly orbs: THREE.Mesh[] = [];
  private readonly signalBeam: THREE.Mesh;
  private readonly trioLines: THREE.Line;
  private readonly trioBodies: { name: string; object: THREE.Object3D; top: number }[] = [];
  private readonly ambient = new THREE.AmbientLight(0x5c3c32, 0.5);
  private readonly hemi = new THREE.HemisphereLight(0xffd0ad, 0x4a2c24, 0.9);
  private dayDome: THREE.MeshBasicMaterial | null = null;
  private duskDome: THREE.MeshBasicMaterial | null = null;
  private skyStars: THREE.PointsMaterial | null = null;
  private readonly dayOnly: THREE.MeshBasicMaterial[] = [];
  private readonly duskOnly: THREE.MeshBasicMaterial[] = [];
  private dusk = 0;
  private planShown = false;
  private night = 0;
  private readonly fogDay = new THREE.Color(0xc39672);
  private readonly fogDusk = new THREE.Color(0x4b3b3d);
  private readonly fogNight = new THREE.Color(0x090707);
  private readonly sunDay = new THREE.Color(0xffe2c4);
  private readonly sunDusk = new THREE.Color(0xb9cdf5);
  private readonly labelPoint = new THREE.Vector3();
  /** Screen positions of the Moon, Voyager and Mars in the last shot. */
  public readonly trioLabels: { name: string; x: number; y: number; visible: boolean }[] = [
    { name: 'The Moon · Apollo 11', x: 0, y: 0, visible: false },
    { name: 'Voyager 1', x: 0, y: 0, visible: false },
    { name: 'Mars · Sample Return', x: 0, y: 0, visible: false }
  ];
  private readonly trio: THREE.Group;
  private readonly basin = new THREE.Group();
  private readonly approachLight: THREE.DirectionalLight;
  private readonly sun: THREE.DirectionalLight;
  private globe: THREE.Object3D | null = null;
  private globeReady = false;
  private handedOff = false;
  private introClock = 0;
  private veil = 0;
  private approachStarted = false;
  private speechEnded = false;
  private fadeAt = Number.POSITIVE_INFINITY;
  private approachU = 0;
  private approachOrigin = 0;
  private paceU = 0;
  private paceClock = 0;
  private approachReadyWait: (() => void) | null = null;
  private approachStars: THREE.Points | null = null;
  public introSkipped = false;
  private readonly jezeroPoint = new THREE.Vector3();
  private readonly focusPoint = new THREE.Vector3();
  private readonly ndc = new THREE.Vector3();
  private readonly viewDir = new THREE.Vector3();
  private readonly spaceColor = new THREE.Color(0x07060a);
  private readonly dustColor = new THREE.Color(0xc39672);
  private readonly skyColor = new THREE.Color(0x07060a);
  public readonly jezeroScreen = { x: 0, y: 0, visible: false };
  public readonly focusScreen = { x: 0, y: 0, visible: false };
  public readonly perseveranceLabel = { x: 0, y: 0, visible: false };
  private perseverance: THREE.Group | null = null;
  private readonly perseveranceTop = new THREE.Vector3(0, 1.9, 0);
  private readonly perseverancePoint = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly smoothedLook = new THREE.Vector3();
  private readonly shotAnchor = new THREE.Vector3();
  private lastFrame = performance.now();
  private elapsed = 0;
  private readonly fog: THREE.FogExp2;
  private frameId = 0;
  private disposed = false;
  private x = ROVER_START.x;
  private z = ROVER_START.z;
  private heading = Math.atan2(SITES.igneous.x - ROVER_START.x, SITES.igneous.z - ROVER_START.z);
  private velocity = 0;
  private forwardInput = 0;
  private turnInput = 0;
  private shot: MarsShot = 'intro';
  private introT = 0;
  private introSent = false;
  private shotT = 0;
  private live: MarsSiteId[] = [];
  private focus: MarsSiteId | null = null;
  private near: MarsSiteId | null = null;
  private holoFrozen = false;
  private wheelSpin = 0;
  /** Solid footprints of the things the rover can inspect. Radius is the object, not the rover. */
  private readonly colliders: { x: number; z: number; radius: number }[] = [];
  private perseveranceCollider: { x: number; z: number; radius: number } | null = null;
  private readonly labMaterials: THREE.MeshBasicMaterial[] = [];
  private labRing: THREE.Object3D | null = null;

  public onTelemetry?: (telemetry: MarsTelemetry) => void;
  public onNear?: (site: MarsSiteId | null) => void;
  public onIntroDone?: () => void;

  public get veilOpacity() {
    return this.veil;
  }

  private readonly onResize = () => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    if (!isSoftwareGl) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.fog = new THREE.FogExp2(this.dustColor, 0);
    this.scene.background = this.skyColor;
    this.scene.fog = this.fog;
    this.camera = new THREE.PerspectiveCamera(
      56,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.08,
      6000
    );
    this.camera.position.copy(APPROACH_DIR).multiplyScalar(APPROACH_START);
    this.smoothedLook.set(0, 0, 0);

    this.scene.add(this.ambient);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffe2c4, 2.8);
    this.sun.position.set(32, 36, 18);
    if (!isSoftwareGl) {
      this.sun.shadow.mapSize.set(2048, 2048);
      this.sun.shadow.camera.near = 8;
      this.sun.shadow.camera.far = 96;
      const span = 26;
      this.sun.shadow.camera.left = -span;
      this.sun.shadow.camera.right = span;
      this.sun.shadow.camera.top = span;
      this.sun.shadow.camera.bottom = -span;
      this.sun.shadow.bias = -0.0002;
      this.sun.shadow.normalBias = 0.03;
      this.sun.shadow.radius = 2;
      this.sun.shadow.intensity = 0.4;
    }
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.approachLight = new THREE.DirectionalLight(0xffd7b0, 2.6);
    this.approachLight.position.copy(APPROACH_DIR);
    this.scene.add(this.approachLight);
    this.addApproachStars();

    this.basin.name = 'JezeroBasin';
    this.basin.visible = false;
    this.scene.add(this.basin);
    this.addSky();
    this.addTerrain();
    this.addRangeRing();
    this.addRocks();
    this.addClueSites();
    this.addCache();
    this.addTerminal();
    this.planGroup = this.addPlanHardware();
    this.routeLine = this.addRoute();
    this.signalBeam = this.addLegacyProps();
    this.trio = this.addTrio();
    this.trioLines = this.trio.getObjectByName('TrioLines') as THREE.Line;
    this.resetCinema();
    const built = buildApolloSceneModels(this.renderer);
    this.rover = built.roverGroup;
    this.wheels = built.roverWheels;
    this.rover.name = 'Explorer';
    this.markShadows(this.rover);
    this.basin.add(this.rover);
    for (let i = 0; i < 3; i++) this.beacons.push(this.addBeacon());
    this.scanRing = this.addScanRing();
    this.holoRing = this.scene.getObjectByName('TerminalRing')!;
    this.holoMat = (this.scene.getObjectByName('TerminalPane') as THREE.Mesh).material as THREE.MeshBasicMaterial;

    this.poseRover();
    this.loadApproachMars();
    window.addEventListener('resize', this.onResize);
    this.frameId = requestAnimationFrame(this.tick);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    // Free everything the scene put on the graphics card, so replays do not pile up.
    const seen = new Set<THREE.Material>();
    this.scene.traverse(node => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!material) return;
      for (const item of Array.isArray(material) ? material : [material]) {
        if (seen.has(item)) continue;
        seen.add(item);
        for (const value of Object.values(item)) {
          if (value instanceof THREE.Texture) value.dispose();
        }
        item.dispose();
      }
    });
    this.sun.shadow.map?.dispose();
    this.scene.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  public setInputs(forward: number, turn: number) {
    this.forwardInput = forward;
    this.turnInput = turn;
  }

  public beginIntro(leadSeconds = 0) {
    this.shot = 'intro';
    this.introT = 0;
    this.introClock = 0;
    this.introSent = false;
    this.introSkipped = false;
    this.handedOff = false;
    this.approachStarted = true;
    this.speechEnded = false;
    this.approachOrigin = performance.now();
    this.approachU = 0;
    this.paceU = 0;
    this.paceClock = 0;
    const lead = Number.isFinite(leadSeconds) && leadSeconds > 0 ? leadSeconds : 0;
    this.fadeAt = lead + APPROACH_SPEECH + APPROACH_TAIL;
    this.veil = 0;
    if (this.approachStars) this.approachStars.visible = true;
    this.basin.visible = false;
    if (this.globe) this.globe.visible = true;
    this.skyColor.copy(this.spaceColor);
    this.fog.density = 0;
    this.camera.far = 6000;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(APPROACH_DIR).multiplyScalar(APPROACH_START);
    this.smoothedLook.set(0, 0, 0);
    this.camera.lookAt(this.smoothedLook);
  }

  public whenApproachReady(fn: () => void) {
    if (this.disposed || this.introSkipped) return;
    if (this.globeReady) fn();
    else this.approachReadyWait = fn;
  }

  /** The line’s real length keeps the fade one second after the last word. */
  public beginApproach(speechSeconds: number) {
    if (this.shot !== 'intro' || this.introSent || this.introSkipped) return;
    const speech = Number.isFinite(speechSeconds) && speechSeconds > 0.35 ? speechSeconds : APPROACH_SPEECH;
    const fadeAt = this.introClock + speech + APPROACH_TAIL;
    if (!this.approachStarted) {
      this.approachStarted = true;
      this.approachOrigin = performance.now();
      this.fadeAt = fadeAt;
      return;
    }
    if (fadeAt <= this.fadeAt + 0.35) return;
    this.paceU = this.approachU;
    this.paceClock = this.introClock;
    this.fadeAt = fadeAt;
  }

  /** The fade waits until the line has finished, then one quiet second. A late ending delays that fade. */
  public noteApproachSpeechEnded() {
    if (this.shot !== 'intro' || this.introSent || this.introSkipped) return;
    this.speechEnded = true;
    if (!this.approachStarted) return;
    const earliest = this.introClock + APPROACH_TAIL;
    if (earliest <= this.fadeAt + 0.45) return;
    this.paceU = this.approachU;
    this.paceClock = this.introClock;
    this.fadeAt = earliest;
  }

  public skipIntro() {
    this.approachReadyWait = null;
    this.introSkipped = true;
    this.revealBasin();
    this.veil = 0;
    if (!this.introSent) {
      this.introSent = true;
      this.onIntroDone?.();
    }
    this.shot = 'drive';
  }

  /** Every open site gets a marker. In an act there are up to three at once. */
  public setLive(ids: MarsSiteId[]) {
    this.live = ids.slice(0, this.beacons.length);
    this.near = null;
    this.onNear?.(null);
    this.live.forEach((id, index) => {
      const site = SITES[id];
      this.beacons[index].group.position.set(site.x, marsHeight(site.x, site.z), site.z);
    });
  }

  /** 0 to 1 while the player sweeps the scanner over the focused site. Null hides it. */
  public setScan(progress: number | null) {
    this.scan = progress;
  }

  public setFocus(id: MarsSiteId | null) {
    this.focus = id;
    if (id) {
      this.shot = 'focus';
      this.shotT = 0;
    } else if (this.shot === 'focus') {
      this.shot = 'drive';
    }
  }

  /** The return hardware appears only once the player opens the terminal. */
  public showPlan() {
    this.planShown = true;
    this.setPlanOpacity(0.45);
  }

  public setHologramFrozen(frozen: boolean) {
    this.holoFrozen = frozen;
    this.holoMat.opacity = frozen ? 0.55 : 0.32;
  }

  public setCinematic(shot: MarsShot, progress: number) {
    if (shot !== this.shot) {
      this.shot = shot;
      this.rover.getWorldPosition(this.shotAnchor);
      // The plan hologram belongs to the terminal scenes only.
      if (shot !== 'plan' && shot !== 'reveal' && shot !== 'drive' && shot !== 'focus') this.planShown = false;
      this.resetCinema();
    }
    this.shotT = THREE.MathUtils.clamp(progress, 0, 1);
    // Once the reveal has played, the plan is gone for good.
    if (shot === 'reveal' && this.shotT >= 1) this.planShown = false;
  }

  public hidePlan() {
    this.planShown = false;
    this.setPlanOpacity(0);
  }

  private setPlanOpacity(opacity: number) {
    this.planGroup.visible = opacity > 0.03;
    this.fade(this.holoLander, opacity);
    this.fade(this.holoMav, opacity);
  }

  /** Set every see-through material under an object to one opacity. Hidden at zero. */
  private fade(object: THREE.Object3D, opacity: number) {
    object.visible = opacity > 0.02;
    object.traverse(node => {
      const mesh = node as THREE.Mesh;
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!material) return;
      for (const item of Array.isArray(material) ? material : [material]) {
        item.transparent = true;
        item.opacity = opacity * ((item.userData.share as number | undefined) ?? 1);
      }
    });
  }

  /** Put the sky, the lights and every cinematic prop back the way a normal drive needs them. */
  private resetCinema() {
    this.setMood(0, 0);
    const shown = this.planShown;
    this.holoLander.position.set(0, 0, 0);
    this.holoMav.position.set(0, 0, 0);
    this.holoMav.rotation.set(0, 0, 0);
    for (const group of [this.holoOrbiter, this.holoEarth, this.holoCapsule, this.holoContainer, this.earth]) {
      this.fade(group, 0);
    }
    this.setPlanOpacity(shown ? 0.45 : 0);
    this.routeLine.visible = false;
    for (const tag of this.tags) tag.visible = false;
    for (const orb of this.orbs) orb.visible = false;
    this.signalBeam.visible = false;
    this.trio.visible = false;
    for (const label of this.trioLabels) label.visible = false;
  }

  /**
   * dusk: 0 is midday, 1 is a Martian sunset, blue around the low sun.
   * night: 0 keeps the sky, 1 is open space with stars.
   */
  private setMood(dusk: number, night: number) {
    this.dusk = dusk;
    this.night = night;
    const dark = Math.max(dusk, night);
    if (this.dayDome) this.dayDome.opacity = 1 - dark;
    if (this.duskDome) this.duskDome.opacity = dusk * (1 - night);
    if (this.skyStars) this.skyStars.opacity = Math.max(night, dusk * 0.55);
    for (const material of this.dayOnly) material.opacity = (material.userData.full as number) * (1 - dark);
    for (const material of this.duskOnly) material.opacity = (material.userData.full as number) * dusk * (1 - night);
    this.fog.color.copy(this.fogDay).lerp(this.fogDusk, dusk).lerp(this.fogNight, night);
    this.skyColor.copy(this.fogNight);
    if (dark < 0.001) this.skyColor.copy(this.fogDay);
    this.sun.color.copy(this.sunDay).lerp(this.sunDusk, dusk);
    this.sun.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(2.8, 1.5, dusk), 0.9, night);
    this.hemi.intensity = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.9, 0.5, dusk), 0.28, night);
    this.ambient.intensity = THREE.MathUtils.lerp(0.5, 0.28, dark);
  }

  /** Daytime sky: pale butterscotch at the horizon, darker overhead, a small far sun, and the crater rim in haze. */
  private addSky() {
    const radius = 1500;
    const geo = new THREE.SphereGeometry(radius, 32, 20);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const horizon = this.dustColor;
    const zenith = new THREE.Color(0x8f6349);
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(pos.getY(i) / radius, 0, 1);
      color.copy(horizon).lerp(zenith, Math.pow(t, 0.55));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.dayDome = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      transparent: true
    });
    const dome = new THREE.Mesh(geo, this.dayDome);
    dome.name = 'Sky';
    dome.renderOrder = -3;
    this.basin.add(dome);

    // Sunset on Mars is blue near the sun and brown everywhere else, the reverse of Earth.
    const sunsetDir = SUNSET_DIR;
    const duskGeo = new THREE.SphereGeometry(radius - 20, 48, 28);
    const duskPos = duskGeo.attributes.position;
    const duskColors = new Float32Array(duskPos.count * 3);
    const duskLow = new THREE.Color(0x5a4640);
    const duskHigh = new THREE.Color(0x120e10);
    const halo = new THREE.Color(0x8fb4e6);
    const point = new THREE.Vector3();
    for (let i = 0; i < duskPos.count; i++) {
      point.fromBufferAttribute(duskPos, i).normalize();
      const up = THREE.MathUtils.clamp(point.y, 0, 1);
      color.copy(duskLow).lerp(duskHigh, Math.pow(up, 0.5));
      const toward = Math.max(point.dot(sunsetDir), 0);
      color.lerp(halo, Math.pow(toward, 9) * 0.95);
      color.lerp(new THREE.Color(0xdfeaff), Math.pow(toward, 90) * 0.8);
      duskColors[i * 3] = color.r;
      duskColors[i * 3 + 1] = color.g;
      duskColors[i * 3 + 2] = color.b;
    }
    duskGeo.setAttribute('color', new THREE.BufferAttribute(duskColors, 3));
    this.duskDome = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      transparent: true,
      opacity: 0
    });
    const duskMesh = new THREE.Mesh(duskGeo, this.duskDome);
    duskMesh.renderOrder = -2.5;
    this.basin.add(duskMesh);

    const lowSun = new THREE.MeshBasicMaterial({ color: 0xf4f8ff, fog: false, depthWrite: false, transparent: true, opacity: 0 });
    lowSun.userData.full = 1;
    this.duskOnly.push(lowSun);
    const lowDisc = new THREE.Mesh(new THREE.CircleGeometry(7, 32), lowSun);
    lowDisc.position.copy(sunsetDir).multiplyScalar(1280);
    lowDisc.lookAt(0, 0, 0);
    lowDisc.renderOrder = -1;
    this.basin.add(lowDisc);

    // Stars for dusk and for open space. They sit inside the domes so the far plane never cuts them.
    const starCount = 1400;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1150 + Math.random() * 200;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.skyStars = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 2.6,
      sizeAttenuation: false,
      fog: false,
      depthWrite: false,
      transparent: true,
      opacity: 0
    });
    const stars = new THREE.Points(starGeo, this.skyStars);
    // Drawn over the sky domes, so the first stars show through the sunset.
    stars.renderOrder = -2.2;
    this.basin.add(stars);

    const sunDir = new THREE.Vector3(32, 36, 18).normalize();
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(46, 32),
      new THREE.MeshBasicMaterial({ color: 0xf6dcc0, transparent: true, opacity: 0.22, fog: false, depthWrite: false })
    );
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(9, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff6ea, fog: false, depthWrite: false, transparent: true })
    );
    (glow.material as THREE.MeshBasicMaterial).userData.full = 0.22;
    (disc.material as THREE.MeshBasicMaterial).userData.full = 1;
    this.dayOnly.push(glow.material as THREE.MeshBasicMaterial, disc.material as THREE.MeshBasicMaterial);
    for (const mesh of [glow, disc]) {
      mesh.position.copy(sunDir).multiplyScalar(1300);
      mesh.lookAt(0, 0, 0);
      mesh.renderOrder = -1;
      this.basin.add(mesh);
    }

    // The real rim is tens of kilometres away. Here it is a hazy line on the horizon.
    const segments = 96;
    const ringRadius = 520;
    const vertices: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const height = 22 + 14 * Math.sin(angle * 5 + 1) + 9 * Math.sin(angle * 11) + 6 * Math.sin(angle * 23 + 2);
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      vertices.push(x, -12, z, x, Math.max(height, 6), z);
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const ridge = new THREE.BufferGeometry();
    ridge.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    ridge.setIndex(indices);
    const rim = new THREE.Mesh(
      ridge,
      new THREE.MeshBasicMaterial({ color: 0xb08463, side: THREE.DoubleSide, fog: false, transparent: true })
    );
    (rim.material as THREE.MeshBasicMaterial).userData.full = 1;
    this.dayOnly.push(rim.material as THREE.MeshBasicMaterial);
    rim.name = 'FarRim';
    rim.renderOrder = -1;
    this.basin.add(rim);
  }

  private addTerrain() {
    const geo = new THREE.PlaneGeometry(340, 340, 250, 250);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const rises = new Float32Array(pos.count);
    const low = new THREE.Color(0x7a3b2c);
    const mid = new THREE.Color(0xc4623e);
    const high = new THREE.Color(0xe0b08a);
    const lake = new THREE.Color(0xb39077);
    const riverbed = new THREE.Color(0xc09a78);
    const strata = [new THREE.Color(0xd8b38c), new THREE.Color(0xa87850), new THREE.Color(0xe8cfae)];
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = marsHeight(x, z);
      pos.setY(i, h);
      const r = Math.hypot(x, z);
      const lift = THREE.MathUtils.clamp(h / 5.5, 0, 1);
      color.copy(low).lerp(mid, lift);
      color.lerp(high, Math.max(0, lift - 0.55));
      // Pale, dried mud where the lake stood.
      color.lerp(lake, (1 - smooth(r, 8, 11.5)) * 0.85);
      color.lerp(riverbed, channelDepth(x, z) * 0.7);
      const rise = deltaRise(x, z);
      rises[i] = rise;
      if (rise > 0) {
        const layer = Math.floor((rise * DELTA_HEIGHT + 0.25 * Math.sin(z * 0.2)) / 0.8);
        color.lerp(strata[((layer % 3) + 3) % 3], Math.min(1, rise * 7));
      }
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aDelta', new THREE.BufferAttribute(rises, 1));
    geo.computeVertexNormals();
    const ground = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.02 });
    // Thin level bands on the delta front, drawn per pixel so the layers stay crisp.
    ground.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aDelta;\nvarying float vDelta;\nvarying float vLevel;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDelta = aDelta;\nvLevel = position.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vDelta;\nvarying float vLevel;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float bed = 0.5 + 0.5 * sin(vLevel * 8.5 + sin(vLevel * 2.1) * 1.6);
          float thin = 0.5 + 0.5 * sin(vLevel * 23.0);
          float shade = mix(0.58, 1.06, smoothstep(0.3, 0.62, bed)) * mix(0.93, 1.0, thin);
          diffuseColor.rgb *= mix(1.0, shade, clamp(vDelta * 5.0, 0.0, 1.0));`
        );
    };
    const mesh = new THREE.Mesh(geo, ground);
    mesh.name = 'Jezero';
    mesh.receiveShadow = true;
    this.basin.add(mesh);
  }

  private addRangeRing() {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const angle = (i / 96) * Math.PI * 2;
      const x = Math.cos(angle) * MARS_RANGE;
      const z = Math.sin(angle) * MARS_RANGE;
      points.push(new THREE.Vector3(x, marsHeight(x, z) + 0.08, z));
    }
    this.basin.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: 0xfbbf24 })
      )
    );
  }

  /** Three rocks that look like what they are: dark basalt, layered sandstone, pale cracked mud. */
  private addRocks() {
    const stone = (color: number, roughness = 0.9) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04, flatShading: true });

    // Igneous: dark, angular, blocky.
    const basalt = new THREE.Group();
    const dark = [stone(0x3a3336, 0.72), stone(0x4a4144, 0.8), stone(0x2f2a2d, 0.7)];
    const blocks: [number, number, number, number, number, number, number][] = [
      [0, 0.38, 0, 1.25, 0.8, 0.95, 0.3],
      [0.85, 0.24, 0.35, 0.7, 0.5, 0.6, 1.1],
      [-0.75, 0.2, -0.3, 0.6, 0.42, 0.7, 2.0],
      [0.2, 0.16, -0.8, 0.5, 0.34, 0.45, 0.7],
      [-0.3, 0.86, 0.1, 0.55, 0.3, 0.5, 1.6]
    ];
    blocks.forEach(([x, y, z, w, h, d, yaw], index) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), dark[index % dark.length]);
      block.position.set(x, y, z);
      block.rotation.set(0.08 * index, yaw, 0.06 * (index - 2));
      basalt.add(block);
    });
    this.placeRock(basalt, 'igneous', 1.25);

    // Sedimentary: a stack of thin layers, each laid on the last.
    const sandstone = new THREE.Group();
    const tans = [stone(0xc9a077), stone(0xa97c55), stone(0xdcbb93), stone(0xb98d64)];
    for (let i = 0; i < 6; i++) {
      const layer = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2 - i * 0.09, 1.28 - i * 0.09, 0.17, 7),
        tans[i % tans.length]
      );
      layer.position.set(Math.sin(i * 1.7) * 0.08, 0.09 + i * 0.17, Math.cos(i * 2.3) * 0.08);
      layer.rotation.y = i * 0.5;
      layer.scale.z = 0.72;
      sandstone.add(layer);
    }
    this.placeRock(sandstone, 'sedimentary', 1.2);

    // Mudstone: flat, pale plates, cracked like a dried puddle.
    const mud = new THREE.Group();
    const pale = [stone(0xcdb9a2, 0.96), stone(0xbfa98f, 0.96), stone(0xd8c7b2, 0.96)];
    const plates: [number, number, number][] = [
      [0, 0, 0.62],
      [0.98, 0.42, 0.5],
      [-0.9, 0.5, 0.48],
      [0.25, -0.95, 0.52],
      [-0.72, -0.62, 0.44],
      [1.0, -0.6, 0.4],
      [0.1, 1.0, 0.42]
    ];
    plates.forEach(([x, z, radius], index) => {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.12, 6), pale[index % pale.length]);
      plate.position.set(x, 0.07 + (index % 2) * 0.015, z);
      plate.rotation.y = index * 0.9;
      mud.add(plate);
    });
    this.placeRock(mud, 'mudstone', 0.9);

    const scatterMat = new THREE.MeshStandardMaterial({ color: 0x7c4034, roughness: 0.9 });
    const scatterGeo = new THREE.DodecahedronGeometry(0.28, 0);
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.399;
      const radius = 10 + (i % 6) * 6.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.nearSite(x, z, 3.6) || Math.hypot(x - ROVER_START.x, z - ROVER_START.z) < 4) continue;
      if (deltaRise(x, z) > 0 || channelDepth(x, z) > 0.2 || Math.hypot(x, z) < 9) continue;
      const stoneMesh = new THREE.Mesh(scatterGeo, scatterMat);
      stoneMesh.position.set(x, marsHeight(x, z) + 0.12, z);
      stoneMesh.scale.setScalar(0.6 + (i % 4) * 0.25);
      stoneMesh.rotation.set(i, angle, i * 0.2);
      this.markShadows(stoneMesh);
      this.basin.add(stoneMesh);
    }
  }

  private placeRock(rock: THREE.Object3D, id: MarsSiteId, radius: number) {
    const site = SITES[id];
    this.plant(rock, site.x, site.z, site.x * 0.37);
    this.markShadows(rock);
    this.basin.add(rock);
    this.colliders.push({ x: site.x, z: site.z, radius });
  }

  /** Something to look at where each of the three clues is found. */
  private addClueSites() {
    // Water: rounded boulders where the river left the delta. Only a strong flow moves stones this size.
    const water = SITES.water;
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x9c7458, roughness: 0.95 });
    const boulderGeo = new THREE.IcosahedronGeometry(0.5, 1);
    const bed: [number, number, number][] = [
      [-3.4, 0.4, 0.7],
      [-4.4, -0.9, 0.5],
      [-2.6, -1.3, 0.42],
      [-5.2, 0.9, 0.62],
      [-3.9, 1.7, 0.36],
      [-6.1, -0.3, 0.8],
      [-2.2, 1.2, 0.3],
      [-5.6, -1.6, 0.44]
    ];
    for (const [dx, dz, scale] of bed) {
      const x = water.x + dx;
      const z = water.z + dz;
      const boulder = new THREE.Mesh(boulderGeo, boulderMat);
      boulder.scale.set(scale * 2, scale * 1.3, scale * 1.7);
      boulder.position.set(x, marsHeight(x, z) + scale * 0.45, z);
      boulder.rotation.y = dx * 2;
      this.markShadows(boulder);
      this.basin.add(boulder);
      if (scale > 0.45) this.colliders.push({ x, z, radius: scale * 1.6 });
    }

    // Possible sign of life: a pale outcrop with leopard spots and the hole where the core was drilled.
    const bio = SITES.biosignature;
    const outcrop = new THREE.Group();
    const side = new THREE.MeshStandardMaterial({ color: 0x9a5a44, roughness: 0.92, flatShading: true });
    const face = new THREE.MeshStandardMaterial({ map: this.leopardTexture(), roughness: 0.88 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.9), [side, side, face, side, side, side]);
    slab.position.y = 0.42;
    slab.rotation.set(0.32, 0, 0.05);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 2.1), side);
    foot.position.set(0.1, 0.12, -0.15);
    foot.rotation.y = 0.2;
    const chip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), side);
    chip.position.set(-1.7, 0.14, 0.6);
    chip.rotation.y = 0.8;
    outcrop.add(foot, slab, chip);
    // Tilted toward the south-east, where the inspection camera stands.
    this.plant(outcrop, bio.x, bio.z, Math.PI / 4);
    this.markShadows(outcrop);
    this.basin.add(outcrop);
    this.colliders.push({ x: bio.x, z: bio.z, radius: 1.6 });

    // Earth laboratories: a small rover instrument beside a machine the size of a building.
    const lab = SITES.laboratory;
    const bench = new THREE.Group();
    bench.name = 'LabBench';
    const line = (opacity: number, wireframe = true) => {
      const material = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity, wireframe });
      this.labMaterials.push(material);
      return material;
    };
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.62, 0.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.48 })
    );
    plinth.position.y = 0.25;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.03, 40), line(0.16, false));
    pad.position.y = 0.55;
    const small = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), line(0.9));
    small.position.set(-1.5, 1.0, 0);
    const smallStand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), line(0.6, false));
    smallStand.position.set(-1.5, 0.78, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.13, 8, 36), line(0.55));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.7, 1.15, 0);
    ring.name = 'LabRing';
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), line(0.5));
    hall.position.set(0.7, 0.95, 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), line(0.7, false));
    beam.rotation.z = Math.PI / 2;
    beam.position.set(1.9, 1.15, 0.4);
    bench.add(plinth, pad, small, smallStand, ring, hall, beam);
    this.markShadows(plinth);
    this.plant(bench, lab.x, lab.z, -Math.PI / 4);
    this.basin.add(bench);
    this.labRing = ring;
    this.colliders.push({ x: lab.x, z: lab.z, radius: 1.5 });
  }

  /** Rust-red mudstone with pale veins, dark-rimmed pale spots, and the drilled and ground patches. */
  private leopardTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#a4553c';
    ctx.fillRect(0, 0, size, size);
    let seed = 71;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(125,58,40,0.35)' : 'rgba(190,110,80,0.3)';
      ctx.fillRect(rand() * size, rand() * size, 2 + rand() * 5, 2 + rand() * 5);
    }
    ctx.strokeStyle = 'rgba(240,228,214,0.9)';
    ctx.lineCap = 'round';
    for (const [y, width] of [[120, 16], [372, 11]] as const) {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.bezierCurveTo(140, y - 40, 330, y + 46, size + 10, y - 12);
      ctx.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const x = 30 + rand() * (size - 60);
      const y = 150 + rand() * 200;
      const radius = 5 + rand() * 9;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * (0.7 + rand() * 0.5), rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = '#e9dcc8';
      ctx.fill();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#2b1d1a';
      ctx.stroke();
    }
    // Ground-flat patch and the core hole beside it.
    ctx.beginPath();
    ctx.arc(396, 258, 44, 0, Math.PI * 2);
    ctx.fillStyle = '#c9a290';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(90,50,40,0.7)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 262, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#140d0c';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#d8c2b4';
    ctx.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  private nearSite(x: number, z: number, radius: number) {
    return Object.values(SITES).some(site => Math.hypot(site.x - x, site.z - z) < radius);
  }

  private addCache() {
    // The real depot: ten tubes laid flat on the ground in a zigzag, not standing in a rack.
    const tubes = new THREE.Group();
    tubes.name = 'SampleTubes';
    const metal = new THREE.MeshStandardMaterial({ color: 0xd9dee4, metalness: 0.78, roughness: 0.24 });
    const cap = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 0.82, roughness: 0.22 });
    const tip = new THREE.MeshStandardMaterial({ color: 0x8b9199, metalness: 0.7, roughness: 0.35 });
    for (let i = 0; i < 10; i++) {
      const tube = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.52, 14), metal);
      body.rotation.z = Math.PI / 2;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.1, 14), cap);
      lid.rotation.z = Math.PI / 2;
      lid.position.x = 0.31;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 14), tip);
      nose.rotation.z = Math.PI / 2;
      nose.position.x = -0.32;
      tube.add(body, lid, nose);
      const x = (i - 4.5) * 0.5;
      const z = i % 2 === 0 ? -0.5 : 0.5;
      tube.position.set(x, marsHeight(x, z) - marsHeight(0, 0) + 0.06, z);
      this.tubeSpots.push(new THREE.Vector3(x, marsHeight(x, z) + 0.06, z));
      tube.rotation.y = (i % 2 === 0 ? 0.5 : -0.5) + Math.sin(i * 3.1) * 0.25;
      tubes.add(tube);
    }
    this.plant(tubes, 0, 0);
    this.markShadows(tubes);
    this.colliders.push({ x: -1.3, z: 0, radius: 1.3 }, { x: 1.3, z: 0, radius: 1.3 });

    const rover = new THREE.Group();
    rover.name = 'Perseverance';
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.55, metalness: 0.22 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2c2c31, roughness: 0.62, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.36, 1.2), bodyMat);
    body.position.y = 0.55;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 0.72), dark);
    deck.position.y = 0.78;
    rover.add(body, deck);
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 14);
    wheelGeo.rotateX(Math.PI / 2);
    for (const x of [-0.55, 0, 0.55]) {
      for (const z of [-0.58, 0.58]) {
        const wheel = new THREE.Mesh(wheelGeo, dark);
        wheel.position.set(x, 0.2, z);
        rover.add(wheel);
      }
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.05, 8), dark);
    mast.position.set(0.1, 1.35, 0.2);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.2), bodyMat);
    head.position.set(0.1, 1.92, 0.2);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.07), dark);
    arm.position.set(0.72, 0.68, 0.28);
    arm.rotation.z = -0.45;
    rover.add(mast, head, arm);
    // The NASA model's arm sits on local +Z. Aim that end at the sample cache.
    const yaw = Math.atan2(-PERSEVERANCE_SITE.x, -PERSEVERANCE_SITE.z);
    this.plant(rover, PERSEVERANCE_SITE.x, PERSEVERANCE_SITE.z, yaw);
    this.markShadows(rover);
    this.perseveranceCollider = {
      x: PERSEVERANCE_SITE.x,
      z: PERSEVERANCE_SITE.z,
      radius: 1.15
    };
    this.colliders.push(this.perseveranceCollider);
    this.basin.add(tubes, rover);
    this.perseverance = rover;
    this.loadPerseverance(rover);
  }

  private loadPerseverance(rover: THREE.Group) {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load('/models/nasa/perseverance-lite.glb?v=upright', (gltf) => {
      draco.dispose();
      const model = gltf.scene;
      model.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      });
      for (const child of [...rover.children]) {
        rover.remove(child);
        child.traverse(node => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(material => material.dispose());
        });
      }
      rover.add(model);
      rover.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(rover);
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.z) * 0.5;
      if (this.perseveranceCollider && radius > 0.4 && radius < 4) {
        this.perseveranceCollider.radius = radius;
      }
      const top = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        box.max.y,
        (box.min.z + box.max.z) / 2
      );
      rover.worldToLocal(top);
      this.perseveranceTop.copy(top);
    });
  }

  private addTerminal() {
    const group = new THREE.Group();
    group.name = 'Terminal';
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 1.05, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.45, roughness: 0.48 })
    );
    pedestal.position.y = 0.52;
    const paneMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    });
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.35), paneMat);
    pane.name = 'TerminalPane';
    pane.position.y = 1.65;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.015, 8, 28),
      paneMat
    );
    ring.name = 'TerminalRing';
    ring.position.y = 2.55;
    group.add(pedestal, pane, ring);
    this.markShadows(pedestal);
    const site = SITES.terminal;
    this.plant(group, site.x, site.z);
    this.colliders.push({ x: site.x, z: site.z, radius: 0.7 });
    this.basin.add(group);
  }

  private holo(opacity = 0.5, wireframe = true, color = 0x7dd3fc) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, wireframe, fog: false });
    material.userData.share = opacity / 0.5;
    return material;
  }

  /** The return hardware, drawn as holograms: lander and rocket by the tubes, orbiter and Earth in the sky. */
  private addPlanHardware() {
    const group = new THREE.Group();
    group.name = 'ReturnPlan';
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.35, 8), this.holo());
    deck.position.y = 0.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 1.15), this.holo());
    body.position.y = 0.95;
    this.holoLander.add(deck, body);
    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5), this.holo(0.5, false));
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      leg.position.set(Math.cos(angle) * 1.9, 0.3, Math.sin(angle) * 1.9);
      leg.rotation.z = Math.cos(angle) * 0.5;
      leg.rotation.x = -Math.sin(angle) * 0.5;
      this.holoLander.add(leg);
    }
    const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 2.2, 10), this.holo());
    rocket.position.set(0.15, 2.3, 0.1);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 10), this.holo());
    nose.position.set(0.15, 3.55, 0.1);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.4, 10), this.holo(0.5, false, 0xfbbf24));
    flame.name = 'Flame';
    flame.rotation.x = Math.PI;
    flame.position.set(0.15, 0.55, 0.1);
    this.holoMav.add(rocket, nose, flame);
    group.add(this.holoLander, this.holoMav);
    this.plant(group, PLAN_SITE.x, PLAN_SITE.z);
    group.visible = false;
    this.basin.add(group);

    const base = group.position;
    // Orbiter: a body with two wide solar wings.
    const bus = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 3.2), this.holo());
    const wingA = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 2.4), this.holo(0.4));
    wingA.position.x = 6;
    const wingB = wingA.clone();
    wingB.position.x = -6;
    this.holoOrbiter.add(bus, wingA, wingB);
    this.holoOrbiter.position.set(base.x - 10, 50, base.z - 30);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), this.holo(0.42, true, 0x60a5fa));
    const core = new THREE.Mesh(new THREE.SphereGeometry(8.8, 20, 14), this.holo(0.2, false, 0x1d4ed8));
    this.holoEarth.add(core, globe);
    this.holoEarth.position.set(base.x + 34, 40, base.z - 110);

    const capsule = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 14), this.holo(0.8, false, 0xfde68a));
    capsule.rotation.x = Math.PI;
    this.holoCapsule.add(capsule);

    const container = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), this.holo(0.95, false, 0xfde68a));
    this.holoContainer.add(container);
    this.basin.add(this.holoOrbiter, this.holoEarth, this.holoCapsule, this.holoContainer);
    return group;
  }

  /** Earth as seen from Mars, and the line a sample would have travelled to reach it. */
  private addRoute() {
    const fallback = new THREE.Mesh(
      new THREE.SphereGeometry(11, 32, 20),
      new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.7, fog: false })
    );
    this.earth.add(fallback);
    this.earth.position.copy(EARTH_SPOT);
    this.basin.add(this.earth);
    new GLTFLoader().load('/models/earth.glb', gltf => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z);
      if (!(span > 0)) return;
      model.position.sub(box.getCenter(new THREE.Vector3()));
      // The model's glow shell is built to read as a far dot of light. Up close it hides the globe.
      const shells: THREE.Object3D[] = [];
      model.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && (mesh.material as THREE.Material).name === 'EarthAtmosphere') shells.push(mesh);
      });
      for (const shell of shells) shell.removeFromParent();
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(22 / span);
      holder.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        // Light the globe from its own map, so the continents show against a night sky.
        const surface = mesh.material as THREE.MeshStandardMaterial;
        surface.emissive = new THREE.Color(0xffffff);
        surface.emissiveMap = surface.map;
        surface.emissiveIntensity = 0.55;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          (material as THREE.MeshStandardMaterial).fog = false;
        }
      });
      const opacity = this.earth.visible ? 1 : 0;
      this.earth.remove(fallback);
      this.earth.add(holder);
      this.fade(this.earth, opacity);
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(-2, 14, -6),
      new THREE.Vector3(-16, 44, -44),
      new THREE.Vector3(-44, 46, -104),
      EARTH_SPOT.clone().add(new THREE.Vector3(8, 6, 10))
    ]);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(this.routeCount - 1));
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.95, fog: false })
    );
    line.visible = false;
    line.frustumCulled = false;
    this.basin.add(line);
    return line;
  }

  /** Archive tags for the tubes, and the three questions sent up from the terminal. */
  private addLegacyProps() {
    const tagMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, fog: false });
    for (const spot of this.tubeSpots) {
      const tag = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 6, 20), tagMat);
      tag.rotation.x = Math.PI / 2;
      tag.position.set(spot.x, spot.y + 0.3, spot.z);
      tag.visible = false;
      this.tags.push(tag);
      this.basin.add(tag);
    }
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xa5f3fc, fog: false });
    for (let i = 0; i < 3; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), orbMat);
      orb.visible = false;
      this.orbs.push(orb);
      this.basin.add(orb);
    }
    const site = SITES.terminal;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 160, 8),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.35, fog: false })
    );
    beam.position.set(site.x, marsHeight(site.x, site.z) + 82, site.z);
    beam.visible = false;
    this.basin.add(beam);
    return beam;
  }

  /** The Moon, Voyager 1 and Mars, joined as one constellation. */
  private addTrio() {
    const group = new THREE.Group();
    group.position.copy(TRIO_SPOT);
    const spots = [new THREE.Vector3(-15, -2, 0), new THREE.Vector3(0, 5, 0), new THREE.Vector3(15, -2, 0)];

    const moonTexture = new THREE.TextureLoader().load('/models/regolith_tile.png');
    moonTexture.colorSpace = THREE.SRGBColorSpace;
    moonTexture.wrapS = THREE.RepeatWrapping;
    moonTexture.wrapT = THREE.RepeatWrapping;
    moonTexture.repeat.set(3, 2);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 40, 28),
      new THREE.MeshStandardMaterial({ map: moonTexture, color: 0xd8dade, roughness: 0.95, fog: false })
    );
    moon.position.copy(spots[0]);

    const voyager = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.28, fog: false });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), metal);
    dish.rotation.x = Math.PI * 0.5;
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), metal);
    boom.rotation.z = Math.PI / 2;
    boom.position.x = 1.5;
    voyager.add(dish, boom);
    voyager.position.copy(spots[1]);
    voyager.rotation.set(0.35, -0.7, 0.15);

    const mars = new THREE.Group();
    const marsBall = new THREE.Mesh(
      new THREE.SphereGeometry(2.7, 40, 28),
      new THREE.MeshStandardMaterial({ color: 0xc4553a, roughness: 0.85, fog: false })
    );
    mars.add(marsBall);
    mars.position.copy(spots[2]);

    // Swap the stand-ins for the real models when they arrive.
    const fit = (model: THREE.Object3D, size: number) => {
      const box = new THREE.Box3().setFromObject(model);
      const span = box.getSize(new THREE.Vector3());
      const longest = Math.max(span.x, span.y, span.z);
      if (!(longest > 0)) return null;
      model.position.sub(box.getCenter(new THREE.Vector3()));
      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(size / longest);
      holder.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          (material as THREE.MeshStandardMaterial).fog = false;
        }
      });
      return holder;
    };
    const loader = new GLTFLoader();
    loader.load('/models/voyager.glb', gltf => {
      const holder = fit(gltf.scene, 6.5);
      if (!holder) return;
      voyager.remove(dish, boom);
      voyager.add(holder);
    });
    loader.load('/models/nasa/mars-lite.glb', gltf => {
      const holder = fit(gltf.scene, 5.4);
      if (!holder) return;
      mars.remove(marsBall);
      mars.add(holder);
    });

    const lines = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([spots[0], spots[1], spots[2], spots[0]]),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, fog: false })
    );
    lines.name = 'TrioLines';
    group.add(moon, voyager, mars, lines);
    this.trioBodies.push(
      { name: 'moon', object: moon, top: 3.4 },
      { name: 'voyager', object: voyager, top: 3.6 },
      { name: 'mars', object: mars, top: 3.6 }
    );
    group.visible = false;
    this.basin.add(group);
    return group;
  }

  /** Move every cinematic prop to where the current shot's progress puts it. */
  private updateCinema() {
    const t = this.shotT;
    const base = this.planGroup.position;
    const orbit = this.holoOrbiter.position;
    const flame = this.holoMav.getObjectByName('Flame');
    if (this.shot === 'plan') {
      this.planGroup.visible = true;
      // A dimmer sky lets the hologram lines stand out.
      this.setMood(smooth(t, 0.1, 0.22) * 0.55, 0);
      // Step 2: the lander comes down.
      const landed = smooth(t, 0.18, 0.35);
      this.fade(this.holoLander, t >= 0.16 ? 0.5 : 0);
      this.holoLander.position.y = (1 - landed) * (1 - landed) * 40;
      // The tubes are carried across, then step 3: the rocket leaves.
      const carry = smooth(t, 0.37, 0.46);
      this.fade(this.holoContainer, t > 0.36 && t < 0.47 ? 1 : 0);
      this.holoContainer.position.set(base.x * carry, base.y + 0.4 + Math.sin(carry * Math.PI) * 1.6 + carry * 2, base.z * carry);
      const climb = smooth(t, 0.47, 0.62);
      const rise = climb * climb;
      this.fade(this.holoMav, t >= 0.16 && t < 0.625 ? 0.5 : 0);
      this.holoMav.position.set(
        (orbit.x - base.x) * rise,
        this.holoLander.position.y * (1 - climb) + (orbit.y - base.y - 3) * rise,
        (orbit.z - base.z) * rise
      );
      if (flame) flame.visible = climb > 0.01 && climb < 1;
      // Step 4: the orbiter catches the samples and leaves for Earth.
      this.fade(this.holoOrbiter, smooth(t, 0.5, 0.58) * 0.55);
      const cruise = smooth(t, 0.7, 0.88);
      const dock = this.labelPoint.copy(this.holoEarth.position).add(new THREE.Vector3(-13, 5, 12));
      this.holoOrbiter.position.set(
        THREE.MathUtils.lerp(base.x - 10, dock.x, cruise),
        THREE.MathUtils.lerp(50, dock.y, cruise),
        THREE.MathUtils.lerp(base.z - 30, dock.z, cruise)
      );
      this.holoOrbiter.scale.setScalar(1 + Math.sin(smooth(t, 0.62, 0.7) * Math.PI) * 0.35);
      this.fade(this.holoEarth, smooth(t, 0.64, 0.74) * 0.5);
      // Step 5: the capsule falls to Earth.
      const fall = smooth(t, 0.88, 0.98);
      this.fade(this.holoCapsule, t > 0.875 ? 0.9 : 0);
      this.holoCapsule.position.lerpVectors(this.holoOrbiter.position, this.holoEarth.position, fall * 0.72);
      this.holoEarth.scale.setScalar(1 + Math.sin(smooth(t, 0.96, 1) * Math.PI) * 0.12);
    } else if (this.shot === 'reveal') {
      // The launch starts again, stops in mid-air, and the plan goes dark piece by piece.
      this.planGroup.visible = true;
      this.setMood(0.55 * (1 - smooth(t, 0.6, 1)), 0);
      const blink = (from: number, to: number) => {
        if (t < from) return 1;
        if (t >= to) return 0;
        return Math.sin(t * 260) > 0 ? 1 : 0.15;
      };
      const climb = smooth(t, 0, 0.2);
      this.holoLander.position.y = 0;
      this.holoMav.position.set(0, climb * climb * 9, 0);
      if (flame) flame.visible = t < 0.2;
      this.holoOrbiter.position.set(base.x - 10, 50, base.z - 30);
      this.holoOrbiter.scale.setScalar(1);
      this.fade(this.holoCapsule, 0);
      this.fade(this.holoContainer, 0);
      this.fade(this.holoEarth, 0.5 * blink(0.26, 0.32));
      this.fade(this.holoOrbiter, 0.55 * blink(0.34, 0.4));
      this.fade(this.holoLander, 0.5 * blink(0.44, 0.5));
      this.fade(this.holoMav, 0.5 * (1 - smooth(t, 0.56, 0.84)));
    } else if (this.shot === 'question') {
      this.setMood(0, smooth(t, 0, 0.28) * 0.88);
      this.earth.position.set(EARTH_SPOT.x, THREE.MathUtils.lerp(-14, EARTH_SPOT.y, smooth(t, 0.06, 0.46)), EARTH_SPOT.z);
      this.fade(this.earth, 1 - smooth(t, 0.8, 0.95));
      this.earth.rotation.y = t * 0.6;
      this.drawRoute(smooth(t, 0.34, 0.68), smooth(t, 0.74, 0.92));
    } else if (this.shot === 'preserve') {
      this.setMood(0, 0);
      this.tags.forEach((tag, index) => {
        const pop = smooth(t, 0.12 + index * 0.065, 0.2 + index * 0.065);
        tag.visible = pop > 0;
        tag.scale.setScalar(0.4 + pop * 0.6 + Math.sin(pop * Math.PI) * 0.5);
      });
    } else if (this.shot === 'questions') {
      this.setMood(smooth(t, 0, 0.3) * 0.7, 0);
      const site = SITES.terminal;
      const ground = marsHeight(site.x, site.z);
      this.signalBeam.visible = t > 0.08;
      this.orbs.forEach((orb, index) => {
        const lift = smooth(t, 0.1 + index * 0.16, 0.75 + index * 0.1);
        orb.visible = lift > 0;
        orb.position.set(site.x, ground + 2.6 + lift * lift * 70, site.z);
        orb.scale.setScalar(1 + Math.sin(this.elapsed * 6 + index) * 0.15);
      });
    } else if (this.shot === 'inspire') {
      this.setMood(0, smooth(t, 0, 0.25) * 0.8);
      this.earth.position.copy(EARTH_SPOT);
      this.fade(this.earth, smooth(t, 0.05, 0.3));
      this.earth.rotation.y = t * 0.5;
      this.drawRoute(smooth(t, 0.15, 0.85), 0);
    } else if (this.shot === 'closing') {
      const space = smooth(t, 0.5, 0.56);
      this.setMood(smooth(t, 0, 0.22), space);
      // Out in space the three bodies are lit plainly, not by the dim crater light.
      this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, 2.6, space);
      this.hemi.intensity = THREE.MathUtils.lerp(this.hemi.intensity, 1.0, space);
      this.trio.visible = t > 0.5;
      this.trio.children.forEach((child, index) => {
        if (index < 3) child.rotation.y += 0.0025;
      });
      (this.trioLines.material as THREE.LineBasicMaterial).opacity = smooth(t, 0.66, 0.8) * 0.75;
    }
  }

  /** Show the route from `0` up to `drawn`, with the first `erased` share already gone. */
  private drawRoute(drawn: number, erased: number) {
    const from = Math.floor(erased * (this.routeCount - 1));
    const to = Math.floor(drawn * (this.routeCount - 1));
    this.routeLine.visible = to - from > 1;
    this.routeLine.geometry.setDrawRange(from, Math.max(to - from + 1, 0));
  }

  /** Screen positions for the three names in the last shot. */
  private projectTrio() {
    const show = this.shot === 'closing' && this.shotT > 0.6;
    const bounds = show ? this.renderer.domElement.getBoundingClientRect() : null;
    this.trioBodies.forEach((body, index) => {
      const label = this.trioLabels[index];
      if (!bounds) {
        label.visible = false;
        return;
      }
      body.object.getWorldPosition(this.labelPoint);
      this.labelPoint.y -= body.top;
      this.ndc.copy(this.labelPoint).project(this.camera);
      label.x = bounds.left + (this.ndc.x * 0.5 + 0.5) * bounds.width;
      label.y = bounds.top + (-this.ndc.y * 0.5 + 0.5) * bounds.height;
      label.visible = this.ndc.z > 0 && this.ndc.z < 1;
    });
  }

  /** Same glowing column and floating diamond as a Moon inspection marker. */
  private addBeacon() {
    const radius = 1.6;
    const group = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 1.8, 32, 1, true);
    beamGeo.translate(0, 0.9, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      map: this.markerBeamTexture(),
      color: 0x00a844,
      transparent: true,
      opacity: 0.5,
      side: THREE.FrontSide,
      depthWrite: false
    });
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x4ade80,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.8
      })
    );
    diamond.position.y = 2.2;
    group.add(new THREE.Mesh(beamGeo, beamMat), diamond);
    group.visible = false;
    this.basin.add(group);
    return { group, diamond, beam: beamMat };
  }

  /** A bright ring that travels up and down the thing being scanned. */
  private addScanRing() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95, fog: false })
    );
    ring.rotation.x = Math.PI / 2;
    const sheet = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 48),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      })
    );
    ring.add(sheet);
    ring.visible = false;
    this.basin.add(ring);
    return ring;
  }

  private updateScanRing() {
    if (this.shot === 'plan' && this.shotT < 0.18) {
      // Step 1 of the plan: the sealed tubes light up.
      this.scanRing.visible = true;
      const sweep = Math.abs(Math.sin(this.shotT * 60));
      this.scanRing.position.set(0, marsHeight(0, 0) + 0.08 + sweep * 0.8, 0);
      (this.scanRing.material as THREE.MeshBasicMaterial).opacity = 0.95;
      return;
    }
    const show = this.scan !== null && this.shot === 'focus' && this.focus !== null;
    this.scanRing.visible = show;
    if (!show || !this.focus) return;
    const site = SITES[this.focus];
    const sweep = Math.abs(Math.sin((this.scan ?? 0) * Math.PI * 3));
    this.scanRing.position.set(site.x, marsHeight(site.x, site.z) + 0.08 + sweep * 1.5, site.z);
    const done = (this.scan ?? 0) >= 1;
    (this.scanRing.material as THREE.MeshBasicMaterial).opacity = done ? 0.35 : 0.95;
  }

  private markerBeamTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /** Bob, tumble, and pulse each waypoint the way a Moon marker does. */
  private updateBeacons(dt: number) {
    const driving = this.shot === 'drive' || this.shot === 'intro';
    const pulse = Math.sin(this.elapsed * 3.5);
    const fastPulse = Math.sin(this.elapsed * 7.5);
    this.beacons.forEach((beacon, index) => {
      const id = this.live[index];
      beacon.group.visible = driving && id !== undefined;
      if (!beacon.group.visible) return;
      const material = beacon.diamond.material as THREE.MeshStandardMaterial;
      beacon.diamond.position.y = 2.2 + Math.sin(this.elapsed * 2.8 + beacon.group.position.x * 0.5) * 0.15;
      beacon.diamond.rotation.y += dt * 2.2;
      beacon.diamond.rotation.x += dt * 0.9;
      if (this.near === id) {
        beacon.beam.opacity = 0.62 + 0.06 * fastPulse;
        material.emissiveIntensity = 1.4 + 0.5 * fastPulse;
      } else {
        beacon.beam.opacity = 0.48 + 0.05 * pulse;
        material.emissiveIntensity = 0.85;
      }
    });
  }

  /** Same white starfield as Mission 2, sized for the approach camera. */
  private addApproachStars() {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 3200 + Math.random() * 2200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 6.5,
      sizeAttenuation: true,
      depthWrite: false
    });
    const stars = new THREE.Points(geometry, material);
    stars.name = 'ApproachStars';
    this.approachStars = stars;
    this.scene.add(stars);
  }

  private loadApproachMars() {
    const loader = new GLTFLoader();
    loader.load(
      '/models/nasa/mars-approach.glb',
      gltf => {
        const model = gltf.scene;
        model.name = 'MarsApproach';
        model.rotation.copy(GLOBE_EULER);
        model.position.set(0, 0, 0);
        this.scene.add(model);
        this.globe = model;
        model.visible = this.shot === 'intro' && !this.handedOff;
        this.markGlobeReady();
      },
      undefined,
      () => {
        this.markGlobeReady();
      }
    );
  }

  private markGlobeReady() {
    this.globeReady = true;
    const wait = this.approachReadyWait;
    this.approachReadyWait = null;
    if (!this.introSkipped) wait?.();
  }

  private approachDoneAt() {
    return this.fadeAt + APPROACH_FADE + APPROACH_HOLD + APPROACH_REVEAL;
  }

  private advanceApproach() {
    if (!this.approachStarted) return;
    const span = Math.max(this.fadeAt + APPROACH_FADE, 0.001);
    const target = this.paceClock > 0
      ? this.paceU + (1 - this.paceU) * Math.min(Math.max(this.introClock - this.paceClock, 0) / Math.max(span - this.paceClock, 0.05), 1)
      : Math.min(this.introClock / span, 1);
    this.approachU = Math.max(this.approachU, target);
  }

  private updateApproach() {
    if (!this.approachStarted) {
      this.veil = 0;
      this.approachLight.intensity = this.handedOff ? 0 : 2.6;
      return;
    }
    const fadeStart = this.fadeAt;
    const holdStart = fadeStart + APPROACH_FADE;
    const revealStart = holdStart + APPROACH_HOLD;
    if (this.speechEnded && this.introClock >= holdStart) this.revealBasin();
    const fading = this.speechEnded && this.introClock >= fadeStart;
    if (!fading) this.veil = 0;
    else if (this.introClock < holdStart) this.veil = THREE.MathUtils.smoothstep(this.introClock, fadeStart, holdStart);
    else if (this.introClock < revealStart) this.veil = 1;
    else this.veil = 1 - THREE.MathUtils.smoothstep(this.introClock, revealStart, this.approachDoneAt());
    this.approachLight.intensity = this.handedOff ? 0 : 2.6;
  }

  private revealBasin() {
    if (this.handedOff) return;
    this.handedOff = true;
    if (this.globe) this.globe.visible = false;
    if (this.approachStars) this.approachStars.visible = false;
    this.basin.visible = true;
    this.skyColor.copy(this.dustColor);
    this.fog.color.copy(this.dustColor);
    this.fog.density = 0.013;
    if (!isSoftwareGl) this.sun.castShadow = true;
    this.approachLight.intensity = 0;
    this.camera.far = 2000;
    this.camera.updateProjectionMatrix();
  }

  private jezeroWorld(target: THREE.Vector3) {
    target.copy(JEZERO_DIR).multiplyScalar(MARS_GLOBE_RADIUS);
    if (this.globe) {
      this.globe.updateMatrixWorld();
      target.applyMatrix4(this.globe.matrixWorld);
    } else {
      target.applyEuler(GLOBE_EULER);
    }
    return target;
  }

  private projectJezero() {
    const show = this.shot === 'intro' && !this.handedOff && this.globeReady && this.veil < 0.45;
    if (!show) {
      this.jezeroScreen.visible = false;
      return;
    }
    this.jezeroWorld(this.jezeroPoint);
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.viewDir);
    const facing =
      (this.jezeroPoint.x - this.camera.position.x) * this.viewDir.x +
      (this.jezeroPoint.y - this.camera.position.y) * this.viewDir.y +
      (this.jezeroPoint.z - this.camera.position.z) * this.viewDir.z;
    this.ndc.copy(this.jezeroPoint).project(this.camera);
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.jezeroScreen.x = bounds.left + (this.ndc.x * 0.5 + 0.5) * bounds.width;
    this.jezeroScreen.y = bounds.top + (-this.ndc.y * 0.5 + 0.5) * bounds.height;
    this.jezeroScreen.visible = facing > 0 && this.ndc.z > 0 && this.ndc.z < 1;
  }

  /** Screen point of the site being inspected, so the scan panel can point at it. */
  private projectFocus() {
    if (this.shot !== 'focus' || !this.focus) {
      this.focusScreen.visible = false;
      return;
    }
    const site = SITES[this.focus];
    if (this.focus === 'water') {
      this.focusPoint.set(site.x - 9, marsHeight(site.x - 9, site.z - 4) + 0.2, site.z - 4);
    } else if (this.focus === 'tubes') {
      this.focusPoint.set(site.x, marsHeight(site.x, site.z) + 0.1, site.z);
    } else {
      this.focusPoint.set(site.x, marsHeight(site.x, site.z) + 0.5, site.z);
    }
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.viewDir);
    const facing =
      (this.focusPoint.x - this.camera.position.x) * this.viewDir.x +
      (this.focusPoint.y - this.camera.position.y) * this.viewDir.y +
      (this.focusPoint.z - this.camera.position.z) * this.viewDir.z;
    this.ndc.copy(this.focusPoint).project(this.camera);
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.focusScreen.x = bounds.left + (this.ndc.x * 0.5 + 0.5) * bounds.width;
    this.focusScreen.y = bounds.top + (-this.ndc.y * 0.5 + 0.5) * bounds.height;
    this.focusScreen.visible = facing > 0 && this.ndc.z > 0 && this.ndc.z < 1;
  }

  /** Screen callout for the NASA rover, hidden while the approach globe is up. */
  private projectPerseverance() {
    const rover = this.perseverance;
    if (!rover || !this.basin.visible) {
      this.perseveranceLabel.visible = false;
      return;
    }
    rover.updateWorldMatrix(true, true);
    rover.localToWorld(this.perseverancePoint.copy(this.perseveranceTop));
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.viewDir);
    const facing =
      (this.perseverancePoint.x - this.camera.position.x) * this.viewDir.x +
      (this.perseverancePoint.y - this.camera.position.y) * this.viewDir.y +
      (this.perseverancePoint.z - this.camera.position.z) * this.viewDir.z;
    this.ndc.copy(this.perseverancePoint).project(this.camera);
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.perseveranceLabel.x = bounds.left + (this.ndc.x * 0.5 + 0.5) * bounds.width;
    this.perseveranceLabel.y = bounds.top + (-this.ndc.y * 0.5 + 0.5) * bounds.height;
    this.perseveranceLabel.visible =
      facing > 0.2 &&
      this.ndc.z > 0 &&
      this.ndc.z < 1 &&
      Math.abs(this.ndc.x) < 0.94 &&
      Math.abs(this.ndc.y) < 0.94;
  }

  private plant(object: THREE.Object3D, x: number, z: number, yaw = 0) {
    object.position.set(x, marsHeight(x, z), z);
    object.rotation.y = yaw;
  }

  /** Soft contact shadows. The sun only starts casting once the basin is on screen. */
  private markShadows(object: THREE.Object3D) {
    object.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }

  private updateSunShadow() {
    if (!this.sun.castShadow) return;
    // At dusk the light comes in low from the setting sun, so shadows run long.
    this.sun.position.set(
      this.look.x + THREE.MathUtils.lerp(32, 58, this.dusk),
      this.look.y + THREE.MathUtils.lerp(36, 9, this.dusk),
      this.look.z + THREE.MathUtils.lerp(18, -18, this.dusk)
    );
    this.sun.target.position.set(this.look.x, this.look.y, this.look.z);
    this.sun.target.updateMatrixWorld();
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.elapsed += dt;
    if (this.shot === 'intro') {
      if (this.approachStarted) {
        this.introClock = (now - this.approachOrigin) / 1000;
        this.advanceApproach();
      }
      this.updateApproach();
      if (this.globe) this.globe.rotation.copy(GLOBE_EULER);
      if (
        this.approachStarted &&
        this.speechEnded &&
        this.introClock >= this.approachDoneAt() &&
        !this.introSent
      ) {
        this.introSent = true;
        this.veil = 0;
        this.shot = 'drive';
        this.onIntroDone?.();
      }
    } else if (this.shot === 'drive') {
      this.updateRover(dt);
    } else {
      this.velocity = THREE.MathUtils.damp(this.velocity, 0, 4, dt);
    }
    if (!this.holoFrozen) {
      this.holoRing.rotation.z += dt * 0.7;
      this.holoRing.rotation.y += dt * 0.4;
      this.holoMat.opacity = 0.26 + Math.sin(this.elapsed * 3) * 0.08;
    }
    if (this.labRing) this.labRing.rotation.z += dt * 0.5;
    this.updateNear();
    this.updateBeacons(dt);
    this.updateScanRing();
    this.applyCamera(dt);
    this.updateCinema();
    this.updateSunShadow();
    this.projectJezero();
    this.projectTrio();
    this.projectPerseverance();
    this.projectFocus();
    this.publish();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private blockedAt(x: number, z: number) {
    if (deltaRise(x, z) > 0.05) return true;
    return this.colliders.some(collider => {
      const reach = collider.radius + ROVER_BODY;
      const dx = x - collider.x;
      const dz = z - collider.z;
      return dx * dx + dz * dz < reach * reach;
    });
  }

  private updateRover(dt: number) {
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const leaving = this.wouldLeave(fx, fz);
    const target = leaving ? 0 : this.forwardInput * DRIVE_SPEED;
    this.velocity = THREE.MathUtils.damp(this.velocity, target, 4, dt);
    if (Math.abs(this.turnInput) > 0.05) {
      const reverse = this.velocity < -0.1 ? -1 : 1;
      this.heading += this.turnInput * 1.55 * dt * reverse;
    }
    const nx = this.x + fx * this.velocity * dt;
    const nz = this.z + fz * this.velocity * dt;
    if (!this.blockedAt(nx, nz)) {
      this.x = nx;
      this.z = nz;
    } else {
      this.slideAround(nx, nz, fx, fz, dt);
    }
    const radial = Math.hypot(this.x, this.z);
    if (radial > MARS_RANGE) {
      this.x *= MARS_RANGE / radial;
      this.z *= MARS_RANGE / radial;
      this.velocity = 0;
    }
    this.poseRover();
    this.wheelSpin += (this.velocity * dt) / 0.24;
    for (const wheel of this.wheels) wheel.rotation.z = -this.wheelSpin;
  }

  /**
   * Push the wanted position back out to the rim of whatever it hit, so the
   * rover rolls around a rock or a lander leg. A dead-centre hit has no side
   * to roll to, so it is given one.
   */
  private slideAround(nx: number, nz: number, fx: number, fz: number, dt: number) {
    let px = nx;
    let pz = nz;
    for (const collider of this.colliders) {
      const reach = collider.radius + ROVER_BODY + 0.001;
      let dx = px - collider.x;
      let dz = pz - collider.z;
      let dist = Math.hypot(dx, dz);
      if (dist >= reach) continue;
      if (dist < 0.0001) {
        dx = -fx;
        dz = -fz;
        dist = 1;
      }
      dx /= dist;
      dz /= dist;
      px = collider.x + dx * reach;
      pz = collider.z + dz * reach;
      const moved = Math.hypot(px - this.x, pz - this.z);
      const step = Math.abs(this.velocity) * dt;
      if (moved < step * 0.35) {
        const travel = this.velocity >= 0 ? 1 : -1;
        const side = (fx * dz - fz * dx) * travel >= 0 ? 1 : -1;
        const angle = (side * step * 0.7) / reach;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = dx * cos + dz * sin;
        const rz = -dx * sin + dz * cos;
        px = collider.x + rx * reach;
        pz = collider.z + rz * reach;
      }
    }
    if (this.blockedAt(px, pz)) {
      // Against the delta front: keep whichever part of the move still fits.
      if (!this.blockedAt(nx, this.z)) this.x = nx;
      else if (!this.blockedAt(this.x, nz)) this.z = nz;
      else this.velocity = 0;
      return;
    }
    this.x = px;
    this.z = pz;
    this.velocity *= 0.985;
  }

  private wouldLeave(fx: number, fz: number) {
    if (Math.hypot(this.x, this.z) < MARS_RANGE - 0.35) return false;
    const dir = this.forwardInput;
    if (Math.abs(dir) < 0.05) return false;
    const outward = this.x * fx + this.z * fz;
    return dir > 0 ? outward > 0 : outward < 0;
  }

  private poseRover() {
    const y = marsHeight(this.x, this.z);
    const ahead = marsHeight(this.x + Math.sin(this.heading) * 1.1, this.z + Math.cos(this.heading) * 1.1);
    const behind = marsHeight(this.x - Math.sin(this.heading) * 1.1, this.z - Math.cos(this.heading) * 1.1);
    const right = marsHeight(this.x + Math.cos(this.heading) * 0.8, this.z - Math.sin(this.heading) * 0.8);
    const left = marsHeight(this.x - Math.cos(this.heading) * 0.8, this.z + Math.sin(this.heading) * 0.8);
    this.rover.rotation.order = 'YXZ';
    this.rover.rotation.x = THREE.MathUtils.clamp(Math.atan2(behind - ahead, 2.2), -0.16, 0.16);
    this.rover.rotation.y = this.heading - Math.PI / 2;
    this.rover.rotation.z = THREE.MathUtils.clamp(Math.atan2(left - right, 1.6), -0.16, 0.16);
    this.rover.position.set(this.x, y, this.z);

    const theta = this.heading - Math.PI / 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    for (const wheel of this.wheels) {
      const rest = wheel.userData.suspensionRest as THREE.Vector3 | undefined;
      if (!rest) continue;
      const wx = this.x + rest.x * cos + rest.z * sin;
      const wz = this.z - rest.x * sin + rest.z * cos;
      const delta = marsHeight(wx, wz) - y;
      wheel.position.y = rest.y + THREE.MathUtils.clamp(delta, -0.16, 0.16);
    }
  }

  private nearestLive() {
    let best: MarsSiteId | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const id of this.live) {
      const site = SITES[id];
      const dist = Math.hypot(this.x - site.x, this.z - site.z);
      if (dist < bestDist) {
        best = id;
        bestDist = dist;
      }
    }
    return { id: best, dist: bestDist };
  }

  private updateNear() {
    let near: MarsSiteId | null = null;
    if (this.live.length > 0 && (this.shot === 'drive' || this.shot === 'intro')) {
      const held = this.near && this.live.includes(this.near) ? SITES[this.near] : null;
      if (held && Math.hypot(this.x - held.x, this.z - held.z) < 7.6) {
        near = this.near;
      } else {
        const nearest = this.nearestLive();
        if (nearest.id && nearest.dist < 6.2) near = nearest.id;
      }
    }
    if (near !== this.near) {
      this.near = near;
      this.onNear?.(near);
    }
  }

  private applyCamera(dt: number) {
    const glide = 1 - Math.exp(-dt * 3.2);
    if (this.shot === 'intro' && !this.handedOff) {
      this.jezeroWorld(this.jezeroPoint);
      this.desired.copy(APPROACH_DIR).multiplyScalar(APPROACH_START);
      this.look.copy(this.desired).sub(this.jezeroPoint).multiplyScalar(APPROACH_END / APPROACH_START).add(this.jezeroPoint);
      this.camera.position.lerpVectors(this.desired, this.look, this.approachU);
      this.smoothedLook.copy(this.camera.position).addScaledVector(APPROACH_DIR, -1);
      this.camera.lookAt(this.smoothedLook);
      return;
    } else if (this.shot === 'focus' && this.focus) {
      const site = SITES[this.focus];
      const y = marsHeight(site.x, site.z);
      if (this.focus === 'water') {
        // Stand back so the layered delta front fills the view behind the boulders.
        this.desired.set(site.x + 8, y + 3.4, site.z - 7);
        this.look.set(site.x - 8, y + 2.6, site.z + 1.5);
      } else {
        // Aim a little to the right, so the subject sits left of the reading panel.
        this.desired.set(site.x + 5.2, y + 2.3, site.z + 5.2);
        this.look.set(site.x + 1.1, y + 0.9, site.z - 1.1);
      }
    } else if (this.shot === 'plan') {
      const t = this.shotT;
      const base = this.planGroup.position;
      if (t < 0.18) {
        // Step 1: the tubes Perseverance sealed.
        this.desired.set(4.6, 2.4, 6.2);
        this.look.set(0.4, 0.3, 0);
      } else {
        this.desired.set(base.x + 12, base.y + 3, base.z + 15);
        if (t < 0.47) this.look.set(base.x, base.y + 2 + this.holoLander.position.y * 0.5, base.z);
        else if (t < 0.62) this.look.copy(base).add(this.holoMav.position).setY(base.y + 3 + this.holoMav.position.y);
        else if (t < 0.88) this.look.copy(this.holoOrbiter.position);
        else this.look.copy(this.holoEarth.position);
      }
      this.fog.density = 0.011;
    } else if (this.shot === 'reveal') {
      const t = this.shotT;
      const base = this.planGroup.position;
      const settle = smooth(t, 0.5, 0.9);
      this.desired.set(
        THREE.MathUtils.lerp(base.x + 12, 3.4, settle),
        THREE.MathUtils.lerp(base.y + 3, 1.5, settle),
        THREE.MathUtils.lerp(base.z + 15, 3.8, settle)
      );
      this.look.set(
        THREE.MathUtils.lerp(base.x, 0, settle),
        THREE.MathUtils.lerp(base.y + 3 + this.holoMav.position.y * 0.6, 0.15, settle),
        THREE.MathUtils.lerp(base.z, 0, settle)
      );
      this.fog.density = 0.012;
    } else if (this.shot === 'question') {
      // Low across the tubes, with Earth coming up beyond them.
      const t = this.shotT;
      this.desired.set(5.4 - t * 3.2, 0.95 + t * 0.5, 5.6 - t * 1.2);
      this.look.set(-8 - t * 8, 2.6 + smooth(t, 0.1, 0.6) * 5.5, -22);
      this.fog.density = 0.006;
    } else if (this.shot === 'preserve') {
      const t = this.shotT;
      this.desired.set(5.2 - t * 2.2, 2.9 - t * 1.2, 5.4 - t * 2.2);
      this.look.set(0, 0.2, 0);
      this.fog.density = 0.013;
    } else if (this.shot === 'questions') {
      const site = SITES.terminal;
      const y = marsHeight(site.x, site.z);
      const t = this.shotT;
      this.desired.set(site.x + 7.5, y + 1.6, site.z + 8.5);
      this.look.set(site.x, y + 2 + smooth(t, 0.1, 0.9) * 11, site.z);
      this.fog.density = 0.008;
    } else if (this.shot === 'inspire') {
      const t = this.shotT;
      this.desired.set(9 - t * 2, 2.2 + t * 2.5, 13);
      this.look.set(-14 - t * 10, 9 + smooth(t, 0, 0.8) * 16, -40);
      this.fog.density = 0.006;
    } else if (this.shot === 'closing') {
      const t = this.shotT;
      if (t < 0.53) {
        // From the top of the delta, looking across the crater into the sunset.
        const u = t / 0.53;
        const x = -41 - u * 9;
        const z = 9;
        this.desired.set(x, marsHeight(x, z) + 2.6 + u * 9, z);
        this.look.set(4, 1.5 + u * 5, -3);
        this.fog.density = 0.009;
      } else {
        const u = (t - 0.53) / 0.47;
        this.desired.set(TRIO_SPOT.x, TRIO_SPOT.y + 3, TRIO_SPOT.z + 24 + u * 26);
        this.look.set(TRIO_SPOT.x, TRIO_SPOT.y + 1, TRIO_SPOT.z);
        this.fog.density = 0;
      }
    } else {
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      const y = marsHeight(this.x, this.z);
      this.desired.set(this.x - fx * 7.4, y + 3.15, this.z - fz * 7.4);
      this.look.set(this.x + fx * 3.2, y + 1.05, this.z + fz * 3.2);
      this.liftCameraClear();
      this.fog.density = 0.013;
    }

    if (this.camera.position.distanceTo(this.desired) > 45) {
      this.camera.position.copy(this.desired);
      this.smoothedLook.copy(this.look);
    } else {
      this.camera.position.lerp(this.desired, glide);
      this.smoothedLook.lerp(this.look, glide);
    }
    this.camera.lookAt(this.smoothedLook);
  }

  /** Keep the chase camera above the ground and out of anything solid behind the rover. */
  private liftCameraClear() {
    const ground = marsHeight(this.desired.x, this.desired.z) + 1.4;
    if (this.desired.y < ground) this.desired.y = ground;
    for (const collider of this.colliders) {
      const reach = collider.radius + 1.1;
      const dx = this.desired.x - collider.x;
      const dz = this.desired.z - collider.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= reach) continue;
      this.desired.y += (1 - dist / reach) * 3.2;
    }
  }

  private publish() {
    const nearest = this.nearestLive();
    this.onTelemetry?.({
      speed: Math.abs(this.velocity),
      heading: ((((this.heading * 180) / Math.PI) % 360) + 360) % 360,
      distanceToTarget: nearest.id ? nearest.dist : 0,
      position: { x: this.x, z: this.z },
      cache: { x: 0, z: 0 },
      rangeRadius: MARS_RANGE
    });
  }
}
