import * as THREE from 'three';
import { gameClock } from '../utils/gameClock';
import { buildApolloSceneModels } from './apolloModels';
import { customModelManager } from './modelLoader';
import {
  EARTH_DIRECTION,
  VOYAGER_MARKERS,
  SHELL_RADIUS,
  VoyagerMarkerId,
  VoyagerStep,
  voyagerSunEarthPositions
} from '../missions/voyager/data';
import { VOYAGER_PARTS, VOYAGER_PART_CENTER, VoyagerPartFrame } from '../missions/voyager/parts';
import { disposeScene } from './disposeScene';

export interface SkyPoint {
  x: number;
  y: number;
  visible: boolean;
  /** Shift the leader tip this many pixels left of the anchor. Mission 1 uses it for Earth. */
  tipLeft?: number;
}

export interface SkyFrame {
  sun: SkyPoint;
  earth: SkyPoint;
  mars: SkyPoint;
  jezero?: SkyPoint;
}

export interface VoyagerTelemetry {
  thrust: number;
  headingErrorDeg: number;
  signal: number;
  aligned: boolean;
  distanceToMarker: number;
  outsideShell: boolean;
  yawError: number;
  pitchError: number;
  markerYaw: number;
  markerPitch: number;
  hasMarker: boolean;
  /** 1 is a full tank. Turning during the aim spends it. */
  fuel: number;
}

const ALIGN_RAD = (8 * Math.PI) / 180;
const ALIGN_HOLD = 1;
/** Seconds of full-rate turning the aim tank holds. */
/** Seconds of full turning the tank allows. Long enough for a first-time player who overshoots once or twice. */
const AIM_FUEL_SECONDS = 20;
const START_YAW = Math.PI;
const PAN_SECONDS = 12;
/** Radians per second the inspection camera walks around the still craft. */
const INSPECT_ORBIT_RATE = 0.32;
/**
 * Height of that camera above the craft. Low enough that the Sun and Earth,
 * side by side ahead of the dish, pass through the frame during the pan.
 */
const INSPECT_PITCH = 0.16;
/**
 * Distance of the circling camera. The model is scaled by its longest part, the 13 m magnetometer boom,
 * so the dish is only about 2 units across: at 18 it was about 10% of the screen height. At 11 the dish
 * fills about a fifth, and the boom still fits.
 */
const TOUR_RADIUS = 11;
/** Distance when a reading eases the camera onto the instrument being read. */
const CLOSE_UP_RADIUS = 8.5;
const CRAFT_HOME = new THREE.Vector3(0, 0, 4);

/**
 * Deep-space flight for Mission 02. The spacecraft is steered as a whole:
 * its dish is fixed to the body and points along local +Z.
 */
export class VoyagerEngine {
  private readonly container: HTMLDivElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly craft: THREE.Group;
  private readonly earthDir = new THREE.Vector3(EARTH_DIRECTION.x, EARTH_DIRECTION.y, EARTH_DIRECTION.z).normalize();
  private readonly sunPosition = new THREE.Vector3();
  private readonly earthPosition = new THREE.Vector3();
  private readonly marsSkyPosition = new THREE.Vector3();
  private readonly earthMarker: THREE.Object3D;
  private readonly sunBody: THREE.Object3D;
  private readonly marsSky: THREE.Object3D;
  private sunGlowMap?: THREE.Texture;
  private earthGlowMap?: THREE.Texture;
  private marsGlowMap?: THREE.Texture;
  private readonly mars: THREE.Mesh;
  private readonly link: THREE.Line;
  private readonly markers = new Map<VoyagerMarkerId, THREE.Group>();
  private readonly forward = new THREE.Vector3();
  private readonly chasePos = new THREE.Vector3();
  private readonly chaseLook = new THREE.Vector3();
  private readonly recordCam = new THREE.Vector3();
  private readonly recordLook = new THREE.Vector3();
  private readonly recordLocal = new THREE.Vector3(1.02, 0, -0.6);
  private readonly partLocals = VOYAGER_PARTS.map(part => new THREE.Vector3(...part.anchor));
  private readonly partCenterLocal = new THREE.Vector3(...VOYAGER_PART_CENTER);
  private readonly partWorld = new THREE.Vector3();
  private readonly partNdc = new THREE.Vector3();
  private readonly partView = new THREE.Vector3();
  private partLabelsOn = false;
  private partLabelsRequested = false;
  private nasaCraft = false;
  /** The player asked to see the part markers (Inspect Voyager 1). The circling camera is separate. */
  private markersOn = false;
  /** What the circling camera looks at: the craft, or the instrument being read. */
  private readonly orbitTarget = new THREE.Vector3();
  private readonly closeUpPoint = new THREE.Vector3();
  /** Share of the screen width covered by a right-hand panel; the picture shifts left to clear it. */
  private frameShift = 0;
  private frameShiftNow = 0;
  /** Share of the height to raise the picture by (short screens, where the narration box sits low). */
  private frameLift = 0;
  private frameLiftNow = 0;
  private fillLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private orbitYaw = Math.PI;
  private orbitPitch = INSPECT_PITCH;
  private orbitRadius = 16;
  private orbitReady = false;
  private orbitPointer = -1;
  private orbitLastX = 0;
  private orbitLastY = 0;
  private orbitDragYaw = 0;
  private orbitDragPitch = 0;
  private readonly orbitOffset = new THREE.Vector3();
  private readonly localEarth = new THREE.Vector3();
  private readonly localMarker = new THREE.Vector3();
  private frameId = 0;
  private disposed = false;
  private mode: 'intro' | 'flight' | 'outro' = 'intro';
  private introStarted = gameClock.now();
  private introSent = false;
  private readonly panStart = new THREE.Vector3(24, 12, -30);
  private step: VoyagerStep = 'align';
  private focus: VoyagerMarkerId | 'record' | null = null;
  private yaw = START_YAW;
  private pitch = 0;
  private velocity = 0;
  private thrustInput = 0;
  private yawInput = 0;
  private pitchInput = 0;
  private alignHold = 0;
  private alignSent = false;
  private fuel = 1;
  private fuelSpentSent = false;
  /** After a refill, ignore a key or button that is still held. */
  private awaitRelease = false;
  private aimYawError = 0;
  private aimPitchError = 0;
  private slewing = false;
  private beaming = false;
  private sendTimer = 0;
  private uplinkSent = false;
  private blinkId: string | null = null;
  private blinkMesh!: THREE.Mesh;
  private blinkLight!: THREE.PointLight;
  private wasInside = true;
  private crossSent = false;
  private outro = 0;
  private telemetryStamp = '';
  private nearStamp: VoyagerMarkerId | null = null;
  private powerDim = 0;

