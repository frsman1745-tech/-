import sharp from 'sharp';
import { statSync } from 'node:fs';
const src = 'imag 2/ezgif-frame-001.jpg';
const orig = statSync(src).size;
console.log('orig MB', (orig / 1048576).toFixed(2));
for (const q of [42, 50, 58, 64, 70]) {
  const { data } = await sharp(src).resize(1280, 720, { fit: 'fill', withoutEnlargement: true }).webp({ quality: q }).toBuffer({ resolveWithObject: true });
  console.log('q' + q, (data.length / 1024).toFixed(1) + 'KB', ((data.length / orig) * 100).toFixed(0) + '%');
}
