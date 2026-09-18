import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((p) => fs.existsSync(p));
const url = process.argv[2] || 'http://localhost:5173/';
const dir = 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });

const sizes = [[360, 740], [1440, 900]];
for (const [w, h] of sizes) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('shamieh-lang'); } catch (e) {} });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2800));
  await page.evaluate((v) => window.scrollTo(0, document.documentElement.scrollHeight), null);
  await new Promise((r) => setTimeout(r, 1600));
  await page.screenshot({ path: `${dir}\\bottom-${w}.png` });
  await page.close();
}

await browser.close();
console.log('done');