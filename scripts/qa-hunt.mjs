import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* ============ QA HUNT — all pages x viewports x dir/lang reduced-motion ============ */
const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

if (!CHROME) { console.error('Chrome not found'); process.exit(1); }

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const BASE = 'http://localhost:5173/';
const SHOT_DIR = fileURLToPath(new URL('../../../../AppData/Local/Temp/opencode/qa-shots', import.meta.url));
try { fs.mkdirSync(SHOT_DIR, { recursive: true }); } catch (e) {}

const VIEWPORTS = [
  { name: 'm360',  w: 360,  h: 740,  dpr: 2 },
  { name: 't768',  w: 768,  h: 1024, dpr: 2 },
  { name: 't1024', w: 1024, h: 768,  dpr: 1 },
  { name: 'd1440', w: 1440, h: 900,  dpr: 1 },
  { name: 'd1920', w: 1920, h: 1080, dpr: 1 },
  { name: 'se360', w: 360,  h: 640,  dpr: 2 }
];
const PAGES = ['index.html', 'sweets.html', 'dry.html', 'mansaf.html', 'mahashi.html'];

/* ---------------- static i18n analysis ---------------- */
const i18nText = fs.readFileSync(path.join(ROOT, 'assets/i18n.js'), 'utf8');
const i18nKeys = {};
const keyRe = /^\s{4}([a-zA-Z0-9_]+):\s*\{/gm;
let m;
while ((m = keyRe.exec(i18nText))) i18nKeys[m[1]] = false;
for (const k of Object.keys(i18nKeys)) {
  const i = i18nText.indexOf(k + ':{');
  const j = i18nText.indexOf('\n    \\w', i);
  const block = i18nText.slice(i, i18nText.indexOf('\n  };', i));
  i18nKeys[k] = /\ben\s*:/.test(block);
}

const pageI18n = {};
for (const p of PAGES) {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const used = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((x) => x[1]));
  const missing = [...used].filter((k) => !(k in i18nKeys));
  const noEn = [...used].filter((k) => k in i18nKeys && !i18nKeys[k]);
  pageI18n[p] = { count: used.size, missing, noEn };
}

/* ---------------- browser helpers ---------------- */
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--disable-dev-shm-usage', '--disable-features=IsolateOrigins,site-per-process']
});

async function newPage(vp, opts = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
  page.__cons = [];
  page.__perr = [];
  page.__fail = [];
  page.__bad = [];
  page.on('console', (mm) => { if (mm.type() === 'error') page.__cons.push(mm.text().slice(0, 400)); });
  page.on('pageerror', (e) => page.__perr.push(String(e).slice(0, 400)));
  page.on('requestfailed', (r) => page.__fail.push((r.failure()?.errorText || '') + ' :: ' + r.url()));
  page.on('response', (r) => { const s = r.status(); if (s >= 400) page.__bad.push(s + ' :: ' + r.url()); });
  if (opts.lang === 'en') {
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('shamieh-lang', 'en'); } catch (e) {} });
  }
  if (opts.reduce) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  return page;
}

async function waitBootGone(page) {
  const t0 = Date.now();
  let present = await page.evaluate(() => !!document.getElementById('boot'));
  const samples = [];
  let maxPct = 0;
  while (Date.now() - t0 < 8000) {
    const r = await page.evaluate(() => {
      const b = document.getElementById('boot');
      const p = document.getElementById('bootPct');
      return { present: !!b, done: b ? b.classList.contains('done') : false, pct: p ? parseInt(p.textContent, 10) || 0 : 0 };
    });
    samples.push(r);
    if (!r.present) break;
    maxPct = Math.max(maxPct, r.pct);
    await new Promise((r2) => setTimeout(r2, 90));
  }
  const goneMs = Date.now() - t0;
  return { presentAtStart: present, goneMs, maxBootPct: maxPct, lastSample: samples[samples.length - 1] };
}

