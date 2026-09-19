import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/* فحص قائمة الشامية (index.html #cats): شبكة صف واحد دائماً (repeat(6,...))؛
   تحت 1080 يمرَّر الصف أفقياً بلمسة داخل .cats-grid نفسه (سكرول مخفي:
   scrollbar-width:none + -webkit-scrollbar{display:none}، مع scroll-snap
   وoverscroll-behavior-x:contain) بلا أي انجراف أفقي للشبكة؛
   على/فوق 1080 ست أعمدة متساوية بلا تمرير أفقي، والبطاقات تدخل من اليمين
   مع التمرير (once لكل بطاقة). على الديسكتوب فقط تنزاح الشبكة ككل يساراً
   مع التمرير (drift -2% ≈ -25px على حاوية ~1280)، وتحت 1080 لا انجراف إطلاقاً. */
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

if (!CHROME) { console.error('Chrome not found'); process.exit(1); }

const BASE = 'http://localhost:5173/';
const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 740, dpr: 2 },
  { name: 'tablet', width: 768, height: 1024, dpr: 2 },
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
      await sleep(24);
    };

    const sec = document.getElementById('cats');
    const grid = sec.querySelector('.cats-grid');
    const cards = [...sec.querySelectorAll('.cat-card')];
    const rect = sec.getBoundingClientRect();
    const top = rect.top + window.scrollY;

    const struct = {
      motionOn: document.documentElement.classList.contains('motion'),
      scrubClass: sec.classList.contains('cats-scrub'),         /* مفترض غائب تماماً */
      staticClass: sec.classList.contains('cats-static'),
      hasLegacy: !!document.getElementById('catsTrack') || !!document.querySelector('.cat-slide') || !!document.getElementById('catsIdx') || !!document.querySelector('.cats-ui'),
      cardsCount: cards.length,
      catsHeightPx: Math.round(rect.height),
      catsTop: Math.round(top),
      overflowX: getComputedStyle(document.documentElement).overflowX,
      overflowY: getComputedStyle(document.documentElement).overflowY,
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      tops: cards.map((c) => Math.round(c.getBoundingClientRect().top)),
      gridRows: getComputedStyle(grid).gridTemplateRows.split(' ').filter(Boolean).length,
      scrollable: grid.scrollWidth - grid.clientWidth > 1,
      scrollbarWidth: getComputedStyle(grid).scrollbarWidth
    };

    /* مسح القسم: عينة x للشبكة + حالة أول بطاقة (دخول من اليمين) + آخر بطاقة */
    const gridX = [];
    const firstSlide = [];
    const lastSlide = [];
    const from = cfg.height;
    const to = rect.height + cfg.height * 0.5;
    const step = Math.max(2, Math.round(cfg.height * 0.35));
    for (let y = top - from; y < top + to; y += step) {
      await scrollToY(y);
      await sleep(10);
      const gx = getComputedStyle(grid).transform;
      const m = gx.match(/matrix\(([^)]+)\)/);
      gridX.push(m ? Math.round(parseFloat(m[1].split(',')[4]) * 10) / 10 : 0);
      const read = (card) => {
        const t = getComputedStyle(card).transform;
        const mm = t.match(/matrix\(([^)]+)\)/);
        return {
          tx: mm ? Math.round(parseFloat(mm[1].split(',')[4]) * 10) / 10 : 0,
          op: Math.round(parseFloat(getComputedStyle(card).opacity) * 100) / 100
        };
      };
      if (firstSlide.length < 80) firstSlide.push(read(cards[0]));
      if (lastSlide.length < 80) lastSlide.push(read(cards[cards.length - 1]));
    }
    await scrollToY(top + to);
    await sleep(300);

    function readFinal(card) {
      const t = getComputedStyle(card).transform;
      const mm = t.match(/matrix\(([^)]+)\)/);
      return {
        tx: mm ? Math.round(parseFloat(mm[1].split(',')[4]) * 10) / 10 : 0,
        op: Math.round(parseFloat(getComputedStyle(card).opacity) * 100) / 100
      };
    }
    const finalFirst = readFinal(cards[0]);
    const finalLast = readFinal(cards[cards.length - 1]);

    /* فحص الـ swipe الجوال (<1080): الصف يمرَّر أفقياً فعلاً داخل .cats-grid */
    let swiped = false, delta = 0;
    if (cfg.width < 1080) {
      const s0 = grid.scrollLeft;
      const offsets = [-240, 240];
      for (const o of offsets) {
        grid.scrollBy({ left: o, behavior: 'instant' });
        await sleep(140);
        delta = grid.scrollLeft - s0;
        if (Math.abs(delta) > 5) { swiped = true; break; }
      }
    }

    return {
      struct,
      gridX,
      firstSlide,
      lastSlide,
      finalFirst,
      finalLast,
      swiped,
      scrollDelta: delta,
      imgsLoaded: cards.map((c) => Math.round(c.querySelector('img')?.naturalWidth || 0)),
      linksOk: cards.map((c) => !!c.getAttribute('href'))
    };
  }, vp);

  out[vp.name] = { ...probe, consoleErrors, pageErrors, failedRequests };
  await page.close();
}

await browser.close();

for (const name of ['mobile', 'tablet', 'desktop']) {
  const r = out[name];
  const isDesktop = name === 'desktop';
  const drift = r.gridX.filter((x) => x < -3).length;
  const driftHard = r.gridX.filter((x) => x < -4).length;
  const driftMin = Math.min(...r.gridX);
  const firstWasHidden = r.firstSlide.some((s) => s.op < 0.15 && s.tx >= 60);
  const firstEndsIn = r.finalFirst.op > 0.95 && Math.abs(r.finalFirst.tx) <= 4;
  const lastEndsIn = r.finalLast.op > 0.95 && Math.abs(r.finalLast.tx) <= 4;
  const firstProgressive = r.firstSlide.some((s) => s.op > 0.2 && s.op < 0.9);

  const common = {
    normalLayout: !r.struct.scrubClass && !r.struct.staticClass && !r.struct.hasLegacy,
    noInflatedHeight: r.struct.catsHeightPx > 60 && r.struct.catsHeightPx < 4000,
    sixCards: r.struct.cardsCount === 6,
    sixColumns: r.struct.cols === 6,
    singleRow: new Set(r.struct.tops).size === 1,                       /* كل المشاهدات */
    cardsSlideInFromRight: firstWasHidden && firstEndsIn && firstProgressive,
    lastCardAlsoVisible: lastEndsIn,
    imagesLoaded: r.imgsLoaded.every((w) => w > 0),
    linksOk: r.linksOk.every(Boolean),
    noConsoleErrors: r.consoleErrors.length === 0 && r.pageErrors.length === 0
  };

  r._check = isDesktop
    ? Object.assign({}, common, {
        desktopNoHScroll: r.struct.scrollable === false,                /* ≥1080 غير ممرَّر */
        gridDriftsLeft: drift >= 2 && r.gridX[0] >= -1 && driftMin <= -12 /* ديسكتوب فقط */
      })
    : Object.assign({}, common, {
        mobileSwipable: r.struct.scrollable === true,                   /* <1080 ممرَّر أفقياً */
        mobileNoScrollbar: r.struct.scrollbarWidth === 'none',           /* <1080 */
        mobileSwipeWorks_: r.swiped === true,                            /* <1080 */
        gridNoDriftMobile: driftHard === 0 && Math.abs(r.gridX[0]) <= 2 && Math.min(...r.gridX) >= -4
      });
}

console.log(JSON.stringify(out, null, 1));