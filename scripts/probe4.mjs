import sharp from 'sharp';
const root = 'imag 2';
for (const f of ['ezgif-frame-001.jpg', 'ezgif-frame-080.jpg', 'ezgif-frame-169.jpg']) {
  const { data } = await sharp(root + '/' + f).webp({ quality: 50 }).toBuffer({ resolveWithObject: true });
  console.log(f, ((data.length / 1024).toFixed(1)) + 'KB @q50');
}
