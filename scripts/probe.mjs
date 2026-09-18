import { readdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const opt = path.join(root, 'imag 2', 'opt');
const files = (await readdir(opt)).sort();
let total = 0;
const samples = [];
for (const f of files) {
  const sz = statSync(path.join(opt, f)).size;
  total += sz;
  if (f === 'ezgif-frame-001.webp' || f === 'ezgif-frame-080.webp' || f === 'ezgif-frame-169.webp') {
    samples.push([f, sz / 1024]);
  }
}
console.log('count:', files.length);
console.log('total:', (total / 1048576).toFixed(2) + ' MB');
console.log('avg:', (total / files.length / 1024).toFixed(1) + ' KB/frame');
for (const [f, kb] of samples) console.log(f, kb.toFixed(1), 'KB');
