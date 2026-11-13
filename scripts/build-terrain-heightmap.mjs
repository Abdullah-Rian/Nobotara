/**
 * Turn the Blender terrain (model-sources/terrain.glb) into the small height maps the game loads.
 * The terrain is a regular grid, so its heights are all the game needs: it builds the mesh from them
 * at start-up. Heights are stored at 16 bits (under 1 mm steps). Two files, with the same heights:
 *
 *   terrain-heights-v2.bin  (HMP2, about 195 KB)  what the game loads. Each height is predicted from its
 *                           left, upper and upper-left neighbours (left + upper - upper-left); only the
 *                           small misses are stored, then gzipped here, because Cloudflare does not
 *                           compress .bin files. The browser unzips it with DecompressionStream.
 *   terrain-heights.bin     (HMP1, 490 KB)  for browsers without DecompressionStream (iOS before 16.4).
 *
 * The glb was 14 MB.
 *
 * Usage: node scripts/build-terrain-heightmap.mjs [input.glb] [output-dir]
 *
 * HMP2 layout, little endian: the same 28-byte header as HMP1 with magic 'HMP2', then a gzip stream
 * of rows*cols u16 prediction misses, zigzag coded, high bytes first, then low bytes.
 * Prediction: left + upper - upper-left; the first row uses left, the first column uses upper, and
 * the first point is 32768 (the middle of the range).
 *
 * HMP1 layout, little endian:
 *   0  u32  magic 'HMP1'
 *   4  u16  cols        8  f32 cell size (metres between points)
 *   6  u16  rows       12  f32 world x of column 0
 *  16  f32  world z of row 0   (rows run toward -z)
 *  20  f32  lowest height      24 f32 height range
 *  28  rows*cols u16 deltas, zigzag coded, high bytes first, then low bytes
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2] || path.join(root, 'model-sources', 'terrain.glb');
const outDir = process.argv[3] || path.join(root, 'public', 'models');

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
const v1 = path.join(outDir, 'terrain-heights.bin');
fs.writeFileSync(v1, Buffer.concat([header, high, low]));

// HMP2: predict each height from its neighbours and keep only the misses.
const predict = (r, c) => {
  if (r === 0 && c === 0) return 32768;
  if (r === 0) return q[c - 1];
  if (c === 0) return q[(r - 1) * cols];
  const i = r * cols + c;
  return q[i - 1] + q[i - cols] - q[i - cols - 1];
};
const high2 = Buffer.alloc(count);
const low2 = Buffer.alloc(count);
for (let r = 0; r < cols; r++) {
  for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const miss = q[i] - predict(r, c);
    if (miss < -32768 || miss > 32767) throw new Error(`A prediction miss at row ${r}, column ${c} is too large to store.`);
    const zigzag = ((miss << 1) ^ (miss >> 31)) & 0xffff;
    high2[i] = zigzag >> 8;
    low2[i] = zigzag & 0xff;
  }
}
const header2 = Buffer.from(header);
header2.write('HMP2', 0, 'ascii');
const v2 = path.join(outDir, 'terrain-heights-v2.bin');
fs.writeFileSync(v2, Buffer.concat([header2, zlib.gzipSync(Buffer.concat([high2, low2]), { level: 9 })]));

console.log(`${cols}x${cols} points, ${cell} m apart, heights ${lo.toFixed(2)} to ${hi.toFixed(2)} m`);
console.log(`stored at 16 bits, worst rounding error ${(worst * 1000).toFixed(2)} mm`);
console.log(`wrote ${v2} (${fs.statSync(v2).size / 1024 | 0} KB)`);
console.log(`wrote ${v1} (${fs.statSync(v1).size / 1024 | 0} KB, for browsers without DecompressionStream)`);