async function scrollThrough(page, vp) {
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = Math.max(2, Math.ceil(docH / (vp.h * 0.8)));
  const targets = [];
  for (let i = 1; i <= steps; i++) targets.push(Math.round((docH * i) / steps));
  targets.push(docH);
  for (const t of targets) {
    await page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, t);
    await new Promise((r) => setTimeout(r, 26));
  }
  await page.evaluate(() => { if (window.__lenis) window.__lenis.scrollTo(99999999, { immediate: true }); else window.scrollTo(0, document.documentElement.scrollHeight); });
  await new Promise((r) => setTimeout(r, 900));
  return docH;
}

async function checkOverflow(page, vp) {
  const r = await page.evaluate(() => {
    const html = document.documentElement;
    const before = { htmlSW: html.scrollWidth, innerW: window.innerWidth };
    const prevBody = document.body.style.overflowX;
    const prevHtml = html.style.overflowX;
    document.body.style.overflowX = 'visible';
    html.style.overflowX = 'visible';
    const revealed = { htmlSW: html.scrollWidth, innerW: window.innerWidth };
    document.body.style.overflowX = prevBody;
    html.style.overflowX = prevHtml;
    let maxRight = 0;
    for (const el of document.querySelectorAll('body *')) {
      const rr = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const w = Math.round(window.scrollX + rr.right);
      if (w > maxRight) maxRight = w;
    }
    return { before, revealed, maxRight, bodyOverflowX: getComputedStyle(document.body).overflowX };
  });
  return { realOverflowX: r.revealed.htmlSW > r.revealed.innerW + 1, revealedHtmlSW: r.revealed.htmlSW, beforeHtmlSW: r.before.htmlSW, innerW: r.revealed.innerW, maxRight: r.maxRight, bodyOverflowX: r.bodyOverflowX };
}

async function checkImgs(page) {
  return page.evaluate(() => {
    const bad = [];
    const all = [...document.querySelectorAll('img')];
    for (const img of all) {
      const src = img.getAttribute('src') || img.currentSrc || '';
      if (!img.complete || img.naturalWidth === 0) bad.push(src);
    }
    return { total: all.length, bad, uniqueBad: [...new Set(bad)].slice(0, 20) };
  });
}

async function checkI18nApplied(page, isEn) {
  if (!isEn) {
    return page.evaluate(() => ({ lang: document.documentElement.getAttribute('lang'), dir: document.documentElement.getAttribute('dir'), title: document.title }));
  }
  return page.evaluate(() => {
    const leftovers = [];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/[\u0600-\u06FF]/.test(t)) {
        const key = el.getAttribute('data-i18n');
        if (!['contactAddr', 'fNotes', 'fNotesPh'].includes(key)) leftovers.push(key + ' => "' + t.slice(0, 60) + '"');
      }
    });
    return {
      lang: document.documentElement.getAttribute('lang'),
      dir: document.documentElement.getAttribute('dir'),
      title: document.title,
      htmlHasFour: document.documentElement.innerHTML.includes('أربعة أقسام'),
      leftovers
    };
  });
}

