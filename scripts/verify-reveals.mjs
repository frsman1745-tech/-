import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 740 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));

const report = await page.evaluate(async () => {
  const vh = window.innerHeight;
  const catY = Math.round(document.getElementById('cats').getBoundingClientRect().top + window.scrollY);
  const cards = [...document.querySelectorAll('.cat-card')];
  const cardY = cards.map((c) => Math.round(c.getBoundingClientRect().top + window.scrollY));

  const sample = () =>
    cards.map((c) => {
      const s = getComputedStyle(c);
      return { op: +s.opacity, tf: s.transform };
    });

  const minL = cards.map(() => 0); // min translateX per card (negative = left)
  const seen = cards.map(() => false);

  // sweep through the cats section in small steps
  for (let y = catY - vh + 120; y <= catY + 700; y += 25) {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 45));
    sample().forEach((s, i) => {
      const m = s.tf.match(/matrix\(1, 0, 0, 1, ([\d.-]+),/);
      if (m) minL[i] = Math.min(minL[i], parseFloat(m[1]));
      if (s.op < 1 && s.op > 0.01) seen[i] = true;
    });
  }

  // bottom gap check
  if (window.__lenis) window.__lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true });
  else window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((r) => setTimeout(r, 900));
  const dh = document.documentElement.scrollHeight;
  const ftr = document.querySelector('.site-footer');
  const fBottom = Math.round(ftr.getBoundingClientRect().bottom + window.scrollY);
  const secBottom = Math.round(document.getElementById('contact').getBoundingClientRect().bottom + window.scrollY);

  return {
    cardY,
    cardsAfterGap: dh - fBottom,
    sectionAfterFooter: secBottom - fBottom,
    minTranslateX: minL,
    hadMidOpacity: seen,
    docH: dh
  };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();