  public onTelemetry?: (telemetry: VoyagerTelemetry) => void;
  public onNearMarker?: (id: VoyagerMarkerId | null) => void;
  public onAligned?: () => void;
  public onFuelSpent?: () => void;
  public onUplinkDone?: () => void;
  public onCrossedShell?: () => void;
  public onIntroSettled?: () => void;
  /** True only after the NASA model has loaded. The procedural stand-in stays unlabeled. */
  public onCraftReady?: (nasa: boolean) => void;
  public readonly partFrame: VoyagerPartFrame = {
    centerX: 0,
    centerY: 0,
    parts: VOYAGER_PARTS.map(part => ({ id: part.id, x: 0, y: 0, visible: false }))
  };
  public readonly skyFrame: SkyFrame = {
    sun: { x: 0, y: 0, visible: false },
    earth: { x: 0, y: 0, visible: false },
    mars: { x: 0, y: 0, visible: false }
  };

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    this.container.addEventListener('pointerdown', this.onOrbitPointerDown);
    this.container.addEventListener('pointermove', this.onOrbitPointerMove);
    this.container.addEventListener('pointerup', this.onOrbitPointerUp);
    this.container.addEventListener('pointercancel', this.onOrbitPointerUp);

    this.scene.background = new THREE.Color(0x000208);
    this.camera = new THREE.PerspectiveCamera(55, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 800);
    this.camera.position.set(18, 10, -24);

    const bodies = voyagerSunEarthPositions(CRAFT_HOME);
    this.sunPosition.set(bodies.sun.x, bodies.sun.y, bodies.sun.z);
    this.earthPosition.set(bodies.earth.x, bodies.earth.y, bodies.earth.z);
    this.marsSkyPosition.set(bodies.mars.x, bodies.mars.y, bodies.mars.z);

