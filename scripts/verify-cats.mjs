import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/* فحص قائمة الشامية (index.html #cats): المعرض البانورامي يزاح لليسار مع التمرير */
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

if (!CHROME) { console.error('Chrome not found'); process.exit(1); }

const BASE = 'http://localhost:5173/';
const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740, dpr: 2 },
  { name: 'desktop', width: 1440, height: 900, dpr: 1 }
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--disable-dev-shm-usage']
});

const out = {};

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', (r) => failedRequests.push((r.failure()?.errorText || '') + ' :: ' + r.url()));

  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; });
  await new Promise((r) => setTimeout(r, 1500));

  const probe = await page.evaluate(async (cfg) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const scrollToY = async (y) => {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      await sleep(26);
    };

    const sec = document.getElementById('cats');
    const track = document.getElementById('catsTrack');
    const vpTop = sec.getBoundingClientRect().top + window.scrollY;
    const vpH = Math.round(sec.getBoundingClientRect().height);
    const slides = [...track.querySelectorAll('.cat-slide')];
    const totalScroll = { start: vpTop, end: sec.getBoundingClientRect().bottom + window.scrollY };

    const struct = {
      motionOn: document.documentElement.classList.contains('motion'),
      scrubClass: sec.classList.contains('cats-scrub'),
      staticClass: sec.classList.contains('cats-static'),
      slidesCount: slides.length,
      catsHeight: getComputedStyle(sec).height,
      vpPosition: getComputedStyle(sec.querySelector('.cats-viewport')).position,
      trackDirection: getComputedStyle(track).direction,
      trackDisplay: getComputedStyle(track).display
    };

    /* نطبع قيم x عبر المرور التدريجي */
    const xSamples = [];
    const counterSeen = new Set();
    const vw = window.innerWidth;
    const maxX = (slides.length - 1) * vw;
    for (let y = vpTop; y <= totalScroll.end; y += Math.round(cfg.height * 0.45)) {
      await scrollToY(y);
      await sleep(16);
      const t = getComputedStyle(track).transform;
      const m = t.match(/matrix\(([^)]+)\)/);
      if (m) xSamples.push(Math.round(parseFloat(m[1].split(',')[4]) * 10) / 10);
      const c = document.getElementById('catsIdx');
      if (c) counterSeen.add(c.textContent);
    }

    /* نهاية المسار: نتأكد الوصول لأقصى إزاحة يسرى والشرائح الأخيرة ظاهرة */
    await scrollToY(totalScroll.end - cfg.height);
    await sleep(350);
    const tEnd = getComputedStyle(track).transform;
    const mEnd = tEnd.match(/matrix\(([^)]+)\)/);
    const xEnd = mEnd ? Math.round(parseFloat(mEnd[1].split(',')[4])) : null;
    const endCounter = document.getElementById('catsIdx')?.textContent;
    const fillEnd = getComputedStyle(document.getElementById('catsFill')).transform;

    const slideImgs = slides.map((s, i) => ({
      i: i + 1,
      w: Math.round(s.getBoundingClientRect().width),
      imgW: s.querySelector('img')?.naturalWidth || 0,
      src: s.querySelector('img')?.getAttribute('src').split('/').pop()
    }));

    return {
      struct,
      vw,
      maxX,
      xSamples,
      counterSeen: [...counterSeen],
      xEnd,
      endCounter,
      fillEnd,
      slideImgs
    };
  }, vp);

  out[vp.name] = { ...probe, consoleErrors, pageErrors, failedRequests };
  await page.close();
}

await browser.close();

for (const name of ['mobile', 'desktop']) {
  const r = out[name];
  const okGrid = r.struct.scrubClass && r.struct.vpPosition === 'sticky';
  const xMidCount = r.xSamples.filter((x) => x < 0).length;
  const reachesEnd = r.xEnd !== null && Math.abs(r.xEnd - (-r.maxX)) <= 3;
  const counterReach = r.endCounter === String(r.struct.slidesCount).padStart(2, '0');
  const slidesOk = r.slideImgs.every((s) => s.w === r.vw) && r.slideImgs.every((s) => s.imgW > 0);
  r._check = {
    sticky: okGrid,
    movesLeftGradually: r.xSamples.length > 3 && xMidCount >= 3 && r.xSamples[0] === 0,
    reachesFullLeft: reachesEnd,
    counterReachesLast: counterReach,
    fillReachesFull: r.fillEnd.includes('1,') || r.fillEnd.includes('1)'),
    slidesFullscreen: slidesOk,
    noConsoleErrors: r.consoleErrors.length === 0 && r.pageErrors.length === 0
  };
}

console.log(JSON.stringify(out, null, 1));