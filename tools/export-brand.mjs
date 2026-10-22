// Renders every [data-export] SVG in brand/kit.html to brand/out/<id>.png at 1080 x 1080, plus a preview sheet of
// all of them as circles at Instagram's real profile size (110 px) and large.  node tools/export-brand.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url'; import { createRequire } from 'module';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const puppeteer = createRequire(path.join(ROOT, '..', 'Animations', '_toolkit', 'package.json'))('puppeteer');
const out = path.join(ROOT, 'brand', 'out'); fs.mkdirSync(out, { recursive: true });

let browser;
try { browser = await puppeteer.launch({ headless: 'new' }); }
catch { browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }); }
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200 });
await page.goto(pathToFileURL(path.join(ROOT, 'brand', 'kit.html')).href, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
const ok = await page.evaluate(() => ['italic 800 40px Newsreader', '800 40px Montserrat'].map(f => document.fonts.check(f)));
if (ok.includes(false)) { console.error('fonts not loaded', ok); process.exit(1); }
const ids = await page.evaluate(() => [...document.querySelectorAll('[data-export]')].map(e => e.dataset.export));
for (const id of ids) {
  // render each at full size on its own
  const svg = await page.evaluate(id => document.querySelector(`[data-export="${id}"]`).outerHTML, id);
  const solo = await browser.newPage();
  await solo.setViewport({ width: 1080, height: 1080 });
  await solo.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,800&family=Montserrat:ital,wght@0,800;1,800&display=swap" rel="stylesheet"><style>body{margin:0}svg{display:block;width:1080px;height:1080px}</style></head><body>${svg.replace(/class="art"/, '')}</body></html>`, { waitUntil: 'networkidle0' });
  await solo.evaluate(() => document.fonts.ready);
  await solo.screenshot({ path: path.join(out, id + '.png') });
  await solo.close();
  console.log('saved', id);
}
// preview: each as a large circle and at real size
const sheet = await browser.newPage();
await sheet.setViewport({ width: 1400, height: 380 * Math.ceil(ids.length / 4) + 40 });
await sheet.setContent(`<body style="margin:0;padding:20px;background:#fff;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;font:600 13px Arial">${ids.map(id => `<div style="display:flex;gap:14px;align-items:flex-end"><img src="${pathToFileURL(path.join(out, id + '.png')).href}" style="width:240px;height:240px;border-radius:50%"><div><img src="${pathToFileURL(path.join(out, id + '.png')).href}" style="width:55px;height:55px;border-radius:50%;display:block;margin-bottom:6px">${id}</div></div>`).join('')}</body>`, { waitUntil: 'load' });
await sheet.screenshot({ path: path.join(out, '_preview.png'), fullPage: true });
await browser.close();
console.log('preview -> brand/out/_preview.png');
