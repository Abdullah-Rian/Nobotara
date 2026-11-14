import * as THREE from 'three';
import { createGoldFoilTexture } from './proceduralTextures';

/**
 * Builds the models that have no Blender file:
 * the lunar rover, the flag, and Voyager 1.
 * The descent stage, retroreflector, terrain, Earth, and Sun come from public/models.
 */

export interface RoverRig {
  solarHinges: THREE.Object3D[];
  solarDeployed: number[];
  solarStowed: number[];
  mastStage: THREE.Object3D;
  mastSlide: THREE.Object3D;
  mastRetracted: number;
  mastRaised: number;
  antennaYaw: THREE.Object3D;
  antennaTilt: THREE.Object3D;
  antennaParkYaw: number;
  antennaParkPitch: number;
  cueMaterial: THREE.MeshStandardMaterial;
}

export interface SceneModels {
  descentStageGroup: THREE.Group;
  retroreflectorGroup: THREE.Group;
  roverGroup: THREE.Group;
  roverHeadlights: THREE.SpotLight[];
  roverWheels: THREE.Mesh[];
  roverRig: RoverRig | null;
  flagGroup: THREE.Group;
  voyagerGroup: THREE.Group;
  earthMesh: THREE.Object3D;
}

export function buildApolloSceneModels(renderer: THREE.WebGLRenderer): SceneModels {
  const goldFoilTex = createGoldFoilTexture(renderer);

  // Common PBR Materials
  const goldFoilMat = new THREE.MeshStandardMaterial({
    map: goldFoilTex,
    color: 0xf59e0b,
    metalness: 0.85,
    roughness: 0.25,
    bumpMap: goldFoilTex,
    bumpScale: 0.05
  });

  const blackBlanketMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.2,
    roughness: 0.75
  });

  const chromeStrutMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15
  });

  // -------------------------------------------------------------
  // 3. LUNAR EXPLORER ROVER (Player Vehicle)
  // -------------------------------------------------------------
  const roverGroup = new THREE.Group();
  roverGroup.name = 'LunarRover';
  roverGroup.position.set(8, 0, 7);

  // Main chassis core
  const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 1.1);
  const roverChassis = new THREE.Mesh(chassisGeo, goldFoilMat);
  roverChassis.position.y = 0.55;
  roverChassis.castShadow = true;
  roverChassis.receiveShadow = true;
  roverGroup.add(roverChassis);

  // Rear-panel markings. The chase camera looks at local -X, so viewer's left is +Z.
  const rearDecal = (canvas: HTMLCanvasElement, width: number, height: number, y: number, z: number): THREE.Mesh => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.4,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(-0.818, y, z);
    mesh.rotation.y = -Math.PI / 2;
    roverGroup.add(mesh);
    return mesh;
  };

  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 512;
  nameCanvas.height = 128;
  const nameCtx = nameCanvas.getContext('2d')!;
  nameCtx.fillStyle = '#1c1917';
  nameCtx.fillRect(0, 0, 512, 128);
  nameCtx.strokeStyle = '#d6d3d1';
  nameCtx.lineWidth = 8;
  nameCtx.strokeRect(8, 8, 496, 112);
  nameCtx.fillStyle = '#f5f5f4';
  nameCtx.font = 'bold 64px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  nameCtx.textAlign = 'center';
  nameCtx.textBaseline = 'middle';
  nameCtx.fillText('NOBOTARA-71', 256, 68);
  const namePlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.11, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x292524, metalness: 0.55, roughness: 0.4 })
  );
  namePlate.position.set(-0.807, 0.42, -0.22);
  roverGroup.add(namePlate);
  rearDecal(nameCanvas, 0.4, 0.092, 0.42, -0.22);

  const bdFlagCanvas = document.createElement('canvas');
  bdFlagCanvas.width = 300;
  bdFlagCanvas.height = 180;
  const bdFlagCtx = bdFlagCanvas.getContext('2d')!;
  bdFlagCtx.fillStyle = '#006a4e';
  bdFlagCtx.fillRect(0, 0, 300, 180);
  bdFlagCtx.fillStyle = '#f42a41';
  bdFlagCtx.beginPath();
  bdFlagCtx.arc(135, 90, 60, 0, Math.PI * 2);
  bdFlagCtx.fill();
  rearDecal(bdFlagCanvas, 0.16, 0.096, 0.42, 0.2);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.04, 0.95), blackBlanketMat);
  deck.position.y = 0.8;
  deck.castShadow = true;
  roverGroup.add(deck);

  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 128;
  cellCanvas.height = 64;
  const cellCtx = cellCanvas.getContext('2d')!;
  cellCtx.fillStyle = '#0b1d4a';
  cellCtx.fillRect(0, 0, 128, 64);
  cellCtx.strokeStyle = '#d6b25e';
  cellCtx.lineWidth = 2;
  for (let gx = 8; gx < 128; gx += 16) {
    cellCtx.beginPath();
    cellCtx.moveTo(gx, 2);
    cellCtx.lineTo(gx, 62);
    cellCtx.stroke();
  }
  for (let gy = 4; gy < 64; gy += 15) {
    cellCtx.beginPath();
    cellCtx.moveTo(2, gy);
    cellCtx.lineTo(126, gy);
    cellCtx.stroke();
  }
  const cellTex = new THREE.CanvasTexture(cellCanvas);
  const solarMat = new THREE.MeshStandardMaterial({
    map: cellTex,
    color: 0x93c5fd,
    metalness: 0.55,
    roughness: 0.28
  });
  const panelGeo = new THREE.BoxGeometry(1.05, 0.028, 0.48);
  const knuckleGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.2, 10);
  const solarHinges: THREE.Object3D[] = [];
  const solarDeployed: number[] = [];
  const solarStowed: number[] = [];
  [1, -1].forEach(side => {
    const hinge = new THREE.Group();
    hinge.name = side > 0 ? 'SolarHingePos' : 'SolarHingeNeg';
    hinge.position.set(0, 0.86, side * 0.56);
    const knuckle = new THREE.Mesh(knuckleGeo, chromeStrutMat);
    knuckle.rotation.z = Math.PI / 2;
    hinge.add(knuckle);
    const panel = new THREE.Mesh(panelGeo, solarMat);
    panel.position.set(0, 0, side * 0.25);
    panel.castShadow = true;
    hinge.add(panel);
    // Tilted up and outward while charging. Folded onto the deck when stowed.
    const deployed = side > 0 ? -0.7 : 0.7;
    const stowed = side > 0 ? -Math.PI : Math.PI;
    hinge.rotation.x = deployed;
    solarHinges.push(hinge);
    solarDeployed.push(deployed);
    solarStowed.push(stowed);
    roverGroup.add(hinge);
  });

  // Camera mast. Nested tubes slide straight up, the way a radio antenna extends.
  const mastRoot = new THREE.Group();
  mastRoot.name = 'CameraMast';
  mastRoot.position.set(0.62, 0.84, 0);
  const mastCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.18, 12), chromeStrutMat);
  mastCollar.position.y = 0.09;
  mastRoot.add(mastCollar);
  const mastStage = new THREE.Group();
  mastStage.name = 'CameraMastStage';
  const mastOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.58, 10), chromeStrutMat);
  mastOuter.position.y = 0.12;
  mastOuter.castShadow = true;
  mastStage.add(mastOuter);
  const mastSlide = new THREE.Group();
  mastSlide.name = 'CameraMastSlide';
  const mastInner = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.4, 10), chromeStrutMat);
  mastInner.position.y = 0.16;
  mastInner.castShadow = true;
  mastSlide.add(mastInner);
  const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.32), blackBlanketMat);
  camHead.position.y = 0.44;
  mastSlide.add(camHead);
  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.rotation.z = Math.PI / 2;
  leftLens.position.set(0.12, 0, 0.08);
  camHead.add(leftLens);
  const rightLens = leftLens.clone();
  rightLens.position.set(0.12, 0, -0.08);
  camHead.add(rightLens);
  mastStage.add(mastSlide);
  mastRoot.add(mastStage);
  const mastRetracted = 0;
  const mastRaised = 0.32;
  mastStage.position.y = mastRetracted;
  mastSlide.position.y = mastRetracted;
  roverGroup.add(mastRoot);

  // High-gain dish on a rod. Bore of the dish is the tilt group's +Z.
  const antennaMount = new THREE.Group();
  antennaMount.position.set(-0.48, 0.82, -0.32);
  const antennaRod = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.5, 8), chromeStrutMat);
  antennaRod.position.y = 0.25;
  antennaMount.add(antennaRod);
  const antennaYaw = new THREE.Group();
  antennaYaw.position.y = 0.5;
  antennaMount.add(antennaYaw);
  const antennaTilt = new THREE.Group();
  antennaYaw.add(antennaTilt);
  const dishGeo = new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = -Math.PI / 2;
  antennaTilt.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.07, 8), chromeStrutMat);
  feed.rotation.x = Math.PI / 2;
  feed.position.z = 0.09;
  antennaTilt.add(feed);
  const antennaParkYaw = 0.85;
  const antennaParkPitch = -0.45;
  antennaYaw.rotation.y = antennaParkYaw;
  antennaTilt.rotation.x = antennaParkPitch;
  roverGroup.add(antennaMount);

  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.38, 8), chromeStrutMat);
  whip.position.set(-0.78, 1.02, 0);
  roverGroup.add(whip);

  const cueMaterial = new THREE.MeshStandardMaterial({
    color: 0xff2a2a,
    emissive: 0xff2a2a,
    emissiveIntensity: 2.2,
    roughness: 0.3,
    metalness: 0.05
  });
  const cue = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.07, 0.16), cueMaterial);
  cue.position.set(-0.78, 0.9, 0.38);
  roverGroup.add(cue);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.2), chromeStrutMat);
  housing.position.set(-0.755, 0.9, 0.38);
  roverGroup.add(housing);

  const roverRig: RoverRig = {
    solarHinges,
    solarDeployed,
    solarStowed,
    mastStage,
    mastSlide,
    mastRetracted,
    mastRaised,
    antennaYaw,
    antennaTilt,
    antennaParkYaw,
    antennaParkPitch,
    cueMaterial
  };

  // 6 Rocker-Bogie Wheels
  const roverWheels: THREE.Mesh[] = [];
  const wheelPositions = [
    [-0.6, 0.28, -0.7],
    [0.0, 0.28, -0.72],
    [0.6, 0.28, -0.7],
    [-0.6, 0.28, 0.7],
    [0.0, 0.28, 0.72],
    [0.6, 0.28, 0.7]
  ];

  // Rotate cylinder geometry at creation so cylinder axis (axle) is along Z
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 24);
  wheelGeo.rotateX(Math.PI / 2);

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.4,
    roughness: 0.8
  });

  // Hub cap aligned with Z
  const hubGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.21, 12);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.2
  });

  // Spoke indicator bars so rolling rotation is clearly visible
  const spokeGeo = new THREE.BoxGeometry(0.42, 0.04, 0.205);
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.9,
    roughness: 0.25
  });

  wheelPositions.forEach((pos, index) => {
    const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
    wheelMesh.name = `RoverWheel_${index}`;
    wheelMesh.position.set(pos[0], pos[1], pos[2]);
    wheelMesh.castShadow = true;
    wheelMesh.receiveShadow = true;
    wheelMesh.userData.suspensionRest = wheelMesh.position.clone();
    wheelMesh.userData.suspensionRadius = 0.24;

    // Hub cap
    const hub = new THREE.Mesh(hubGeo, hubMat);
    wheelMesh.add(hub);

    // Cross spokes
    const spoke1 = new THREE.Mesh(spokeGeo, spokeMat);
    wheelMesh.add(spoke1);
    const spoke2 = new THREE.Mesh(spokeGeo, spokeMat);
    spoke2.rotation.z = Math.PI / 2;
    wheelMesh.add(spoke2);

    roverGroup.add(wheelMesh);
    roverWheels.push(wheelMesh);
  });

  // Dual Headlights & SpotLights for cinematic lunar shadows
  const roverHeadlights: THREE.SpotLight[] = [];
  [-0.35, 0.35].forEach(zOffset => {
    const lightFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12),
      chromeStrutMat
    );
    lightFixture.rotation.z = Math.PI / 2;
    lightFixture.position.set(0.85, 0.55, zOffset);
    roverGroup.add(lightFixture);

    const spot = new THREE.SpotLight(0xfffbeb, 4.0, 18, Math.PI / 5, 0.4, 1.2);
    spot.position.set(0.9, 0.55, zOffset);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(6, 0, zOffset);
    roverGroup.add(targetObj);
    spot.target = targetObj;
    roverGroup.add(spot);
    roverHeadlights.push(spot);
  });

  // -------------------------------------------------------------
  // 4. HISTORIC AMERICAN FLAG (Planted in lunar soil)
  // -------------------------------------------------------------
  const flagGroup = new THREE.Group();
  flagGroup.position.set(-23.331, 0, 2.138);

  const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.0);
  const pole = new THREE.Mesh(poleGeo, chromeStrutMat);
  pole.position.y = 1.0;
  flagGroup.add(pole);

  // Horizontal extender arm (vacuum support)
  const armGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9);
  const arm = new THREE.Mesh(armGeo, chromeStrutMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.45, 1.95, 0);
  flagGroup.add(arm);

  // Flag fabric with crinkled wrinkles
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 256;
  flagCanvas.height = 160;
  const fctx = flagCanvas.getContext('2d')!;
  // Red & white stripes
  for (let s = 0; s < 13; s++) {
    fctx.fillStyle = s % 2 === 0 ? '#b91c1c' : '#f8fafc';
    fctx.fillRect(0, s * (160 / 13), 256, 160 / 13);
  }
  // Blue canton
  fctx.fillStyle = '#1e3a8a';
  fctx.fillRect(0, 0, 100, (160 / 13) * 7);
  // White stars representation
  fctx.fillStyle = '#f8fafc';
  for (let sy = 0; sy < 5; sy++) {
    for (let sx = 0; sx < 6; sx++) {
      fctx.fillRect(10 + sx * 15, 10 + sy * 15, 4, 4);
    }
  }

  const flagTex = new THREE.CanvasTexture(flagCanvas);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  const flagMat = new THREE.MeshStandardMaterial({
    map: flagTex,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const flagGeo = new THREE.PlaneGeometry(0.85, 0.55, 6, 4);
  // Add subtle crinkled wave vertices
  const posAttr = flagGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = Math.sin(vx * 6) * 0.04;
    posAttr.setZ(i, vz);
  }
  flagGeo.computeVertexNormals();

  const flagMesh = new THREE.Mesh(flagGeo, flagMat);
  flagMesh.position.set(0.45, 1.65, 0);
  flagMesh.castShadow = true;
  flagGroup.add(flagMesh);
  flagGroup.name = 'HistoricFlag';


  // -------------------------------------------------------------
  // 6. VOYAGER 1 (Revealed in Phase 4 Outro)
  // -------------------------------------------------------------
  const voyagerGroup = new THREE.Group();
  voyagerGroup.name = 'Voyager1';
  voyagerGroup.position.set(0, -500, 0); // Initially hidden below until outro
  voyagerGroup.scale.set(1.4, 1.4, 1.4);

  // 3.7m High-Gain White Parabolic Dish Antenna
  const hgaGeo = new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.3);
  const hgaMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.2,
    side: THREE.DoubleSide
  });
  const hgaMesh = new THREE.Mesh(hgaGeo, hgaMat);
  hgaMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(hgaMesh);

  // Subreflector feed legs
  const subFeedGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8);
  const subFeedMesh = new THREE.Mesh(subFeedGeo, chromeStrutMat);
  subFeedMesh.position.set(0, 0, 1.0);
  subFeedMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(subFeedMesh);

  // 10-sided Decagonal Bus Core
  const busGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.7, 10);
  const busMesh = new THREE.Mesh(busGeo, blackBlanketMat);
  busMesh.position.set(0, 0, -0.6);
  busMesh.rotation.x = Math.PI / 2;
  voyagerGroup.add(busMesh);

  // THE GOLDEN RECORD (Mounted on side of decagonal bus)
  const recordGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.02, 32);
  const recordMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15
  });
  const recordMesh = new THREE.Mesh(recordGeo, recordMat);
  recordMesh.position.set(1.02, 0, -0.6);
  recordMesh.rotation.z = Math.PI / 2;
  voyagerGroup.add(recordMesh);

  // Magnetometer Boom (13-meter deployable lattice boom)
  const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 7.5);
  const boomMesh = new THREE.Mesh(boomGeo, chromeStrutMat);
  boomMesh.position.set(-3.8, 0, -0.6);
  boomMesh.rotation.z = Math.PI / 2;
  voyagerGroup.add(boomMesh);

  // RTG Power Generators (Radioisotope Thermoelectric Generators)
  const rtgGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.2, 8);
  const rtgMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.4 });
  const rtgMesh = new THREE.Mesh(rtgGeo, rtgMat);
  rtgMesh.position.set(0, -2.4, -0.6);
  rtgMesh.rotation.x = Math.PI / 6;
  voyagerGroup.add(rtgMesh);

  const descentStageGroup = new THREE.Group();
  descentStageGroup.name = 'EagleDescentStage';
  const retroreflectorGroup = new THREE.Group();
  retroreflectorGroup.name = 'LaserRetroreflector';
  const earthMesh = new THREE.Group();
  earthMesh.name = 'Earth';

  return {
    descentStageGroup,
    retroreflectorGroup,
    roverGroup,
    roverHeadlights,
    roverWheels,
    roverRig,
    flagGroup,
    voyagerGroup,
    earthMesh
  };
}
