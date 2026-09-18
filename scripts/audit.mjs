import { build, preview } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'audit');
fs.mkdirSync(outDir, { recursive: true });

const PAGES = ['/', '/sweets.html', '/dry.html', '/mansaf.html', '/mahashi.html'];
const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 800, dsf: 2 },
  { name: 'tablet', width: 768, height: 1024, dsf: 2 },
  { name: 'desktop', width: 1440, height: 900, dsf: 1 }
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('Chrome not found. Set CHROME_PATH env var.');
}

function runChecks() {
  const vw = document.documentElement.clientWidth;
  const report = {};

  report.docScrollWidth = document.documentElement.scrollWidth;
  report.horizontalOverflow = document.documentElement.scrollWidth - vw;

  report.h1 = document.querySelector('h1')?.textContent.trim().slice(0, 60) || null;
  report.pageTitle = document.title;
  report.lang = document.documentElement.getAttribute('lang');
  report.dir = document.documentElement.getAttribute('dir');
  report.motionActive = document.documentElement.classList.contains('motion');
  report.hasProgressBar = !!document.querySelector('.scroll-progress');

  const imgs = [...document.images];
  report.images = {
    total: imgs.length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src)
  };

  const overflowOffenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      let p = el.parentElement;
      let clipped = false;
      while (p) {
        const s = getComputedStyle(p);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { clipped = true; break; }
        p = p.parentElement;
      }
      if (!clipped) {
        overflowOffenders.push({
          sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
          left: Math.round(r.left),
          right: Math.round(r.right)
        });
      }
    }
  }
  report.overflowOffenders = overflowOffenders.slice(0, 12);

  const parseRGB = (str) => {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map((n) => parseFloat(n.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] === undefined ? 1 : parts[3] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const contrast = [];
  for (const el of document.querySelectorAll('p, h1, h2, h3, a, span, li, button, b, small, em, label')) {
    const text = (el.textContent || '').trim();
    if (!text || el.children.length > 0) continue;
    if (el.closest('.site-header, .contact, .hero, .cats, .page-coming')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) continue;
    const fg = parseRGB(s.color);
    if (!fg) continue;
    let bg = null, blocked = false, node = el;
    while (node) {
      const bs = getComputedStyle(node);
      if (bs.backgroundImage && bs.backgroundImage !== 'none') { blocked = true; break; }
      const c = parseRGB(bs.backgroundColor);
      if (c && c.a > 0.5) { bg = c; break; }
      node = node.parentElement;
    }
    if (blocked || !bg) continue;
    const cr = ratio(fg, bg);
    const size = parseFloat(s.fontSize);
    const bold = parseInt(s.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    if (cr < min) {
      contrast.push({
        text: text.slice(0, 40),
        color: s.color,
        bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        ratio: Math.round(cr * 100) / 100,
        need: min,
        fontSize: size
      });
    }
  }
  report.contrastFailures = contrast.slice(0, 12);

  return report;
}

async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
  });
}

async function hiddenAfterScroll(page) {
  return page.evaluate(() => {
    const stuck = [];
    for (const el of document.querySelectorAll('[data-reveal], .cat-card')) {
      const s = getComputedStyle(el);
      if (parseFloat(s.opacity) < 0.9) {
        stuck.push(el.className || el.tagName.toLowerCase());
      }
    }
    return stuck.slice(0, 12);
  });
}

async function testLangToggle(page) {
  const btn = await page.$('#langToggle');
  if (!btn) return { skipped: true };
  const before = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    label: document.querySelector('#langLabel')?.textContent
  }));
  await btn.click();
  await new Promise((r) => setTimeout(r, 500));
  const after = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    label: document.querySelector('#langLabel')?.textContent
  }));
  await btn.click();
  await new Promise((r) => setTimeout(r, 400));
  return { before, after };
}

async function testModal(page) {
  const btn = await page.$('[data-open-modal]');
  if (!btn) return { skipped: true };
  await btn.click();
  await new Promise((r) => setTimeout(r, 500));
  const open = await page.evaluate(() => !!document.querySelector('#orderModal.open'));
  await page.evaluate(() => document.querySelector('#modalClose')?.click());
  await new Promise((r) => setTimeout(r, 400));
  const closed = await page.evaluate(() => !document.querySelector('#orderModal.open'));
  return { open, closed };
}