async function probePage(page, vp, opts) {
  const out2 = {};
  out2.boot = await waitBootGone(page);
  try { await page.evaluate(async () => { if (document.fonts) await document.fonts.ready; }); } catch (e) {}
  await new Promise((r) => setTimeout(r, 900));

  const docH = await scrollThrough(page, vp);
  out2.docH = docH;

  out2.i18n = await checkI18nApplied(page, opts.lang === 'en');

  await page.evaluate(() => { if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 80));
  out2.overflowTop = await checkOverflow(page, vp);
  await page.evaluate(() => { if (window.__lenis) window.__lenis.scrollTo(99999999, { immediate: true }); else window.scrollTo(0, document.documentElement.scrollHeight); });
  await new Promise((r) => setTimeout(r, 80));
  out2.overflowBottom = await checkOverflow(page, vp);

  out2.imgs = await checkImgs(page);

  out2.resources = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    return {
      top: res.map((e) => ({ name: e.name.replace(/^.*\//, '').slice(-48), size: e.transferSize || e.encodedBodySize || 0, initiator: e.initiatorType }))
        .sort((a, b) => b.size - a.size).slice(0, 10),
      totalTransfer: res.reduce((a, e) => a + (e.transferSize || e.encodedBodySize || 0), 0),
      count: res.length
    };
  });

  out2.layers = await page.evaluate(() => {
    const read = (sel) => { const el = document.querySelector(sel); return el ? { z: getComputedStyle(el).zIndex, pos: getComputedStyle(el).position } : null; };
    return { header: read('.site-header'), boot: read('.boot'), ui: read('.cats-ui'), modal: read('.modal'), prog: read('.scroll-progress') };
  });

  await page.evaluate(() => { if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0); });
  out2.state = await page.evaluate(() => ({
    motionOn: document.documentElement.classList.contains('motion'),
    bodyNoScroll: document.body.classList.contains('no-scroll'),
    scrollbarW: window.innerWidth - document.documentElement.clientWidth
  }));

  out2.consoleErrors = page.__cons;
  out2.pageErrors = page.__perr;
  out2.failedRequests = page.__fail;
  out2.badResponses = page.__bad;
  return out2;
}

const results = {};
for (const p of PAGES) {
  results[p] = { ar: {}, env: {} };
  for (const vp of VIEWPORTS) {
    const page = await newPage(vp, { lang: 'ar' });
    const resp = await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 });
    const data = await probePage(page, vp, { lang: 'ar' });
    data.httpCode = resp && resp.status();
    results[p].ar[vp.name] = data;
    await page.close();
  }
}

/* EN mode: 3 viewports */
for (const p of PAGES) {
  results[p].env = {};
  for (const vp of VIEWPORTS.filter((v) => ['m360', 't768', 'd1440'].includes(v.name))) {
    const page = await newPage(vp, { lang: 'en' });
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 });
    const data = await probePage(page, vp, { lang: 'en' });
    results[p].env[vp.name] = data;
    await page.close();
  }
}

