import * as THREE from 'three';
import { BodySpring, MOON_DRIVE, driveStep } from './roverDynamics';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildApolloSceneModels, RoverRig, SceneModels } from './apolloModels';
import { ArtifactId, MarkerId, RoverTelemetry } from '../types/game';
import { ReplaceableModelType, customModelManager } from './modelLoader';
import { disposeScene } from './disposeScene';
import { ARTIFACTS, LASER_STATION } from '../data/artifactsData';

/** Convex hull of points on the ground, counter-clockwise seen from above (x right, z toward the viewer). */
function convexHull(points: { x: number; z: number }[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length < 3) return sorted;
  const cross = (o: { x: number; z: number }, a: { x: number; z: number }, b: { x: number; z: number }) =>
    (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower: { x: number; z: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { x: number; z: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Parts of the lander higher than this above the ground are over the rover's roof and do not block it. */
const ROVER_HEIGHT = 1.6;

// Software WebGL Detection
export const isSoftwareGl = (() => {
  if (typeof window === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Reusable math vectors to ensure zero GC in the animation loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3Target = new THREE.Vector3();
const _sunWorld = new THREE.Vector3();
const _sunNdc = new THREE.Vector3();
const _sunView = new THREE.Vector3();

export interface CameraStateConfig {
  mode: 'title' | 'intro' | 'explore' | 'inspect' | 'ranging' | 'outro' | 'warp';
  targetArtifact?: ArtifactId | null;
  introProgress?: number; // 0 to 1
  outroProgress?: number; // 0 to 1
}

/**
 * Inspection Marker structure for the GTA Vice City-style glowing surface area markers
 */
export interface InspectionMarkerVisual {
  artifactId: MarkerId;
  group: THREE.Group;
  cylinderBeam: THREE.Mesh;
  diamond: THREE.Mesh;
  position: THREE.Vector3;
  radius: number;
  visited: boolean;
  inside: boolean;
}

/**
 * Procedural vertical gradient texture for the marker column
 */
function createMarkerBeamTexture(): THREE.CanvasTexture {
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

export class ApolloThreeEngine {
  private container: HTMLDivElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  private frameId: number = 0;
  private isDisposed: boolean = false;

  // Scene Components
  public models!: SceneModels;
  private customActiveModels: Partial<Record<ReplaceableModelType, boolean>> = {};
  private terrainMesh!: THREE.Object3D;
  private terrainRaycast = false;
  private regolithMap: THREE.Texture | null = null;
  private regolithReady: Promise<void> = Promise.resolve();
  private readonly heightRay = new THREE.Raycaster();
  private readonly heightRayOrigin = new THREE.Vector3();
  private readonly heightRayDown = new THREE.Vector3(0, -1, 0);
  private heightField: {
    originX: number;
    originZ: number;
    cellX: number;
    cellZ: number;
    cols: number;
    rows: number;
    heights: Float32Array;
  } | null = null;
  private readonly sunDirection = new THREE.Vector3(1000, 1500, 0).normalize();
  private starsParticles!: THREE.Points;
  private warpLines!: THREE.LineSegments;
  private warpGeometry!: THREE.BufferGeometry;
  // Laser Animation & Volumetric Visuals
  private isLaserFiring: boolean = false;
  private laserProgress: number = 0;
  private laserPulseGroup!: THREE.Group;
  private laserCoreMesh!: THREE.Mesh;
  private laserHaloMesh!: THREE.Mesh;
  private laserPacketMesh!: THREE.Mesh;
  private laserSparkMesh!: THREE.Mesh;
  private laserRippleMesh!: THREE.Mesh;
  // Centimeters at the reflector, meters at Earth, so the line stays a thread on screen.
  private readonly laserCoreMoon = 0.018;
  private readonly laserCoreEarth = 26;
  private readonly laserHaloMoon = 0.04;
  private readonly laserHaloEarth = 46;
  private earthLaserPos: THREE.Vector3 = new THREE.Vector3(-19890.44, 2091.26, 0);
  /** World-space radius of the Earth model, including the atmosphere shell. */
  private earthVisualRadius = 0;
  private reflectorLaserPos: THREE.Vector3 = new THREE.Vector3(-2.12, 0.5, 21.53);
  private sunLight!: THREE.DirectionalLight;
  private sunAnchor = new THREE.Vector3();
  private hasSun = false;
  /** Screen positions of the Sun and Earth models, for the same leader labels Mission 2 uses. */
  public readonly sunScreen = { x: 0, y: 0, visible: false };
  /** Screen positions of the Eagle descent stage and the retroreflector, for the tappable part labels. */
  public readonly partScreen = {
    descent: { x: 0, y: 0, visible: false },
    reflector: { x: 0, y: 0, visible: false }
  };
  private readonly partAnchor = { descent: new THREE.Vector3(), reflector: new THREE.Vector3() };
  private partAnchorKey = '';
  public readonly earthScreen = { x: 0, y: 0, visible: false, tipLeft: 0 };

  // Rover Kinematics
  private roverVelocity: number = 0;
  /** -1..1 throttle and smoothed steering for the drive model (roverDynamics.ts). */
  private roverThrottle = 0;
  private roverSteer = 0;
  private readonly roverSpring = new BodySpring();
  /** Wall-clock time of the last frame, so the simulation runs at real speed on any screen. */
  private lastTickAt = 0;
  /** The rover starts facing the first marker, so the first push forward goes the right way. */
  private roverHeading: number = Math.atan2(
    ARTIFACTS.descent_stage.markerPosition[0] - 8,
    ARTIFACTS.descent_stage.markerPosition[2] - 7
  );
  private roverPose: 'charging' | 'booting' | 'ready' = 'charging';
  private roverBootStart = 0;
  private roverBootNotified = false;
  public onRoverBootComplete?: () => void;
  private readonly dishAim = new THREE.Vector3();
  private roverPosition: THREE.Vector3 = new THREE.Vector3(8, 0, 7);
  /** Horizontal reach of the wheels, so the body stops before it overlaps a solid. */
  private readonly roverClearance = 0.9;
  private readonly solidBoxes: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  /** Convex outlines, counter-clockwise seen from above, already grown by the rover's reach. */
  private readonly solidOutlines: { x: number; z: number }[][] = [];
  private landerX = ARTIFACTS.descent_stage.position[0];
  private landerZ = ARTIFACTS.descent_stage.position[2];
  /** Radius of the circle that covers half the lunar surface, centered on the lander. */
  private roverMaxDistance = Infinity;
  private roverTargetSpeed: number = 0;
  private roverTurnInput: number = 0;
  private roverPitch = 0;
  private roverRoll = 0;
  private suspensionGroup: THREE.Object3D | null = null;
  private suspensions: {
    wheel: THREE.Object3D;
    restLocal: THREE.Vector3;
    radius: number;
    direct: boolean;
  }[] = [];
  private readonly suspensionDir = new THREE.Vector3();

  // Camera Management
  private cameraConfig: CameraStateConfig = { mode: 'title' };
  private introActive = false;
  private introStartedAt = 0;
  private introHoldUntil = 0;
  private readonly introStartCam = new THREE.Vector3(22.669, 45, 54.138);
  private readonly introMidCam = new THREE.Vector3(-5.331, 16, 19.138);
  private readonly introLookStart = new THREE.Vector3(-17.331, 2, -5.862);
  private readonly introLookMid = new THREE.Vector3(-17.331, 1.5, -5.862);
  private shadowDirty = true;
  private shadowAnchorX = Number.NaN;
  private shadowAnchorZ = Number.NaN;
  private shadowAnchorHeading = Number.NaN;
  private telemetryStamp = '';
  private nearStamp: MarkerId | null | undefined = undefined;
  public onIntroCameraSettled?: () => void;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);
  private readonly plaqueLook = new THREE.Vector3(-17.396, 2.706, -2.227);
  private readonly plaqueNormal = new THREE.Vector3(0, 0.409, 0.913);
  private readonly plaqueLocalCenter = new THREE.Vector3();
  private readonly plaqueLocalNormal = new THREE.Vector3(0, 0, 1);
  private plaqueAimId = 0;
  private readonly plaqueNdc = new THREE.Vector3();
  public readonly plaqueScreenPoint = { x: 0, y: 0, visible: false };

  // GTA Vice City Glowing Surface Markers
  private inspectionMarkers: Map<MarkerId, InspectionMarkerVisual> = new Map();
  private visibleMarkerIds: MarkerId[] | null = null;
  private visitedArtifacts: Record<ArtifactId, boolean> | null = null;
  private elapsedTime: number = 0;

  // Callbacks
  public onTelemetryUpdate?: (telemetry: RoverTelemetry) => void;
  public onNearArtifact?: (artifactId: MarkerId | null, distance: number) => void;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      logarithmicDepthBuffer: true
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // The shadow map only changes when something in the scene moves. The flyby camera does not.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a); // Deep lunar space void
    this.scene.fog = new THREE.FogExp2(0x02040a, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      80000
    );
    this.camera.position.set(-17.331, 12, 22.138);

    // 3. Studio Reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Initialize World. Blender models are loaded before the first frame,
    // so the procedural stand-ins are never drawn.
    this.renderer.domElement.style.visibility = 'hidden';
    this.initLights();
    this.initStars();
    this.initWarpLines();
    this.initLaser();
    this.initModels();
    this.loadRegolithMap();

    // 5. Window Resize Handler
    window.addEventListener('resize', this.onResize);

    // 6. Start Loop once the bundled models are in the scene
    this.tick = this.tick.bind(this);
    void this.presentBundledModels();
  }

  /** The Blender tile repeats 64 times across the kilometre-wide ground. */
  private loadRegolithMap() {
    this.regolithReady = new Promise(resolve => {
      new THREE.TextureLoader().load('/models/regolith_tile.jpg', tex => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(64, 64);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.regolithMap = tex;
        if (this.terrainMesh) this.dressTerrain(this.terrainMesh);
        resolve();
      }, undefined, () => resolve());
    });
  }

  private dressTerrain(root: THREE.Object3D) {
    const map = this.regolithMap;
    if (!map) return;
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (!('map' in material)) return;
        const mat = material as THREE.MeshStandardMaterial;
        mat.map = map;
        mat.bumpMap = map;
        mat.bumpScale = 0.05;
        mat.roughness = 0.92;
        mat.metalness = 0;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      });
    });
  }

  /**
   * The exported terrain is a regular grid. Copy its heights once so the rover
   * can sample the ground without raycasting every triangle each frame.
   */
  private buildTerrainHeightField(root: THREE.Object3D) {
    this.heightField = null;
    const baked = root.userData.bakedField as typeof this.heightField;
    if (baked) {
      this.heightField = baked;
      return;
    }
    let source: THREE.Mesh | null = null;
    root.updateWorldMatrix(true, true);
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
      if (!source || mesh.geometry.attributes.position.count > source.geometry.attributes.position.count) {
        source = mesh;
      }
    });
    if (!source) return;
    const mesh: THREE.Mesh = source;
    const pos = mesh.geometry.attributes.position;
    const cols = Math.round(Math.sqrt(pos.count));
    if (cols * cols !== pos.count || cols < 2) return;

    const point = new THREE.Vector3();
    const at = (index: number) => {
      mesh.localToWorld(point.set(pos.getX(index), pos.getY(index), pos.getZ(index)));
      return point;
    };
    const origin = at(0).clone();
    const alongCol = at(1).clone().sub(origin);
    const alongRow = at(cols).clone().sub(origin);
    if (Math.abs(alongCol.z) > Math.abs(alongCol.x) * 0.02) return;
    if (Math.abs(alongRow.x) > Math.abs(alongRow.z) * 0.02) return;
    if (Math.abs(alongCol.x) < 1e-4 || Math.abs(alongRow.z) < 1e-4) return;

    const heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) heights[i] = at(i).y;
    this.heightField = {
      originX: origin.x,
      originZ: origin.z,
      cellX: alongCol.x,
      cellZ: alongRow.z,
      cols,
      rows: cols,
      heights
    };
  }

  /**
   * Computes height on lunar regolith surface
   */
  public getLunarHeight(x: number, z: number): number {
    const field = this.heightField;
    if (field) {
      const col = (x - field.originX) / field.cellX;
      const row = (z - field.originZ) / field.cellZ;
      if (col >= 0 && row >= 0 && col <= field.cols - 1 && row <= field.rows - 1) {
        const c0 = Math.floor(col);
        const r0 = Math.floor(row);
        const c1 = Math.min(c0 + 1, field.cols - 1);
        const r1 = Math.min(r0 + 1, field.rows - 1);
        const tx = col - c0;
        const tz = row - r0;
        const h = field.heights;
        const cols = field.cols;
        const h00 = h[r0 * cols + c0];
        const h10 = h[r0 * cols + c1];
        const h01 = h[r1 * cols + c0];
        const h11 = h[r1 * cols + c1];
        return (h00 + (h10 - h00) * tx) * (1 - tz) + (h01 + (h11 - h01) * tx) * tz;
      }
    }

    if (this.terrainRaycast && this.terrainMesh) {
      this.heightRayOrigin.set(x, 4000, z);
      this.heightRay.set(this.heightRayOrigin, this.heightRayDown);
      const hits = this.heightRay.intersectObject(this.terrainMesh, true);
      if (hits.length > 0) return hits[0].point.y;
      return 0;
    }

    // Keep landing zone smooth around Eagle (0, 0)
    const distFromCenter = Math.hypot(x, z);
    const flatFactor = Math.min(1, Math.max(0, (distFromCenter - 6) / 12));

    // Rolling lunar swells
    const swell = (Math.sin(x * 0.05) * Math.cos(z * 0.05) * 1.5 +
                   Math.sin(x * 0.1 + z * 0.08) * 0.8) * flatFactor;

    // Crater at (24, -18)
    const dCrater1 = Math.hypot(x - 24, z + 18);
    let crater1 = 0;
    if (dCrater1 < 10) {
      crater1 = -Math.cos((dCrater1 / 10) * Math.PI * 0.5) * 2.2;
    }

    // Crater at (-28, 22)
    const dCrater2 = Math.hypot(x + 28, z - 22);
    let crater2 = 0;
    if (dCrater2 < 8) {
      crater2 = -Math.cos((dCrater2 / 8) * Math.PI * 0.5) * 1.6;
    }

    return swell + crater1 + crater2;
  }

  private initLights() {
    // Direct Solar Beam (harsh vacuum sunlight)
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 3.2);
    this.sunLight.position.copy(this.sunDirection).multiplyScalar(80);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight.target);
    this.sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      this.sunLight.shadow.mapSize.width = 2048;
      this.sunLight.shadow.mapSize.height = 2048;
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 140;
      const d = 30;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0004;
    }
    this.scene.add(this.sunLight);

    // Deep space fill light (rebounding earthlight)
    const earthLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    earthLight.position.set(-60, 40, -80);
    this.scene.add(earthLight);

    // Subtle hemisphere ambient fill
    const hemiLight = new THREE.HemisphereLight(0x0f172a, 0x1e293b, 0.45);
    this.scene.add(hemiLight);
  }

  private initStars() {
    const starCount = 2500;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 500 + Math.random() * 200;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 15; // Upper celestial sphere
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Star color temperatures (white, pale cyan, subtle amber)
      const t = Math.random();
      if (t < 0.7) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      } else if (t < 0.9) {
        colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.7;
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.starsParticles = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starsParticles);
  }

  private initWarpLines() {
    const lineCount = 500;
    this.warpGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6);

    for (let i = 0; i < lineCount; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 200;
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z - 2; // initial short streak
    }

    this.warpGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const warpMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.0
    });

    this.warpLines = new THREE.LineSegments(this.warpGeometry, warpMat);
    this.warpLines.position.set(0, 100, -300);
    this.scene.add(this.warpLines);
  }

  private initLaser() {
    this.laserPulseGroup = new THREE.Group();
    this.laserPulseGroup.visible = false;

    const earthPos = this.earthLaserPos;
    const reflectorPos = this.reflectorLaserPos;

    const dir = new THREE.Vector3().subVectors(reflectorPos, earthPos);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(earthPos, reflectorPos).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );

    // A 532 nm ranging pulse is a few centimeters long and does not light the vacuum,
    // so the trace is a hairline. It widens toward Earth only enough to stay visible.
    const coreGeo = this.laserBeamGeometry(length, this.laserCoreMoon, this.laserCoreEarth);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x3ddc6e,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
    this.laserCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.laserCoreMesh.position.copy(mid);
    this.laserCoreMesh.quaternion.copy(orientation);
    this.laserPulseGroup.add(this.laserCoreMesh);

    const haloGeo = this.laserBeamGeometry(length, this.laserHaloMoon, this.laserHaloEarth);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
    this.laserHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.laserHaloMesh.position.copy(mid);
    this.laserHaloMesh.quaternion.copy(orientation);
    this.laserPulseGroup.add(this.laserHaloMesh);

    // Short streak standing in for the pulse. Scaled each frame so it stays a dash, not a ball.
    const packetGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0xd1fae5,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
    this.laserPacketMesh = new THREE.Mesh(packetGeo, packetMat);
    this.laserPacketMesh.position.copy(earthPos);
    this.laserPacketMesh.quaternion.copy(orientation);
    this.laserPulseGroup.add(this.laserPacketMesh);

    // Glint on the corner-cube array. The Apollo 11 panel is 46 cm across.
    const sparkGeo = new THREE.SphereGeometry(0.16, 16, 12);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.laserSparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    this.laserSparkMesh.position.copy(reflectorPos);
    this.laserPulseGroup.add(this.laserSparkMesh);

    // Small glint ring on the array, not a ground shockwave.
    const rippleGeo = new THREE.RingGeometry(0.12, 0.22, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    this.laserRippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    this.laserRippleMesh.position.set(reflectorPos.x, reflectorPos.y + 0.05, reflectorPos.z);
    this.laserPulseGroup.add(this.laserRippleMesh);

    this.scene.add(this.laserPulseGroup);
  }

  private initModels() {
    this.models = buildApolloSceneModels(this.renderer);

    // The rover, flag, and Voyager have no Blender file. The lander, reflector,
    // and Earth are added only after their GLBs load.
    this.scene.add(this.models.roverGroup);
    this.scene.add(this.models.flagGroup);
    this.scene.add(this.models.voyagerGroup);

    this.models.flagGroup.position.y = this.getLunarHeight(-23.331, 2.138);

    this.roverPosition.set(8, this.getLunarHeight(8, 7), 7);
    this.models.roverGroup.position.copy(this.roverPosition);
    this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;
    this.rebuildSolidBoxes();
  }

  /** Load every bundled GLB, then reveal the canvas. */
  private async presentBundledModels() {
    await Promise.all([this.checkDefaultPublicModels(), this.regolithReady]);
    if (this.isDisposed) return;
    if (this.terrainMesh) this.dressTerrain(this.terrainMesh);
    this.initInspectionMarkers();
    this.reseatSurfaceObjects();
    this.retargetLaser();
    this.shadowDirty = true;
    this.renderer.domElement.style.visibility = 'visible';
    this.tick();
  }

  /**
   * Replace any of the game's 3D models with a custom Blender model
   */
  public replaceModel(type: ReplaceableModelType, newGroup: THREE.Group, wheels?: THREE.Mesh[]) {
    this.shadowDirty = true;
    if (type === 'rover') {
      this.scene.remove(this.models.roverGroup);
      this.models.roverGroup = newGroup;
      this.models.roverGroup.position.copy(this.roverPosition);
      this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;
      this.scene.add(newGroup);
      if (wheels && wheels.length > 0) {
        this.models.roverWheels = wheels;
      }
      this.models.roverRig = null;
      this.suspensionGroup = null;
      this.customActiveModels.rover = true;

    } else if (type === 'descent_stage') {
      this.scene.remove(this.models.descentStageGroup);
      this.models.descentStageGroup = newGroup;
      this.scene.add(newGroup);
      this.seatOnGround(newGroup, 0.22);
      this.updateLanderAnchor();
      this.customActiveModels.descent_stage = true;
      this.rebuildSolidBoxes();

    } else if (type === 'retroreflector') {
      this.scene.remove(this.models.retroreflectorGroup);
      this.models.retroreflectorGroup = newGroup;
      this.scene.add(newGroup);
      this.seatOnGround(newGroup);
      this.syncReflectorLaserPos();
      this.customActiveModels.retroreflector = true;
      this.rebuildSolidBoxes();

    } else if (type === 'voyager') {
      this.scene.remove(this.models.voyagerGroup);
      newGroup.rotation.set(0, 0, 0);
      newGroup.position.set(0, 0, 0);
      newGroup.scale.setScalar(1);
      newGroup.updateWorldMatrix(true, true);
      const size = new THREE.Box3().setFromObject(newGroup).getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (longest > 0) newGroup.scale.setScalar(13 / longest);
      this.models.voyagerGroup = newGroup;
      newGroup.position.set(0, -500, 0);
      this.scene.add(newGroup);
      this.customActiveModels.voyager = true;

    } else if (type === 'terrain') {
      if (this.terrainMesh) this.scene.remove(this.terrainMesh);
      this.setShadowFlags(newGroup, false, true);
      this.terrainMesh = newGroup;
      this.scene.add(newGroup);
      this.terrainRaycast = true;
      this.dressTerrain(newGroup);
      this.buildTerrainHeightField(newGroup);
      this.updateRoverRange(newGroup);
      this.customActiveModels.terrain = true;
      this.reseatSurfaceObjects();
      if (this.customActiveModels.descent_stage) {
        this.seatOnGround(this.models.descentStageGroup, 0.22);
        this.updateLanderAnchor();
      }
      if (this.customActiveModels.retroreflector) {
        this.seatOnGround(this.models.retroreflectorGroup);
        this.syncReflectorLaserPos();
      }
      this.rebuildSolidBoxes();

    } else if (type === 'earth') {
      this.scene.remove(this.models.earthMesh);
      this.setShadowFlags(newGroup, false, false);
      this.setFogEnabled(newGroup, false);
      this.tuneEarth(newGroup);
      this.models.earthMesh = newGroup;
      this.scene.add(newGroup);
      const earthBox = new THREE.Box3().setFromObject(newGroup);
      earthBox.getCenter(this.earthLaserPos);
      const earthSize = earthBox.getSize(new THREE.Vector3());
      this.earthVisualRadius = Math.max(earthSize.x, earthSize.y, earthSize.z) * 0.5;
      this.retargetLaser();
      this.customActiveModels.earth = true;

    } else if (type === 'sun') {
      this.setShadowFlags(newGroup, false, false);
      this.setFogEnabled(newGroup, false);
      this.scene.add(newGroup);
      newGroup.updateWorldMatrix(true, true);
      new THREE.Box3().setFromObject(newGroup).getCenter(this.sunAnchor);
      this.hasSun = true;
      this.customActiveModels.sun = true;

    } else if (type === 'footprints') {
      newGroup.visible = false;
      this.scene.add(newGroup);
      this.customActiveModels.footprints = true;
    }
  }

  private async checkDefaultPublicModels() {
    const defaultPaths: { type: ReplaceableModelType; url: string }[] = [
      { type: 'descent_stage', url: '/models/descent_stage.glb' },
      { type: 'retroreflector', url: '/models/retroreflector.glb' },
      { type: 'earth', url: '/models/earth.glb' },
      { type: 'sun', url: '/models/sun.glb' },
      { type: 'rover', url: '/models/rover.glb' },
    ];

    // No HEAD probe first: on a slow link it would cost a round trip per file. A missing
    // file (the optional rover) fails to load and keeps its built stand-in.
    await Promise.all([this.loadTerrainFromHeights(), ...defaultPaths.map(async (item) => {
      try {
        const loaded = await customModelManager.loadFromUrl(item.url, item.type);
        if (this.isDisposed) return;
        this.replaceModel(item.type, loaded.scene, loaded.wheels);
      } catch {
        // A missing optional file, such as the rover, keeps its built model.
      }
    })]);
  }

  /**
   * The ground is a regular grid, so the game downloads only its heights (about 0.3 MB) and builds
   * the mesh here, instead of downloading a 14 MB model of 500,000 triangles. The heights come from
   * model-sources/terrain.glb through scripts/build-terrain-heightmap.mjs.
   */
  private async loadTerrainFromHeights() {
    try {
      const response = await fetch('/models/terrain-heights.bin');
      if (!response.ok) return;
      const data = await response.arrayBuffer();
      if (this.isDisposed) return;
      const header = new DataView(data);
      if (header.getUint32(0, true) !== 0x31504d48) return; // 'HMP1'
      const cols = header.getUint16(4, true);
      const rows = header.getUint16(6, true);
      const cell = header.getFloat32(8, true);
      const originX = header.getFloat32(12, true);
      const originZ = header.getFloat32(16, true);
      const lowest = header.getFloat32(20, true);
      const range = header.getFloat32(24, true);
      const count = cols * rows;
      if (data.byteLength < 28 + count * 2) return;

      // Undo the row-by-row differences, rebuilding the heights in metres.
      const bytes = new Uint8Array(data, 28);
      const heights = new Float32Array(count);
      for (let r = 0; r < rows; r++) {
        let value = 32768; // every row starts from the middle of the range
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const zigzag = (bytes[i] << 8) | bytes[count + i];
          value += (zigzag >>> 1) ^ -(zigzag & 1);
          heights[i] = lowest + (value / 65535) * range;
        }
      }

      const group = new THREE.Group();
      group.name = 'TranquilityBaseTerrain';
      group.add(this.buildTerrainMesh(heights, cols, rows, cell, originX, originZ));
      group.userData.bakedField = { originX, originZ, cellX: cell, cellZ: -cell, cols, rows, heights };
      this.replaceModel('terrain', group);
    } catch {
      // Without the file the procedural ground stays.
    }
  }

  private voyagerRequested = false;

  /**
   * Voyager appears only in the closing shot, so the menu does not download its 2.4 MB model.
   * The download starts once a mission begins. If it is not there by the closing shot, the
   * built-in stand-in is shown instead.
   */
  /** Start the Voyager download early, once the ending is near, so it is ready in time. */
  public preloadVoyager() {
    this.loadVoyagerModel();
  }

  private loadVoyagerModel() {
    if (this.voyagerRequested || this.isDisposed) return;
    this.voyagerRequested = true;
    customModelManager
      .loadFromUrl('/models/voyager.glb', 'voyager')
      .then(loaded => {
        if (!this.isDisposed) this.replaceModel('voyager', loaded.scene, loaded.wheels);
      })
      .catch(() => {
        // The stand-in built in code stays.
      });
  }

  /** Weak devices draw every second point of the grid. Driving still follows the full-detail heights. */
  private terrainStep() {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const weak = isSoftwareGl || (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
    return weak ? 2 : 1;
  }

  private buildTerrainMesh(heights: Float32Array, cols: number, rows: number, cell: number, originX: number, originZ: number) {
    const step = this.terrainStep();
    const gridCols = Math.floor((cols - 1) / step) + 1;
    const gridRows = Math.floor((rows - 1) / step) + 1;
    const positions = new Float32Array(gridCols * gridRows * 3);
    const uvs = new Float32Array(gridCols * gridRows * 2);
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const v = r * gridCols + c;
        const source = r * step * cols + c * step;
        positions[v * 3] = originX + c * step * cell;
        positions[v * 3 + 1] = heights[source];
        positions[v * 3 + 2] = originZ - r * step * cell;
        uvs[v * 2] = c / (gridCols - 1);
        uvs[v * 2 + 1] = 1 - r / (gridRows - 1);
      }
    }
    const indices = new Uint32Array((gridCols - 1) * (gridRows - 1) * 6);
    let k = 0;
    for (let r = 0; r < gridRows - 1; r++) {
      for (let c = 0; c < gridCols - 1; c++) {
        const a = r * gridCols + c;
        const b = a + 1;
        const d = a + gridCols;
        const e = d + 1;
        indices[k++] = a;
        indices[k++] = b;
        indices[k++] = e;
        indices[k++] = a;
        indices[k++] = e;
        indices[k++] = d;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'TerrainMesh';
    return mesh;
  }

  /** Drop a model so its lowest point rests on the lunar surface without moving it sideways. */
  private seatOnGround(group: THREE.Object3D, extraDrop = 0) {
    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const groundY = this.getLunarHeight(center.x, center.z);
    // The slope under Eagle leaves the +X foot about 22cm in the air when the body sits on the center.
    group.position.y += groundY - box.min.y - extraDrop;
  }

  private reseatSurfaceObjects() {
    this.roverPosition.y = this.getLunarHeight(this.roverPosition.x, this.roverPosition.z);
    this.models.roverGroup.position.y = this.roverPosition.y;
    this.models.flagGroup.position.y = this.getLunarHeight(-23.331, 2.138);
    this.rebuildSolidBoxes();
    for (const marker of this.inspectionMarkers.values()) {
      const y = this.getLunarHeight(marker.position.x, marker.position.z);
      marker.position.y = y;
      marker.group.position.y = y;
    }
  }

  /** +Y of the cylinder points at the Moon, so the top radius is the lunar end. */
  private laserBeamGeometry(length: number, moonRadius: number, earthRadius: number) {
    return new THREE.CylinderGeometry(moonRadius, earthRadius, length, 8, 1, true);
  }

  private placeLaserPacket(position: THREE.Vector3) {
    this.laserPacketMesh.position.copy(position);
    this.laserPacketMesh.quaternion.copy(this.laserCoreMesh.quaternion);
    const dist = Math.max(6, this.camera.position.distanceTo(position));
    const viewHeight = this.renderer.domElement.clientHeight || 800;
    const fov = (this.camera.fov * Math.PI) / 180;
    const metersPerPixel = (2 * Math.tan(fov / 2) * dist) / viewHeight;
    const length = Math.max(0.35, metersPerPixel * 8);
    const radius = Math.max(0.01, Math.min(length * 0.08, metersPerPixel * 1.2));
    this.laserPacketMesh.scale.set(radius, length, radius);
  }

  private syncReflectorLaserPos() {
    const box = new THREE.Box3().setFromObject(this.models.retroreflectorGroup);
    if (!box.isEmpty()) box.getCenter(this.reflectorLaserPos);
  }

  private retargetLaser() {
    const dir = new THREE.Vector3().subVectors(this.reflectorLaserPos, this.earthLaserPos);
    const length = Math.max(dir.length(), 0.001);
    const mid = new THREE.Vector3().addVectors(this.earthLaserPos, this.reflectorLaserPos).multiplyScalar(0.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    const beams: { mesh: THREE.Mesh; moon: number; earth: number }[] = [
      { mesh: this.laserCoreMesh, moon: this.laserCoreMoon, earth: this.laserCoreEarth },
      { mesh: this.laserHaloMesh, moon: this.laserHaloMoon, earth: this.laserHaloEarth },
    ];
    for (const beam of beams) {
      beam.mesh.geometry.dispose();
      beam.mesh.geometry = this.laserBeamGeometry(length, beam.moon, beam.earth);
      beam.mesh.position.copy(mid);
      beam.mesh.quaternion.copy(orientation);
    }
    this.laserPacketMesh.quaternion.copy(orientation);
    this.laserSparkMesh.position.copy(this.reflectorLaserPos);
    this.laserRippleMesh.position.set(
      this.reflectorLaserPos.x,
      this.reflectorLaserPos.y + 0.05,
      this.reflectorLaserPos.z
    );
  }

  private setShadowFlags(root: THREE.Object3D, cast: boolean, receive: boolean) {
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;
      }
    });
  }

  /** Keep the Blue Marble readable and wrap it in a soft spherical atmosphere. */
  private tuneEarth(root: THREE.Object3D) {
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (!('name' in material)) return;
        const named = material as THREE.Material;
        if (named.name === 'EarthAtmosphere') {
          mesh.material = this.createEarthGlowMaterial();
          mesh.scale.setScalar(1.2);
          mesh.visible = true;
          mesh.renderOrder = 1;
        } else if (named.name === 'EarthSurface' && 'emissive' in named) {
          const surface = named as THREE.MeshStandardMaterial;
          surface.emissive.setRGB(0, 0, 0);
          surface.emissiveIntensity = 0;
          surface.color.setScalar(1);
          surface.roughness = 0.55;
        }
      });
    });
  }

  /** Even blue shell so the atmosphere reads as a sphere wrapped around Earth. */
  private createEarthGlowMaterial() {
    return new THREE.MeshBasicMaterial({
      name: 'EarthAtmosphere',
      color: 0x7eb6ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.FrontSide
    });
  }

  private setFogEnabled(root: THREE.Object3D, enabled: boolean) {
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if ('fog' in material) material.fog = enabled;
      });
    });
  }

  /**
   * Initializes the glowing green surface area markers (GTA Vice City style)
   * at each artifact inspection zone on the lunar regolith.
   */
  private initInspectionMarkers() {
    const beamTex = createMarkerBeamTexture();

    const markerSpecs: { id: MarkerId; position: [number, number, number]; radius: number }[] = [
      { id: 'descent_stage', position: ARTIFACTS.descent_stage.markerPosition, radius: ARTIFACTS.descent_stage.markerRadius },
      { id: 'retroreflector', position: ARTIFACTS.retroreflector.markerPosition, radius: ARTIFACTS.retroreflector.markerRadius },
      { id: 'plaque', position: ARTIFACTS.plaque.markerPosition, radius: ARTIFACTS.plaque.markerRadius },
      { id: 'laser_station', position: LASER_STATION.position, radius: LASER_STATION.radius }
    ];

    markerSpecs.forEach(spec => {
      const id = spec.id;
      const [mx, , mz] = spec.position;
      const my = this.getLunarHeight(mx, mz);
      const radius = spec.radius || 1.6;

      const group = new THREE.Group();
      group.position.set(mx, my, mz);

      const beamGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 1.8, 32, 1, true);
      beamGeo.translate(0, 0.9, 0);
      const beamMat = new THREE.MeshBasicMaterial({
        map: beamTex,
        color: 0x00a844,
        transparent: true,
        opacity: 0.5,
        side: THREE.FrontSide,
        depthWrite: false
      });
      const cylinderBeam = new THREE.Mesh(beamGeo, beamMat);
      group.add(cylinderBeam);

      // Floating diamond beacon
      const diamondGeo = new THREE.OctahedronGeometry(0.24, 0);
      const diamondMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x4ade80,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.8
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.position.y = 2.2;
      group.add(diamond);

      group.visible = id === 'descent_stage';
      this.scene.add(group);

      this.inspectionMarkers.set(id, {
        artifactId: id,
        group,
        cylinderBeam,
        diamond,
        position: new THREE.Vector3(mx, my, mz),
        radius,
        visited: false,
        inside: false
      });
    });

    if (this.visibleMarkerIds) this.setVisibleMarkers(this.visibleMarkerIds);
    if (this.visitedArtifacts) this.setArtifactsVisited(this.visitedArtifacts);
  }

  /**
   * Updates visited status on all inspection markers
   */
  public setVisibleMarkers(ids: MarkerId[]) {
    this.visibleMarkerIds = ids;
    const allow = new Set(ids);
    for (const [id, marker] of this.inspectionMarkers.entries()) {
      marker.group.visible = allow.has(id);
    }
  }

  public setArtifactsVisited(visited: Record<ArtifactId, boolean>) {
    this.visitedArtifacts = visited;
    for (const [id, marker] of this.inspectionMarkers.entries()) {
      if (id === 'laser_station') continue;
      marker.visited = Boolean(visited[id]);
      if (marker.visited) {
        (marker.diamond.material as THREE.MeshStandardMaterial).color.setHex(0x10b981);
        (marker.diamond.material as THREE.MeshStandardMaterial).emissive.setHex(0x34d399);
      }
    }
  }

  /**
   * Set inputs from keyboard or touch joystick
   */
  public setRoverInputs(forwardInput: number, turnInput: number) {
    this.roverThrottle = forwardInput;
    this.roverTargetSpeed = forwardInput * MOON_DRIVE.topSpeed;
    this.roverTurnInput = turnInput;
  }

  /**
   * Switch active camera choreography mode
   */
  public setCameraMode(config: CameraStateConfig) {
    if (config.mode !== 'intro' && this.introActive) this.cancelIntroFlyby();
    this.cameraConfig = config;
    // Voyager is only seen in the ending. Load it then at the latest (preloadVoyager() usually came first).
    if (config.mode === 'outro' || config.mode === 'warp') this.loadVoyagerModel();
  }

  /** The opening move runs on the render clock and eases to a stop before the boot. */
  public beginIntroFlyby() {
    if (this.introActive) return;
    this.introActive = true;
    this.introStartedAt = performance.now();
    this.introHoldUntil = 0;
    this.cameraConfig = { mode: 'intro', introProgress: 0 };
  }

  public cancelIntroFlyby() {
    this.introActive = false;
    this.introHoldUntil = 0;
  }

  public snapExploreCamera() {
    this.chaseCameraPose(this.camera.position, this.cameraTarget);
    this.camera.lookAt(this.cameraTarget);
  }

  /**
   * Trigger the Earth-to-Moon Laser Pulse animation
   */
  public fireLaser() {
    this.isLaserFiring = true;
    this.laserProgress = 0;
    this.laserPulseGroup.visible = true;
    this.laserPacketMesh.position.copy(this.earthLaserPos);
    this.laserRippleMesh.visible = false;
  }

  /**
   * Main render tick
   */
  private tick() {
    if (this.isDisposed) return;

    // Real time since the last frame, capped so a stalled tab does not jump. It used to be a fixed
    // 1/60 s, which ran the whole Moon at double speed on 120 Hz screens and half speed at 30 fps.
    const now = performance.now();
    const dt = this.lastTickAt ? Math.min(Math.max((now - this.lastTickAt) / 1000, 0), 0.05) : 1 / 60;
    this.lastTickAt = now;

    // 1. Update Rover Kinematics
    this.updateRover(dt);

    // 2. Update Glowing Green GTA-style Surface Markers
    this.updateInspectionMarkers(dt);

    // 3. Update Laser Pulse
    this.updateLaser(dt);

    // 4. Update Camera Choreography
    this.updateCamera(dt);

    // 5. Slowly rotate the distant Earth in place
    const earthNode = this.models.earthMesh.getObjectByName('Earth') ?? this.models.earthMesh;
    earthNode.rotation.y += 0.018 * dt;

    this.projectSkyLabels();

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);

    this.frameId = requestAnimationFrame(this.tick);
  }

  /** Remember each wheel's unloaded pose. Rebuilt when the rover mesh is swapped. */
  private bindSuspensions() {
    const group = this.models.roverGroup;
    group.rotation.order = 'YXZ';
    group.rotation.x = 0;
    group.rotation.z = 0;
    group.updateWorldMatrix(true, true);

    const wheels = (this.models.roverWheels ?? []).filter(wheel => group.getObjectById(wheel.id));
    this.suspensions = wheels.map(wheel => {
      const storedRest = wheel.userData.suspensionRest as THREE.Vector3 | undefined;
      if (storedRest) wheel.position.copy(storedRest);
      const restLocal = group.worldToLocal(wheel.getWorldPosition(new THREE.Vector3()));
      let radius = wheel.userData.suspensionRadius as number | undefined;
      if (!radius && wheel.geometry) {
        if (!wheel.geometry.boundingSphere) wheel.geometry.computeBoundingSphere();
        radius = wheel.geometry.boundingSphere?.radius;
      }
      return {
        wheel,
        restLocal,
        radius: radius && radius > 0 ? radius : 0.24,
        direct: wheel.parent === group
      };
    });
    this.suspensionGroup = group;
  }

  /**
   * Tilt the chassis to the ground under the wheels, then let each wheel
   * travel vertically so its bottom stays on its own patch of regolith.
   */
  private poseRoverOnTerrain(dt: number) {
    if (this.suspensionGroup !== this.models.roverGroup) this.bindSuspensions();

    const group = this.models.roverGroup;
    const yaw = this.roverHeading - Math.PI / 2;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);

    if (this.suspensions.length === 0) {
      this.roverPosition.y = this.getLunarHeight(this.roverPosition.x, this.roverPosition.z);
      group.position.copy(this.roverPosition);
      group.rotation.set(0, yaw, 0);
      return;
    }

    const samples = this.suspensions.map(link => {
      const lx = link.restLocal.x;
      const lz = link.restLocal.z;
      const x = this.roverPosition.x + cos * lx + sin * lz;
      const z = this.roverPosition.z - sin * lx + cos * lz;
      return { link, lx, lz, ground: this.getLunarHeight(x, z) };
    });

    let groundSum = 0;
    let contactSum = 0;
    for (const sample of samples) {
      groundSum += sample.ground;
      contactSum += sample.link.restLocal.y - sample.link.radius;
    }
    const avgGround = groundSum / samples.length;
    this.roverPosition.y = avgGround - contactSum / samples.length;

    let sxx = 0, szz = 0, sxz = 0, sxh = 0, szh = 0;
    for (const sample of samples) {
      const dh = sample.ground - avgGround;
      sxx += sample.lx * sample.lx;
      szz += sample.lz * sample.lz;
      sxz += sample.lx * sample.lz;
      sxh += sample.lx * dh;
      szh += sample.lz * dh;
    }
    const det = sxx * szz - sxz * sxz;
    let targetPitch = 0;
    let targetRoll = 0;
    if (Math.abs(det) > 1e-4) {
      targetPitch = (sxh * szz - szh * sxz) / det;
      targetRoll = -((sxx * szh - sxz * sxh) / det);
      const limit = 0.4;
      targetPitch = THREE.MathUtils.clamp(targetPitch, -limit, limit);
      targetRoll = THREE.MathUtils.clamp(targetRoll, -limit, limit);
    }
    this.roverPitch = THREE.MathUtils.damp(this.roverPitch, targetPitch, 6, dt);
    this.roverRoll = THREE.MathUtils.damp(this.roverRoll, targetRoll, 6, dt);

    group.position.copy(this.roverPosition);
    // The body rides on a soft spring: over a crest in low gravity it floats, then settles.
    group.position.y += this.roverSpring.step(this.roverPosition.y, MOON_DRIVE, dt);
    group.rotation.set(this.roverRoll, yaw, this.roverPitch);
    group.updateMatrix();
    const e = group.matrix.elements;

    const travel = 0.18;
    for (const sample of samples) {
      const { link, lx, lz, ground } = sample;
      const targetWheelY = ground + link.radius;
      let idealY = link.restLocal.y;
      if (link.direct && Math.abs(e[5]) > 0.2) {
        idealY = (targetWheelY - e[1] * lx - e[9] * lz - e[13]) / e[5];
      } else {
        link.wheel.updateWorldMatrix(true, false);
        const worldY = link.wheel.getWorldPosition(this.suspensionDir).y;
        idealY = link.wheel.position.y + (targetWheelY - worldY);
      }
      const clamped = THREE.MathUtils.clamp(idealY, link.restLocal.y - travel, link.restLocal.y + travel);
      link.wheel.position.y = THREE.MathUtils.damp(link.wheel.position.y, clamped, 10, dt);
      if (link.direct) {
        link.wheel.position.x = link.restLocal.x;
        link.wheel.position.z = link.restLocal.z;
      }
    }
  }

  /**
   * Half the terrain's ground area, as a circle around the lander.
   * On the 1 km square that radius is about 399 m, and it stays on the mesh.
   */
  private updateRoverRange(root: THREE.Object3D) {
    let area = 0;
    const field = this.heightField;
    if (field) {
      area = Math.abs(field.cellX) * (field.cols - 1) * Math.abs(field.cellZ) * (field.rows - 1);
    }
    if (area < 1) {
      root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(root);
      if (!box.isEmpty()) {
        const size = box.getSize(new THREE.Vector3());
        area = size.x * size.z;
      }
    }
    if (area < 1) return;
    this.roverMaxDistance = Math.sqrt(area / (2 * Math.PI));
  }

  private updateLanderAnchor() {
    const group = this.models?.descentStageGroup;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    this.landerX = center.x;
    this.landerZ = center.z;
  }

  /** True when throttle would carry the rover past the circle this frame. */
  private roverHeldAtRange(): boolean {
    const limit = this.roverMaxDistance;
    if (!Number.isFinite(limit)) return false;
    const dx = this.roverPosition.x - this.landerX;
    const dz = this.roverPosition.z - this.landerZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 1e-4) return false;
    const headingX = Math.sin(this.roverHeading);
    const headingZ = Math.cos(this.roverHeading);
    const outward = (headingX * dx + headingZ * dz) / dist;
    if (this.roverTargetSpeed * outward <= 0.2) return false;
    const step = Math.max(this.roverVelocity, this.roverTargetSpeed) * 0.02;
    return dist + step >= limit;
  }

  /** Boxes around the lander, the reflector, and the flag, grown by the rover's body. */
  private rebuildSolidBoxes() {
    if (!this.models) return;
    this.solidBoxes.length = 0;
    this.solidOutlines.length = 0;
    this.addFootprintBoxes(this.models.descentStageGroup);
    this.addSolidBox(this.models.retroreflectorGroup);
    this.addSolidBox(this.models.flagGroup);
  }

  private addSolidBox(root: THREE.Object3D | null | undefined) {
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    const pad = this.roverClearance;
    const minX = box.min.x - pad;
    const maxX = box.max.x + pad;
    const minZ = box.min.z - pad;
    const maxZ = box.max.z + pad;
    if (maxX - minX > 40 || maxZ - minZ > 40) return;
    this.solidBoxes.push({ minX, maxX, minZ, maxZ });
  }

  private footprintKey = '';

  /**
   * The lander is a cross of legs around a body, with open ground between the legs. One box
   * around all of it would also block those four empty corners, so the rover would stop against
   * air. Instead this looks at the model itself: every part within the rover's height of the
   * ground is marked on a fine grid, the marks are grown by the rover's reach, and the result is
   * covered with as few rectangles as possible.
   */
  private addFootprintBoxes(root: THREE.Object3D | null | undefined) {
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(root);
    if (bounds.isEmpty() || bounds.max.x - bounds.min.x > 40 || bounds.max.z - bounds.min.z > 40) return;

    const key = `${root.uuid}|${this.heightField ? 1 : 0}|${bounds.min.x.toFixed(2)}|${bounds.min.z.toFixed(2)}|${bounds.max.x.toFixed(2)}`;
    if (key === this.footprintKey && this.footprintOutline.length > 2) {
      this.solidOutlines.push(this.footprintOutline);
      return;
    }

    const cell = 0.2;
    const reach = Math.ceil(this.roverClearance / cell);
    const margin = reach + 2;
    const originX = bounds.min.x - margin * cell;
    const originZ = bounds.min.z - margin * cell;
    const cols = Math.ceil((bounds.max.x - bounds.min.x) / cell) + margin * 2 + 1;
    const rows = Math.ceil((bounds.max.z - bounds.min.z) / cell) + margin * 2 + 1;
    const marked = new Uint8Array(cols * rows);

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const p = new THREE.Vector3();
    const mark = (point: THREE.Vector3) => {
      const height = point.y - this.getLunarHeight(point.x, point.z);
      if (height > ROVER_HEIGHT || height < -0.6) return;
      const col = Math.floor((point.x - originX) / cell);
      const row = Math.floor((point.z - originZ) / cell);
      if (col >= 0 && row >= 0 && col < cols && row < rows) marked[row * cols + col] = 1;
    };
    root.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
      mesh.updateWorldMatrix(true, false);
      const position = mesh.geometry.attributes.position;
      const index = mesh.geometry.index;
      const triangles = index ? index.count / 3 : position.count / 3;
      for (let t = 0; t < triangles; t++) {
        const i0 = index ? index.getX(t * 3) : t * 3;
        const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
        a.fromBufferAttribute(position, i0).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position, i1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position, i2).applyMatrix4(mesh.matrixWorld);
        // Sample large triangles across their surface so a flat plate marks every cell it covers.
        const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
        const steps = Math.min(16, Math.max(1, Math.ceil(longest / (cell * 0.75))));
        for (let u = 0; u <= steps; u++) {
          for (let v = 0; v <= steps - u; v++) {
            const wu = u / steps;
            const wv = v / steps;
            p.copy(a).multiplyScalar(1 - wu - wv).addScaledVector(b, wu).addScaledVector(c, wv);
            mark(p);
          }
        }
      }
    });

    // Grow every mark by the rover's reach (a square, one pass across and one pass down).
    const across = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      let last = -1000;
      for (let col = 0; col < cols; col++) {
        if (marked[r * cols + col]) last = col;
        if (col - last <= reach) across[r * cols + col] = 1;
      }
      last = 1000;
      for (let col = cols - 1; col >= 0; col--) {
        if (marked[r * cols + col]) last = col;
        if (last - col <= reach) across[r * cols + col] = 1;
      }
    }
    const grown = new Uint8Array(cols * rows);
    for (let col = 0; col < cols; col++) {
      let last = -1000;
      for (let r = 0; r < rows; r++) {
        if (across[r * cols + col]) last = r;
        if (r - last <= reach) grown[r * cols + col] = 1;
      }
      last = 1000;
      for (let r = rows - 1; r >= 0; r--) {
        if (across[r * cols + col]) last = r;
        if (last - r <= reach) grown[r * cols + col] = 1;
      }
    }

    // Wrap the grown area in its convex outline. The gaps between the legs are under the lander's
    // body, and a rover that drove into one would be wedged in a corner, so the outline closes them.
    const points: { x: number; z: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        if (!grown[r * cols + col]) continue;
        const edge =
          col === 0 || r === 0 || col === cols - 1 || r === rows - 1 ||
          !grown[r * cols + col - 1] || !grown[r * cols + col + 1] ||
          !grown[(r - 1) * cols + col] || !grown[(r + 1) * cols + col];
        if (!edge) continue;
        const x = originX + col * cell;
        const z = originZ + r * cell;
        points.push({ x, z }, { x: x + cell, z }, { x, z: z + cell }, { x: x + cell, z: z + cell });
      }
    }
    const outline = convexHull(points);
    if (outline.length < 3) {
      this.addSolidBox(root);
      return;
    }
    this.footprintKey = key;
    this.footprintOutline = outline;
    this.solidOutlines.push(outline);
  }

  private footprintOutline: { x: number; z: number }[] = [];

  /**
   * Keep the rover out of the solids. Moving into a face does not stop it: the part of the move
   * that runs along the face carries on, so the rover glides past, around a corner, and off.
   */
  private holdRoverOutsideSolids(x0: number, z0: number, forwardX: number, forwardZ: number) {
    const wantedX = this.roverPosition.x - x0;
    const wantedZ = this.roverPosition.z - z0;
    const wanted = Math.hypot(wantedX, wantedZ);
    let px = x0;
    let pz = z0;
    let dx = wantedX;
    let dz = wantedZ;

    // A start inside a solid (a model swapped in under the rover) is pushed out first.
    this.roverPosition.x = px;
    this.roverPosition.z = pz;
    this.escapeSolids();
    px = this.roverPosition.x;
    pz = this.roverPosition.z;

    for (let pass = 0; pass < 4 && Math.hypot(dx, dz) > 1e-6; pass++) {
      let tHit = 1;
      let nx = 0;
      let nz = 0;
      for (const box of this.solidBoxes) {
        const hit = this.sweepSolid(px, pz, dx, dz, box);
        if (!hit || hit.t >= tHit) continue;
        tHit = hit.t;
        nx = hit.nx;
        nz = hit.nz;
      }
      if (tHit >= 1) {
        px += dx;
        pz += dz;
        break;
      }
      const t = Math.max(0, tHit - 0.002);
      px += dx * t;
      pz += dz * t;
      // What is left of the move, with the part that points into the face removed.
      const rest = 1 - t;
      const into = dx * nx + dz * nz;
      dx = (dx - into * nx) * rest;
      dz = (dz - into * nz) * rest;
    }

    this.roverPosition.x = px;
    this.roverPosition.z = pz;
    this.escapeSolids();

    // A head-on push loses its speed. A glide along a face keeps it (the move itself is already
    // limited to the part along the face), so the rover does not crawl while it slides past.
    if (wanted > 1e-6) {
      const done = Math.hypot(this.roverPosition.x - x0, this.roverPosition.z - z0);
      const share = Math.min(1, done / wanted);
      if (share < 0.3) this.roverVelocity *= share;
    }
  }

  /** If the rover is inside a solid, move it out through the nearest face. Repeats for touching boxes. */
  private escapeSolids() {
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const outline of this.solidOutlines) moved = this.pushOutOfOutline(outline) || moved;
      const box = this.solidBoxes.find(item => this.pointInSolid(this.roverPosition.x, this.roverPosition.z, item));
      if (box) {
        this.pushOutOfSolid(box);
        moved = true;
      }
      if (!moved) return;
    }
  }

  /**
   * If the rover is inside a convex outline, move it out through the nearest edge. Because only
   * the part of the move that went into the edge is undone, the rest carries the rover along it.
   */
  private pushOutOfOutline(outline: { x: number; z: number }[]) {
    const x = this.roverPosition.x;
    const z = this.roverPosition.z;
    let best = Infinity;
    let nx = 0;
    let nz = 0;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const len = Math.hypot(ex, ez);
      if (len < 1e-6) continue;
      // Outward normal of a counter-clockwise outline.
      const ox = ez / len;
      const oz = -ex / len;
      const outside = (x - a.x) * ox + (z - a.z) * oz;
      if (outside >= 0) return false;
      if (-outside < best) {
        best = -outside;
        nx = ox;
        nz = oz;
      }
    }
    this.roverPosition.x = x + nx * (best + 0.002);
    this.roverPosition.z = z + nz * (best + 0.002);
    return true;
  }

  private pointInSolid(
    x: number,
    z: number,
    box: { minX: number; maxX: number; minZ: number; maxZ: number }
  ) {
    return x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ;
  }

  private pushOutOfSolid(box: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    const x = this.roverPosition.x;
    const z = this.roverPosition.z;
    const left = x - box.minX;
    const right = box.maxX - x;
    const near = z - box.minZ;
    const far = box.maxZ - z;
    const min = Math.min(left, right, near, far);
    if (min === left) {
      this.roverPosition.x = box.minX;
      return { nx: -1, nz: 0 };
    }
    if (min === right) {
      this.roverPosition.x = box.maxX;
      return { nx: 1, nz: 0 };
    }
    if (min === near) {
      this.roverPosition.z = box.minZ;
      return { nx: 0, nz: -1 };
    }
    this.roverPosition.z = box.maxZ;
    return { nx: 0, nz: 1 };
  }

  /** Earliest entry of the movement segment into the box. The normal points outward. */
  private sweepSolid(
    x0: number,
    z0: number,
    dx: number,
    dz: number,
    box: { minX: number; maxX: number; minZ: number; maxZ: number }
  ) {
    let tmin = 0;
    let tmax = 1;
    let nx = 0;
    let nz = 0;

    if (Math.abs(dx) < 1e-8) {
      if (x0 <= box.minX || x0 >= box.maxX) return null;
    } else {
      let tNear = (box.minX - x0) / dx;
      let tFar = (box.maxX - x0) / dx;
      let enter = -1;
      if (tNear > tFar) {
        const swap = tNear;
        tNear = tFar;
        tFar = swap;
        enter = 1;
      }
      if (tNear > tmin) {
        tmin = tNear;
        nx = enter;
        nz = 0;
      }
      if (tFar < tmax) tmax = tFar;
      if (tmin > tmax) return null;
    }

    if (Math.abs(dz) < 1e-8) {
      if (z0 <= box.minZ || z0 >= box.maxZ) return null;
    } else {
      let tNear = (box.minZ - z0) / dz;
      let tFar = (box.maxZ - z0) / dz;
      let enter = -1;
      if (tNear > tFar) {
        const swap = tNear;
        tNear = tFar;
        tFar = swap;
        enter = 1;
      }
      if (tNear > tmin) {
        tmin = tNear;
        nx = 0;
        nz = enter;
      }
      if (tFar < tmax) tmax = tFar;
      if (tmin > tmax) return null;
    }

    if (tmax <= 1e-4 || tmin > 1) return null;
    if (tmin < 0) return null;
    return { t: tmin, nx, nz };
  }

  /** Keep the rover on or inside the circle around the lander. */
  private holdRoverNearLander(forwardX: number, forwardZ: number) {
    const limit = this.roverMaxDistance;
    if (!Number.isFinite(limit)) return;
    const dx = this.roverPosition.x - this.landerX;
    const dz = this.roverPosition.z - this.landerZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= limit || dist < 1e-4) return;
    const nx = dx / dist;
    const nz = dz / dist;
    this.roverPosition.x = this.landerX + nx * limit;
    this.roverPosition.z = this.landerZ + nz * limit;
    if ((forwardX * nx + forwardZ * nz) * this.roverVelocity > 0) {
      this.roverVelocity = 0;
    }
  }

  private updateRover(dt: number) {
    // Lunar driving (roverDynamics.ts): gentle grip in a sixth of Earth's gravity, hills by their
    // slope, softer steering at a standstill. At the range edge, throttle that points farther out is ignored.
    const heldAtRange = this.roverHeldAtRange();
    const aheadX = Math.sin(this.roverHeading);
    const aheadZ = Math.cos(this.roverHeading);
    const grade =
      (this.getLunarHeight(this.roverPosition.x + aheadX * 1.2, this.roverPosition.z + aheadZ * 1.2) -
        this.getLunarHeight(this.roverPosition.x - aheadX * 1.2, this.roverPosition.z - aheadZ * 1.2)) /
      2.4;
    const drive = { velocity: this.roverVelocity, steer: this.roverSteer };
    this.roverHeading += driveStep(drive, this.roverThrottle, this.roverTurnInput, grade, MOON_DRIVE, dt, heldAtRange);
    this.roverVelocity = drive.velocity;
    this.roverSteer = drive.steer;

    // Move rover forward
    const forwardX = Math.sin(this.roverHeading);
    const forwardZ = Math.cos(this.roverHeading);

    const prevX = this.roverPosition.x;
    const prevZ = this.roverPosition.z;
    this.roverPosition.x += forwardX * this.roverVelocity * dt;
    this.roverPosition.z += forwardZ * this.roverVelocity * dt;
    this.holdRoverOutsideSolids(prevX, prevZ, forwardX, forwardZ);
    this.holdRoverNearLander(forwardX, forwardZ);

    this.poseRoverOnTerrain(dt);

    this.refreshShadows();

    // Rotate wheels smoothly around their Z-axis axle (zero Y-axis spin)
    if (this.models.roverWheels) {
      const wheelSpin = (this.roverVelocity * dt) / 0.24;
      this.models.roverWheels.forEach(wheel => {
        wheel.rotation.z -= wheelSpin;
      });
    }

    // Check proximity to glowing green surface area markers
    this.checkArtifactProximity();
    this.applyRoverPose();
  }

  /** Stop at once (an inspection or dialogue takes over), instead of coasting on. */
  public haltRover() {
    this.roverVelocity = 0;
    this.roverSteer = 0;
    this.roverThrottle = 0;
    this.roverTargetSpeed = 0;
  }

  public beginRoverBoot() {
    if (!this.models?.roverRig) {
      this.roverPose = 'ready';
      this.roverBootNotified = true;
      this.onRoverBootComplete?.();
      return;
    }
    if (this.roverPose !== 'charging') return;
    this.roverPose = 'booting';
    this.roverBootStart = performance.now();
    this.roverBootNotified = false;
  }

  public isRoverBooting() {
    return this.roverPose === 'booting';
  }

  public snapRoverReady() {
    this.roverPose = 'ready';
    this.roverBootNotified = true;
    this.applyRoverPose();
  }

  private applyRoverPose() {
    const rig = this.models?.roverRig;
    if (!rig) return;

    const now = performance.now();
    const elapsed = now - this.roverBootStart;
    // Cue finishes, then the wings, then the mast, then the dish. Each waits for the one before it.
    const cueMs = 1200;
    const stepMs = 1400;
    const gapMs = 250;
    const wingAt = cueMs + gapMs;
    const mastAt = wingAt + stepMs + gapMs;
    const dishAt = mastAt + stepMs + gapMs;
    const bootMs = dishAt + stepMs;
    if (this.roverPose === 'booting' && elapsed >= bootMs) {
      this.roverPose = 'ready';
      this.shadowDirty = true;
      if (!this.roverBootNotified) {
        this.roverBootNotified = true;
        this.onRoverBootComplete?.();
      }
    }
    const bootT = this.roverPose === 'booting' ? elapsed : this.roverPose === 'ready' ? bootMs : 0;
    const wing = this.roverPose === 'charging' ? 0 : this.smoothStep((bootT - wingAt) / stepMs);
    const mast = this.roverPose === 'charging' ? 0 : this.smoothStep((bootT - mastAt) / stepMs);
    const dish = this.roverPose === 'charging' ? 0 : this.smoothStep((bootT - dishAt) / stepMs);

    rig.solarHinges.forEach((hinge, index) => {
      hinge.rotation.x = rig.solarDeployed[index] + (rig.solarStowed[index] - rig.solarDeployed[index]) * wing;
    });
    const mastY = rig.mastRetracted + (rig.mastRaised - rig.mastRetracted) * mast;
    rig.mastStage.position.y = mastY;
    rig.mastSlide.position.y = mastY;

    const aim = this.dishTargetAngles(rig);
    const yawDelta = Math.atan2(Math.sin(aim.yaw - rig.antennaParkYaw), Math.cos(aim.yaw - rig.antennaParkYaw));
    const pitchDelta = Math.atan2(Math.sin(aim.pitch - rig.antennaParkPitch), Math.cos(aim.pitch - rig.antennaParkPitch));
    rig.antennaYaw.rotation.y = rig.antennaParkYaw + yawDelta * dish;
    rig.antennaTilt.rotation.x = rig.antennaParkPitch + pitchDelta * dish;

    if (this.roverPose === 'charging') {
      const pulse = 1.7 + 0.5 * Math.sin(now * 0.004);
      this.setCue(rig, 0xff2a2a, pulse);
    } else if (this.roverPose === 'booting' && elapsed < cueMs) {
      const on = ((elapsed / cueMs) * 3) % 1 < 0.5;
      this.setCue(rig, 0xf5c542, on ? 2.4 : 0.05);
    } else {
      this.setCue(rig, 0x22c55e, 2.0);
    }
  }

  private dishTargetAngles(rig: RoverRig) {
    const mount = rig.antennaYaw.parent;
    if (!mount) return { yaw: rig.antennaParkYaw, pitch: rig.antennaParkPitch };
    mount.updateWorldMatrix(true, false);
    this.dishAim.copy(this.earthLaserPos);
    mount.worldToLocal(this.dishAim);
    this.dishAim.sub(rig.antennaYaw.position);
    const dx = this.dishAim.x;
    const dy = this.dishAim.y;
    const dz = this.dishAim.z;
    return {
      yaw: Math.atan2(dx, dz),
      pitch: Math.atan2(-dy, Math.hypot(dx, dz) || 0.001)
    };
  }

  private setCue(rig: RoverRig, hex: number, intensity: number) {
    rig.cueMaterial.color.setHex(hex);
    rig.cueMaterial.emissive.setHex(hex);
    rig.cueMaterial.emissiveIntensity = intensity;
  }

  private smoothStep(t: number) {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  }

  /**
   * Bobs the beacon and keeps the column at a low glow, a little brighter when the rover is inside.
   */
  private updateInspectionMarkers(dt: number) {
    this.elapsedTime += dt;
    const pulse = Math.sin(this.elapsedTime * 3.5);
    const fastPulse = Math.sin(this.elapsedTime * 7.5);

    for (const marker of this.inspectionMarkers.values()) {
      marker.diamond.position.y = 2.2 + Math.sin(this.elapsedTime * 2.8 + marker.position.x * 0.5) * 0.15;
      marker.diamond.rotation.y += dt * 2.2;
      marker.diamond.rotation.x += dt * 0.9;

      const beamMat = marker.cylinderBeam.material as THREE.MeshBasicMaterial;
      const diamondMat = marker.diamond.material as THREE.MeshStandardMaterial;

      if (marker.inside) {
        beamMat.opacity = 0.62 + 0.06 * fastPulse;
        diamondMat.emissiveIntensity = 1.4 + 0.5 * fastPulse;
      } else {
        beamMat.opacity = 0.48 + 0.05 * pulse;
        diamondMat.emissiveIntensity = marker.visited ? 0.6 : 0.85;
      }
    }
  }

  /**
   * Evaluates if the player's rover is inside the designated glowing green marker.
   * The inspect prompt will ONLY activate when the rover is positioned inside the marker.
   */
  private checkArtifactProximity() {
    const rx = this.roverPosition.x;
    const rz = this.roverPosition.z;

    let nearestInside: MarkerId | null = null;
    let minMarkerDist = 999;
    let nearestArtifactId: MarkerId | null = null;

    for (const [id, marker] of this.inspectionMarkers.entries()) {
      if (!marker.group.visible) {
        marker.inside = false;
        continue;
      }
      const dist = Math.hypot(rx - marker.position.x, rz - marker.position.z);
      if (dist < minMarkerDist) {
        minMarkerDist = dist;
        nearestArtifactId = id;
      }

      // Check if rover is inside this glowing green circle marker!
      const isInside = dist <= marker.radius;
      marker.inside = isInside;

      if (isInside) {
        nearestInside = id;
      }
    }

    const speed = Math.abs(this.roverVelocity);
    const heading = (this.roverHeading * (180 / Math.PI)) % 360;
    const rangeRadius = Number.isFinite(this.roverMaxDistance) ? this.roverMaxDistance : 0;
    const stamp = `${speed.toFixed(1)}|${heading.toFixed(0)}|${rx.toFixed(1)}|${rz.toFixed(1)}|${minMarkerDist.toFixed(0)}|${nearestInside ?? ''}|${this.landerX.toFixed(1)}|${this.landerZ.toFixed(1)}|${rangeRadius.toFixed(0)}`;
    if (stamp !== this.telemetryStamp) {
      this.telemetryStamp = stamp;
      this.onTelemetryUpdate?.({
        speed,
        heading,
        distanceToTarget: minMarkerDist,
        nearestArtifact: nearestInside || nearestArtifactId,
        position: { x: rx, y: this.roverPosition.y, z: rz },
        lander: { x: this.landerX, z: this.landerZ },
        rangeRadius
      });
    }
    if (nearestInside !== this.nearStamp) {
      this.nearStamp = nearestInside;
      this.onNearArtifact?.(nearestInside, minMarkerDist);
    }
  }

  private updateLaser(dt: number) {
    if (!this.isLaserFiring) return;
    this.laserProgress += dt; // time in seconds (0 to ~3.2s)

    const totalDuration = 3.2;
    const halfDuration = totalDuration * 0.5; // ~1.6s flight time each way

    const coreMat = this.laserCoreMesh.material as THREE.MeshBasicMaterial;
    const haloMat = this.laserHaloMesh.material as THREE.MeshBasicMaterial;
    const sparkMat = this.laserSparkMesh.material as THREE.MeshBasicMaterial;
    const rippleMat = this.laserRippleMesh.material as THREE.MeshBasicMaterial;

    // Pulse core and halo intensity
    const beamPulse = Math.sin(this.laserProgress * 22);
    coreMat.opacity = 0.82 + 0.1 * beamPulse;
    haloMat.opacity = 0.22 + 0.08 * beamPulse;

    if (this.laserProgress < halfDuration) {
      const t = this.laserProgress / halfDuration;
      this.placeLaserPacket(_vec3A.lerpVectors(this.earthLaserPos, this.reflectorLaserPos, t));
      this.laserPacketMesh.visible = true;

      this.laserSparkMesh.scale.setScalar(0.45 + 0.15 * Math.sin(this.laserProgress * 15));
      this.laserRippleMesh.visible = false;
    } else {
      const t = (this.laserProgress - halfDuration) / halfDuration;
      this.placeLaserPacket(_vec3A.lerpVectors(this.reflectorLaserPos, this.earthLaserPos, t));

      const impactTime = this.laserProgress - halfDuration;
      if (impactTime < 0.7) {
        this.laserRippleMesh.visible = true;
        const rippleScale = 1.0 + impactTime * 1.6;
        this.laserRippleMesh.scale.set(rippleScale, rippleScale, rippleScale);
        rippleMat.opacity = Math.max(0, 0.8 - impactTime * 1.1);

        this.laserSparkMesh.scale.setScalar(1.5 + (0.7 - impactTime) * 0.8);
        sparkMat.opacity = Math.max(0.25, 1.0 - impactTime * 0.9);
      } else {
        this.laserRippleMesh.visible = false;
        sparkMat.opacity = 0.3;
        this.laserSparkMesh.scale.setScalar(0.6);
      }
    }

    if (this.laserProgress > totalDuration) {
      this.isLaserFiring = false;
      this.laserPulseGroup.visible = false;
    }
  }

  /** Point the SUN and EARTH labels at their models while each is inside the view. */
  private projectSkyLabels() {
    const mode = this.cameraConfig.mode;
    const hidden = mode === 'title' || mode === 'outro' || mode === 'warp';
    this.camera.updateMatrixWorld();
    this.projectBodyLabel(this.hasSun ? this.sunAnchor : null, this.sunScreen, hidden);
    this.projectBodyLabel(this.earthLaserPos, this.earthScreen, hidden);
    this.earthScreen.tipLeft = this.earthScreen.visible ? this.earthLimbPixels() : 0;
    this.projectPartLabels(hidden);
  }

  /** Aim points on the two models: the middle of the lander body, and the top of the reflector. */
  private projectPartLabels(hidden: boolean) {
    const descent = this.models?.descentStageGroup;
    const reflector = this.models?.retroreflectorGroup;
    if (!descent || !reflector) {
      this.partScreen.descent.visible = false;
      this.partScreen.reflector.visible = false;
      return;
    }
    // The models are swapped when the real ones finish loading, so refit when their ids change.
    const key = `${descent.id}:${reflector.id}:${descent.position.y.toFixed(3)}:${reflector.position.y.toFixed(3)}`;
    if (key !== this.partAnchorKey) {
      this.partAnchorKey = key;
      const box = new THREE.Box3();
      descent.updateWorldMatrix(true, true);
      box.setFromObject(descent);
      if (!box.isEmpty()) box.getCenter(this.partAnchor.descent);
      reflector.updateWorldMatrix(true, true);
      box.setFromObject(reflector);
      if (!box.isEmpty()) {
        box.getCenter(this.partAnchor.reflector);
        this.partAnchor.reflector.y = box.max.y;
      }
    }
    this.projectBodyLabel(this.partAnchor.descent, this.partScreen.descent, hidden);
    this.projectBodyLabel(this.partAnchor.reflector, this.partScreen.reflector, hidden);
  }

  /** Pixels from the Earth's center to a point just left of its silhouette. */
  private earthLimbPixels() {
    if (this.earthVisualRadius <= 0) return 0;
    const dist = this.camera.position.distanceTo(this.earthLaserPos);
    const inside = dist * dist - this.earthVisualRadius * this.earthVisualRadius;
    if (inside <= 1) return 0;
    const fov = (this.camera.fov * Math.PI) / 180;
    const viewHeight = this.renderer.domElement.getBoundingClientRect().height;
    const limb = (this.earthVisualRadius / Math.sqrt(inside)) / Math.tan(fov / 2) * (viewHeight / 2);
    return limb + 8;
  }

  private projectBodyLabel(
    world: THREE.Vector3 | null,
    slot: { x: number; y: number; visible: boolean },
    hidden: boolean
  ) {
    if (!world || hidden) {
      slot.visible = false;
      return;
    }
    _sunWorld.copy(world);
    this.camera.getWorldDirection(_sunView);
    const facing =
      (_sunWorld.x - this.camera.position.x) * _sunView.x +
      (_sunWorld.y - this.camera.position.y) * _sunView.y +
      (_sunWorld.z - this.camera.position.z) * _sunView.z;
    _sunNdc.copy(_sunWorld).project(this.camera);
    const bounds = this.renderer.domElement.getBoundingClientRect();
    slot.x = bounds.left + (_sunNdc.x * 0.5 + 0.5) * bounds.width;
    slot.y = bounds.top + (-_sunNdc.y * 0.5 + 0.5) * bounds.height;
    slot.visible =
      facing > 0.2 &&
      _sunNdc.z > 0 &&
      _sunNdc.z < 1 &&
      Math.abs(_sunNdc.x) < 0.92 &&
      Math.abs(_sunNdc.y) < 0.92;
  }

  private updateCamera(dt: number) {
    this.plaqueScreenPoint.visible = false;
    const mode = this.cameraConfig.mode;

    if (mode === 'title') {
      // Atmospheric orbit around the Sea of Tranquility landing site
      const time = performance.now() * 0.00018;
      const camRadius = 26;
      _vec3Target.set(-17.331 + Math.sin(time) * camRadius, 10 + Math.sin(time * 0.5) * 2, -5.862 + Math.cos(time) * camRadius);
      this.camera.position.lerp(_vec3Target, dt * 2.5);
      this.cameraTarget.set(-17.331, 1.8, -5.862);
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'intro') {
      this.updateIntroFlyby();

    } else if (mode === 'explore') {
      this.chaseCameraPose(_vec3Target, _vec3A);
      this.camera.position.lerp(_vec3Target, dt * 4.5);
      this.cameraTarget.lerp(_vec3A, dt * 6.0);
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'inspect') {
      const target = this.cameraConfig.targetArtifact;
      if (target === 'plaque') {
        this.holdPlaqueCamera(dt);
      } else {
        // Slow orbit around the artifact while the narration plays. One turn takes about 40 seconds.
        let lookX = -17.331;
        let lookY = 1.8;
        let lookZ = -5.862;
        let radius = 12;
        let height = 3.4;
        if (target === 'retroreflector') {
          lookX = -2.12;
          lookY = 0.55;
          lookZ = 21.53;
          radius = 6.5;
          height = 2.0;
        }
        const angle = this.elapsedTime * ((Math.PI * 2) / 40);
        const camX = lookX + Math.cos(angle) * radius;
        const camZ = lookZ + Math.sin(angle) * radius;
        const ground = this.getLunarHeight(camX, camZ);
        _vec3Target.set(camX, Math.max(lookY + height, ground + 1.2), camZ);
        this.camera.position.lerp(_vec3Target, dt * 2.4);
        this.cameraTarget.set(lookX, lookY, lookZ);
        this.camera.lookAt(this.cameraTarget);
      }

    } else if (mode === 'ranging') {
      // Stand off the reflector, opposite Earth, so the array sits in front of the planet.
      _vec3Target.set(8, 2.4, 21.5);
      this.camera.position.lerp(_vec3Target, dt * 1.4);
      this.cameraTarget.lerp(this.earthLaserPos, dt * 1.4);
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'outro' || mode === 'warp') {
      const p = this.cameraConfig.outroProgress ?? 0;

      if (p < 0.5) {
        // Camera pulling vertically up away from Sea of Tranquility
        const h = THREE.MathUtils.lerp(15, 200, p * 2);
        const z = THREE.MathUtils.lerp(25, 120, p * 2);
        this.camera.position.set(-17.331, h, -5.862 + z);
        this.camera.lookAt(-17.331, 0, -5.862);

        // Hide Voyager during initial pull away
        this.models.voyagerGroup.position.set(0, -500, 0);
        (this.warpLines.material as THREE.LineBasicMaterial).opacity = 0;

      } else {
        // Warp acceleration into deep space revealing Voyager 1
        const warpP = (p - 0.5) * 2;
        const warpOpacity = Math.sin(warpP * Math.PI);
        (this.warpLines.material as THREE.LineBasicMaterial).opacity = warpOpacity * 0.9;

        // Position camera in front of Voyager 1 in deep space
        this.models.voyagerGroup.position.set(0, 100, -320);
        this.models.voyagerGroup.rotation.y += 0.3 * dt;

        this.camera.position.set(0, 100, -305);
        this.cameraTarget.set(0, 100, -320);
        this.camera.lookAt(this.cameraTarget);
      }
    }
  }

  private onResize = () => {
    if (!this.container || this.isDisposed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private refreshShadows() {
    if (isSoftwareGl || !this.sunLight.castShadow) return;
    const bootMoving = this.roverPose === 'booting';
    const moved = this.shadowDirty
      || bootMoving
      || Math.abs(this.shadowAnchorX - this.roverPosition.x) > 0.02
      || Math.abs(this.shadowAnchorZ - this.roverPosition.z) > 0.02
      || Math.abs(this.shadowAnchorHeading - this.roverHeading) > 0.01;
    if (!moved) return;
    this.shadowDirty = false;
    this.shadowAnchorX = this.roverPosition.x;
    this.shadowAnchorZ = this.roverPosition.z;
    this.shadowAnchorHeading = this.roverHeading;
    this.sunLight.position.copy(this.roverPosition).addScaledVector(this.sunDirection, 80);
    this.sunLight.target.position.copy(this.roverPosition);
    this.sunLight.target.updateMatrixWorld();
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Face of the commemorative plaque on the lander, in world space. */
  private syncPlaqueAim() {
    const root = this.models?.descentStageGroup?.getObjectByName('CommemorativePlaque');
    if (!root) return;
    if (this.plaqueAimId !== root.id) {
      this.plaqueAimId = root.id;
      root.updateWorldMatrix(true, true);
      const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const box = new THREE.Box3();
      const vertex = new THREE.Vector3();
      root.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
        const attr = mesh.geometry.attributes.position;
        for (let i = 0; i < attr.count; i++) {
          vertex.fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
          box.expandByPoint(vertex);
        }
      });
      if (!box.isEmpty()) {
        box.getCenter(this.plaqueLocalCenter);
        const size = new THREE.Vector3();
        box.getSize(size);
        if (size.x <= size.y && size.x <= size.z) this.plaqueLocalNormal.set(1, 0, 0);
        else if (size.y <= size.x && size.y <= size.z) this.plaqueLocalNormal.set(0, 1, 0);
        else this.plaqueLocalNormal.set(0, 0, 1);
      }
    }
    root.updateWorldMatrix(true, false);
    this.plaqueLook.copy(this.plaqueLocalCenter).applyMatrix4(root.matrixWorld);
    this.plaqueNormal.copy(this.plaqueLocalNormal).transformDirection(root.matrixWorld).normalize();
  }

  /** Fixed view of the ladder plaque, held in the right half so the photograph can sit on the left. */
  private holdPlaqueCamera(dt: number) {
    this.syncPlaqueAim();
    const look = this.plaqueLook;
    _vec3Target.copy(look).addScaledVector(this.plaqueNormal, 2.35);
    _vec3Target.x -= 1.25;
    const ground = this.getLunarHeight(_vec3Target.x, _vec3Target.z);
    _vec3Target.y = Math.max(_vec3Target.y, ground + 0.9);
    this.camera.position.lerp(_vec3Target, dt * 2.4);
    // Look to the left of the plaque so the model sits in the right half of the frame.
    this.cameraTarget.copy(look);
    this.cameraTarget.x -= 0.72;
    this.camera.lookAt(this.cameraTarget);

    this.plaqueNdc.copy(look).project(this.camera);
    const bounds = this.container.getBoundingClientRect();
    this.plaqueScreenPoint.x = bounds.left + (this.plaqueNdc.x * 0.5 + 0.5) * bounds.width;
    this.plaqueScreenPoint.y = bounds.top + (-this.plaqueNdc.y * 0.5 + 0.5) * bounds.height;
    this.plaqueScreenPoint.visible = this.plaqueNdc.z < 1;
  }

  private chaseCameraPose(outPos: THREE.Vector3, outTarget: THREE.Vector3) {
    const chaseDistance = 6.8;
    const chaseHeight = 2.9;
    const idealCamX = this.roverPosition.x - Math.sin(this.roverHeading) * chaseDistance;
    const idealCamZ = this.roverPosition.z - Math.cos(this.roverHeading) * chaseDistance;
    const idealCamY = Math.max(this.roverPosition.y + chaseHeight, this.getLunarHeight(idealCamX, idealCamZ) + 1.2);
    outPos.set(idealCamX, idealCamY, idealCamZ);
    outTarget.set(this.roverPosition.x, this.roverPosition.y + 1.2, this.roverPosition.z);
  }

  private poseIntroCamera(p: number) {
    this.chaseCameraPose(_vec3Target, _vec3A);
    const span = p < 0.5 ? p * 2 : (p - 0.5) * 2;
    if (p < 0.5) {
      this.camera.position.lerpVectors(this.introStartCam, this.introMidCam, span);
      this.cameraTarget.lerpVectors(this.introLookStart, this.introLookMid, span);
    } else {
      this.camera.position.lerpVectors(this.introMidCam, _vec3Target, span);
      this.cameraTarget.lerpVectors(this.introLookMid, _vec3A, span);
    }
    this.camera.lookAt(this.cameraTarget);
  }

  /** Slow the last part of the flyby so the camera arrives with no leftover speed. */
  private easeIntro(linear: number) {
    const easeFrom = 0.84;
    if (linear <= easeFrom) return linear;
    const u = (linear - easeFrom) / (1 - easeFrom);
    const s = u * u * (3 - 2 * u);
    return easeFrom + (1 - easeFrom) * s;
  }

  private updateIntroFlyby() {
    if (!this.introActive) {
      this.poseIntroCamera(this.cameraConfig.introProgress ?? 0);
      return;
    }
    const now = performance.now();
    const linear = Math.min(1, (now - this.introStartedAt) / 15000);
    const p = this.easeIntro(linear);
    this.cameraConfig.introProgress = p;
    if (linear < 1) {
      this.poseIntroCamera(p);
      return;
    }
    if (this.introHoldUntil === 0) this.introHoldUntil = now + 500;
    this.snapExploreCamera();
    if (now < this.introHoldUntil) return;
    this.introActive = false;
    this.cameraConfig = { mode: 'explore' };
    this.onIntroCameraSettled?.();
  }

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    for (const marker of this.inspectionMarkers.values()) {
      this.scene.remove(marker.group);
      marker.cylinderBeam.geometry.dispose();
      (marker.cylinderBeam.material as THREE.Material).dispose();
      marker.diamond.geometry.dispose();
      (marker.diamond.material as THREE.Material).dispose();
    }
    this.inspectionMarkers.clear();
    disposeScene(this.scene, this.renderer);
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
