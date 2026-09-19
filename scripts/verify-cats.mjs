import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/* فحص قائمة الشامية (index.html #cats):
   - ديسكتوب (≥1080): صف واحد بست أعمدة متساوية، بطاقات تدخل من اليمين مع التمرير
     (once لكل بطاقة + stagger)، والشبكة ككل تنزاح يساراً قليلاً مع التمرير (drift -2%).
   - جوال/تابلت (<1080): رصّ عمودي — كل بطاقة تملأ الشاشة (100svh) وتُظهر صورة
     الصنف كاملة؛ لا سوايب يدوي إطلاقاً (لا تمرير أفقي/سكرول مخفي/scroll-snap)؛
     كل بطاقة تصعد من الأسفل (y ~ 60 → 0) عند وصول المقطع وتكتمل قبل التالية.
   السلوك المشترك: بلا أخطاء كونسول، 6 بطاقات، صور محمّلة، روابط سليمة. */
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
      vpHeight: cfg.height,
      overflowX: getComputedStyle(document.documentElement).overflowX,
      overflowY: getComputedStyle(document.documentElement).overflowY,
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      tops: cards.map((c) => Math.round(c.getBoundingClientRect().top)),
      cardHeights: cards.map((c) => Math.round(c.getBoundingClientRect().height)),
      gridRows: getComputedStyle(grid).gridTemplateRows.split(' ').filter(Boolean).length,
      scrollable: grid.scrollWidth - grid.clientWidth > 1,
      scrollbarWidth: getComputedStyle(grid).scrollbarWidth,
      snap: getComputedStyle(grid).scrollSnapType
    };

    /* مسح القسم: عينة x للشبكة + حالة أول بطاقة (دخول) + آخر بطاقة */
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
          ty: mm ? Math.round(parseFloat(mm[1].split(',')[5]) * 10) / 10 : 0,
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
        ty: mm ? Math.round(parseFloat(mm[1].split(',')[5]) * 10) / 10 : 0,
        op: Math.round(parseFloat(getComputedStyle(card).opacity) * 100) / 100
      };
    }
    const finalFirst = readFinal(cards[0]);
    const finalLast = readFinal(cards[cards.length - 1]);

    return {
      struct,
      gridX,
      firstSlide,
      lastSlide,
      finalFirst,
      finalLast,
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
  const driftMin = Math.min(...r.gridX);
  const firstWasHiddenRise = r.firstSlide.some((s) => s.op < 0.15 && s.ty >= 40);
  const firstWasHiddenSlide = r.firstSlide.some((s) => s.op < 0.15 && s.tx >= 60);
  const firstEndsIn = r.finalFirst.op > 0.95 && Math.abs(r.finalFirst.tx) <= 4 && Math.abs(r.finalFirst.ty) <= 4;
  const lastEndsIn = r.finalLast.op > 0.95 && Math.abs(r.finalLast.tx) <= 4 && Math.abs(r.finalLast.ty) <= 4;
  const firstProgressive = r.firstSlide.some((s) => s.op > 0.2 && s.op < 0.9);
  const ascendingTops = r.struct.tops.every((t, i) => i === 0 || t > r.struct.tops[i - 1]);

  const common = {
    normalLayout: !r.struct.scrubClass && !r.struct.staticClass && !r.struct.hasLegacy,
    sixCards: r.struct.cardsCount === 6,
    imagesLoaded: r.imgsLoaded.every((w) => w > 0),
    linksOk: r.linksOk.every(Boolean),
    noConsoleErrors: r.consoleErrors.length === 0 && r.pageErrors.length === 0
  };

  r._check = isDesktop
    ? Object.assign({}, common, {
        sixColumns: r.struct.cols === 6,
        singleRow: new Set(r.struct.tops).size === 1,
        noInflatedHeight: r.struct.catsHeightPx > 60 && r.struct.catsHeightPx < 4000,
        desktopNoHScroll: r.struct.scrollable === false,                /* ≥1080 غير ممرَّر */
        gridDriftsLeft: r.gridX.filter((x) => x < -3).length >= 2 && r.gridX[0] >= -1 && driftMin <= -12,
        cardsSlideInFromRight: firstWasHiddenSlide && firstEndsIn && firstProgressive,
        lastCardAlsoVisible: lastEndsIn
      })
    : Object.assign({}, common, {
        singleColumn: r.struct.cols === 1,                              /* <1080 رصّ عمودي */
        stackedRows: new Set(r.struct.tops).size === 6 && ascendingTops, /* 6 صفوف متتالية */
        fullScreenCards: Math.min(...r.struct.cardHeights) >= r.struct.vpHeight * 0.9, /* صورة كاملة */
        noInflatedHeight: r.struct.catsHeightPx > r.struct.vpHeight * 3 && r.struct.catsHeightPx < r.struct.vpHeight * 7.5,
        noHScrollAll: r.struct.scrollable === false && r.struct.cols === 1, /* لا سوايب ولا سكرول أفقي */
        cardsRiseFromBottom: firstWasHiddenRise && firstEndsIn && firstProgressive, /* y:56→0 */
        lastCardAlsoVisible: lastEndsIn,
        gridNoDriftMobile: r.gridX.filter((x) => x < -4).length === 0 && Math.abs(r.gridX[0]) <= 2 && driftMin >= -4
      });
}

console.log(JSON.stringify(out, null, 1));