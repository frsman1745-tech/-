/*
 * إعادة توليد فريمات WebP بالحجم الأمثل — نهائي
 * المصدر:  imag 2/ezgif-frame-NNN.jpg  (1280×720)
 * المخرج:   imag 2/opt/ezgif-frame-NNN.webp (960×540, q56)
 * الهدف:    خفض الوزن ~50–60% مع بقاء الجودة مقبولة للـ scrub
 */
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'imag 2');
const outDir = path.join(srcDir, 'opt');

await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => /^ezgif-frame-\d+\.jpg$/i.test(f));

let done = 0;
for(const f of files){
  const num = path.basename(f, '.jpg').replace(/\D/g, '');
  const out = path.join(outDir, `ezgif-frame-${num}.webp`);
  // إعادة توليد دائماً (نمحي القديم لنضمن القرار الجديد)
  await sharp(path.join(srcDir, f))
    .resize(960, 540, { fit: 'fill', withoutEnlargement: true })
    .webp({ quality: 56 })
    .toFile(out);
  done++;
  process.stdout.write(`\r  [${String(done).padStart(3)}/${files.length}] ${path.basename(out)}`);
}
process.stdout.write('\n');

// قياس المجموع
let total = 0;
for(const f of await readdir(outDir)){
  total += (await import('node:fs')).statSync(path.join(outDir, f)).size;
}
console.log(`اجمالي opt (960×540 q56): ${(total / 1048576).toFixed(2)} MB`);
