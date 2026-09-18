import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 740 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => {
  const dh = document.documentElement.scrollHeight;
  if (window.__lenis) window.__lenis.scrollTo(dh, { immediate: true });
  else window.scrollTo(0, dh);
});
await new Promise((r) => setTimeout(r, 1200));
const data = await page.evaluate(() => {
  const dh = document.documentElement.scrollHeight;
  const sy = window.scrollY;
  const rows = [...document.body.querySelectorAll('*')].map((el) => {
    const r = el.getBoundingClientRect();
    const t = r.top + sy, b = r.bottom + sy;
    if (!(b > dh - 40 || (t > dh - 260 && b <= dh))) return null;
    let cls = '';
    if (typeof el.className === 'string') cls = el.className.slice(0, 70);
    return { tag: el.tagName, id: el.id || null, cls, top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const row of rows) {
    const k = row.tag + '|' + row.id + '|' + row.cls + '|' + row.top + '|' + row.bottom;
    if (!seen.has(k)) { seen.add(k); unique.push(row); }
  }
  return { dh, rows: unique.slice(-30) };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();