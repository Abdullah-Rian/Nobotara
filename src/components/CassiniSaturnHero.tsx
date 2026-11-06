import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface CassiniSaturnHeroProps {
  reducedMotion?: boolean;
}

export const CassiniSaturnHero: React.FC<CassiniSaturnHeroProps> = ({
  reducedMotion = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL per Three.js skill guidelines
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const width = 540;
    const height = 215;

    // 1. Scene & Calibrated Camera (Closer distance so Saturn is larger while rings never clip)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(23, width / height, 0.1, 50);
    camera.position.set(0, 0.05, 9.6);
    camera.lookAt(0, 0, 0);

    // 2. Renderer with shadow support & ACES Filmic tone mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Studio environment reflection for subtle icy ring specularity
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    // 3. Lighting Rig: Oblique Sun Key light for shadow casting + planetary fill + cyan rim
    const sunLight = new THREE.DirectionalLight(0xfff4de, 3.1);
    sunLight.position.set(5.8, 3.8, 5.4);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1.0;
      sunLight.shadow.camera.far = 25.0;
      const d = 4.2;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0003;
      sunLight.shadow.normalBias = 0.015;
    }
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xfef6e8, 0x091124, 0.55);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-5.5, -2.2, -5.5);
    scene.add(rimLight);

    // 4. Procedural Saturn Atmospheric Texture with Longitudinal Cloud Waves & Storm Ovals
    // (Longitudinal features ensure planetary rotation is clearly visible!)
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 1024;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      // North polar hexagon region
      grad.addColorStop(0.0, '#6c7d87');
      grad.addColorStop(0.08, '#85969f');
      grad.addColorStop(0.14, '#b8ab92');
      // North temperate bands
      grad.addColorStop(0.22, '#d6b47c');
      grad.addColorStop(0.30, '#f4e4c1');
      grad.addColorStop(0.36, '#c79c60');
      grad.addColorStop(0.42, '#f8edd4');
      // Equatorial bright zone
      grad.addColorStop(0.48, '#fbe2ad');
      grad.addColorStop(0.52, '#fff1d9');
      grad.addColorStop(0.56, '#edd29f');
      // South temperate & tropical bands
      grad.addColorStop(0.64, '#ce9f64');
      grad.addColorStop(0.72, '#f1e0bf');
      grad.addColorStop(0.80, '#bba076');
      grad.addColorStop(0.90, '#96856d');
      grad.addColorStop(1.0, '#665c4d');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Wavy longitudinal jet streams & atmospheric turbulence so rotation is unmistakably visible
      for (let y = 24; y < 488; y += 3) {
        const waveAmp = 2.5 + 3.5 * Math.sin(y * 0.07);
        const freq = (y % 4 === 0) ? 4 : (y % 3 === 0) ? 6 : 3;
        const phase = y * 0.23;
        const isLight = Math.sin(y * 0.16) > 0;

        ctx.beginPath();
        for (let x = 0; x <= 1024; x += 8) {
          const theta = (x / 1024) * Math.PI * 2;
          const wy =
            y +
            Math.sin(theta * freq + phase) * waveAmp +
            Math.cos(theta * (freq * 2) - phase) * (waveAmp * 0.45);
          if (x === 0) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.strokeStyle = isLight
          ? 'rgba(255, 250, 235, 0.16)'
          : 'rgba(115, 75, 35, 0.14)';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }

      // Cassini atmospheric storm ovals & Great White Spot eddies distributed across longitudes
      const storms = [
        { x: 140, y: 185, rx: 46, ry: 14, color: 'rgba(255, 248, 230, 0.42)' },
        { x: 340, y: 235, rx: 64, ry: 18, color: 'rgba(255, 252, 240, 0.48)' },
        { x: 560, y: 165, rx: 38, ry: 12, color: 'rgba(165, 118, 68, 0.38)' },
        { x: 740, y: 260, rx: 58, ry: 16, color: 'rgba(255, 245, 222, 0.44)' },
        { x: 910, y: 205, rx: 44, ry: 14, color: 'rgba(140, 96, 52, 0.36)' },
        { x: 230, y: 315, rx: 50, ry: 15, color: 'rgba(250, 236, 205, 0.38)' },
        { x: 640, y: 335, rx: 42, ry: 13, color: 'rgba(155, 110, 62, 0.35)' },
      ];

      for (const s of storms) {
        const sGrad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.rx);
        sGrad.addColorStop(0, s.color);
        sGrad.addColorStop(0.6, s.color.replace(/[\d.]+\)$/, '0.18)'));
        sGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(1, s.ry / s.rx);
        ctx.beginPath();
        ctx.arc(0, 0, s.rx, 0, Math.PI * 2);
        ctx.fillStyle = sGrad;
        ctx.fill();
        ctx.restore();
      }
    }

    const saturnTexture = new THREE.CanvasTexture(texCanvas);
    saturnTexture.wrapS = THREE.RepeatWrapping;
    saturnTexture.colorSpace = THREE.SRGBColorSpace;
    saturnTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // 5. Procedural Cassini Rings Texture with Radial Spokes & Azimuthal Variations
    // (Azimuthal spokes & density variations make the ring rotation unmistakably visible!)
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 1024;
    ringCanvas.height = 1024;
    const rCtx = ringCanvas.getContext('2d');
    if (rCtx) {
      const cx = 512;
      const cy = 512;
      const maxR = 492;
      const minR = 248;

      rCtx.clearRect(0, 0, 1024, 1024);

      for (let r = minR; r <= maxR; r++) {
        const normR = (r - minR) / (maxR - minR);
        let alpha = 0;
        let color = '235, 218, 185';

        if (normR < 0.22) {
          // C Ring (Crepe Ring)
          alpha = 0.34 + 0.14 * Math.sin(r * 0.65);
          color = '188, 175, 152';
        } else if (normR < 0.64) {
          // B Ring: dense, bright creamy gold with fine ringlets
          const subRing = Math.sin(r * 0.52) * 0.09 + Math.cos(r * 0.85) * 0.06;
          alpha = Math.min(0.97, 0.88 + subRing);
          color = '248, 233, 204';
        } else if (normR < 0.70) {
          // Cassini Division: prominent dark gap
          alpha = 0.02;
          color = '35, 28, 18';
        } else {
          // A Ring with Encke Gap
          const isEncke = normR >= 0.86 && normR <= 0.885;
          if (isEncke) {
            alpha = 0.035;
            color = '45, 36, 22';
          } else {
            const aStripes = Math.sin(r * 0.55) * 0.09;
            alpha = 0.75 + aStripes;
            color = '232, 216, 186';
          }
        }

        rCtx.beginPath();
        rCtx.arc(cx, cy, r, 0, Math.PI * 2);
        rCtx.strokeStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
        rCtx.lineWidth = 1.4;
        rCtx.stroke();
      }

      // Add authentic Cassini azimuthal ring spokes & Keplerian density clumps
      // so rotating the ring plane creates a clear, dynamic orbital motion
      rCtx.save();
      rCtx.translate(cx, cy);
      const spokeCount = 36;
      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2 + Math.sin(i * 1.7) * 0.08;
        const spokeWidth = 0.04 + (i % 3) * 0.025;
        const isBrightSpoke = i % 2 === 0;

        rCtx.beginPath();
        rCtx.arc(0, 0, 365, angle, angle + spokeWidth);
        rCtx.strokeStyle = isBrightSpoke
          ? 'rgba(255, 250, 240, 0.22)'
          : 'rgba(90, 70, 45, 0.18)';
        rCtx.lineWidth = 115;
        rCtx.stroke();
      }

      // Outer A-ring azimuthal shimmer arcs
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        rCtx.beginPath();
        rCtx.arc(0, 0, 455, angle, angle + 0.09);
        rCtx.strokeStyle =
          i % 2 === 0 ? 'rgba(255, 248, 232, 0.24)' : 'rgba(70, 55, 35, 0.16)';
        rCtx.lineWidth = 42;
        rCtx.stroke();
      }
      rCtx.restore();
    }

    const ringTexture = new THREE.CanvasTexture(ringCanvas);
    ringTexture.colorSpace = THREE.SRGBColorSpace;
    ringTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // 6. Assemble Larger, Dynamic Saturn System
    const saturnSystem = new THREE.Group();
    // Scale up the system so Saturn has commanding hero presence without clipping
    saturnSystem.scale.setScalar(1.18);

    // Planet Sphere (Oblate spheroid like real Saturn)
    const planetRadius = 1.0;
    const planetGeo = new THREE.SphereGeometry(planetRadius, 64, 48);
    const planetMat = new THREE.MeshStandardMaterial({
      map: saturnTexture,
      roughness: 0.82,
      metalness: 0.05,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.scale.set(1.04, 0.94, 1.04); // Authentic Saturn polar flattening
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    saturnSystem.add(planetMesh);

    // Rings Mesh: inner radius = 1.26, outer radius = 2.45
    const ringInner = 1.26;
    const ringOuter = 2.45;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 128, 64);

    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = (x / ringOuter) * 0.5 + 0.5;
      const v = (y / ringOuter) * 0.5 + 0.5;
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;

    const ringMat = new THREE.MeshStandardMaterial({
      map: ringTexture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.68,
      metalness: 0.12,
      alphaTest: 0.015,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;

    // 7. Orbiting Ice Ringlet Particles & Shepherd Moonlets for Unmistakable Orbital Motion
    const particleCount = 180;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (i * 0.618);
      // Distribute across B and A rings (avoiding Cassini division)
      const band = i % 3 === 0 ? 1.48 + (i % 17) * 0.026 : 2.08 + (i % 13) * 0.025;
      particlePositions[i * 3] = Math.cos(angle) * band;
      particlePositions[i * 3 + 1] = (Math.sin(i * 3.1) * 0.012);
      particlePositions[i * 3 + 2] = Math.sin(angle) * band;

      // Warm golden-ice and cyan-ice glints
      if (i % 5 === 0) {
        particleColors[i * 3] = 0.75;
        particleColors[i * 3 + 1] = 0.92;
        particleColors[i * 3 + 2] = 1.0;
      } else {
        particleColors[i * 3] = 1.0;
        particleColors[i * 3 + 1] = 0.93;
        particleColors[i * 3 + 2] = 0.80;
      }
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.038,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringParticles = new THREE.Points(particleGeo, particleMat);

    const ringRotatingGroup = new THREE.Group();
    ringRotatingGroup.add(ringMesh);
    ringRotatingGroup.add(ringParticles);
    saturnSystem.add(ringRotatingGroup);

    // Base Cassini inclination and axial tilt (~26.7 deg)
    const baseRotX = 0.44;
    const baseRotZ = -0.16;
    saturnSystem.rotation.x = baseRotX;
    saturnSystem.rotation.z = baseRotZ;

    scene.add(saturnSystem);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 8. Paced Render Loop with Planetary Rotation, Ring Orbit & Gentle Orbital Precession
    let frameId = 0;
    const startTime = performance.now();
    let lastTime = startTime;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      if (!reducedMotion) {
        // 1. Rotate Saturn's atmospheric bands & storms around its polar axis
        planetMesh.rotation.y += delta * 0.42;

        // 2. Smoothly rotate the textured ring plane & ice particles around the polar axis
        ringMesh.rotation.z -= delta * 0.34;
        ringParticles.rotation.y += delta * 0.48;

        // 3. Gentle zero-gravity spacecraft flyby precession & floating motion
        saturnSystem.rotation.x = baseRotX + Math.sin(elapsed * 0.75) * 0.045;
        saturnSystem.rotation.z = baseRotZ + Math.cos(elapsed * 0.6) * 0.055;
        saturnSystem.position.y = Math.sin(elapsed * 1.1) * 0.065;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    // 9. Cleanup & Resource Disposal
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
      planetGeo.dispose();
      planetMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      saturnTexture.dispose();
      ringTexture.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [reducedMotion]);

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{ width: '540px', height: '215px', maxWidth: '100%' }}
      aria-label="Cassini 3D Saturn Model"
    >
      {/* Soft celestial backdrop glow */}
      <div
        className="pointer-events-none absolute w-[420px] h-[160px] rounded-full blur-3xl opacity-45"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.24) 0%, rgba(99, 102, 241, 0.14) 48%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div
        ref={mountRef}
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
      />
    </div>
  );
};
