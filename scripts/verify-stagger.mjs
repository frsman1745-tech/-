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
  const triggered = cards.map(() => null); // scrollY where opacity left 0 (reveal started)
  const settled = cards.map(() => null); // scrollY where opacity hit ~1

  for (let y = catY - vh + 130; y <= catY + 800; y += 20) {
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 35));
    cards.forEach((c, i) => {
      const op = parseFloat(getComputedStyle(c).opacity);
      if (triggered[i] === null && op > 0.02) triggered[i] = y;
      if (op >= 0.99) settled[i] = Math.min(settled[i] ?? 1e9, y);
    });
  }

  return {
    catY,
    cardYs: cards.map((c) => Math.round(c.getBoundingClientRect().top + window.scrollY)),
    triggerScroll: triggered,
    settledScroll: settled
  };
});
console.log(JSON.stringify(report, null, 1));
await browser.close();