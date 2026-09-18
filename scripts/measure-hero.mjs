import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const url = process.argv[2] || 'http://localhost:5173/';
const sizes = [[360, 740], [768, 900], [1440, 900]];
const langs = ['ar', 'en'];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const out = [];

for (const lang of langs) {
  for (const [w, h] of sizes) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h });
    await page.evaluateOnNewDocument((l) => { try { localStorage.setItem('shamieh-lang', l); } catch (e) {} }, lang);
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 3200));
    const m = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { t: Math.round(r.top + scrollY), b: Math.round(r.bottom + scrollY), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
      const hero = q('.hero');
      const pick = (s) => box(q(s));
      const vh = window.innerHeight;
      return {
        vh,
        heroH: Math.round(hero.getBoundingClientRect().height),
        hOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        docH: Math.round(document.documentElement.scrollHeight),
        copy: pick('.hero-copy'),
        kicker: pick('.hero .kicker'),
        h1: pick('.hero h1'),
        lead: pick('.hero p.lead'),
        ctas: pick('.hero-ctas'),
        stats: pick('.hero-stats'),
        note: pick('.hero-note'),
        visual: pick('.hero-visual'),
        card: pick('.hero-card'),
        strip: pick('.hero-strip'),
        stripDisplay: q('.hero-strip') ? getComputedStyle(q('.hero-strip')).display : null,
        baseGrid: getComputedStyle(q('.hero-grid')).gridTemplateColumns,
        h1Font: getComputedStyle(q('.hero h1')).fontSize,
        lineClip: [...document.querySelectorAll('.hero h1 .line')].map((l) => Math.round(l.scrollHeight - l.clientHeight)),
        spans: [...document.querySelectorAll('.hero h1 .line > span')].map((s) => { const r = s.getBoundingClientRect(); return Math.round(r.width); })
      };
    });
    out.push({ lang, w, h, ...m });
    await page.close();
  }
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