    this.scene.add(new THREE.AmbientLight(0x8ea2c9, 0.55));
    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.4);
    sunLight.position.copy(this.sunPosition);
    this.scene.add(sunLight);
    // Voyager is far from the Sun, and the camera often sees its unlit side: a dark shape on black space.
    // A soft light from the camera and a faint cool rim from behind keep its outline readable.
    this.fillLight = new THREE.DirectionalLight(0xdfe8ff, 1.15);
    this.rimLight = new THREE.DirectionalLight(0x9cc3ff, 1.4);
    this.scene.add(this.fillLight, this.fillLight.target, this.rimLight, this.rimLight.target);

    this.addStars();
    this.sunBody = this.addSun();
    this.earthMarker = this.addEarthMarker();
    this.marsSky = this.addMarsSky();
    this.mars = this.addMars();
    this.link = this.addLink();
    this.craft = this.addCraft();
    this.addBlink();
    this.addMarkers();

    this.tick = this.tick.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.frameId = requestAnimationFrame(this.tick);
  }

  public setInputs(thrust: number, yaw: number, pitch: number) {
    this.thrustInput = thrust;
    this.yawInput = yaw;
    this.pitchInput = pitch;
  }

  public setStep(step: VoyagerStep) {
    this.step = step;
    for (const [, group] of this.markers) group.visible = false;
    if (step === 'cross' && this.craft.position.length() > SHELL_RADIUS && !this.crossSent) {
      this.crossSent = true;
      this.wasInside = false;
      this.onCrossedShell?.();
    }
  }

  /** Put the aim back at the start, with a full tank. */
  public resetAim() {
    this.yaw = START_YAW;
    this.pitch = 0;
    this.velocity = 0;
    this.fuel = 1;
    this.alignHold = 0;
    this.alignSent = false;
    this.fuelSpentSent = false;
    this.awaitRelease = true;
    this.telemetryStamp = '';
    this.boresight(this.forward);
  }

  /** Pulse a point on one labeled part. `null` turns it off. */
  public setBlink(partId: string | null) {
    this.blinkId = partId;
    const on = Boolean(partId);
    this.blinkMesh.visible = on;
    this.blinkLight.visible = on;
  }

  /** Turn the dish toward Earth, then hold a bright uplink. */
  public beginUplink() {
    this.slewing = true;
    this.beaming = false;
    this.sendTimer = 0;
    this.uplinkSent = false;
    this.telemetryStamp = '';
  }

  public setFocus(target: VoyagerMarkerId | 'record' | null) {
    this.focus = target;
  }

  public beginIntro() {
    this.mode = 'intro';
    this.introStarted = gameClock.now();
    this.introSent = false;
    this.earthMarker.visible = true;
    this.playPan(0);
  }

  public skipIntro() {
    if (this.introSent) return;
    this.introSent = true;
    this.earthMarker.visible = true;
    this.mode = 'flight';
    this.onIntroSettled?.();
  }

  /** Enter flight without the intro callback. Used by the temporary objective skip. */
  public beginFlight() {
    this.introSent = true;
    this.earthMarker.visible = true;
    if (this.mode !== 'outro') this.mode = 'flight';
  }

  /** The part markers (chips and leader lines) for Inspect Voyager 1. The circling camera stays as it is. */
  public setPartMarkers(on: boolean) {
    this.markersOn = on;
    if (!on) this.clearPartFrame();
  }

  /** Move the picture left by half a panel's share of the width, so the craft sits beside the panel. */
  public setFrameShift(share: number, lift = 0) {
    this.frameShift = THREE.MathUtils.clamp(share, 0, 0.6);
    this.frameLift = THREE.MathUtils.clamp(lift, 0, 0.3);
  }

  /**
   * The circling tour camera (it walks slowly around the still craft). Named for the part labels it used to
   * switch on as well; those are now setPartMarkers. Ignored until the NASA model is the one on screen.
   */
  public setPartLabels(on: boolean) {
    this.partLabelsRequested = on;
    this.partLabelsOn = on && this.nasaCraft;
    if (!this.partLabelsOn) {
      this.orbitReady = false;
      this.orbitPointer = -1;
      this.clearPartFrame();
    }
  }

  public setOutroProgress(progress: number) {
    this.mode = 'outro';
    this.outro = Math.min(1, Math.max(0, progress));
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.container.removeEventListener('pointerdown', this.onOrbitPointerDown);
    this.container.removeEventListener('pointermove', this.onOrbitPointerMove);
    this.container.removeEventListener('pointerup', this.onOrbitPointerUp);
    this.container.removeEventListener('pointercancel', this.onOrbitPointerUp);
    window.removeEventListener('resize', this.onResize);
    this.sunGlowMap?.dispose();
    this.earthGlowMap?.dispose();
    this.marsGlowMap?.dispose();
    disposeScene(this.scene, this.renderer);
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private addStars() {
    const positions = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const radius = 120 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xf8fafc, size: 0.35, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geometry, material));
  }

  private addShell() {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(SHELL_RADIUS, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.04,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    this.scene.add(shell);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const axes: Array<[number, number, number]> = [
      [Math.PI / 2, 0, 0],
      [0, 0, 0],
      [0, Math.PI / 2, 0]
    ];
    for (const [x, y, z] of axes) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(SHELL_RADIUS, 0.035, 6, 80), ringMat);
      ring.rotation.set(x, y, z);
      this.scene.add(ring);
    }
  }

  private addSun() {
    const group = new THREE.Group();
    group.position.copy(this.sunPosition);
    this.sunGlowMap = this.makePointTexture(true);
    const sunScale = this.sunPosition.distanceTo(CRAFT_HOME) / 100;
    group.add(this.makePoint(this.sunGlowMap, 0xfff4c2, 2.4 * sunScale, 0.08 * sunScale, 0xfffef6));
    this.scene.add(group);
    return group;
  }

  private addEarthMarker() {
    const marker = new THREE.Group();
    this.earthGlowMap = this.makePointTexture(false);
    const earthScale = this.earthPosition.distanceTo(CRAFT_HOME) / 167;
    marker.add(this.makePoint(this.earthGlowMap, 0xdbeafe, 2.66 * earthScale, 0.114 * earthScale, 0xf8fbff));
    marker.position.copy(this.earthPosition);
    this.scene.add(marker);
    return marker;
  }

  private addMarsSky() {
    const marker = new THREE.Group();
    this.marsGlowMap = this.makePointTexture(false, 'rgba(255, 150, 110, 0.5)');
    const marsScale = this.marsSkyPosition.distanceTo(CRAFT_HOME) / 167;
    marker.add(this.makePoint(this.marsGlowMap, 0xff6a3d, 2.66 * marsScale, 0.114 * marsScale, 0xffd2c4));
    marker.position.copy(this.marsSkyPosition);
    this.scene.add(marker);
    return marker;
  }

  /** A bright core plus an additive glow. The Sun texture also carries short rays. */
  private makePoint(map: THREE.Texture, glow: number, glowSize: number, coreSize: number, core: number) {
    const group = new THREE.Group();
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map,
        color: glow,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      })
    );
    sprite.scale.set(glowSize, glowSize, 1);
    sprite.renderOrder = 2;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(coreSize, 10, 8),
      new THREE.MeshBasicMaterial({ color: core, toneMapped: false })
    );
    body.renderOrder = 3;
    group.add(sprite, body);
    return group;
  }

  private makePointTexture(rays: boolean, halo = 'rgba(191,219,254,0.4)') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (!context) return texture;
    const center = 64;
    if (rays) {
      context.strokeStyle = 'rgba(255, 236, 180, 0.7)';
      context.lineWidth = 2;
      context.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI;
        const outer = i % 2 === 0 ? 58 : 34;
        context.beginPath();
        context.moveTo(center + Math.cos(angle) * 8, center + Math.sin(angle) * 8);
        context.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
        context.moveTo(center - Math.cos(angle) * 8, center - Math.sin(angle) * 8);
        context.lineTo(center - Math.cos(angle) * outer, center - Math.sin(angle) * outer);
        context.stroke();
      }
    }
    const glow = context.createRadialGradient(center, center, 0, center, center, 64);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.07, 'rgba(255,255,255,0.95)');
    glow.addColorStop(rays ? 0.2 : 0.16, rays ? 'rgba(255,236,180,0.45)' : halo);
    glow.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 128, 128);
    texture.needsUpdate = true;
    return texture;
  }

  private addMars() {
    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.85, metalness: 0.05 })
    );
    mars.position.set(0, 0, -28);
    mars.scale.setScalar(0.01);
    mars.visible = false;
    this.scene.add(mars);
    return mars;
  }

  private addLink() {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0 })
    );
    this.scene.add(line);
    return line;
  }

  private addCraft() {
    const craft = new THREE.Group();
    craft.name = 'Voyager1';
    craft.position.copy(CRAFT_HOME);
    this.scene.add(craft);
    this.loadCraftModel();
    return craft;
  }

  private async loadCraftModel() {
    try {
      const loaded = await customModelManager.loadFromUrl('/models/voyager.glb', 'voyager');
      if (this.disposed) return;
      const model = loaded.scene;
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
      this.prepareCraftMaterials(model);
      this.craft.add(model);
      this.recordLocal.set(-0.018, -3.399, -1.682);
      this.fitCraft(7);
      this.nasaCraft = true;
      this.partLabelsOn = this.partLabelsRequested;
      this.onCraftReady?.(true);
    } catch {
      if (this.disposed) return;
      this.useProceduralCraft();
    }
  }

  private useProceduralCraft() {
    const standIn = buildApolloSceneModels(this.renderer).voyagerGroup;
    standIn.position.set(0, 0, 0);
    standIn.rotation.set(0, 0, 0);
    standIn.scale.setScalar(1);
    this.prepareCraftMaterials(standIn);
    this.craft.add(standIn);
    this.recordLocal.set(1.02, 0, -0.6);
    this.fitCraft(7);
    this.nasaCraft = false;
    this.partLabelsOn = false;
    this.clearPartFrame();
    this.onCraftReady?.(false);
  }

  private prepareCraftMaterials(root: THREE.Object3D) {
    root.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const source = mesh.material;
      mesh.material = Array.isArray(source) ? source.map(item => item.clone()) : source.clone();
    });
  }

  private fitCraft(targetLength: number) {
    const saved = this.craft.rotation.clone();
    this.craft.rotation.set(0, 0, 0);
    this.craft.scale.setScalar(1);
    this.craft.updateWorldMatrix(true, true);
    const size = new THREE.Box3().setFromObject(this.craft).getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z);
    if (longest > 0) this.craft.scale.setScalar(targetLength / longest);
    this.craft.rotation.copy(saved);
  }

  private clearPartFrame() {
    this.partFrame.centerX = 0;
    this.partFrame.centerY = 0;
    for (const part of this.partFrame.parts) part.visible = false;
  }

  /** Anchors in viewport pixels, using the craft scale and rotation. */
  private projectParts() {
    if (!this.partLabelsOn || !this.markersOn) return;
    const bounds = this.container.getBoundingClientRect();
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.partView);
    const center = this.projectCraftPoint(this.partCenterLocal, bounds);
    this.partFrame.centerX = center.x;
    this.partFrame.centerY = center.y;
    for (let i = 0; i < this.partLocals.length; i++) {
      const point = this.projectCraftPoint(this.partLocals[i], bounds);
      const slot = this.partFrame.parts[i];
      slot.x = point.x;
      slot.y = point.y;
      slot.visible = point.visible;
    }
  }

  private projectSky() {
    if (this.mode === 'outro') {
      this.skyFrame.sun.visible = false;
      this.skyFrame.earth.visible = false;
      this.skyFrame.mars.visible = false;
      this.marsSky.visible = false;
      return;
    }
    this.marsSky.visible = true;
    const bounds = this.container.getBoundingClientRect();
    this.camera.updateMatrixWorld();
    this.camera.getWorldDirection(this.partView);
    this.writeSkyPoint(this.sunBody, this.skyFrame.sun, bounds);
    this.writeSkyPoint(this.earthMarker, this.skyFrame.earth, bounds);
    this.writeSkyPoint(this.marsSky, this.skyFrame.mars, bounds);
  }

  private writeSkyPoint(body: THREE.Object3D, slot: SkyPoint, bounds: DOMRect) {
    body.getWorldPosition(this.partWorld);
    const facing =
      (this.partWorld.x - this.camera.position.x) * this.partView.x +
      (this.partWorld.y - this.camera.position.y) * this.partView.y +
      (this.partWorld.z - this.camera.position.z) * this.partView.z;
    this.partNdc.copy(this.partWorld).project(this.camera);
    slot.x = bounds.left + (this.partNdc.x * 0.5 + 0.5) * bounds.width;
    slot.y = bounds.top + (-this.partNdc.y * 0.5 + 0.5) * bounds.height;
    slot.visible =
      facing > 0.2 &&
      this.partNdc.z > 0 &&
      this.partNdc.z < 1 &&
      Math.abs(this.partNdc.x) < 0.92 &&
      Math.abs(this.partNdc.y) < 0.92;
  }

  private projectCraftPoint(local: THREE.Vector3, bounds: DOMRect) {
    const scale = this.craft.scale.x;
    this.partWorld.copy(local).multiplyScalar(scale);
    this.partWorld.applyQuaternion(this.craft.quaternion).add(this.craft.position);
    const facing =
      (this.partWorld.x - this.camera.position.x) * this.partView.x +
      (this.partWorld.y - this.camera.position.y) * this.partView.y +
      (this.partWorld.z - this.camera.position.z) * this.partView.z;
    this.partNdc.copy(this.partWorld).project(this.camera);
    return {
      x: bounds.left + (this.partNdc.x * 0.5 + 0.5) * bounds.width,
      y: bounds.top + (-this.partNdc.y * 0.5 + 0.5) * bounds.height,
      visible: facing > 0.2 && this.partNdc.z < 1
    };
  }

  private addBlink() {
    this.blinkMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x86efac, toneMapped: false })
    );
    this.blinkMesh.visible = false;
    this.blinkMesh.renderOrder = 5;
    this.blinkLight = new THREE.PointLight(0x86efac, 6, 8, 2);
    this.blinkLight.visible = false;
    this.scene.add(this.blinkMesh, this.blinkLight);
  }

  private updateBlink(now: number) {
    if (!this.blinkId) return;
    const part = VOYAGER_PARTS.find(item => item.id === this.blinkId);
    if (!part) return;
    const scale = this.craft.scale.x || 1;
    this.partWorld.set(part.anchor[0], part.anchor[1], part.anchor[2]).multiplyScalar(scale);
    this.partWorld.applyQuaternion(this.craft.quaternion).add(this.craft.position);
    const pulse = 0.35 + 0.65 * Math.abs(Math.sin(now / 160));
    this.blinkMesh.position.copy(this.partWorld);
    this.blinkMesh.scale.setScalar(0.7 + pulse);
    this.blinkLight.position.copy(this.partWorld);
    this.blinkLight.intensity = 2 + pulse * 8;
  }

  private addMarkers() {
    for (const spec of VOYAGER_MARKERS) {
      const group = new THREE.Group();
      group.position.set(spec.position[0], spec.position[1], spec.position[2]);
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 3.2, 12),
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.45 })
      );
      column.position.y = 1.6;
      const diamond = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28),
        new THREE.MeshStandardMaterial({ color: 0xecfdf5, emissive: 0x34d399, emissiveIntensity: 0.9, roughness: 0.3 })
      );
      diamond.position.y = 3.4;
      diamond.name = 'diamond';
      group.add(column, diamond);
      group.visible = false;
      this.scene.add(group);
      this.markers.set(spec.id, group);
    }
  }

  private playPan(span: number) {
    const offset = this.orbitOffset.copy(this.panStart).sub(this.craft.position);
    const distance = Math.max(offset.length(), 0.001);
    const startYaw = Math.atan2(offset.x, offset.z);
    const startPitch = Math.asin(THREE.MathUtils.clamp(offset.y / distance, -1, 1));
    this.placeOrbit(
      startYaw + span * INSPECT_ORBIT_RATE * PAN_SECONDS,
      THREE.MathUtils.lerp(startPitch, INSPECT_PITCH, span),
      THREE.MathUtils.lerp(distance, 18, span)
    );
  }

  private boresight(out: THREE.Vector3) {
    this.craft.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.craft.updateMatrixWorld(true);
    out.set(0, 0, 1).applyQuaternion(this.craft.quaternion);
  }

  /** Walk the camera around the still spacecraft. It pans on its own; yaw and pitch steer that pan. */
  private orbitCraft(dt: number) {
    if (!this.orbitReady) {
      this.orbitOffset.copy(this.camera.position).sub(this.craft.position);
      if (this.orbitOffset.lengthSq() < 1) this.orbitOffset.set(0, 3, -14);
      this.orbitRadius = THREE.MathUtils.clamp(this.orbitOffset.length(), 10, 28);
      this.orbitYaw = Math.atan2(this.orbitOffset.x, this.orbitOffset.z);
      this.orbitPitch = Math.asin(THREE.MathUtils.clamp(this.orbitOffset.y / this.orbitOffset.length(), -1, 1));
      this.orbitPitch = THREE.MathUtils.lerp(this.orbitPitch, INSPECT_PITCH, 0.85);
      this.orbitTarget.copy(this.craft.position);
      this.orbitReady = true;
    }
    // During a reading the camera eases onto the blinking instrument, from the side it sits on, and holds.
    const closeUp = this.closeUpTarget();
    if (closeUp) {
      this.orbitTarget.lerp(closeUp, 1 - Math.exp(-2.2 * dt));
      this.orbitRadius = THREE.MathUtils.damp(this.orbitRadius, CLOSE_UP_RADIUS, 1.8, dt);
      const out = this.closeUpPoint.copy(closeUp).sub(this.craft.position);
      if (out.lengthSq() > 1e-4) {
        const want = Math.atan2(out.x, out.z);
        const turn = Math.atan2(Math.sin(want - this.orbitYaw), Math.cos(want - this.orbitYaw));
        this.orbitYaw += turn * (1 - Math.exp(-1.6 * dt));
      }
      this.orbitPitch = THREE.MathUtils.damp(this.orbitPitch, INSPECT_PITCH + 0.12, 1.6, dt);
      this.orbitYaw += this.orbitDragYaw;
      this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + this.orbitDragPitch, -1.05, 1.15);
      this.orbitDragYaw = 0;
      this.orbitDragPitch = 0;
      this.placeOrbit(this.orbitYaw, this.orbitPitch, this.orbitRadius);
      return;
    }
    this.orbitTarget.lerp(this.craft.position, 1 - Math.exp(-2.2 * dt));
    this.orbitRadius = THREE.MathUtils.damp(this.orbitRadius, TOUR_RADIUS, 2.5, dt);
    this.orbitYaw += (INSPECT_ORBIT_RATE - this.yawInput * 0.9) * dt + this.orbitDragYaw;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch + this.pitchInput * 0.7 * dt + this.orbitDragPitch,
      -1.05,
      1.15
    );
    this.orbitDragYaw = 0;
    this.orbitDragPitch = 0;
    this.placeOrbit(this.orbitYaw, this.orbitPitch, this.orbitRadius);
  }

  private placeOrbit(yaw: number, pitch: number, radius: number) {
    const cp = Math.cos(pitch);
    const target = this.orbitReady ? this.orbitTarget : this.craft.position;
    this.camera.position.set(
      target.x + Math.sin(yaw) * cp * radius,
      target.y + Math.sin(pitch) * radius,
      target.z + Math.cos(yaw) * cp * radius
    );
    this.camera.lookAt(target);
  }

  /** World position of the instrument a reading is about (the blinking part), or null. */
  private closeUpTarget(): THREE.Vector3 | null {
    if (!this.blinkId) return null;
    const part = VOYAGER_PARTS.find(item => item.id === this.blinkId);
    if (!part) return null;
    const scale = this.craft.scale.x || 1;
    // Aim between the craft and the instrument, so both the part and the craft it sits on stay in view.
    return this.closeUpPoint
      .set(part.anchor[0], part.anchor[1], part.anchor[2])
      .multiplyScalar(scale * 0.6)
      .applyQuaternion(this.craft.quaternion)
      .add(this.craft.position)
      .clone();
  }

  /** The fill light sits with the camera; the rim light opposite it, a little above. */
  private placeCraftLights() {
    this.fillLight.position.copy(this.camera.position);
    this.fillLight.target.position.copy(this.craft.position);
    this.rimLight.position
      .copy(this.craft.position)
      .multiplyScalar(2)
      .sub(this.camera.position)
      .add(new THREE.Vector3(0, 4, 0));
    this.rimLight.target.position.copy(this.craft.position);
  }

  private setOffset(width: number, height: number) {
    if (this.frameShiftNow < 1e-4 && this.frameLiftNow < 1e-4) {
      this.camera.clearViewOffset();
      return;
    }
    this.camera.setViewOffset(width, height, (this.frameShiftNow / 2) * width, this.frameLiftNow * height, width, height);
  }

  /** Ease the picture sideways (camera view offset) so the craft clears a right-hand panel. */
  private applyFrameShift(dt: number) {
    if (this.frameShiftNow === this.frameShift && this.frameLiftNow === this.frameLift) return;
    let shift = THREE.MathUtils.damp(this.frameShiftNow, this.frameShift, 3, dt);
    if (Math.abs(shift - this.frameShift) < 1e-3) shift = this.frameShift;
    let lift = THREE.MathUtils.damp(this.frameLiftNow, this.frameLift, 3, dt);
    if (Math.abs(lift - this.frameLift) < 1e-3) lift = this.frameLift;
    this.frameShiftNow = shift;
    this.frameLiftNow = lift;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.setOffset(width, height);
  }

  private onOrbitPointerDown = (event: PointerEvent) => {
    if (!this.partLabelsOn || this.mode !== 'flight' || this.focus || event.button !== 0) return;
    this.orbitPointer = event.pointerId;
    this.orbitLastX = event.clientX;
    this.orbitLastY = event.clientY;
    this.container.setPointerCapture(event.pointerId);
  };

  private onOrbitPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.orbitPointer) return;
    const dx = event.clientX - this.orbitLastX;
    const dy = event.clientY - this.orbitLastY;
    this.orbitLastX = event.clientX;
    this.orbitLastY = event.clientY;
    this.orbitDragYaw -= dx * 0.005;
    this.orbitDragPitch -= dy * 0.004;
  };

  private onOrbitPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== this.orbitPointer) return;
    this.orbitPointer = -1;
    if (this.container.hasPointerCapture(event.pointerId)) this.container.releasePointerCapture(event.pointerId);
  };

  private chase(outPos: THREE.Vector3, outLook: THREE.Vector3) {
    this.boresight(this.forward);
    outPos.copy(this.craft.position).addScaledVector(this.forward, -9).add(new THREE.Vector3(0, 2.4, 0));
    outLook.copy(this.craft.position).addScaledVector(this.forward, 6);
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = 0.016;
    const now = gameClock.now();

    if (this.mode === 'intro') {
      const elapsed = (now - this.introStarted) / 1000;
      const span = Math.min(1, elapsed / PAN_SECONDS);
      this.playPan(span);
      if (span >= 1) this.skipIntro();
    } else if (this.mode === 'flight') {
      const looking = this.partLabelsOn && !this.focus && !this.slewing;
      if (looking) {
        this.velocity = 0;
        this.boresight(this.forward);
      } else {
        this.fly(dt);
      }
      this.updateAim(dt);
      if (this.focus === 'record') this.frameRecord();
      else if (this.focus && this.markers.has(this.focus)) this.frameMarker(this.focus);
      else if (looking) this.orbitCraft(dt);
      else {
        this.chase(this.chasePos, this.chaseLook);
        this.camera.position.lerp(this.chasePos, 1 - Math.pow(0.001, dt));
        this.camera.lookAt(this.chaseLook);
      }
    } else {
      this.playOutro();
    }

    this.placeCraftLights();
    this.applyFrameShift(dt);
    this.bobMarkers(now);
    this.updateBlink(now);
    this.projectParts();
    this.projectSky();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  };

  private fly(dt: number) {
    if (this.slewing) {
      // Yaw error is measured in the craft frame, opposite the stored Euler yaw.
      this.yaw += this.aimYawError * 1.6 * dt;
      this.pitch = THREE.MathUtils.clamp(this.pitch - this.aimPitchError * 1.6 * dt, -1.05, 1.05);
    } else if (this.awaitRelease) {
      const held = Math.abs(this.yawInput) > 0.05 || Math.abs(this.pitchInput) > 0.05;
      if (!held) this.awaitRelease = false;
    } else if (this.step === 'align' && !this.alignSent && this.fuel > 0) {
      const effort = Math.max(Math.abs(this.yawInput), Math.abs(this.pitchInput));
      this.fuel = Math.max(0, this.fuel - (effort * dt) / AIM_FUEL_SECONDS);
      if (this.fuel > 0) {
        this.yaw -= this.yawInput * 0.9 * dt;
        this.pitch = THREE.MathUtils.clamp(this.pitch - this.pitchInput * 0.7 * dt, -1.05, 1.05);
      }
    }
    this.velocity = 0;
    this.boresight(this.forward);
  }

  private updateAim(dt: number) {
    this.boresight(this.forward);
    const dot = THREE.MathUtils.clamp(this.forward.dot(this.earthDir), -1, 1);
    const angle = Math.acos(dot);
    const signal = THREE.MathUtils.clamp(1 - angle / (40 * Math.PI / 180), 0, 1);
    const aligned = angle < ALIGN_RAD;
    if (this.step === 'align' && aligned && !this.alignSent) this.alignHold += dt;
    else if (!this.alignSent) this.alignHold = 0;
    if (this.step === 'align' && this.alignHold >= ALIGN_HOLD && !this.alignSent) {
      this.alignSent = true;
      this.onAligned?.();
    }
    if (this.step === 'align' && !this.alignSent && this.fuel <= 0 && !aligned && !this.fuelSpentSent) {
      this.fuelSpentSent = true;
      this.onFuelSpent?.();
    }

    const outside = this.craft.position.length() > SHELL_RADIUS;
    if (this.step === 'cross' && this.wasInside && outside && !this.crossSent) {
      this.crossSent = true;
      this.onCrossedShell?.();
    }
    this.wasInside = !outside;

    const linkMat = this.link.material as THREE.LineBasicMaterial;
    const linkPos = this.link.geometry.attributes.position as THREE.BufferAttribute;
    linkPos.setXYZ(0, this.craft.position.x, this.craft.position.y, this.craft.position.z);
    linkPos.setXYZ(1, this.earthMarker.position.x, this.earthMarker.position.y, this.earthMarker.position.z);
    linkPos.needsUpdate = true;
    if (this.beaming) {
      linkMat.color.set(0xfef3c7);
      linkMat.opacity = 1;
    } else {
      linkMat.color.set(0x86efac);
      linkMat.opacity = signal > 0.2 ? signal * 0.85 : 0;
    }

    this.localEarth.copy(this.earthDir).applyQuaternion(this.craft.quaternion.clone().invert());
    const yawError = Math.atan2(this.localEarth.x, this.localEarth.z);
    const pitchError = Math.atan2(this.localEarth.y, Math.hypot(this.localEarth.x, this.localEarth.z));
    this.aimYawError = yawError;
    this.aimPitchError = pitchError;
    if (this.slewing && angle < ALIGN_RAD) {
      this.beaming = true;
      this.sendTimer += dt;
      if (this.sendTimer > 1.6 && !this.uplinkSent) {
        this.uplinkSent = true;
        this.slewing = false;
        this.onUplinkDone?.();
      }
    } else if (this.slewing) {
      this.beaming = false;
      this.sendTimer = 0;
    }

    let nearest: VoyagerMarkerId | null = null;
    let nearestDist = Infinity;
    let markerYaw = 0;
    let markerPitch = 0;
    for (const [id, group] of this.markers) {
      if (!group.visible) continue;
      const dist = this.craft.position.distanceTo(group.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = id;
        this.localMarker.copy(group.position).sub(this.craft.position).normalize().applyQuaternion(this.craft.quaternion.clone().invert());
        markerYaw = Math.atan2(this.localMarker.x, this.localMarker.z);
        markerPitch = Math.atan2(this.localMarker.y, Math.hypot(this.localMarker.x, this.localMarker.z));
      }
    }
    const insideMarker = nearest !== null && nearestDist < 5 ? nearest : null;
    if (insideMarker !== this.nearStamp) {
      this.nearStamp = insideMarker;
      this.onNearMarker?.(insideMarker);
    }

    if (this.step === 'power' || this.step === 'record' || this.step === 'archive' || this.step === 'outro') {
      this.powerDim = Math.min(1, this.powerDim + dt * 0.45);
      this.craft.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material)) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (!material.color) return;
        if (!mesh.userData.baseColor) mesh.userData.baseColor = material.color.clone();
        const base = mesh.userData.baseColor as THREE.Color;
        if (base.getHex() === 0xf59e0b) {
          material.color.copy(base);
          return;
        }
        material.color.copy(base).multiplyScalar(1 - this.powerDim * 0.62);
        if (material.emissive) material.emissiveIntensity = (1 - this.powerDim) * 0.25;
      });
    }

    const stamp = `${signal.toFixed(2)}|${(angle * 180 / Math.PI).toFixed(0)}|${this.fuel.toFixed(3)}|${insideMarker ?? ''}`;
    if (stamp !== this.telemetryStamp) {
      this.telemetryStamp = stamp;
      this.onTelemetry?.({
        thrust: this.velocity,
        headingErrorDeg: angle * 180 / Math.PI,
        signal,
        aligned,
        distanceToMarker: Number.isFinite(nearestDist) ? nearestDist : 0,
        outsideShell: outside,
        yawError,
        pitchError,
        markerYaw,
        markerPitch,
        hasMarker: nearest !== null,
        fuel: this.fuel
      });
    }
  }

  private frameMarker(id: VoyagerMarkerId) {
    const group = this.markers.get(id);
    if (!group) return;
    const offset = group.position.clone().add(new THREE.Vector3(4.5, 2.2, 4.5));
    this.camera.position.lerp(offset, 0.08);
    this.camera.lookAt(group.position);
  }

  private frameRecord() {
    const scale = this.craft.scale.x;
    this.recordCam.copy(this.recordLocal);
    if (this.recordCam.lengthSq() < 1e-6) this.recordCam.set(1, 0, 0);
    this.recordCam.normalize();
    this.recordLook.copy(this.recordLocal).multiplyScalar(scale);
    this.recordCam.multiplyScalar(3.2 * scale).add(this.recordLook);
    this.recordLook.applyQuaternion(this.craft.quaternion).add(this.craft.position);
    this.recordCam.applyQuaternion(this.craft.quaternion).add(this.craft.position);
    this.camera.position.lerp(this.recordCam, 0.08);
    this.camera.lookAt(this.recordLook);
  }

  private playOutro() {
    const p = this.outro;
    const approachingMars = p >= 0.72;
    this.craft.visible = !approachingMars;
    this.link.visible = !approachingMars;
    if (approachingMars) {
      this.blinkMesh.visible = false;
      this.blinkLight.visible = false;
    }
    if (p < 0.4) {
      const pull = 10 + p / 0.4 * 34;
      this.camera.position.copy(this.craft.position).add(new THREE.Vector3(0, pull * 0.25, -pull));
      this.camera.lookAt(this.craft.position);
      this.earthMarker.scale.setScalar(1);
      this.mars.visible = false;
    } else if (p < 0.72) {
      const dot = 1 - (p - 0.4) / 0.32;
      this.earthMarker.scale.setScalar(Math.max(0.08, dot));
      this.camera.position.set(0, 4, -18);
      this.camera.lookAt(this.earthMarker.position);
      this.mars.visible = false;
    } else {
      const grow = (p - 0.72) / 0.28;
      this.mars.visible = true;
      this.mars.scale.setScalar(0.4 + grow * 14);
      this.camera.position.set(0, 2, 8);
      this.camera.lookAt(this.mars.position);
    }
  }

  private bobMarkers(now: number) {
    const t = now * 0.001;
    for (const group of this.markers.values()) {
      const diamond = group.getObjectByName('diamond');
      if (!diamond) continue;
      diamond.position.y = 3.4 + Math.sin(t * 2.2 + group.position.x) * 0.12;
      diamond.rotation.y += 0.02;
    }
  }

  private onResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    if (this.frameShiftNow > 1e-4 || this.frameLiftNow > 1e-4) this.setOffset(width, height);
    else this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
