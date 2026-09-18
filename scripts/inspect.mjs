import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const url = process.argv[2];
const forceLang = process.argv[3];
if (!url) { console.error('usage: node scripts/inspect.mjs <url> [lang]'); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
if (forceLang) {
  await page.evaluateOnNewDocument((l) => { try { localStorage.setItem('shamieh-lang', l); } catch (e) {} }, forceLang);
}
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 160)));
page.on('requestfailed', (r) => { if (!r.url().includes('fonts.googleapis') && !r.url().includes('fonts.gstatic')) errors.push('REQFAIL ' + r.url()); });

await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }).catch((e) => errors.push('GOTO ' + e.message));
await new Promise((r) => setTimeout(r, 2500));

const out = await page.evaluate(() => {
  const cs = (el) => el ? getComputedStyle(el) : null;
  const heroVis = document.querySelector('#home .hero-visual');
  const h1 = document.querySelector('#home h1');
  const body = document.body;
  const sheets = [...document.styleSheets].map((s) => {
    let rules = -1;
    try { rules = s.cssRules ? s.cssRules.length : -2; } catch (e) { rules = -3; }
    return { href: s.href ? s.href.split('/').slice(-1)[0] : '(inline)', rules };
  });
  return {
    htmlClass: document.documentElement.className,
    bodyBg: cs(body).backgroundColor,
    bodyFont: cs(body).fontFamily,
    cssVarGold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
    sheets,
    motion: document.documentElement.classList.contains('motion'),
    lenis: !!window.__lenis,
    progress: !!document.querySelector('.scroll-progress'),
    mqCount: document.querySelectorAll('.mq').length,
    heroTitleText: h1 ? h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 50) : null,
    heroLineSpans: document.querySelectorAll('#home h1 .line > span').length,
    heroVisualOpacity: cs(heroVis) ? cs(heroVis).opacity : null,
    reveals: [...document.querySelectorAll('[data-reveal]')].map((el) => ({ cls: String(el.className).split(' ')[0], op: cs(el).opacity })),
    imgBroken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
    lang: document.documentElement.getAttribute('lang'),
    dir: document.documentElement.getAttribute('dir'),
    langLabel: document.querySelector('#langLabel')?.textContent,
    storedLang: (() => { try { return localStorage.getItem('shamieh-lang'); } catch (e) { return null; } })(),
    dLangEmpty: [...document.querySelectorAll('[data-i18n]')].filter((el) => !(el.textContent || '').trim() && !el.getAttribute('data-i18n-attr')).map((el) => el.getAttribute('data-i18n')),
    dLangStillArabic: (document.documentElement.lang === 'en' ? [...document.querySelectorAll('[data-i18n]')].filter((el) => /[\u0600-\u06FF]/.test(el.textContent || '')).map((el) => el.getAttribute('data-i18n') + '=' + (el.textContent || '').trim().slice(0, 25)) : [])
  };
}, {});

await browser.close();
console.log(JSON.stringify({ url, errors, ...out }, null, 2));
