/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

    // Detect software WebGL
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

    const width = 440;
    const height = 165;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(23, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 11.0);
    camera.lookAt(0, -0.05, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '440px';
    canvas.style.height = '165px';
    canvas.style.maxWidth = '100%';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.outline = 'none';
    container.innerHTML = '';
    container.appendChild(canvas);

    // 1. Procedural High-Fidelity Globe Texture
    function createGlobeTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d');
      if (!ctx) return new THREE.Texture();

      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.00, '#607480');
      grad.addColorStop(0.08, '#78898f');
      grad.addColorStop(0.15, '#beaa86');
      grad.addColorStop(0.24, '#d0bc97');
      grad.addColorStop(0.35, '#decba8');
      grad.addColorStop(0.48, '#efe0c3');
      grad.addColorStop(0.53, '#e5d3b3');
      grad.addColorStop(0.61, '#caa97e');
      grad.addColorStop(0.73, '#b89972');
      grad.addColorStop(0.86, '#937b5d');
      grad.addColorStop(1.00, '#564939');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      for (let y = 0; y < 512; y += 2) {
        const alpha = Math.sin(y * 0.28) * 0.035 + 0.025;
        ctx.fillStyle = `rgba(255, 248, 230, ${alpha})`;
        ctx.fillRect(0, y, 1024, 1);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      return tex;
    }

    // 2. Procedural High-Fidelity Cassini Ring Texture
    function createRingTexture() {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (!ctx) return new THREE.Texture();

      const grad = ctx.createLinearGradient(0, 0, 1024, 0);
      grad.addColorStop(0.00, 'rgba(0,0,0,0)');
      grad.addColorStop(0.05, 'rgba(80, 72, 60, 0.16)');
      grad.addColorStop(0.25, 'rgba(120, 108, 90, 0.45)');
      grad.addColorStop(0.27, 'rgba(215, 196, 165, 0.92)');
      grad.addColorStop(0.48, 'rgba(242, 226, 198, 0.98)');
      grad.addColorStop(0.66, 'rgba(220, 200, 168, 0.94)');
      grad.addColorStop(0.70, 'rgba(195, 175, 145, 0.88)');
      grad.addColorStop(0.71, 'rgba(0, 0, 0, 0.0)');
      grad.addColorStop(0.76, 'rgba(0, 0, 0, 0.0)');
      grad.addColorStop(0.77, 'rgba(188, 168, 138, 0.88)');
      grad.addColorStop(0.87, 'rgba(175, 155, 125, 0.82)');
      grad.addColorStop(0.90, 'rgba(0, 0, 0, 0.08)');
      grad.addColorStop(0.92, 'rgba(170, 150, 122, 0.78)');
      grad.addColorStop(0.97, 'rgba(120, 104, 82, 0.22)');
      grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 256);

      for (let x = 30; x < 990; x += 2) {
        if (x > 720 && x < 780) continue;
        const strokeAlpha = Math.sin(x * 1.6) * 0.08 + 0.05;
        ctx.fillStyle = `rgba(30, 24, 16, ${strokeAlpha})`;
        ctx.fillRect(x, 0, 1, 256);
      }

      for (let y = 0; y < 256; y++) {
        const spoke =
          Math.sin((y / 256) * Math.PI * 8) * 0.14 +
          Math.sin((y / 256) * Math.PI * 2) * 0.08;
        if (spoke > 0) {
          ctx.fillStyle = `rgba(255, 242, 220, ${spoke})`;
        } else {
          ctx.fillStyle = `rgba(15, 10, 5, ${Math.abs(spoke) * 1.2})`;
        }
        ctx.fillRect(160, y, 760, 1);
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    // 3. System assembly
    const saturnSystem = new THREE.Group();
    saturnSystem.rotation.z = -0.44;
    saturnSystem.rotation.x = 0.28;
    scene.add(saturnSystem);

    const planetGeo = new THREE.SphereGeometry(1.22, 64, 64);
    planetGeo.scale(1.0, 0.89, 1.0);
    const planetMat = new THREE.MeshStandardMaterial({
      map: createGlobeTexture(),
      roughness: 0.90,
      metalness: 0.02,
    });
    const planet = new THREE.Mesh(planetGeo, planetMat);
    planet.castShadow = true;
    planet.receiveShadow = true;
    saturnSystem.add(planet);

    const innerR = 1.45;
    const outerR = 3.10;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 192);

    const pos = ringGeo.attributes.position;
    const uvs = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const theta = Math.atan2(y, x);
      const u = (r - innerR) / (outerR - innerR);
      const v = theta / (Math.PI * 2) + 0.5;
      uvs.setXY(i, u, v);
    }
    uvs.needsUpdate = true;

    const ringMat = new THREE.MeshStandardMaterial({
      map: createRingTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      roughness: 0.82,
      metalness: 0.04,
    });

    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    saturnSystem.add(ringMesh);

    // 4. Photometric Directional Sunlight + Ambient Fill
    const sunLight = new THREE.DirectionalLight(0xfff2d4, 2.1);
    sunLight.position.set(7, 4.5, 4.5);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 22;
      sunLight.shadow.bias = -0.001;
    }
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x18130d, 0.7);
    scene.add(ambientLight);

    // 5. Animation loop
    let reqId = 0;
    function animate() {
      reqId = requestAnimationFrame(animate);
      if (!reducedMotion) {
        ringMesh.rotation.z += 0.0085;
      }
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
      planetGeo.dispose();
      planetMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className="relative w-[440px] h-[165px] flex items-center justify-center select-none pointer-events-none"
      aria-label="3D Cassini Saturn Model"
    />
  );
};
