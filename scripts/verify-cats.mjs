import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/* فحص قائمة الشامية (index.html #cats):
   - ديسكتوب (≥1080): صف واحد بست أعمدة متساوية، بطاقات تدخل من اليمين مع التمرير
     (once لكل بطاقة + stagger)، والشبكة ككل تنزاح يساراً قليلاً مع التمرير (drift -2%).
   - جوال/تابلت (<1080): بانوراما أفقية مثبّتة — قسم كامل الشاشة يلتصق بأعلى الشاشة
     عند وصوله (pin)، وكل تمرير للأسفل يحرّك الشبكة يساراً (translateX اتّجاه سالب)،
     والسكرول يُستهلك حتى تُعرض كل الأصناف (end = (N-1)×العرض) ثم تتحرر؛
     بلا أي سوايب يدوي — لا تمرير أفقي في الصفحة والشبكة مقصوصة داخل القسم.
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
    /* الصور lazy لن تُحمَّل خارج الشاشة — نُجبرها للفحص فقط (تبقى lazy للزائر) */
    cards.forEach((c) => { const im = c.querySelector('img'); if (im) im.loading = 'eager'; });
    const rect = sec.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const isMobile = cfg.width < 1080;
    const dist = (cards.length - 1) * cfg.width;

    const struct = {
      motionOn: document.documentElement.classList.contains('motion'),
      scrubClass: sec.classList.contains('cats-scrub'),         /* مفترض غائب تماماً */
      staticClass: sec.classList.contains('cats-static'),
      hasLegacy: !!document.getElementById('catsTrack') || !!document.querySelector('.cat-slide') || !!document.getElementById('catsIdx') || !!document.querySelector('.cats-ui'),
      cardsCount: cards.length,
      catsHeightPx: Math.round(rect.height),
      catsTop: Math.round(top),
      vpHeight: cfg.height,
      vpWidth: cfg.width,
      overflowX: getComputedStyle(document.documentElement).overflowX,
      gridDisplay: getComputedStyle(grid).display,
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      tops: cards.map((c) => Math.round(c.getBoundingClientRect().top)),
      cardWidths: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
      cardHeights: cards.map((c) => Math.round(c.getBoundingClientRect().height)),
      gridRows: getComputedStyle(grid).gridTemplateRows.split(' ').filter(Boolean).length,
      scrollable: grid.scrollWidth - grid.clientWidth > 1,
      scrollbarWidth: getComputedStyle(grid).scrollbarWidth,
      sectionOverflowX: getComputedStyle(sec).overflowX,
      snap: getComputedStyle(grid).scrollSnapType
    };

    /* مسح القسم: عينة موضع الشبكة (انزلاق أفقي) وموضع القسم (تثبيت) + حالة البطاقات */
    const gridX = [];
    const secTopArr = [];
    const cardOp = [];
    const firstSlide = [];
    const from = cfg.height;
    const to = (isMobile ? dist : 0) + rect.height + cfg.height * 0.5;
    const step = Math.max(2, Math.round(cfg.height * 0.35));
    for (let y = top - from; y < top + to; y += step) {
      await scrollToY(y);
      await sleep(10);
      const gx = getComputedStyle(grid).transform;
      const m = gx.match(/matrix\(([^)]+)\)/);
      gridX.push(m ? Math.round(parseFloat(m[1].split(',')[4]) * 10) / 10 : 0);
      secTopArr.push(Math.round(sec.getBoundingClientRect().top));
      if (!isMobile && firstSlide.length < 60) {
        const t = getComputedStyle(cards[0]).transform;
        const mm = t.match(/matrix\(([^)]+)\)/);
        firstSlide.push({
          tx: mm ? Math.round(parseFloat(mm[1].split(',')[4]) * 10) / 10 : 0,
          op: Math.round(parseFloat(getComputedStyle(cards[0]).opacity) * 100) / 100
        });
      }
    }
    /* مواضع القياس: أول بطاقة عند بداية التثبيت (progress 0)، آخر بطاقة عند
       اكتمال البانوراما (progress 1 → scrollY = top + dist) */
    let imgsLoaded, firstCardRect, lastCardRect;
    if (isMobile) {
      await scrollToY(top);
      await sleep(450);
      cards.forEach((c) => cardOp.push(Math.round(parseFloat(getComputedStyle(c).opacity) * 100) / 100));
      const fr = cards[0].getBoundingClientRect();
      firstCardRect = { left: Math.round(fr.left), top: Math.round(fr.top), width: Math.round(fr.width), height: Math.round(fr.height) };
      await scrollToY(top + dist);
      await sleep(450);
      const lr = cards[cards.length - 1].getBoundingClientRect();
      lastCardRect = { left: Math.round(lr.left), top: Math.round(lr.top), width: Math.round(lr.width), height: Math.round(lr.height) };
      /* تمرير لكل صورة حتى تدخل الشاشة (مع تهدئة scrub) والانتظار لتحميل lazy */
      const widths = [];
      for (let i = 0; i < cards.length; i++) {
        await scrollToY(top + i * cfg.width);
        await sleep(300);
        widths.push(Math.round(cards[i].querySelector('img')?.naturalWidth || 0));
      }
      imgsLoaded = widths;
    } else {
      await scrollToY(top);
      await sleep(120);
      cards.forEach((c) => cardOp.push(Math.round(parseFloat(getComputedStyle(c).opacity) * 100) / 100));
      const fr = cards[0].getBoundingClientRect();
      firstCardRect = { left: Math.round(fr.left), top: Math.round(fr.top), width: Math.round(fr.width), height: Math.round(fr.height) };
      const lr = cards[cards.length - 1].getBoundingClientRect();
      lastCardRect = { left: Math.round(lr.left), top: Math.round(lr.top), width: Math.round(lr.width), height: Math.round(lr.height) };
      imgsLoaded = cards.map((c) => Math.round(c.querySelector('img')?.naturalWidth || 0));
      /* عينة استقرار أخيرة بعد نهاية المسح لالتقاط الاكتمال الكامل للدخول */
      await scrollToY(top + to);
      await sleep(300);
      const t = getComputedStyle(cards[0]).transform;
      const mm = t.match(/matrix\(([^)]+)\)/);
      firstSlide.push({
        tx: mm ? Math.round(parseFloat(mm[1].split(',')[4]) * 10) / 10 : 0,
        op: Math.round(parseFloat(getComputedStyle(cards[0]).opacity) * 100) / 100
      });
    }

    return {
      struct,
      gridX,
      secTopArr,
      firstCardRect,
      lastCardRect,
      cardOp,
      pageNoHScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1,
      imgsLoaded,
      linksOk: cards.map((c) => !!c.getAttribute('href')),
      firstSlide
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
  const pinned = r.secTopArr.some((t, i) => Math.abs(t) <= 2.5 && r.gridX[i] <= -(r.struct.vpWidth * 1.5));
  /* أثناء التثبيت: أس peak موضع البداية (أقرب لصفر) وأقصى انزلاق يساري — من عينات المسح */
  const pinnedTops = r.gridX.filter((x, i) => Math.abs(r.secTopArr[i]) <= 2.5);
  const startX = Math.max(...pinnedTops);
  const maxTravel = Math.min(...r.gridX);
  const firstCardShown = startX >= -(r.struct.vpWidth * 0.2);
  const lastCardShown = maxTravel <= -((r.struct.cardsCount - 1) * r.struct.vpWidth * 0.9);
  const deskWasHidden = r.firstSlide.some((s) => s.op < 0.15 && s.tx >= 60);
  const deskEndsIn = r.firstSlide.some((s) => s.op > 0.95 && Math.abs(s.tx) <= 6);

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
        desktopNoHScroll: r.struct.scrollable === false && r.pageNoHScroll,
        gridDriftsLeft: r.gridX.filter((x) => x < -3).length >= 2 && r.gridX[0] >= -1 && driftMin <= -12,
        cardsSlideInFromRight: deskWasHidden && deskEndsIn
      })
    : Object.assign({}, common, {
        cardsFullScreen: r.struct.cardWidths.every((w) => w >= r.struct.vpWidth * 0.9) && r.struct.cardHeights.every((h) => h >= r.struct.vpHeight * 0.9),
        noInflatedHeight: r.struct.catsHeightPx > r.struct.vpHeight * 0.7 && r.struct.catsHeightPx < r.struct.vpHeight * 1.3,
        pinnedHorizontal: pinned,                                        /* القسم مثبَّت أثناء الانزلاق */
        panoramaMovesLeft: driftMin <= -(r.struct.vpWidth * 4.5),        /* انزلاق يسار كامل لكل الأصناف */
        lastCardShownAtEnd: lastCardShown && r.lastCardRect.width >= r.struct.vpWidth * 0.9,
        firstCardShownAtStart: firstCardShown,
        panoramaCardsVisible: r.cardOp.every((o) => o === 1),            /* البانوراما هي الكشف */
        noSwipeNoHScroll: r.pageNoHScroll && r.struct.sectionOverflowX === 'hidden' && r.struct.snap !== 'x mandatory', /* لا سوايب يدوي */
        trackIsFlexRow: r.struct.gridDisplay === 'flex' && r.struct.gridRows < 2
      });
}

console.log(JSON.stringify(out, null, 1));