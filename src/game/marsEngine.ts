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
  | 'reveal'
  | 'question'
  | 'preserve'
  | 'questions'
  | 'inspire'
  | 'closing';

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

export function marsHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const bowl = (r * r) / 1400;
  const dune =
    Math.sin(x * 0.33 + 1.7) * Math.cos(z * 0.29) * 0.18 +
    Math.sin(x * 0.12 - z * 0.08) * 0.12;
  const rim = Math.exp(-((r - 54) * (r - 54)) / 36) * 7.5;
  return bowl + dune + rim;
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
  private readonly beacon: THREE.Group;
  private readonly diamond: THREE.Object3D;
  private readonly holoRing: THREE.Object3D;
  private readonly holoMat: THREE.MeshBasicMaterial;
  private readonly planGroup: THREE.Group;
  private readonly planMaterials: THREE.MeshBasicMaterial[] = [];
  private readonly questionGroup: THREE.Group;
  private readonly questionExtras: THREE.Group;
  private readonly questionFade: THREE.Material[] = [];
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
  private readonly dustColor = new THREE.Color(0x7c5144);
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
  private live: MarsSiteId | null = 'igneous';
  private focus: MarsSiteId | null = null;
  private near = false;
  private holoFrozen = false;
  private wheelSpin = 0;
  /** Solid footprints of the things the rover can inspect. Radius is the object, not the rover. */
  private readonly colliders: { x: number; z: number; radius: number }[] = [];
  private perseveranceCollider: { x: number; z: number; radius: number } | null = null;
  private beaconBeam: THREE.MeshBasicMaterial | null = null;

  public onTelemetry?: (telemetry: MarsTelemetry) => void;
  public onNear?: (near: boolean) => void;
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
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    this.scene.add(new THREE.AmbientLight(0x5c3c32, 0.5));
    this.scene.add(new THREE.HemisphereLight(0xffd0ad, 0x4a2c24, 0.9));
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
    this.addTerrain();
    this.addRangeRing();
    this.addLakeBed();
    this.addRocks();
    this.addCache();
    this.addTerminal();
    this.planGroup = this.addPlanHardware();
    this.questionGroup = this.addQuestionStage();
    this.questionExtras = this.questionGroup.getObjectByName('QuestionExtras') as THREE.Group;
    this.trio = this.addTrio();
    const built = buildApolloSceneModels(this.renderer);
    this.rover = built.roverGroup;
    this.wheels = built.roverWheels;
    this.rover.name = 'Explorer';
    this.markShadows(this.rover);
    this.basin.add(this.rover);
    this.beacon = this.addBeacon();
    this.diamond = this.beacon.getObjectByName('BeaconDiamond')!;
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

  public setLive(id: MarsSiteId | null) {
    this.live = id;
    this.near = false;
    this.onNear?.(false);
    if (!id) return;
    const site = SITES[id];
    this.beacon.position.set(site.x, marsHeight(site.x, site.z), site.z);
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

  public setHologramFrozen(frozen: boolean) {
    this.holoFrozen = frozen;
    this.holoMat.opacity = frozen ? 0.55 : 0.32;
  }

  public setCinematic(shot: MarsShot, progress: number) {
    if (shot !== this.shot) {
      this.shot = shot;
      this.rover.getWorldPosition(this.shotAnchor);
    }
    this.shotT = THREE.MathUtils.clamp(progress, 0, 1);
    if (shot === 'reveal') this.setPlanOpacity(0.55 * (1 - this.shotT));
    if (shot === 'question') this.setQuestionFade(this.shotT);
  }

  private setPlanOpacity(opacity: number) {
    this.planGroup.visible = opacity > 0.03;
    for (const material of this.planMaterials) material.opacity = opacity;
  }

  private setQuestionFade(t: number) {
    const fade = THREE.MathUtils.smoothstep(t, 0.4, 1);
    for (const material of this.questionFade) {
      if ('opacity' in material) material.opacity = 1 - fade;
    }
    this.questionExtras.visible = fade < 0.98;
  }

  private addTerrain() {
    const geo = new THREE.PlaneGeometry(130, 130, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(0x7a3b2c);
    const mid = new THREE.Color(0xc4623e);
    const high = new THREE.Color(0xe0b08a);
    const color = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = marsHeight(x, z);
      pos.setY(i, h);
      const lift = THREE.MathUtils.clamp(h / 5.5, 0, 1);
      const basin = THREE.MathUtils.clamp(1 - Math.hypot(x, z) / 18, 0, 1);
      color.copy(low).lerp(mid, lift);
      color.lerp(new THREE.Color(0x5c2c24), basin * 0.45);
      color.lerp(high, Math.max(0, lift - 0.55));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0.02 })
    );
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

  private addLakeBed() {
    const bed = new THREE.Mesh(
      new THREE.CircleGeometry(9, 40),
      new THREE.MeshStandardMaterial({ color: 0x4a2e28, roughness: 1, metalness: 0 })
    );
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = marsHeight(0, 0) + 0.04;
    bed.receiveShadow = true;
    this.basin.add(bed);
  }

  private addRocks() {
    const geo = new THREE.IcosahedronGeometry(0.55, 0);
    const mats = [0x8d4b3a, 0x6e5348, 0xc4b39a].map(
      color => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0.04 })
    );
    (['igneous', 'sedimentary', 'mudstone'] as const).forEach((id, index) => {
      const site = SITES[id];
      const rock = new THREE.Mesh(geo, mats[index]);
      const scaleX = 1.1 + index * 0.15;
      rock.scale.set(scaleX, 0.72, 0.95);
      rock.position.set(site.x, marsHeight(site.x, site.z) + 0.28, site.z);
      rock.rotation.y = index;
      this.markShadows(rock);
      this.basin.add(rock);
      this.colliders.push({ x: site.x, z: site.z, radius: 0.55 * Math.max(scaleX, 0.95) });
    });

    const scatterMat = new THREE.MeshStandardMaterial({ color: 0x7c4034, roughness: 0.9 });
    const scatterGeo = new THREE.DodecahedronGeometry(0.28, 0);
    for (let i = 0; i < 16; i++) {
      const angle = i * 2.399;
      const radius = 10 + (i % 5) * 6.2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (this.nearSite(x, z, 3.2) || Math.hypot(x - ROVER_START.x, z - ROVER_START.z) < 4) continue;
      const stone = new THREE.Mesh(scatterGeo, scatterMat);
      stone.position.set(x, marsHeight(x, z) + 0.12, z);
      stone.scale.setScalar(0.6 + (i % 4) * 0.25);
      stone.rotation.set(i, angle, i * 0.2);
      this.markShadows(stone);
      this.basin.add(stone);
    }
  }

  private nearSite(x: number, z: number, radius: number) {
    return Object.values(SITES).some(site => Math.hypot(site.x - x, site.z - z) < radius);
  }

  private addCache() {
    const tubes = new THREE.Group();
    tubes.name = 'SampleTubes';
    const glass = new THREE.MeshStandardMaterial({ color: 0xd5dee8, metalness: 0.72, roughness: 0.18 });
    const cap = new THREE.MeshStandardMaterial({ color: 0xe8b84a, metalness: 0.82, roughness: 0.22 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 0.38;
      const z = Math.sin(angle) * 0.38;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12), glass);
      tube.position.set(x, 0.28, z);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.045, 12), cap);
      lid.position.set(x, 0.5, z);
      tubes.add(tube, lid);
    }
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: 0x6a4336, roughness: 0.82 })
    );
    tray.position.y = 0.05;
    tubes.add(tray);
    this.plant(tubes, 0, 0);
    this.markShadows(tubes);
    this.colliders.push({ x: 0, z: 0, radius: 0.9 });

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

  private addPlanHardware() {
    const group = new THREE.Group();
    group.name = 'ReturnPlan';
    const holo = () => {
      const material = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.45,
        wireframe: true
      });
      this.planMaterials.push(material);
      return material;
    };
    const lander = new THREE.Group();
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.35, 8), holo());
    deck.position.y = 0.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 1.15), holo());
    body.position.y = 0.95;
    lander.add(deck, body);
    const mav = new THREE.Group();
    const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 2.2, 10), holo());
    rocket.position.set(0.15, 2.3, 0.1);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 10), holo());
    nose.position.set(0.15, 3.55, 0.1);
    mav.add(rocket, nose);
    group.add(lander, mav);
    this.plant(group, PLAN_SITE.x, PLAN_SITE.z);
    this.basin.add(group);
    return group;
  }

  private addQuestionStage() {
    const group = new THREE.Group();
    group.position.set(240, 30, 0);
    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 28, 18),
      new THREE.MeshStandardMaterial({ color: 0xc4513a, roughness: 0.82 })
    );
    const extras = new THREE.Group();
    extras.name = 'QuestionExtras';
    const solid = (color: number) => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, transparent: true });
      this.questionFade.push(material);
      return material;
    };
    const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.4, 10), solid(0xe2e8f0));
    rocket.position.set(6.5, 0.4, 1.5);
    const orbiter = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 24), solid(0xcbd5e1));
    orbiter.position.set(-1.5, 2.4, 7);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.35, 20, 14), solid(0x3b82c4));
    earth.position.set(11, 0.6, -5);
    extras.add(rocket, orbiter, earth);
    group.add(mars, extras);
    this.markShadows(group);
    this.basin.add(group);
    return group;
  }

  private addTrio() {
    const group = new THREE.Group();
    group.position.set(-240, 48, 0);
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.9 })
    );
    moon.position.x = -14;
    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xc4553a, roughness: 0.8 })
    );
    mars.position.x = 14;
    const voyager = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.28 });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), metal);
    dish.rotation.x = Math.PI * 0.5;
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), metal);
    boom.rotation.z = Math.PI / 2;
    boom.position.x = 1.5;
    const record = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.7, roughness: 0.35 })
    );
    record.rotation.x = Math.PI / 2;
    record.position.set(0.15, 0.15, 0.9);
    voyager.add(dish, boom, record);
    voyager.scale.setScalar(1.7);
    voyager.rotation.set(0.35, -0.7, 0.15);
    group.add(moon, mars, voyager);
    this.markShadows(group);
    this.basin.add(group);
    return group;
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
    this.beaconBeam = beamMat;
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
    diamond.name = 'BeaconDiamond';
    diamond.position.y = 2.2;
    group.add(new THREE.Mesh(beamGeo, beamMat), diamond);
    const site = SITES.igneous;
    group.position.set(site.x, marsHeight(site.x, site.z), site.z);
    this.basin.add(group);
    return group;
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

  /** Bob, tumble, and pulse the waypoint the way a Moon marker does. */
  private updateBeacon(dt: number) {
    const diamond = this.diamond as THREE.Mesh;
    const material = diamond.material as THREE.MeshStandardMaterial;
    diamond.position.y = 2.2 + Math.sin(this.elapsed * 2.8 + this.beacon.position.x * 0.5) * 0.15;
    diamond.rotation.y += dt * 2.2;
    diamond.rotation.x += dt * 0.9;
    const pulse = Math.sin(this.elapsed * 3.5);
    const fastPulse = Math.sin(this.elapsed * 7.5);
    if (this.near) {
      if (this.beaconBeam) this.beaconBeam.opacity = 0.62 + 0.06 * fastPulse;
      material.emissiveIntensity = 1.4 + 0.5 * fastPulse;
    } else {
      if (this.beaconBeam) this.beaconBeam.opacity = 0.48 + 0.05 * pulse;
      material.emissiveIntensity = 0.85;
    }
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
    this.focusPoint.set(site.x, marsHeight(site.x, site.z) + 0.5, site.z);
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
    this.sun.position.set(this.look.x + 32, this.look.y + 36, this.look.z + 18);
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
    const showBeacon = (this.shot === 'drive' || this.shot === 'focus' || this.shot === 'intro') && this.live !== null;
    this.beacon.visible = showBeacon;
    this.updateNear();
    this.updateBeacon(dt);
    this.applyCamera(dt);
    this.updateSunShadow();
    this.projectJezero();
    this.projectPerseverance();
    this.projectFocus();
    this.publish();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private blockedAt(x: number, z: number) {
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
    } else if (!this.blockedAt(nx, this.z)) {
      this.x = nx;
    } else if (!this.blockedAt(this.x, nz)) {
      this.z = nz;
    } else {
      this.velocity = 0;
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

  private updateNear() {
    if (!this.live || (this.shot !== 'drive' && this.shot !== 'intro')) {
      if (this.near) {
        this.near = false;
        this.onNear?.(false);
      }
      return;
    }
    const site = SITES[this.live];
    const dist = Math.hypot(this.x - site.x, this.z - site.z);
    const near = this.near ? dist < 7.6 : dist < 6.2;
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
      this.desired.set(site.x + 5.2, y + 2.3, site.z + 5.2);
      this.look.set(site.x, y + 0.9, site.z);
    } else if (this.shot === 'reveal') {
      this.desired.set(13, 5.5, 15);
      this.look.set(0, 0.7, -1);
      this.fog.density = 0.012;
    } else if (this.shot === 'question') {
      this.desired.set(252, 34, 16);
      this.look.copy(this.questionGroup.position);
      this.fog.density = 0.01;
    } else if (this.shot === 'preserve') {
      const t = this.shotT;
      this.desired.set(8 - t * 5.5, 3.2 - t * 1.5, 8 - t * 5.2);
      this.look.set(0, 0.45, 0);
      this.fog.density = 0.013;
    } else if (this.shot === 'questions') {
      const site = SITES.terminal;
      const y = marsHeight(site.x, site.z);
      const angle = this.shotT * Math.PI * 1.35;
      this.desired.set(site.x + Math.cos(angle) * 4.4, y + 1.8, site.z + Math.sin(angle) * 4.4);
      this.look.set(site.x, y + 1.6, site.z);
      this.fog.density = 0.013;
    } else if (this.shot === 'inspire') {
      const t = this.shotT;
      this.desired.set(this.shotAnchor.x, this.shotAnchor.y + 2 + t * 34, this.shotAnchor.z + 8);
      this.look.set(this.shotAnchor.x, 6 + t * 22, this.shotAnchor.z - 30);
      this.fog.density = 0.01;
    } else if (this.shot === 'closing') {
      const t = this.shotT;
      if (t < 0.46) {
        const u = t / 0.46;
        this.desired.set(this.shotAnchor.x - 6, this.shotAnchor.y + 3 + u * 32, this.shotAnchor.z + 14);
        this.look.set(0, u * 4, -8);
        this.fog.density = 0.012;
      } else {
        const u = (t - 0.46) / 0.54;
        this.desired.set(this.trio.position.x, this.trio.position.y + 6, this.trio.position.z + 16 + u * 42);
        this.look.copy(this.trio.position);
        this.fog.density = 0.008;
      }
    } else {
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      const y = marsHeight(this.x, this.z);
      this.desired.set(this.x - fx * 7.4, y + 3.15, this.z - fz * 7.4);
      this.look.set(this.x + fx * 3.2, y + 1.05, this.z + fz * 3.2);
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

  private publish() {
    const site = this.live ? SITES[this.live] : null;
    this.onTelemetry?.({
      speed: Math.abs(this.velocity),
      heading: (this.heading * 180) / Math.PI,
      distanceToTarget: site ? Math.hypot(this.x - site.x, this.z - site.z) : 0,
      position: { x: this.x, z: this.z },
      cache: { x: 0, z: 0 },
      rangeRadius: MARS_RANGE
    });
  }
}
