// Records a space's promo reel (kit/reel.js) to an mp4, frame by frame, from the local server (node serve.js, port 8091).
//   node tools/record-reel.mjs habitt-studio                     -> _reels/habitt-studio/final.mp4
//   node tools/record-reel.mjs habitt-studio --stills 1,4.5,9    -> stills plus one contact sheet, no video
// Uses puppeteer and ffmpeg from Animations/_toolkit (the video pipeline's own install).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { createRequire } from 'module'; import { execFileSync } from 'child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', '..', 'Animations', '_toolkit', 'package.json'));
const puppeteer = require('puppeteer');
const FF = require('@ffmpeg-installer/ffmpeg').path;

const room = process.argv[2] || 'habitt-studio';
const si = process.argv.indexOf('--stills'), stills = si > 0 ? process.argv[si + 1].split(',').map(Number) : null;
// --reel <name> records kit/reel-<name>.js to final-<name>.mp4 (and its own loudness, quieter: music goes on top in the app)
const ri = process.argv.indexOf('--reel'), reel = ri > 0 ? process.argv[ri + 1] : '';
const out = path.join(HERE, '..', '_reels', room); fs.mkdirSync(out, { recursive: true });
const FINAL = reel ? `final-${reel}.mp4` : 'final.mp4', LUFS = reel ? -18 : -14;

const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'];
let browser;
try { browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 0, args }); }
catch { browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 0, args, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }); }
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
// 432 x 768 CSS px at 2.5x = a 1080 x 1920 frame with the phone layout
await page.setViewport({ width: 432, height: 768, deviceScaleFactor: 2.5 });
await page.goto(`http://localhost:8091/${room}?reel${reel ? "=" + reel : ""}&rec`, { waitUntil: 'networkidle0', timeout: 120000 });
await page.waitForFunction(() => window.__reel, { timeout: 120000 });
const fonts = await page.evaluate(async () => { await document.fonts.ready; return ['italic 800 20px Newsreader', '800 20px Montserrat', '600 14px Inter'].map(f => document.fonts.check(f)); });
if (fonts.includes(false)) { console.error('fonts not loaded', fonts); process.exit(1); }
const { frames, fps } = await page.evaluate(() => ({ frames: __reel.frames, fps: __reel.fps }));

const t0 = Date.now();
let f = 0;
const stepTo = n => page.evaluate(n => { let k = 0; while (k < n) { __reel.step(); k++; } }, n);
if (stills) {
  const names = [];
  for (const s of stills) {
    const n = Math.round(s * fps); await stepTo(n - f); f = n;
    const name = path.join(out, `still_${String(s).replace('.', '_')}.jpg`);
    await page.screenshot({ path: name, type: 'jpeg', quality: 88 }); names.push(name);
  }
  // one contact sheet, each still at 270 x 480, 7 to a row (sharp from the House Walkthrough install; this ffmpeg's
  // xstack has no fill option, so an uneven last row failed)
  const sharp = createRequire(path.join(HERE, '..', '..', 'House Walkthrough', 'package.json'))('sharp');
  const cols = Math.min(names.length, 7), rows = Math.ceil(names.length / cols);
  const tiles = await Promise.all(names.map(n => sharp(n).resize(270, 480).toBuffer()));
  await sharp({ create: { width: 270 * cols, height: 480 * rows, channels: 3, background: '#111' } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * 270, top: Math.floor(i / cols) * 480 }))).jpeg({ quality: 85 }).toFile(path.join(out, 'contact.jpg'));
  console.log('stills ->', out, 'contact.jpg');
} else {
  const dir = path.join(out, 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  for (let i = 0; i < frames; i++) {
    await stepTo(1);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
    if (i % 60 === 0) console.log(`frame ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const wav = path.join(out, 'sound.wav');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => __reel.audio()), 'base64'));
  execFileSync(FF, ['-y', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-af', `loudnorm=I=${LUFS}:TP=-1.5:LRA=11`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(out, FINAL)], { stdio: 'ignore' });
  console.log('video ->', path.join(out, FINAL));
}
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
