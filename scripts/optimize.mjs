/*
 * تحسين وضغط الصور دفعةً واحدة — WebP
 * الفريمات (imag 2/*.jpg, 1280×720) → imag 2/opt/*.webp  (800×450, q44)
 * الأصناف (imeg/*.jpg) → imeg/opt/item-*.webp (960w, q80)
 * شعار الحلو (remove_bg png) → imeg/opt/chip.webp (256px, alpha, q85)
 * صورة LCP الرئيسية (assets/image_05.png) → assets/image_05.webp (1200w, q80)
 */
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const progress = { done: 0, total: 0 };
function started(total){ progress.total = total; progress.done = 0; }
function tick(label){
  progress.done++;
  process.stdout.write(`\r  [${progress.done}/${progress.total}] ${label.padEnd(26)}`);
}

async function frames(){
  const srcDir = path.join(root, 'imag 2');
  const outDir = path.join(srcDir, 'opt');
  await mkdir(outDir, { recursive: true });
  const files = (await readdir(srcDir)).filter((f) => /^ezgif-frame-\d+\.jpg$/i.test(f));
  started(files.length);
  for(const f of files){
    const num = path.basename(f, '.jpg').replace(/\D/g, '');
    const out = path.join(outDir, `ezgif-frame-${num}.webp`);
    if(!existsSync(out)){
      await sharp(path.join(srcDir, f))
        .resize(800, 450, { fit: 'fill', withoutEnlargement: true })
        .webp({ quality: 44 })
        .toFile(out);
    }
    tick(`imag 2 › opt › ezgif-frame-${num}.webp`);
  }
  process.stdout.write('\n');
}

async function items(){
  const srcDir = path.join(root, 'imeg');
  const outDir = path.join(srcDir, 'opt');
  await mkdir(outDir, { recursive: true });
  const names = [
    'تنزيل.jpg', 'تنزيل (1).jpg', 'تنزيل (2).jpg', 'تنزيل (3).jpg',
    'تنزيل (4).jpg', 'تنزيل (5).jpg', 'تنزيل (6).jpg', 'تنزيل (7).jpg'
  ];
  started(names.length);
  for(const n in names){
    const out = path.join(outDir, `item-${String(Number(n) + 1).padStart(2, '0')}.webp`);
    if(!existsSync(out)){
      await sharp(path.join(srcDir, names[n]))
        .resize({ width: 960, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(out);
    }
    tick(`imeg › opt › item-${String(Number(n) + 1).padStart(2, '0')}.webp`);
  }
  process.stdout.write('\n');
}

async function chip(){
  const srcDir = path.join(root, 'imeg');
  const outDir = path.join(srcDir, 'opt');
  await mkdir(outDir, { recursive: true });
  const out = path.join(outDir, 'chip.webp');
  if(!existsSync(out)){
    const png = (await readdir(srcDir)).find((f) => /^remove_bg_.+\.png$/i.test(f));
    if(png){
      await sharp(path.join(srcDir, png))
        .resize({ width: 256, withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 90 })
        .toFile(out);
    }
  }
  if(existsSync(out)) tick('imeg › opt › chip.webp');
  process.stdout.write('\n');
}

async function lcp(){
  const src = path.join(root, 'assets', 'image_05.png');
  const out = path.join(root, 'assets', 'image_05.webp');
  if(existsSync(src) && !existsSync(out)){
    await sharp(src)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
  }
  if(existsSync(out)) tick('assets › image_05.webp');
  process.stdout.write('\n');
}

async function totals(){
  console.log('── جمع الأحجام ──');
  for(const [dir, label] of [['imag 2/opt', 'فريمات WebP'], ['imeg/opt', 'أصناف + شعار']]){
    const full = path.join(root, dir);
    let bytes = 0, count = 0;
    for(const f of await readdir(full)){
      bytes += statSync(path.join(full, f)).size;
      count++;
    }
    console.log(`  ${label}: ${(bytes / 1048576).toFixed(2)} MB (${count})`);
  }
  const l = path.join(root, 'assets', 'image_05.webp');
  if(existsSync(l)) console.log(`  LCP WebP: ${(statSync(l).size / 1024).toFixed(1)} KB`);
}

await frames();
await items();
await chip();
await lcp();
await totals();
console.log('✔ تم');
