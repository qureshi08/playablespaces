// Captures real store pages at phone size for a reel's "website" beat (dev only).
//   node tools/capture-site.mjs <out dir> <name>=<url> [<name>=<url> ...] [--swatches name=Grey,Light Green]
// Each page is saved as <name>.png (full page, 1080 px wide). With --swatches, the product page is also saved once per
// colour after clicking that colour's option, as <name>-<colour>.png (top of the page only).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', '..', 'Animations', '_toolkit', 'package.json'));
const puppeteer = require('puppeteer');

const args = process.argv.slice(2), out = args[0]; fs.mkdirSync(out, { recursive: true });
const pages = args.slice(1).filter(a => a.includes('=') && !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--swatches').map(a => a.split(/=(.*)/s));
const si = args.indexOf('--swatches'), sw = si > 0 ? args[si + 1].split(/=(.*)/s) : null;

let browser;
try { browser = await puppeteer.launch({ headless: 'new' }); }
catch { browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }); }
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true });
// popups and chat bubbles are not the store: hide anything fixed that covers the page
const tidy = () => page.evaluate(() => {
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    // (only fixed things: sticky ones include the product photo gallery, which is the point of the capture)
    if (cs.position === 'fixed' && el.offsetHeight > 0) {
      const r = el.getBoundingClientRect();
      const header = r.top <= 1 && r.height < 140;
      if (!header) el.style.setProperty('display', 'none', 'important');
    }
  }
  // the store's floating AI chat chips are not part of the page either
  for (const el of document.querySelectorAll('body *')) {
    const t = el.textContent.trim();
    if (/^(Shop with AI|Browse this collection\?|What are the .{0,40}\?)$/.test(t) && el.querySelectorAll('*').length < 12) el.style.setProperty('display', 'none', 'important');
  }
  // (chat widgets often live inside a shadow root, so check those hosts too)
  for (const el of document.querySelectorAll('body *')) if (el.shadowRoot && /Shop with AI|Browse this collection|Save Rs/.test(el.shadowRoot.textContent || '')) el.style.setProperty('display', 'none', 'important');
  for (const el of document.querySelectorAll('body *')) if (/^Save Rs[\d,.]+ off the original/.test(el.textContent.trim()) && el.querySelectorAll('*').length < 12) el.style.setProperty('display', 'none', 'important');
  document.documentElement.style.overflow = 'auto'; document.body.style.overflow = 'auto';
});
const settle = async () => { await new Promise(r => setTimeout(r, 2500)); await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); }); await new Promise(r => setTimeout(r, 1200)); await tidy(); };

for (const [name, url] of pages) {
  // (stores keep chat and tracking sockets open, so "network idle" may never come; load, then settle by time)
  await page.goto(url, { waitUntil: 'load', timeout: 120000 }).catch(e => console.warn('slow load, going on:', e.message));
  await settle();
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  console.log('saved', name);
  if (sw && sw[0] === name) {
    for (const colour of sw[1].split(',')) {
      const ok = await page.evaluate(c => {
        const el = [...document.querySelectorAll('label, button, input[type=radio], [data-value], option, span, a')].find(e => (e.value || e.dataset?.value || e.textContent || e.title || '').trim() === c && e.offsetParent);
        if (!el) return false; (el.tagName === 'INPUT' ? (el.labels?.[0] || el) : el).click(); return true;
      }, colour);
      await new Promise(r => setTimeout(r, 1800)); await tidy(); await page.evaluate(() => scrollTo(0, 0));
      // the click scrolls the page, so take the top of the page itself, not the viewport
      await page.screenshot({ path: path.join(out, `${name}-${colour.replace(/\s+/g, '-').toLowerCase()}.png`), clip: { x: 0, y: 0, width: 390, height: 844 }, captureBeyondViewport: true });
      console.log('swatch', colour, ok ? 'clicked' : 'NOT FOUND');
    }
  }
}
await browser.close();
