import * as THREE from 'three';
import { createGoldFoilTexture, createPlaqueTexture, createEarthTexture } from './proceduralTextures';

/**
 * Builds high-fidelity composite Three.js PBR models for:
 * 1. Apollo 11 Lunar Module Descent Stage ('Eagle')
 * 2. Lunar Laser Ranging Retroreflector (LRRR)
 * 3. Commemorative Plaque (on forward landing strut)
 * 4. Lunar Explorer Rover (player vehicle)
 * 5. Historic American Flag
 * 6. Voyager 1 (for Phase 4 outro)
 */

export interface SceneModels {
  descentStageGroup: THREE.Group;
  retroreflectorGroup: THREE.Group;
  plaqueMesh: THREE.Mesh;
  roverGroup: THREE.Group;
  roverHeadlights: THREE.SpotLight[];
  roverWheels: THREE.Mesh[];
  voyagerGroup: THREE.Group;
  earthMesh: THREE.Mesh;
}

export function buildApolloSceneModels(renderer: THREE.WebGLRenderer): SceneModels {
  const goldFoilTex = createGoldFoilTexture(renderer);
  const plaqueTex = createPlaqueTexture(renderer);
  const earthTex = createEarthTexture(renderer);

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

  const footpadMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.8,
    roughness: 0.35
  });

  const engineNozzleMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    metalness: 0.85,
    roughness: 0.3
  });

  // -------------------------------------------------------------
  // 1. EAGLE DESCENT STAGE (Multi-part Composite Model)
  // -------------------------------------------------------------
  const descentStageGroup = new THREE.Group();
  descentStageGroup.name = 'EagleDescentStage';

  // Octagonal Center Body
  const bodyRadius = 2.1;
  const bodyHeight = 1.6;
  const bodyGeo = new THREE.CylinderGeometry(bodyRadius, bodyRadius * 1.05, bodyHeight, 8);
  const bodyMesh = new THREE.Mesh(bodyGeo, goldFoilMat);
  bodyMesh.position.y = 1.6;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  descentStageGroup.add(bodyMesh);

  // Top Equipment Deck / Interstage Ring (where Ascent Stage detached)
  const deckGeo = new THREE.CylinderGeometry(bodyRadius * 0.9, bodyRadius * 0.9, 0.2, 8);
  const deckMesh = new THREE.Mesh(deckGeo, blackBlanketMat);
  deckMesh.position.y = 1.6 + bodyHeight / 2 + 0.1;
  deckMesh.castShadow = true;
  descentStageGroup.add(deckMesh);

  // Descent Propulsion System (DPS) Engine Bell Nozzle
  const nozzleGeo = new THREE.ConeGeometry(0.7, 1.1, 16, 1, true);
  const nozzleMesh = new THREE.Mesh(nozzleGeo, engineNozzleMat);
  nozzleMesh.position.y = 1.1;
  nozzleMesh.rotation.x = Math.PI;
  nozzleMesh.castShadow = true;
  descentStageGroup.add(nozzleMesh);

  // 4 Outrigger Trusses, Landing Legs, and Footpads
  const legAngles = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
  const legRadius = 4.2;

  legAngles.forEach((angle, idx) => {
    const legX = Math.cos(angle) * legRadius;
    const legZ = Math.sin(angle) * legRadius;

    // Outrigger beam from body to strut pivot
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2);
    const beamMesh = new THREE.Mesh(beamGeo, chromeStrutMat);
    beamMesh.position.set(legX * 0.45, 1.7, legZ * 0.45);
    beamMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legX, 0.2, legZ).normalize()
    );
    descentStageGroup.add(beamMesh);

    // Primary Landing Strut (angled down to lunar regolith)
    const strutGeo = new THREE.CylinderGeometry(0.09, 0.09, 3.4);
    const strutMesh = new THREE.Mesh(strutGeo, goldFoilMat);
    strutMesh.position.set(legX * 0.72, 1.0, legZ * 0.72);
    strutMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(legX * 0.6, -1.5, legZ * 0.6).normalize()
    );
    strutMesh.castShadow = true;
    descentStageGroup.add(strutMesh);

    // Secondary tension struts (V-truss)
    const vStrutGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.6);
    const vStrutMesh = new THREE.Mesh(vStrutGeo, chromeStrutMat);
    vStrutMesh.position.set(legX * 0.65, 1.25, legZ * 0.65);
    descentStageGroup.add(vStrutMesh);

    // Circular Dish Footpad (contact with lunar soil)
    const footpadGeo = new THREE.CylinderGeometry(0.48, 0.42, 0.08, 16);
    const footpadMesh = new THREE.Mesh(footpadGeo, footpadMat);
    footpadMesh.position.set(legX, 0.04, legZ);
    footpadMesh.receiveShadow = true;
    descentStageGroup.add(footpadMesh);

    // Probe contact sensor wire extending below footpad (broken on touchdown)
    const probeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6);
    const probeMesh = new THREE.Mesh(probeGeo, chromeStrutMat);
    probeMesh.position.set(legX + 0.1, 0.05, legZ + 0.1);
    probeMesh.rotation.z = 0.4;
    descentStageGroup.add(probeMesh);
  });

  // Forward Landing Gear Ladder (Mounted on the leg along angle Math.PI/4)
  const forwardAngle = Math.PI / 4;
  const ladderGroup = new THREE.Group();
  const fX = Math.cos(forwardAngle);
  const fZ = Math.sin(forwardAngle);

  // Ladder vertical rails
  const railGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.6);
  const leftRail = new THREE.Mesh(railGeo, chromeStrutMat);
  leftRail.position.set(-0.2, 1.2, 0);
  ladderGroup.add(leftRail);

  const rightRail = new THREE.Mesh(railGeo, chromeStrutMat);
  rightRail.position.set(0.2, 1.2, 0);
  ladderGroup.add(rightRail);

  // Ladder Rungs
  const rungCount = 8;
  for (let r = 0; r < rungCount; r++) {
    const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
    const rungMesh = new THREE.Mesh(rungGeo, chromeStrutMat);
    rungMesh.rotation.z = Math.PI / 2;
    rungMesh.position.set(0, 0.2 + r * 0.28, 0);
    ladderGroup.add(rungMesh);
  }

  ladderGroup.position.set(fX * 2.4, 0, fZ * 2.4);
  ladderGroup.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(fX, 0.3, fZ).normalize()
  );
  descentStageGroup.add(ladderGroup);

  // -------------------------------------------------------------
  // COMMEMORATIVE PLAQUE (Mounted on ladder between rungs)
  // -------------------------------------------------------------
  const plaqueGeo = new THREE.PlaneGeometry(0.48, 0.36);
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    metalness: 0.9,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.name = 'CommemorativePlaque';
  // Positioned directly on the forward ladder leg at eye height
  plaqueMesh.position.set(0, 0.9, 0.05);
  plaqueMesh.rotation.y = Math.PI; // Face outwards
  ladderGroup.add(plaqueMesh);

  // MESA Equipment Bay (Modular Equipment Stowage Assembly)
  const mesaGeo = new THREE.BoxGeometry(0.8, 0.7, 0.6);
  const mesaMesh = new THREE.Mesh(mesaGeo, blackBlanketMat);
  mesaMesh.position.set(-1.4, 1.5, 0.9);
  descentStageGroup.add(mesaMesh);

  // RCS Propellant Helium/Fuel Spherical Tanks
  const tankGeo = new THREE.SphereGeometry(0.38, 12, 12);
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.9,
    roughness: 0.2
  });
  const tank1 = new THREE.Mesh(tankGeo, tankMat);
  tank1.position.set(1.5, 1.7, 0);
  descentStageGroup.add(tank1);
  const tank2 = new THREE.Mesh(tankGeo, tankMat);
  tank2.position.set(-1.5, 1.7, 0);
  descentStageGroup.add(tank2);

  // -------------------------------------------------------------
  // 2. LASER RETROREFLECTOR (EASEP / LRRR 100-Cube Array)
  // -------------------------------------------------------------
  const retroreflectorGroup = new THREE.Group();
  retroreflectorGroup.name = 'LaserRetroreflector';
  retroreflectorGroup.position.set(14, 0, -8);

  // White thermal pallet base
  const palletGeo = new THREE.BoxGeometry(1.2, 0.15, 1.2);
  const palletMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
    metalness: 0.1
  });
  const palletMesh = new THREE.Mesh(palletGeo, palletMat);
  palletMesh.position.y = 0.08;
  palletMesh.receiveShadow = true;
  retroreflectorGroup.add(palletMesh);

  // Gimbal angle mounting bracket (elevated 45 degrees towards Earth)
  const gimbalGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6);
  const gimbalMesh = new THREE.Mesh(gimbalGeo, chromeStrutMat);
  gimbalMesh.position.set(0, 0.35, 0);
  retroreflectorGroup.add(gimbalMesh);

  // Angled reflector tray
  const trayGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
  const trayMesh = new THREE.Mesh(trayGeo, blackBlanketMat);
  trayMesh.position.set(0, 0.6, 0);
  trayMesh.rotation.x = -Math.PI / 4; // Tilted toward Earth sky
  trayMesh.rotation.y = Math.PI / 6;
  retroreflectorGroup.add(trayMesh);

  // 100 Corner-Cube Prisms Array
  const prismMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.95,
    roughness: 0.05,
    reflectivity: 1.0,
    clearcoat: 1.0
  });

  const prismGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.03, 6);
  const prismInstanced = new THREE.InstancedMesh(prismGeo, prismMat, 100);
  const dummy = new THREE.Object3D();
  let prismIdx = 0;
  for (let ix = 0; ix < 10; ix++) {
    for (let iz = 0; iz < 10; iz++) {
      dummy.position.set(-0.315 + ix * 0.07, 0.06, -0.315 + iz * 0.07);
      dummy.rotation.x = Math.PI / 2;
      dummy.updateMatrix();
      prismInstanced.setMatrixAt(prismIdx++, dummy.matrix);
    }
  }
  prismInstanced.instanceMatrix.needsUpdate = true;
  trayMesh.add(prismInstanced);

  // Sun compass / shadow casting pointer on reflector
  const shadowGnomonGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.2);
  const shadowGnomon = new THREE.Mesh(shadowGnomonGeo, chromeStrutMat);
  shadowGnomon.position.set(0.3, 0.1, 0.3);
  trayMesh.add(shadowGnomon);

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

  // Top avionics deck & solar array
  const solarPanelGeo = new THREE.BoxGeometry(1.4, 0.06, 0.9);
  const solarPanelMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    metalness: 0.7,
    roughness: 0.2
  });
  const solarPanel = new THREE.Mesh(solarPanelGeo, solarPanelMat);
  solarPanel.position.set(0, 0.8, 0);
  roverGroup.add(solarPanel);

  // Panoramic Camera Mast
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9);
  const mast = new THREE.Mesh(mastGeo, chromeStrutMat);
  mast.position.set(0.5, 1.25, 0.3);
  roverGroup.add(mast);

  // Stereoscopic Camera Head
  const camHeadGeo = new THREE.BoxGeometry(0.25, 0.14, 0.35);
  const camHead = new THREE.Mesh(camHeadGeo, blackBlanketMat);
  camHead.position.set(0.5, 1.7, 0.3);
  roverGroup.add(camHead);

  // Camera lenses
  const lensGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.rotation.z = Math.PI / 2;
  leftLens.position.set(0.12, 0, 0.1);
  camHead.add(leftLens);
  const rightLens = leftLens.clone();
  rightLens.position.set(0.12, 0, -0.1);
  camHead.add(rightLens);

  // Steerable High-Gain Parabolic Dish Antenna
  const dishGeo = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.rotation.x = Math.PI / 3;
  dish.rotation.z = -Math.PI / 4;
  dish.position.set(-0.5, 1.3, -0.3);
  roverGroup.add(dish);

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

  wheelPositions.forEach(pos => {
    const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
    wheelMesh.position.set(pos[0], pos[1], pos[2]);
    wheelMesh.castShadow = true;
    wheelMesh.receiveShadow = true;

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

    // Rocker-bogie suspension strut
    const strutG = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
    const strutM = new THREE.Mesh(strutG, chromeStrutMat);
    strutM.position.set(pos[0], pos[1] + 0.15, pos[2] * 0.8);
    roverGroup.add(strutM);
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
  flagGroup.position.set(-6, 0, 8);

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

  descentStageGroup.add(flagGroup);

  // -------------------------------------------------------------
  // 5. DISTANT EARTH IN LUNAR SKY
  // -------------------------------------------------------------
  const earthGeo = new THREE.SphereGeometry(6, 32, 32);
  const earthMat = new THREE.MeshStandardMaterial({
    map: earthTex,
    roughness: 0.45,
    metalness: 0.1,
    emissive: 0x0369a1,
    emissiveIntensity: 0.15
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  // Positioned high up in the dark sky at azimuth
  earthMesh.position.set(120, 95, -160);
  earthMesh.rotation.y = 0.8;

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

  return {
    descentStageGroup,
    retroreflectorGroup,
    plaqueMesh,
    roverGroup,
    roverHeadlights,
    roverWheels,
    voyagerGroup,
    earthMesh
  };
}
