import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRegolithTexture } from './proceduralTextures';
import { buildApolloSceneModels, SceneModels } from './apolloModels';
import { ArtifactId, RoverTelemetry } from '../types/game';
import { ReplaceableModelType, customModelManager } from './modelLoader';
import { ARTIFACTS } from '../data/artifactsData';

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

export interface CameraStateConfig {
  mode: 'title' | 'intro' | 'explore' | 'inspect' | 'outro' | 'warp';
  targetArtifact?: ArtifactId | null;
  introProgress?: number; // 0 to 1
  outroProgress?: number; // 0 to 1
}

/**
 * Inspection Marker structure for the GTA Vice City-style glowing surface area markers
 */
export interface InspectionMarkerVisual {
  artifactId: ArtifactId;
  group: THREE.Group;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  glowDisc: THREE.Mesh;
  cylinderBeam: THREE.Mesh;
  diamond: THREE.Mesh;
  position: THREE.Vector3;
  radius: number;
  visited: boolean;
  inside: boolean;
}

/**
 * Procedural radial gradient texture for the glowing green surface corona
 */
function createMarkerGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(74, 222, 128, 0.95)'); // Vibrant lime core
  grad.addColorStop(0.35, 'rgba(34, 197, 94, 0.6)');  // Emerald glow
  grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.25)'); // Soft edge
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');           // Seamless transparent border
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

/**
 * Procedural vertical gradient texture for the GTA Vice City-style cylindrical light corona beam
 */
function createMarkerBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(74, 222, 128, 0.75)');   // Bright near surface
  grad.addColorStop(0.25, 'rgba(34, 197, 94, 0.45)');
  grad.addColorStop(0.65, 'rgba(16, 185, 129, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');           // Translucent sky fade
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
  private defaultModels!: SceneModels;
  private customActiveModels: Partial<Record<ReplaceableModelType, boolean>> = {};
  private terrainMesh!: THREE.Mesh;
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
  private earthLaserPos: THREE.Vector3 = new THREE.Vector3(120, 95, -160);
  private reflectorLaserPos: THREE.Vector3 = new THREE.Vector3(14, 0.65, -8);
  private sunLight!: THREE.DirectionalLight;

  // Rover Kinematics
  private roverVelocity: number = 0;
  private roverHeading: number = 0;
  private roverPosition: THREE.Vector3 = new THREE.Vector3(8, 0, 7);
  private roverTargetSpeed: number = 0;
  private roverTurnInput: number = 0;

  // Camera Management
  private cameraConfig: CameraStateConfig = { mode: 'title' };
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);

  // GTA Vice City Glowing Surface Markers
  private inspectionMarkers: Map<ArtifactId, InspectionMarkerVisual> = new Map();
  private elapsedTime: number = 0;

  // Callbacks
  public onTelemetryUpdate?: (telemetry: RoverTelemetry) => void;
  public onNearArtifact?: (artifactId: ArtifactId | null, distance: number) => void;

  constructor(container: HTMLDivElement) {
    this.container = container;

    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      1200
    );
    this.camera.position.set(0, 12, 28);

    // 3. Studio Reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Initialize World
    this.initLights();
    this.initTerrain();
    this.initStars();
    this.initWarpLines();
    this.initLaser();
    this.initModels();
    this.initInspectionMarkers();

    // 5. Window Resize Handler
    window.addEventListener('resize', this.onResize);

    // 6. Start Loop
    this.tick = this.tick.bind(this);
    this.tick();
  }

  /**
   * Computes height on lunar regolith surface
   */
  public getLunarHeight(x: number, z: number): number {
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
    this.sunLight.position.set(45, 55, 35);
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

  private initTerrain() {
    const size = 180;
    const segments = 100;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, this.getLunarHeight(x, z));
    }
    geo.computeVertexNormals();

    const regolithTex = createRegolithTexture(this.renderer);
    const mat = new THREE.MeshStandardMaterial({
      map: regolithTex,
      roughness: 0.92,
      metalness: 0.05,
      bumpMap: regolithTex,
      bumpScale: 0.06
    });

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // Contact shadow beneath Eagle descent stage
    const contactGeo = new THREE.CircleGeometry(5.2, 32);
    contactGeo.rotateX(-Math.PI / 2);
    const contactMat = new THREE.MeshBasicMaterial({
      color: 0x05070a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const contactMesh = new THREE.Mesh(contactGeo, contactMat);
    contactMesh.position.set(0, 0.02, 0);
    this.scene.add(contactMesh);
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

    // 1. Intense solid neon-green core beam cylinder (replaces 1px WebGL line)
    const coreGeo = new THREE.CylinderGeometry(0.14, 0.14, length, 16, 1, true);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.laserCoreMesh.position.copy(mid);
    this.laserCoreMesh.quaternion.copy(orientation);
    this.laserPulseGroup.add(this.laserCoreMesh);

    // 2. Wide outer volumetric halo bloom cylinder
    const haloGeo = new THREE.CylinderGeometry(0.55, 0.55, length, 16, 1, true);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserHaloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.laserHaloMesh.position.copy(mid);
    this.laserHaloMesh.quaternion.copy(orientation);
    this.laserPulseGroup.add(this.laserHaloMesh);

    // 3. High-energy traveling photon plasma bolt packet (travels Earth -> Moon -> Earth)
    const packetGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const packetMat = new THREE.MeshBasicMaterial({
      color: 0xdcfce7,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserPacketMesh = new THREE.Mesh(packetGeo, packetMat);
    this.laserPacketMesh.position.copy(earthPos);
    this.laserPulseGroup.add(this.laserPacketMesh);

    // 4. Glowing impact spark burst at the Retroreflector
    const sparkGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserSparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    this.laserSparkMesh.position.copy(reflectorPos);
    this.laserPulseGroup.add(this.laserSparkMesh);

    // 5. Expanding impact shockwave ripple ring on the ground
    const rippleGeo = new THREE.RingGeometry(0.2, 0.45, 32);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0x86efac,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserRippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    this.laserRippleMesh.position.set(reflectorPos.x, reflectorPos.y + 0.05, reflectorPos.z);
    this.laserPulseGroup.add(this.laserRippleMesh);

    this.scene.add(this.laserPulseGroup);
  }

  private initModels() {
    this.models = buildApolloSceneModels(this.renderer);
    this.defaultModels = { ...this.models };

    // Add models to scene
    this.scene.add(this.models.descentStageGroup);
    this.scene.add(this.models.retroreflectorGroup);
    this.scene.add(this.models.roverGroup);
    this.scene.add(this.models.earthMesh);
    this.scene.add(this.models.voyagerGroup);

    // Position Descent Stage flush on ground
    const stageY = this.getLunarHeight(0, 0);
    this.models.descentStageGroup.position.set(0, stageY, 0);

    // Position Retroreflector flush on ground
    const retroY = this.getLunarHeight(14, -8);
    this.models.retroreflectorGroup.position.set(14, retroY, -8);

    // Initial Rover Position and Heading
    this.roverPosition.set(8, this.getLunarHeight(8, 7), 7);
    this.models.roverGroup.position.copy(this.roverPosition);
    this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;

    // Check if custom .glb files exist in /models/
    this.checkDefaultPublicModels();
  }

  /**
   * Replace any of the game's 3D models with a custom Blender model
   */
  public replaceModel(type: ReplaceableModelType, newGroup: THREE.Group, wheels?: THREE.Mesh[]) {
    if (type === 'rover') {
      this.scene.remove(this.models.roverGroup);
      this.models.roverGroup = newGroup;
      this.models.roverGroup.position.copy(this.roverPosition);
      this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;
      this.scene.add(newGroup);
      if (wheels && wheels.length > 0) {
        this.models.roverWheels = wheels;
      }
      this.customActiveModels.rover = true;

    } else if (type === 'descent_stage') {
      this.scene.remove(this.models.descentStageGroup);
      this.models.descentStageGroup = newGroup;
      newGroup.position.set(0, this.getLunarHeight(0, 0), 0);
      this.scene.add(newGroup);
      this.customActiveModels.descent_stage = true;

    } else if (type === 'retroreflector') {
      this.scene.remove(this.models.retroreflectorGroup);
      this.models.retroreflectorGroup = newGroup;
      newGroup.position.set(14, this.getLunarHeight(14, -8), -8);
      this.scene.add(newGroup);
      this.customActiveModels.retroreflector = true;

    } else if (type === 'voyager') {
      this.scene.remove(this.models.voyagerGroup);
      this.models.voyagerGroup = newGroup;
      newGroup.position.set(0, -500, 0);
      this.scene.add(newGroup);
      this.customActiveModels.voyager = true;
    }
  }

  /**
   * Reset model back to procedural high-fidelity default
   */
  public resetModel(type: ReplaceableModelType) {
    if (type === 'rover') {
      this.scene.remove(this.models.roverGroup);
      this.models.roverGroup = this.defaultModels.roverGroup;
      this.models.roverWheels = this.defaultModels.roverWheels;
      this.models.roverGroup.position.copy(this.roverPosition);
      this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;
      this.scene.add(this.models.roverGroup);
      this.customActiveModels.rover = false;

    } else if (type === 'descent_stage') {
      this.scene.remove(this.models.descentStageGroup);
      this.models.descentStageGroup = this.defaultModels.descentStageGroup;
      this.models.descentStageGroup.position.set(0, this.getLunarHeight(0, 0), 0);
      this.scene.add(this.models.descentStageGroup);
      this.customActiveModels.descent_stage = false;

    } else if (type === 'retroreflector') {
      this.scene.remove(this.models.retroreflectorGroup);
      this.models.retroreflectorGroup = this.defaultModels.retroreflectorGroup;
      this.models.retroreflectorGroup.position.set(14, this.getLunarHeight(14, -8), -8);
      this.scene.add(this.models.retroreflectorGroup);
      this.customActiveModels.retroreflector = false;

    } else if (type === 'voyager') {
      this.scene.remove(this.models.voyagerGroup);
      this.models.voyagerGroup = this.defaultModels.voyagerGroup;
      this.scene.add(this.models.voyagerGroup);
      this.customActiveModels.voyager = false;
    }
  }

  public getCustomActiveModels(): Partial<Record<ReplaceableModelType, boolean>> {
    return { ...this.customActiveModels };
  }

  private async checkDefaultPublicModels() {
    const defaultPaths: { type: ReplaceableModelType; url: string }[] = [
      { type: 'rover', url: '/models/rover.glb' },
      { type: 'descent_stage', url: '/models/descent_stage.glb' },
      { type: 'retroreflector', url: '/models/retroreflector.glb' },
      { type: 'voyager', url: '/models/voyager.glb' },
    ];

    for (const item of defaultPaths) {
      try {
        const res = await fetch(item.url, { method: 'HEAD' });
        if (res.ok) {
          const loaded = await customModelManager.loadFromUrl(item.url, item.type);
          this.replaceModel(item.type, loaded.scene, loaded.wheels);
        }
      } catch {
        // Fallback remains active seamlessly
      }
    }
  }

  /**
   * Initializes the glowing green surface area markers (GTA Vice City style)
   * at each artifact inspection zone on the lunar regolith.
   */
  private initInspectionMarkers() {
    const glowTex = createMarkerGlowTexture();
    const beamTex = createMarkerBeamTexture();

    const artifactList: ArtifactId[] = ['descent_stage', 'retroreflector', 'plaque'];

    artifactList.forEach(id => {
      const art = ARTIFACTS[id];
      if (!art || !art.markerPosition) return;

      const [mx, , mz] = art.markerPosition;
      const my = this.getLunarHeight(mx, mz);
      const radius = art.markerRadius || 1.6;

      const group = new THREE.Group();
      group.position.set(mx, my, mz);

      // 1. Soft radial ground glow disc
      const discGeo = new THREE.CircleGeometry(radius, 48);
      discGeo.rotateX(-Math.PI / 2);
      const discMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowDisc = new THREE.Mesh(discGeo, discMat);
      glowDisc.position.y = 0.03;
      group.add(glowDisc);

      // 2. Outer pulsing neon green ground ring
      const ringGeo = new THREE.RingGeometry(radius * 0.9, radius, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const outerRing = new THREE.Mesh(ringGeo, ringMat);
      outerRing.position.y = 0.04;
      group.add(outerRing);

      // 3. Inner rotating concentric ring
      const innerGeo = new THREE.RingGeometry(radius * 0.42, radius * 0.48, 32);
      innerGeo.rotateX(-Math.PI / 2);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x86efac,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const innerRing = new THREE.Mesh(innerGeo, innerMat);
      innerRing.position.y = 0.05;
      group.add(innerRing);

      // 4. Vertical translucent cylinder corona beam (iconic GTA Vice City cylindrical column)
      const beamGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 1.8, 32, 1, true);
      beamGeo.translate(0, 0.9, 0); // Ground up to 1.8m
      const beamMat = new THREE.MeshBasicMaterial({
        map: beamTex,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cylinderBeam = new THREE.Mesh(beamGeo, beamMat);
      group.add(cylinderBeam);

      // 5. Floating rotating diamond beacon
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

      this.scene.add(group);

      this.inspectionMarkers.set(id, {
        artifactId: id,
        group,
        outerRing,
        innerRing,
        glowDisc,
        cylinderBeam,
        diamond,
        position: new THREE.Vector3(mx, my, mz),
        radius,
        visited: false,
        inside: false
      });
    });
  }

  /**
   * Updates visited status on all inspection markers
   */
  public setArtifactsVisited(visited: Record<ArtifactId, boolean>) {
    for (const [id, marker] of this.inspectionMarkers.entries()) {
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
    this.roverTargetSpeed = forwardInput * 5.2; // max speed 5.2 m/s
    this.roverTurnInput = turnInput;
  }

  /**
   * Switch active camera choreography mode
   */
  public setCameraMode(config: CameraStateConfig) {
    this.cameraConfig = config;
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

    const dt = 0.016; // Stable ~60fps step

    // 1. Update Rover Kinematics
    this.updateRover(dt);

    // 2. Update Glowing Green GTA-style Surface Markers
    this.updateInspectionMarkers(dt);

    // 3. Update Laser Pulse
    this.updateLaser(dt);

    // 4. Update Camera Choreography
    this.updateCamera(dt);

    // 5. Slowly rotate Earth
    if (this.models.earthMesh) {
      this.models.earthMesh.rotation.y += 0.0003;
    }

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);

    this.frameId = requestAnimationFrame(this.tick);
  }

  private updateRover(dt: number) {
    // Smooth acceleration & deceleration
    this.roverVelocity = THREE.MathUtils.damp(this.roverVelocity, this.roverTargetSpeed, 4.0, dt);

    // Turn rate scales with speed & reverse steering
    if (Math.abs(this.roverTurnInput) > 0.05) {
      const turnMultiplier = this.roverVelocity < -0.1 ? -1 : 1;
      this.roverHeading += this.roverTurnInput * 1.8 * dt * turnMultiplier;
    }

    // Move rover forward
    const forwardX = Math.sin(this.roverHeading);
    const forwardZ = Math.cos(this.roverHeading);

    this.roverPosition.x += forwardX * this.roverVelocity * dt;
    this.roverPosition.z += forwardZ * this.roverVelocity * dt;

    // Ground clamp & surface normal tilt
    const groundY = this.getLunarHeight(this.roverPosition.x, this.roverPosition.z);
    this.roverPosition.y = groundY;

    this.models.roverGroup.position.copy(this.roverPosition);
    this.models.roverGroup.rotation.y = this.roverHeading - Math.PI / 2;

    // Rotate wheels smoothly around their Z-axis axle (zero Y-axis spin)
    if (this.models.roverWheels) {
      const wheelSpin = (this.roverVelocity * dt) / 0.24;
      this.models.roverWheels.forEach(wheel => {
        wheel.rotation.z -= wheelSpin;
      });
    }

    // Check proximity to glowing green surface area markers
    this.checkArtifactProximity();
  }

  /**
   * Animates the GTA Vice City glowing green surface area markers:
   * outer ring scaling/pulsing, inner concentric ring spinning,
   * cylindrical corona beam glowing, and floating diamond beacon bobbing.
   */
  private updateInspectionMarkers(dt: number) {
    this.elapsedTime += dt;
    const pulse = Math.sin(this.elapsedTime * 3.5);
    const fastPulse = Math.sin(this.elapsedTime * 7.5);

    for (const marker of this.inspectionMarkers.values()) {
      // 1. Rotate inner concentric ring
      marker.innerRing.rotation.z += dt * 1.6;

      // 2. Bob and spin floating diamond beacon
      marker.diamond.position.y = 2.2 + Math.sin(this.elapsedTime * 2.8 + marker.position.x * 0.5) * 0.15;
      marker.diamond.rotation.y += dt * 2.2;
      marker.diamond.rotation.x += dt * 0.9;

      const beamMat = marker.cylinderBeam.material as THREE.MeshBasicMaterial;
      const ringMat = marker.outerRing.material as THREE.MeshBasicMaterial;
      const discMat = marker.glowDisc.material as THREE.MeshBasicMaterial;
      const diamondMat = marker.diamond.material as THREE.MeshStandardMaterial;

      if (marker.inside) {
        // Player rover is inside the marker! Energized GTA Vice City active state
        marker.outerRing.scale.setScalar(1.0 + 0.08 * fastPulse);
        ringMat.color.setHex(0x86efac);
        ringMat.opacity = 0.95;
        beamMat.opacity = 0.65 + 0.25 * fastPulse;
        discMat.opacity = 0.9;
        diamondMat.emissiveIntensity = 1.4 + 0.5 * fastPulse;
      } else {
        // Idling allure pulse
        marker.outerRing.scale.setScalar(1.0 + 0.04 * pulse);
        ringMat.color.setHex(marker.visited ? 0x10b981 : 0x4ade80);
        ringMat.opacity = 0.75 + 0.15 * pulse;
        beamMat.opacity = 0.35 + 0.12 * pulse;
        discMat.opacity = 0.6 + 0.15 * pulse;
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

    let nearestInside: ArtifactId | null = null;
    let minMarkerDist = 999;
    let nearestArtifactId: ArtifactId = 'descent_stage';

    for (const [id, marker] of this.inspectionMarkers.entries()) {
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

    if (this.onNearArtifact) {
      this.onNearArtifact(nearestInside, minMarkerDist);
    }

    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        speed: Math.abs(this.roverVelocity),
        heading: (this.roverHeading * (180 / Math.PI)) % 360,
        distanceToTarget: minMarkerDist,
        nearestArtifact: nearestInside || nearestArtifactId,
        position: { x: rx, y: this.roverPosition.y, z: rz }
      });
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
    coreMat.opacity = 0.85 + 0.15 * beamPulse;
    haloMat.opacity = 0.45 + 0.25 * beamPulse;

    if (this.laserProgress < halfDuration) {
      // Outbound phase: High-energy photon plasma bolt travels from Earth down to the Retroreflector
      const t = this.laserProgress / halfDuration;
      this.laserPacketMesh.position.lerpVectors(this.earthLaserPos, this.reflectorLaserPos, t);
      this.laserPacketMesh.scale.setScalar(1.0 + 0.3 * Math.sin(t * Math.PI));
      this.laserPacketMesh.visible = true;

      this.laserSparkMesh.scale.setScalar(0.4 + 0.2 * Math.sin(this.laserProgress * 15));
      this.laserRippleMesh.visible = false;
    } else {
      // Return phase: Photon pulse reflects from lunar corner-cube array back to Earth!
      const t = (this.laserProgress - halfDuration) / halfDuration;
      this.laserPacketMesh.position.lerpVectors(this.reflectorLaserPos, this.earthLaserPos, t);
      this.laserPacketMesh.scale.setScalar(1.0 + 0.3 * Math.sin(t * Math.PI));

      // Impact explosion and expanding ripple ring on the ground at the retroreflector pallet
      const impactTime = this.laserProgress - halfDuration;
      if (impactTime < 0.9) {
        this.laserRippleMesh.visible = true;
        const rippleScale = 1.0 + impactTime * 5.5;
        this.laserRippleMesh.scale.set(rippleScale, rippleScale, rippleScale);
        rippleMat.opacity = Math.max(0, 0.85 - impactTime * 0.95);

        // Flash spark
        this.laserSparkMesh.scale.setScalar(1.8 + (0.9 - impactTime) * 2.2);
        sparkMat.opacity = Math.max(0.4, 1.0 - impactTime * 0.6);
      } else {
        this.laserRippleMesh.visible = false;
        sparkMat.opacity = 0.4;
      }
    }

    if (this.laserProgress > totalDuration) {
      this.isLaserFiring = false;
      this.laserPulseGroup.visible = false;
    }
  }

  private updateCamera(dt: number) {
    const mode = this.cameraConfig.mode;

    if (mode === 'title') {
      // Atmospheric orbit around the Sea of Tranquility landing site
      const time = performance.now() * 0.00018;
      const camRadius = 26;
      _vec3Target.set(Math.sin(time) * camRadius, 10 + Math.sin(time * 0.5) * 2, Math.cos(time) * camRadius);
      this.camera.position.lerp(_vec3Target, dt * 2.5);
      this.cameraTarget.set(0, 1.8, 0);
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'intro') {
      // 15-second cinematic flyby
      const p = this.cameraConfig.introProgress ?? 0;
      // Start high in orbit looking at Earth and Moon, swoop down to Eagle
      const startCam = _vec3A.set(40, 45, 60);
      const midCam = _vec3B.set(12, 16, 25);
      const endCam = _vec3Target.set(
        this.roverPosition.x - Math.sin(this.roverHeading) * 7,
        this.roverPosition.y + 3.2,
        this.roverPosition.z - Math.cos(this.roverHeading) * 7
      );

      if (p < 0.5) {
        this.camera.position.lerpVectors(startCam, midCam, p * 2);
        this.cameraTarget.lerpVectors(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 1.5, 0), p * 2);
      } else {
        this.camera.position.lerpVectors(midCam, endCam, (p - 0.5) * 2);
        this.cameraTarget.lerpVectors(new THREE.Vector3(0, 1.5, 0), this.roverPosition, (p - 0.5) * 2);
      }
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'explore') {
      // Third-person chase camera behind the rover
      const chaseDistance = 6.8;
      const chaseHeight = 2.9;

      const idealCamX = this.roverPosition.x - Math.sin(this.roverHeading) * chaseDistance;
      const idealCamZ = this.roverPosition.z - Math.cos(this.roverHeading) * chaseDistance;
      const idealCamY = Math.max(this.roverPosition.y + chaseHeight, this.getLunarHeight(idealCamX, idealCamZ) + 1.2);

      _vec3Target.set(idealCamX, idealCamY, idealCamZ);
      this.camera.position.lerp(_vec3Target, dt * 4.5);

      _vec3A.set(this.roverPosition.x, this.roverPosition.y + 1.2, this.roverPosition.z);
      this.cameraTarget.lerp(_vec3A, dt * 6.0);
      this.camera.lookAt(this.cameraTarget);

    } else if (mode === 'inspect') {
      // Close up inspection shots based on targetArtifact
      const target = this.cameraConfig.targetArtifact;
      if (target === 'plaque') {
        // Tight focus on the ladder plaque
        _vec3Target.set(2.4, 1.3, 2.4);
        this.camera.position.lerp(_vec3Target, dt * 4.0);
        this.cameraTarget.set(1.7, 1.1, 1.7);
        this.camera.lookAt(this.cameraTarget);
      } else if (target === 'retroreflector') {
        if (this.isLaserFiring) {
          // Dynamic wide-angle cinematic shot framing BOTH Earth in the starry sky AND the retroreflector on the moon!
          _vec3Target.set(10.5, 2.2, 3.5);
          this.camera.position.lerp(_vec3Target, dt * 5.0);
          _vec3A.set(38, 22, -45);
          this.cameraTarget.lerp(_vec3A, dt * 5.0);
          this.camera.lookAt(this.cameraTarget);
        } else {
          // Angled view on the retroreflector array
          _vec3Target.set(15.8, 1.8, -6.5);
          this.camera.position.lerp(_vec3Target, dt * 4.0);
          this.cameraTarget.set(14, 0.6, -8);
          this.camera.lookAt(this.cameraTarget);
        }
      } else {
        // Descent stage dramatic view
        _vec3Target.set(5.5, 3.2, 5.5);
        this.camera.position.lerp(_vec3Target, dt * 4.0);
        this.cameraTarget.set(0, 1.8, 0);
        this.camera.lookAt(this.cameraTarget);
      }

    } else if (mode === 'outro' || mode === 'warp') {
      const p = this.cameraConfig.outroProgress ?? 0;

      if (p < 0.5) {
        // Camera pulling vertically up away from Sea of Tranquility
        const h = THREE.MathUtils.lerp(15, 200, p * 2);
        const z = THREE.MathUtils.lerp(25, 120, p * 2);
        this.camera.position.set(0, h, z);
        this.camera.lookAt(0, 0, 0);

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
        this.models.voyagerGroup.rotation.y += 0.005;

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

  public dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onResize);
    for (const marker of this.inspectionMarkers.values()) {
      this.scene.remove(marker.group);
      marker.outerRing.geometry.dispose();
      (marker.outerRing.material as THREE.Material).dispose();
      marker.innerRing.geometry.dispose();
      (marker.innerRing.material as THREE.Material).dispose();
      marker.glowDisc.geometry.dispose();
      (marker.glowDisc.material as THREE.Material).dispose();
      marker.cylinderBeam.geometry.dispose();
      (marker.cylinderBeam.material as THREE.Material).dispose();
      marker.diamond.geometry.dispose();
      (marker.diamond.material as THREE.Material).dispose();
    }
    this.inspectionMarkers.clear();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