(async () => {
  let server = null;
  let base;
  if (process.env.AUDIT_URL) {
    base = process.env.AUDIT_URL.replace(/\/$/, '');
    console.log('> auditing live server at', base);
  } else {
    console.log('> building...');
    await build({ root, logLevel: 'warn' });
    server = await preview({ root, logLevel: 'warn', preview: { port: 4173, strictPort: true } });
    base = server.resolvedUrls.local[0].replace(/\/$/, '');
    console.log('> preview at', base);
  }

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--disable-dev-shm-usage']
  });

  const full = {};
  for (const pagePath of PAGES) {
    full[pagePath] = {};
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf });
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
      page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
      page.on('requestfailed', (r) => failedRequests.push(r.url() + ' :: ' + (r.failure()?.errorText || '')));

      await page.goto(base + pagePath, { waitUntil: 'networkidle0', timeout: 45000 });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await new Promise((r) => setTimeout(r, 2200));

      const checks = await page.evaluate(runChecks);
      checks.stuckHiddenAfterIdle = await hiddenAfterScroll(page);
      await scrollFullPage(page);
      checks.stuckHiddenAfterScroll = await hiddenAfterScroll(page);

      if (pagePath === '/' && vp.name !== 'tablet') checks.langToggle = await testLangToggle(page);
      if (pagePath === '/' && vp.name === 'desktop') checks.modal = await testModal(page);

      checks.consoleErrors = consoleErrors;
      checks.pageErrors = pageErrors;
      checks.failedRequests = failedRequests;

      full[pagePath][vp.name] = checks;

      if (vp.name !== 'tablet') {
        const shot = path.join(outDir, `${pagePath === '/' ? 'home' : pagePath.replace(/[/.]/g, '')}-${vp.name}.png`);
        await page.screenshot({ path: shot, fullPage: true });
      }
      await page.close();
    }
  }

  await browser.close();
  if (server) await server.close();

  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(full, null, 2), 'utf8');

  const problems = [];
  const note = (pagePath, vp, msg) => problems.push(`${pagePath} [${vp}] ${msg}`);
  for (const [pagePath, vps] of Object.entries(full)) {
    for (const [vpName, c] of Object.entries(vps)) {
      if (c.horizontalOverflow > 1) note(pagePath, vpName, `horizontal overflow ${c.horizontalOverflow}px`);
      if (c.overflowOffenders?.length) note(pagePath, vpName, `offenders: ${c.overflowOffenders.map((o) => o.sel).join(', ')}`);
      if (c.images?.broken?.length) note(pagePath, vpName, `broken images: ${c.images.broken.join(', ')}`);
      if (c.consoleErrors?.length) note(pagePath, vpName, `console errors: ${c.consoleErrors.join(' | ')}`);
      if (c.pageErrors?.length) note(pagePath, vpName, `page errors: ${c.pageErrors.join(' | ')}`);
      if (c.failedRequests?.length) note(pagePath, vpName, `failed requests: ${c.failedRequests.join(' | ')}`);
      if (c.stuckHiddenAfterScroll?.length) note(pagePath, vpName, `stuck hidden: ${c.stuckHiddenAfterScroll.join(', ')}`);
      if (c.contrastFailures?.length) {
        c.contrastFailures.forEach((f) => note(pagePath, vpName, `contrast ${f.ratio}<${f.need} "${f.text}"`));
      }
      if (c.langToggle && !c.langToggle.skipped) {
        if (c.langToggle.after.lang !== 'en' || c.langToggle.after.dir !== 'ltr') note(pagePath, vpName, `lang toggle failed ${JSON.stringify(c.langToggle.after)}`);
      }
      if (c.modal && !c.modal.skipped) {
        if (!c.modal.open || !c.modal.closed) note(pagePath, vpName, `modal open/close failed ${JSON.stringify(c.modal)}`);
      }
    }
  }

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(problems.length ? problems.map((p) => ' - ' + p).join('\n') : 'No issues found.');
  console.log('==============================================');
  console.log('report:', path.join(outDir, 'report.json'));
  console.log('shots :', outDir);
})().catch((err) => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
