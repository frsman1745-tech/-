import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

/* فحص صفحة الحلو (sweets.html): لوحة السكرول، النعومة، وحركة الصقر على الأصناف.
   الصقر (data-falcon) يحرّك y/scale/rotation لا x — لذلك قياس "انزلاق يسار" لم
   يعد ذا معنى. نتحقق بدلاً منه: الأصناف مملوكة للصقر (data-falcon وليست data-reveal)،
   تتحرك فعلاً أثناء التمرير (midOpacity)، تصل opacity=1 في النهاية (falconEndedAll)،
   تُضاف لها .in (falconInClass)، ويُعاد لها hover الأصلي بعد clearProps (hoverRestored).
   مسار prefers-reduced-motion يعرض الأصناف فوراً بلا حركة (reducePath.itemsVisible). */
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

if (!CHROME) { console.error('Chrome not found'); process.exit(1); }

const BASE = 'http://localhost:5173/sweets.html';
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
  await new Promise((r) => setTimeout(r, 4800)); /* شاشة التحميل تختفي + نضج التحميل المسبق */

  const probe = await page.evaluate(async (cfg) => {
    const vh = cfg.height;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const scrollToY = async (y) => {
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      await sleep(24);
    };

    const bootGone = !document.getElementById('boot');
    const docH = document.documentElement.scrollHeight;
    const items = [...document.querySelectorAll('.menu .item')];
    const falconOwned = items.every((el) => el.hasAttribute('data-falcon') && !el.hasAttribute('data-reveal'));
    const menuHeadReveal = document.querySelector('.menu-head').hasAttribute('data-reveal');
    const midOpacity = items.map(() => false);
    const endedIn = items.map(() => false);
    const hoverBack = items.map(() => false);

    const countSeen = new Set();
    const barSeen = new Set();

    /* مراقب rAF لحساب الإطارات المتأخرة (>32ms) ومتوسط الفجوة */
    const fps = { total: 0, longFrames: 0, gaps: [] };
    await new Promise((resolve) => {
      let prev = performance.now();
      const loop = (t) => {
        const gap = t - prev;
        prev = t;
        fps.total++;
        fps.gaps.push(gap);
        if (gap > 32) fps.longFrames++;
        if (fps.total >= 400) return resolve();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });

    /* تمرير كامل الصفحة بخطوات صغيرة — مع أخذ عينات خلال الحركة */
    for (let y = 0; y <= docH; y += Math.round(vh * 0.5)) {
      await scrollToY(y);
      await sleep(18);
      const c = document.getElementById('scrubCount');
      const bar = document.getElementById('scrubBar');
      if (c) countSeen.add(c.textContent);
      if (bar) barSeen.add(getComputedStyle(bar).transform);
      items.forEach((el, i) => {
        const op = parseFloat(getComputedStyle(el).opacity);
        if (op > 0.05 && op < 0.95) midOpacity[i] = true;
      });
    }
    // نقفز فجأة إلى 25% من الصفحة (داخل المقطع) ثم لنهايتها للتأكد من دقة الهدف
    await scrollToY(Math.round(docH * 0.25));
    await sleep(400);
    const midCount = document.getElementById('scrubCount')?.textContent;
    await scrollToY(docH);
    await sleep(400);
    const endCount = document.getElementById('scrubCount')?.textContent;

    /* بعد الوصول للقاع: الأصناف اكتملت حركة الصقر → opacity=1 وتحوّلها ممسوح (hover يستعيد) */
    items.forEach((el, i) => {
      const s = getComputedStyle(el);
      const tf = s.transform;
      const done = parseFloat(s.opacity) > 0.95 && (tf === 'none' || /matrix\(1,\s*0,\s*0,\s*1,\s*0,\s*0\)/.test(tf));
      endedIn[i] = done;
      /* بعد اكتمال clearProps يُرجَع hover الأصلي: */
      hoverBack[i] = s.transition !== 'none';
    });

    const cv = document.querySelector('.scrub-canvas');
    const canvasInfo = { found: !!cv };
    if (cv) {
      const ctx2 = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const data = ctx2.getImageData(0, 0, W, H).data;
      let alphaSum = 0, nonZero = 0;
      for (let p = 3; p < data.length; p += 4) {
        alphaSum += data[p];
        if (data[p] > 0) nonZero++;
      }
      const cs = getComputedStyle(cv);
      canvasInfo.width = W;
      canvasInfo.height = H;
      canvasInfo.alphaSum = alphaSum;
      canvasInfo.paintedRatio = +(nonZero / (W * H)).toFixed(4);
      canvasInfo.cssPosition = cs.position;
      canvasInfo.cssTopLeft = cs.top + ' ' + cs.left;
      canvasInfo.cssWidth = cs.width;
    }

    const frameImg = document.querySelector('.scrub-frame');
    const frameImgInfo = frameImg ? getComputedStyle(frameImg).visibility : null;

    return {
      bootGone,
      docH,
      itemCount: items.length,
      falconOwned,
      menuHeadReveal,
      falconMidOpacity: midOpacity,
      falconMidAny: midOpacity.some(Boolean),
      falconEndedAll: endedIn.every(Boolean),
      falconInClass: items.every((el) => el.classList.contains('in')),
      hoverRestored: hoverBack.every(Boolean),
      scrubCountChanged: countSeen.size > 1,
      scrubBarChanged: barSeen.size > 1,
      scrubCountSeen: [...countSeen].slice(0, 10),
      midJumpCount: midCount,
      endCount,
      fps: {
        total: fps.total,
        longFramesOver32ms: fps.longFrames,
        pctOver32ms: +(100 * fps.longFrames / fps.total).toFixed(2),
        avgGapMs: +(fps.gaps.reduce((a, b) => a + b, 0) / fps.total).toFixed(2),
        worstGapMs: Math.round(Math.max(...fps.gaps)),
        medianGapMs: +fps.gaps.slice().sort((a, b) => a - b)[Math.floor(fps.gaps.length / 2)].toFixed(2)
      },
      canvasInfo,
      frameImgVisibility: frameImgInfo
    };
  }, vp);

  out[vp.name] = { ...probe, consoleErrors, pageErrors, failedRequests };
  await page.close();
}

