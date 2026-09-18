import sharp from 'sharp';
import { readdir, statSync } from 'node:fs';
import path from 'node:path';
const a = readdirSync('imag 2');
console.log('src count', a.length);
for(const f of [a[0], a[Math.floor(a.length / 2)], a[a.length - 1]]){
  const s = await sharp('imag 2/' + f).metadata();
  console.log('SRC', f, s.width + 'x' + s.height, (statSync('imag 2/' + f).size / 1024).toFixed(1) + 'KB');
}
