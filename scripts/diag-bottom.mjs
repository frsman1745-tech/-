import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const url = process.argv[2] || 'http://localhost:5173/';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

const sizes = [[360, 740], [768, 900], [1440, 900]];
const out = [];
for (const [w, h] of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('shamieh-lang'); } catch (e) {} });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3000));
  const m = await page.evaluate(() => {
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const cs = (el) => el ? getComputedStyle(el) : null;
    const sec = document.querySelector('#contact');
    const inner = document.querySelector('.contact .c-inner');
    const ftrContainer = document.querySelector('#contact > .container:last-of-type');
    const footer = document.querySelector('.site-footer');
    const adv = { l: Math.round(sec.getBoundingClientRect().left), r: Math.round(sec.getBoundingClientRect().right) };
    return {
      lang: document.documentElement.lang,
      docH: Math.round(document.documentElement.scrollHeight),
      scrollW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
      hashOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      contact: {
        box: box(sec),
        padding: cs(sec).paddingTop + ' / ' + cs(sec).paddingBottom,
        bgImage: cs(sec).backgroundImage,
        bgColor: cs(sec).backgroundColor
      },
      inner: { box: box(inner), maxWidth: cs(inner).maxWidth, margin: cs(inner).margin },
      footerC: { box: box(ftrContainer), maxWidth: cs(ftrContainer).maxWidth, padding: cs(ftrContainer).padding },
      footer: {
        box: box(footer),
        display: cs(footer).display,
        justifyContent: cs(footer).justifyContent,
        wrap: cs(footer).flexWrap,
        borderTop: cs(footer).borderTop,
        gap: cs(footer).gap
      },
      toTop: { box: box(document.querySelector('.to-top')), text: document.querySelector('.to-top')?.innerText },
      closing: { box: box(document.querySelector('.closing-phrase')), text: document.querySelector('.closing-phrase')?.innerText },
      lastChild: sec.lastElementChild ? (sec.lastElementChild.className || sec.lastElementChild.tagName) : null,
      facebookBg: Boolean(document.querySelector('#contact')) && getComputedStyle(sec).backgroundImage.includes('facebook_cover')
    };
  });
  out.push({ w, h, ...m });
  await page.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 1));