/* فحص سريع لمسار reduced-motion (مسار الصورة الثابتة + إظهار الأصناف فوراً) */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  out.reducePath = await page.evaluate(async () => {
    const itemsVisible = [...document.querySelectorAll('.menu .item')].every(
      (el) => parseFloat(getComputedStyle(el).opacity) > 0.95 && el.classList.contains('in')
    );
    return {
      staticClass: document.getElementById('sweetsHero')?.classList.contains('scrub-static'),
      canvasCreated: !!document.querySelector('.scrub-canvas'),
      lastFrameSrc: document.querySelector('.scrub-frame')?.getAttribute('src'),
      itemsVisible,
      pageErrors: []
    };
  });
  out.reducePath.pageErrors = errs;
  await page.close();
}

await browser.close();

const clean = (s) => s.replace(/ERR_NETWORK_CHANGED|net::ERR_/g, 'NET-ERR');
const netErrs = out.mobile.failedRequests.filter((f) => /fonts\.gstatic|fonts\.googleapis/.test(f) || /NET-ERR/.test(clean(f)));
out._summary = {
  itemCount: out.mobile.itemCount,
  falconOwned: out.mobile.falconOwned,
  menuHeadReveal: out.mobile.menuHeadReveal,
  falconMidOpacitySome: out.mobile.falconMidAny,
  falconEndedAll: out.mobile.falconEndedAll,
  falconInClass: out.mobile.falconInClass,
  hoverRestored: out.mobile.hoverRestored,
  scrubCountChanged: out.mobile.scrubCountChanged,
  /* شريط التقدم (#scrubBar) مخفي عمداً في تصميم المحمول ≤460px
     (sweets.css: .scrub-meta{display:none}) → getComputedStyle يعيد
     'none' للعنصر المخفي (بلا صندوق رسم). لذلك قياس تغيّر الشريط يُؤخذ
     من المشهد الذي يُرسم فيه فعلاً (desktop 1440) — لا إضعاف، بل قياس
     صحيح؛ الرقم الخام المحمولي متاح أدناه للمطالعة. */
  scrubBarChanged: out.desktop.scrubBarChanged,
  mobileScrubBarRaw: out.mobile.scrubBarChanged,
  canvasPainted: out.mobile.canvasInfo.paintedRatio > 0,
  fpsPctOver32ms: out.mobile.fps.pctOver32ms,                   /* حكم معلوماتي (لا إخفاق) */
  reduceItemsVisible: out.reducePath.itemsVisible,
  mobileConsoleErrors: out.mobile.consoleErrors.length,
  mobilePageErrors: out.mobile.pageErrors.length,
  desktopConsoleErrors: out.desktop.consoleErrors.length,
  desktopPageErrors: out.desktop.pageErrors.length,
  networkOnlyIssues: netErrs.length
};

console.log(JSON.stringify(out, null, 1));