/* ---------------- deep-dive: cats (index) ---------------- */
const catsOut = { scrub: {}, static: {} };
for (const vp of VIEWPORTS) {
  for (const dirMode of ['ar', 'en']) {
    const page = await newPage(vp, { lang: dirMode });
    await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
    await waitBootGone(page);
    await new Promise((r) => setTimeout(r, 1000));

    const probe = await page.evaluate(async (vpInfo) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const scrollToY = async (y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); await sleep(20); };
      const sec = document.getElementById('cats');
      const track = document.getElementById('catsTrack');
      const idx = document.getElementById('catsIdx');
      const fill = document.getElementById('catsFill');
      const ui = document.querySelector('.cats-ui');
      const stats = document.getElementById('stats');
      const slides = [...track.querySelectorAll('.cat-slide')];
      const vpTop = Math.round(sec.getBoundingClientRect().top + window.scrollY);
      const totalScrollEnd = Math.round(stats.getBoundingClientRect().top + window.scrollY);

      const struct = {
        motion: document.documentElement.classList.contains('motion'),
        scrub: sec.classList.contains('cats-scrub'),
        static: sec.classList.contains('cats-static'),
        htmlDir: document.documentElement.getAttribute('dir'),
        catsH: Math.round(sec.getBoundingClientRect().height),
        catsHDeclared: getComputedStyle(sec).height,
        viewportH: Math.round(sec.querySelector('.cats-viewport').getBoundingClientRect().height),
        vpPos: getComputedStyle(sec.querySelector('.cats-viewport')).position,
        trackDir: getComputedStyle(track).direction,
        trackFlex: getComputedStyle(track).flexDirection,
        slideCount: slides.length,
        uiVisible: ui ? getComputedStyle(ui).display !== 'none' : false,
        uiZ: ui ? getComputedStyle(ui).zIndex : null
      };

      const vw = window.innerWidth;
      const maxX = (slides.length - 1) * vw;
      const xSamples = [];
      const counterSeen = new Set();
      const count = totalScrollEnd - vpTop;
      const step = Math.max(12, Math.round(count / 26));
      for (let y = vpTop + step; y < totalScrollEnd - 1; y += step) {
        await scrollToY(y);
        await sleep(8);
        const mm = getComputedStyle(track).transform.match(/matrix\(([^)]+)\)/);
        if (mm) xSamples.push(Math.round(parseFloat(mm[1].split(',')[4]) * 10) / 10);
        if (idx) counterSeen.add(idx.textContent);
      }
      await scrollToY(totalScrollEnd);
      await sleep(500);
      const mEnd = getComputedStyle(track).transform.match(/matrix\(([^)]+)\)/);
      const xEnd = mEnd ? Math.round(parseFloat(mEnd[1].split(',')[4])) : null;
      const endCounter = idx ? idx.textContent : null;
      const fillEnd = fill ? getComputedStyle(fill).transform : null;

      const lastSlide = slides[slides.length - 1];
      await scrollToY(totalScrollEnd - vpInfo.h);
      await sleep(120);
      const uiRect = ui ? ui.getBoundingClientRect() : null;
      const bodyRect = lastSlide.querySelector('.cat-body') ? lastSlide.querySelector('.cat-body').getBoundingClientRect() : null;
      const uiOverlapBody = uiRect && bodyRect ? uiRect.top < bodyRect.bottom : null;

      const gapAfterCats = (() => {
        const s = stats.getBoundingClientRect().top + window.scrollY;
        return Math.round(s - totalScrollEnd);
      })();

      const slideW = slides.map((s) => Math.round(s.getBoundingClientRect().width));
      const vpRect = sec.querySelector('.cats-viewport').getBoundingClientRect();

      return {
        struct, vw, maxX,
        xSamples: xSamples.filter((x, i2) => i2 % 4 === 0).slice(0, 10),
        xSamplesCount: xSamples.length,
        negativeSamples: xSamples.filter((x) => x < 0).length,
        counterSeen: [...counterSeen].slice(0, 12),
        xEnd, endCounter, fillEnd,
        uiOverlapBody, gapAfterCats,
        slideW,
        viewportW: Math.round(vpRect.width),
        expectedEnd: -maxX
      };
    }, vp);
    probe.consoleErrors = page.__cons;
    probe.pageErrors = page.__perr;
    catsOut.scrub[vp.name + '_' + dirMode] = probe;
    await page.close();
  }
}

/* cats reduced-motion static path */
{
  const page = await newPage({ w: 360, h: 640, dpr: 2 }, { lang: 'ar', reduce: true });
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await scrollThrough(page, { w: 360, h: 640, dpr: 2 });
  const probe = await page.evaluate(() => {
    const sec = document.getElementById('cats');
    const track = document.getElementById('catsTrack');
    const slides = [...track.querySelectorAll('.cat-slide')];
    return {
      static: sec.classList.contains('cats-static'),
      scrub: sec.classList.contains('cats-scrub'),
      motionOn: document.documentElement.classList.contains('motion'),
      trackFlex: getComputedStyle(track).flexDirection,
      slideHeights: slides.slice(0, 3).map((s) => Math.round(s.getBoundingClientRect().height)),
      catsHeight: Math.round(sec.getBoundingClientRect().height),
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      uiDisplay: getComputedStyle(document.querySelector('.cats-ui')).display,
      uiDisplayOf: getComputedStyle(document.querySelector('.cats-ui')).display
    };
  });
  probe.consoleErrors = page.__cons;
  probe.pageErrors = page.__perr;
  catsOut.static['m360x640_reduce'] = probe;
  await page.close();
}
{
  const page = await newPage({ w: 1440, h: 900, dpr: 1 }, { lang: 'ar', reduce: true });
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  const probe = await page.evaluate(() => ({
    static: document.getElementById('cats').classList.contains('cats-static'),
    motionOn: document.documentElement.classList.contains('motion'),
    catsHeight: Math.round(document.getElementById('cats').getBoundingClientRect().height)
  }));
  probe.consoleErrors = page.__cons;
  probe.pageErrors = page.__perr;
  catsOut.static['d1440_reduce'] = probe;
  await page.close();
}

