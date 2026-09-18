import sharp from 'sharp';
const s = 'imag 2/ezgif-frame-080.jpg';
const orig = (await import('node:fs')).statSync(s).size;
console.log('orig KB', (orig / 1024).toFixed(1));
for (const w of [960, 800, 720]) {
  for (const q of [48, 56, 62]) {
    const { data } = await sharp(s).resize(w, null, { withoutEnlargement: true }).webp({ quality: q }).toBuffer({ resolveWithObject: true });
    console.log(`${w}w q${q} → ${(data.length / 1024).toFixed(1)} KB`);
  }
}
