import * as THREE from 'three';

/**
 * Generates procedural canvas textures for lunar regolith,
 * gold foil wrinkles, plaque engravings, and tread patterns.
 * 100% offline, zero-dependency, zero-404.
 */

export function createRegolithTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark lunar gray base
  ctx.fillStyle = '#6e7681';
  ctx.fillRect(0, 0, size, size);

  // Regolith micro-cratering and dust noise
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = Math.floor(80 + Math.random() * 60);
    const radius = Math.random() < 0.98 ? 1 : 1 + Math.random() * 3;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle crater rims
  for (let c = 0; c < 25; c++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 4 + Math.random() * 16;
    
    // Crater shadow
    ctx.fillStyle = 'rgba(30, 35, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, cr, 0, Math.PI * 2);
    ctx.fill();

    // Crater bright rim
    ctx.strokeStyle = 'rgba(180, 190, 205, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createGoldFoilTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base amber-gold
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 0, size, size);

  // Wrinkle facet lines (Kapton multi-layer insulation)
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(113, 63, 18, 0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createPlaqueTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const width = 512;
  const height = 400;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Brushed stainless steel background
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, width, height);

  // Brushed steel subtle horizontal grain
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
  for (let y = 0; y < height; y += 2) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Outer border
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, width - 32, height - 32);
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // Dual hemispheres of Earth outline
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(width / 2 - 70, 95, 45, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2 + 70, 95, 45, 0, Math.PI * 2);
  ctx.stroke();

  // Continental hints
  ctx.fillStyle = '#334155';
  ctx.font = '12px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WESTERN', width / 2 - 70, 98);
  ctx.fillText('EASTERN', width / 2 + 70, 98);

  // Engraved Historic Inscription
  ctx.fillStyle = '#090d16';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';

  const lines = [
    'HERE MEN FROM THE PLANET EARTH',
    'FIRST SET FOOT UPON THE MOON',
    'JULY 1969, A.D.',
    'WE CAME IN PEACE FOR ALL MANKIND'
  ];

  lines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, 190 + idx * 26);
  });

  // Signatures line
  ctx.font = 'italic 12px serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('NEIL A. ARMSTRONG · MICHAEL COLLINS · EDWIN E. ALDRIN, JR.', width / 2, 315);
  ctx.fillText('RICHARD NIXON, PRESIDENT OF THE UNITED STATES OF AMERICA', width / 2, 340);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createEarthTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean blue
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(0, 0, size, size);

  // Continents (green and tan swirls)
  ctx.fillStyle = '#15803d';
  const continents = [
    { x: 120, y: 160, r: 60 },
    { x: 180, y: 260, r: 70 },
    { x: 340, y: 150, r: 80 },
    { x: 380, y: 280, r: 65 },
    { x: 260, y: 380, r: 50 },
  ];
  continents.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Swirling white clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cw = 40 + Math.random() * 90;
    const ch = 12 + Math.random() * 30;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