/* ---------------- deep-dive: sweets scrub canvas ---------------- */
const sweetsOut = { scrub: {}, static: {} };
for (const vp of VIEWPORTS) {
  const page = await newPage(vp, { lang: 'ar' });
  await page.goto(BASE + 'sweets.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await new Promise((r) => setTimeout(r, 1500));
  const probe = await page.evaluate(async (vpI) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const scrollToY = async (y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); await sleep(16); };
    const hero = document.getElementById('sweetsHero');
    const docH = document.documentElement.scrollHeight;
    const countSeen = new Set();
    const barSeen = new Set();
    for (let y = 0; y <= docH; y += Math.round(vpI.h * 0.4)) {
      await scrollToY(y);
      await sleep(10);
      const c = document.getElementById('scrubCount');
      if (c) countSeen.add(c.textContent);
      const b = document.getElementById('scrubBar');
      if (b) barSeen.add(getComputedStyle(b).transform);
    }
    await scrollToY(docH);
    await sleep(450);
    const cv = document.querySelector('.scrub-canvas');
    let canvasInfo = { found: !!cv };
    if (cv) {
      const ctx2 = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const d = ctx2.getImageData(0, 0, W, H).data;
      let nz = 0;
      for (let p = 3; p < d.length; p += 4) if (d[p] > 0) nz++;
      canvasInfo = { found: true, w: W, h: H, paintedRatio: +(nz / (W * H)).toFixed(4), cssWidth: Math.round(cv.getBoundingClientRect().width), cssHeight: Math.round(cv.getBoundingClientRect().height) };
    }
    return {
      docH,
      heroHs: hero ? hero.style.height : null,
      frameVisibility: getComputedStyle(document.querySelector('.scrub-frame')).visibility,
      countSeen: [...countSeen].slice(0, 8),
      barChanged: barSeen.size > 1,
      endCount: document.getElementById('scrubCount')?.textContent,
      canvasInfo
    };
  }, vp);
  probe.consoleErrors = page.__cons;
  probe.pageErrors = page.__perr;
  probe.failedRequests = page.__fail;
  sweetsOut.scrub[vp.name] = probe;
  await page.close();
}
/* sweets reduced path */
{
  const page = await newPage({ w: 360, h: 740, dpr: 2 }, { lang: 'ar', reduce: true });
  await page.goto(BASE + 'sweets.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await new Promise((r) => setTimeout(r, 800));
  const probe = await page.evaluate(() => ({
    static: document.getElementById('sweetsHero').classList.contains('scrub-static'),
    canvas: !!document.querySelector('.scrub-canvas'),
    frameSrc: document.querySelector('.scrub-frame')?.getAttribute('src'),
    count: document.getElementById('scrubCount')?.textContent,
    heroH: document.getElementById('sweetsHero').style.height,
    heroClasses: document.getElementById('sweetsHero').className
  }));
  probe.consoleErrors = page.__cons;
  probe.pageErrors = page.__perr;
  sweetsOut.static['m360_reduce'] = probe;
  await page.close();
}

/* ---------------- interactions: modal + anchors (index desktop) ---------------- */
const interactions = {};
{
  const page = await newPage({ w: 1440, h: 900, dpr: 1 }, { lang: 'ar' });
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await new Promise((r) => setTimeout(r, 700));
  interactions.modal = await page.evaluate(() => {
    const m = document.getElementById('orderModal');
    document.querySelector('[data-open-modal]').click();
    return {
      open: m.classList.contains('open'),
      bodyOverflow: document.body.style.overflow,
      lenisStopped: window.__lenis ? window.__lenis.isStopped : null,
      zModal: getComputedStyle(m).zIndex,
      zHeader: getComputedStyle(document.getElementById('siteHeader')).zIndex
    };
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 500));
  interactions.afterEsc = await page.evaluate(() => {
    const m = document.getElementById('orderModal');
    return {
      open: m.classList.contains('open'),
      bodyOverflow: document.body.style.overflow,
      lenisStopped: window.__lenis ? window.__lenis.isStopped : null
    };
  });
  await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href="#cats"]')][0];
    if (a) a.click();
  });
  await new Promise((r) => setTimeout(r, 1700));
  interactions.anchor = await page.evaluate(() => {
    const st = document.getElementById('cats');
    return {
      scrollY: Math.round(window.scrollY),
      catsScreenTop: Math.round(st.getBoundingClientRect().top)
    };
  });
  // header light on stats / dark on cats
  await page.evaluate(() => { window.__lenis.scrollTo(0, { immediate: true }); });
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(() => { window.__lenis.scrollTo(document.getElementById('cats').getBoundingClientRect().top + window.scrollY + 200, { immediate: true }); });
  await new Promise((r) => setTimeout(r, 400));
  interactions.headerDarkOverCats = await page.evaluate(() => {
    const h = document.getElementById('siteHeader');
    return { light: h.classList.contains('light'), hidden: h.classList.contains('hidden') };
  });
  await page.close();
}

