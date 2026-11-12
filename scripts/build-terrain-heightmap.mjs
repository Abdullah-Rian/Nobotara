/**
 * Turn the Blender terrain (model-sources/terrain.glb) into the small height map the game loads
 * (public/models/terrain-heights.bin). The terrain is a regular grid, so its heights are all the
 * game needs: it builds the mesh from them at start-up. The file is 16-bit heights, each row stored
 * as differences from the previous point, split into a high-byte plane and a low-byte plane, which
 * the web server's Brotli squeezes to about 270 KB (the glb was 14 MB).
 *
 * Usage: node scripts/build-terrain-heightmap.mjs [input.glb] [output.bin]
 *
 * File layout, little endian:
 *   0  u32  magic 'HMP1'
 *   4  u16  cols        8  f32 cell size (metres between points)
 *   6  u16  rows       12  f32 world x of column 0
 *  16  f32  world z of row 0   (rows run toward -z)
 *  20  f32  lowest height      24 f32 height range
 *  28  rows*cols u16 deltas, zigzag coded, high bytes first, then low bytes
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2] || path.join(root, 'model-sources', 'terrain.glb');
const output = process.argv[3] || path.join(root, 'public', 'models', 'terrain-heights.bin');

const file = fs.readFileSync(input);
const jsonLength = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
const bin = 20 + jsonLength + 8;
const primitive = gltf.meshes[0].primitives[0];
const accessor = gltf.accessors[primitive.attributes.POSITION];
const view = gltf.bufferViews[accessor.bufferView];
const start = bin + (view.byteOffset || 0) + (accessor.byteOffset || 0);
const count = accessor.count;
const cols = Math.round(Math.sqrt(count));
if (cols * cols !== count) throw new Error('The terrain is not a square grid.');

// Any offset on the terrain node moves every height with it.
const offsetY = gltf.nodes.find(node => node.mesh === 0)?.translation?.[1] ?? 0;
const x = i => file.readFloatLE(start + i * 12);
const y = i => file.readFloatLE(start + i * 12 + 4) + offsetY;
const z = i => file.readFloatLE(start + i * 12 + 8);

const cell = x(1) - x(0);
for (let i = 0; i < cols; i++) {
  if (Math.abs(x(i) - (x(0) + i * cell)) > 1e-3) throw new Error('Columns are not evenly spaced.');
  if (Math.abs(z(i * cols) - (z(0) - i * cell)) > 1e-3) throw new Error('Rows are not evenly spaced.');
}

let lo = Infinity;
let hi = -Infinity;
for (let i = 0; i < count; i++) {
  lo = Math.min(lo, y(i));
  hi = Math.max(hi, y(i));
}
const range = hi - lo;
const q = new Uint16Array(count);
let worst = 0;
for (let i = 0; i < count; i++) {
  q[i] = Math.round(((y(i) - lo) / range) * 65535);
  worst = Math.max(worst, Math.abs((q[i] / 65535) * range + lo - y(i)));
}

const header = Buffer.alloc(28);
header.write('HMP1', 0, 'ascii');
header.writeUInt16LE(cols, 4);
header.writeUInt16LE(cols, 6);
header.writeFloatLE(cell, 8);
header.writeFloatLE(x(0), 12);
header.writeFloatLE(z(0), 16);
header.writeFloatLE(lo, 20);
header.writeFloatLE(range, 24);

const high = Buffer.alloc(count);
const low = Buffer.alloc(count);
for (let r = 0; r < cols; r++) {
  // Each row starts from the middle of the range, so even its first step fits in 16 bits.
  let previous = 32768;
  for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const delta = q[i] - previous;
    if (delta < -32768 || delta > 32767) throw new Error(`A height step at row ${r}, column ${c} is too large to store.`);
    previous = q[i];
    const zigzag = ((delta << 1) ^ (delta >> 31)) & 0xffff;
    high[i] = zigzag >> 8;
    low[i] = zigzag & 0xff;
  }
}
fs.writeFileSync(output, Buffer.concat([header, high, low]));
console.log(`${cols}x${cols} points, ${cell} m apart, heights ${lo.toFixed(2)} to ${hi.toFixed(2)} m`);
console.log(`stored at 16 bits, worst rounding error ${(worst * 1000).toFixed(2)} mm`);
console.log(`wrote ${output} (${(28 + count * 2) / 1024 | 0} KB before compression)`);