/* ---------------- CLS + fonts ---------------- */
const perfOut = {};
for (const vp of [{ w: 1440, h: 900, dpr: 1 }, { w: 360, h: 740, dpr: 2 }]) {
  const page = await newPage(vp, { lang: 'ar' });
  await page.evaluateOnNewDocument(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
  });
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await scrollThrough(page, vp);
  await new Promise((r) => setTimeout(r, 800));
  perfOut[vp.w + 'x' + vp.h] = await page.evaluate(() => ({
    cls: Math.round(window.__cls * 1000) / 1000,
    fontsStatus: document.fonts ? document.fonts.status : null,
    scrollbarW: window.innerWidth - document.documentElement.clientWidth
  }));
  await page.close();
}

/* ---------------- screenshots for suspicious combos ---------------- */
async function shot(url, vp, name, opts = {}) {
  const page = await newPage(vp, opts);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await waitBootGone(page);
  await new Promise((r) => setTimeout(r, 700));
  const sec = await page.evaluate(() => { const c = document.getElementById('cats'); return c ? Math.round(c.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.55) : null; });
  if (sec !== null) { await page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); }, sec); }
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: path.join(SHOT_DIR, name + '.png') });
  await page.close();
}
await shot(BASE + 'index.html', { w: 1440, h: 900, dpr: 1 }, 'index-d1440-cats-pinned', { lang: 'ar' });
await shot(BASE + 'index.html', { w: 1920, h: 1080, dpr: 1 }, 'index-d1920-cats-pinned', { lang: 'ar' });
await shot(BASE + 'index.html', { w: 768, h: 1024, dpr: 2 }, 'index-t768-cats-pinned', { lang: 'ar' });
await shot(BASE + 'index.html', { w: 360, h: 640, dpr: 2 }, 'index-se360-cats-pinned', { lang: 'ar' });
await shot(BASE + 'sweets.html', { w: 1440, h: 900, dpr: 1 }, 'sweets-d1440', { lang: 'ar' });

await browser.close();

const big = {
  i18nStatic: pageI18n,
  pages: results,
  cats: catsOut,
  sweets: sweetsOut,
  interactions,
  perf: perfOut
};

console.log(JSON.stringify(big, null, 1));