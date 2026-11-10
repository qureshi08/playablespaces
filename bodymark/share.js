// Share studio, the Strava idea for Bodymark: swipe between styles, every one built from your real set.
//   photo   = your deepest full rep, with the skeleton the coach saw and the stats on top (Strava's photo + stats)
//   trace   = every rep drawn as one line, full reps dotted, half reps marked (our version of the route map)
//   sticker = a see-through PNG of the trace and stats, copied to paste on your own Instagram story
import { C, BONES, mascot } from './engine.js';

const W = 1080, H = 1920, INK = '#12101F';

function font(g, w, px, fam = 'Archivo') { g.font = `${w} ${px}px '${fam}', sans-serif`; if ('fontStretch' in g) g.fontStretch = fam === 'Archivo' ? 'condensed' : 'normal'; }
function T(g, s, x, y, px, col, o = {}) {
  font(g, o.w || 900, px, o.fam || 'Archivo'); g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  g.save(); if (o.shadow) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = o.shadow; g.shadowOffsetY = o.shadow / 5; }
  g.fillStyle = col; g.fillText(s, x, y); g.restore(); return g.measureText(s).width;
}
const tw = (g, s, px, w = 900, fam = 'Archivo') => { font(g, w, px, fam); return g.measureText(s).width; };

// the wordmark: body + the little yellow figure + mark, same drawing as the home page. h = letter height in px
function logo(g, x, y, h, col = '#fff', align = 'left', shadow = 0) {
  const k = h / 70; font(g, 900, 96); const wb = g.measureText('body').width, wm = g.measureText('mark').width, gap = 70, full = (wb + gap + wm) * k;
  const x0 = align === 'center' ? x - full / 2 : align === 'right' ? x - full : x;
  g.save(); if (shadow) { g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = shadow; }
  g.translate(x0, y); g.scale(k, k); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = col;
  g.fillText('body', 0, 0); g.fillText('mark', wb + gap, 0);
  mascot(g, { x: wb + gap / 2, y: -48, s: 0.6, lw: 17, col: C.yellow, la: -2.15, ra: 2.15, ll: -0.22, rl: 0.22 });
  g.restore(); return full;
}

const rankPill = p => p >= 50 ? 'top ' + Math.max(1, 100 - p) + '%' : 'better than ' + p + '%';
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const when = d => {
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '').toLowerCase();
  let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
  return `${day} · ${h}:${m} ${ap}`;
};
function pill(g, s, x, y, px, bg, col, align = 'left') {
  const w = tw(g, s, px) + px * 0.9, h = px * 1.32, x0 = align === 'center' ? x - w / 2 : x;
  g.beginPath(); g.roundRect(x0, y, w, h, h / 2); g.fillStyle = bg; g.fill();
  T(g, s, x0 + w / 2, y + h / 2 + px * 0.04, px, col, { align: 'center', base: 'middle' }); return w;
}

// the rep trace: depth over time, smoothed into buckets; full reps get a dot at the bottom of the dip, half reps a ring
function trace(g, D, x, y, w, h, o = {}) {
  const tr = D.trace; if (!tr || tr.length < 3) return;
  // only the part with reps in it: a second before the first rep to a second after the last one
  const reps = D.reps || [], tA = Math.max(tr[0].t, (reps.length ? reps[0].t : tr[0].t) - 1), tB = Math.min(tr[tr.length - 1].t, (reps.length ? reps[reps.length - 1].t : tr[tr.length - 1].t) + 1);
  // resample at even time steps (the camera frame rate is never even), then smooth, so the line flows like a route
  const N = 240, raw = []; let j = 0;
  for (let i = 0; i < N; i++) {
    const t = tA + (tB - tA) * i / (N - 1); while (j < tr.length - 2 && tr[j + 1].t < t) j++;
    const p = tr[j], q = tr[j + 1], k = q.t > p.t ? Math.min(1, Math.max(0, (t - p.t) / (q.t - p.t))) : 0; raw.push(p.d + (q.d - p.d) * k);
  }
  const sm = raw.map((_, i) => { let s = 0, c = 0; for (let k = -3; k <= 3; k++) { const v = raw[i + k]; if (v != null) { s += v; c++; } } return s / c; });
  const X = t => x + (t - tA) / Math.max(0.001, tB - tA) * w, Y = d => y + Math.min(1, Math.max(0, d)) * h;
  const at = t => sm[Math.round(Math.min(1, Math.max(0, (t - tA) / Math.max(0.001, tB - tA))) * (N - 1))];
  const pts = sm.map((d, i) => [x + w * i / (N - 1), Y(d)]);
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.line75) { g.setLineDash([18, 16]); g.strokeStyle = o.line75; g.lineWidth = 4; g.beginPath(); g.moveTo(x, Y(0.75)); g.lineTo(x + w, Y(0.75)); g.stroke(); g.setLineDash([]); }
  if (o.glow) { g.shadowColor = o.col; g.shadowBlur = o.glow; }
  if (o.shadow) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = o.shadow; }
  g.strokeStyle = o.col; g.lineWidth = o.lw; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); g.stroke(); g.restore();
  if (!o.marks) return;
  for (const r of D.reps) {
    if (r.t < tA || r.t > tB) continue; const px = X(r.t), py = Y(at(r.t)), R = o.lw * 1.35;
    g.beginPath(); g.arc(px, py, R, 0, 7);
    if (r.ok) { g.fillStyle = o.col; g.fill(); g.lineWidth = o.lw * 0.5; g.strokeStyle = o.ring || INK; g.stroke(); }
    else { g.fillStyle = o.ring || INK; g.fill(); g.lineWidth = o.lw * 0.55; g.strokeStyle = C.coral; g.stroke(); }
  }
}

// cover-fit the rep photo, centred on the person, so a landscape camera still keeps you in frame
function photoFit(D) {
  const iw = D.photo.width, ih = D.photo.height, s = Math.max(W / iw, H / ih);
  const vis = (D.pts || []).filter((p, i) => i >= 11 && p.v > 0.4), cx = vis.length ? vis.reduce((a, p) => a + p.x, 0) / vis.length : iw / 2;
  const ox = Math.min(0, Math.max(W - iw * s, W / 2 - cx * s)), oy = (H - ih * s) / 2;
  return { s, ox, oy, iw, ih };
}
function skeleton(g, D, f) {
  const P = D.pts; if (!P) return; const at = p => [f.ox + p.x * f.s, f.oy + p.y * f.s], ok = i => P[i] && P[i].v > 0.4;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  for (const [lw, col] of [[26, 'rgba(18,16,31,.45)'], [12, C.yellow]]) {
    g.lineWidth = lw; g.strokeStyle = col;
    for (const [a, b] of BONES) if (ok(a) && ok(b)) { const p = at(P[a]), q = at(P[b]); g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke(); }
  }
  for (let i = 11; i < 33; i++) if (ok(i) && i < 29) { const [x, y] = at(P[i]); g.beginPath(); g.arc(x, y, 11, 0, 7); g.fillStyle = C.violet; g.fill(); g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke(); }
  g.restore();
}
function cardPhoto(g, D) {
  if (D.photo) { const f = photoFit(D); g.drawImage(D.photo, f.ox, f.oy, f.iw * f.s, f.ih * f.s); skeleton(g, D, f); }
  else { g.fillStyle = C.violet; g.fillRect(0, 0, W, H); }
  let gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, 'rgba(18,16,31,.7)'); gr.addColorStop(1, 'rgba(18,16,31,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 420);
  gr = g.createLinearGradient(0, H * 0.48, 0, H); gr.addColorStop(0, 'rgba(18,16,31,0)'); gr.addColorStop(0.45, 'rgba(18,16,31,.78)'); gr.addColorStop(1, 'rgba(18,16,31,.96)'); g.fillStyle = gr; g.fillRect(0, H * 0.48, W, H * 0.52);
  logo(g, 72, 170, 62); T(g, when(D.date), W - 72, 166, 36, 'rgba(255,255,255,.85)', { w: 800, fam: 'Nunito', align: 'right' });
  T(g, 'real push ups', 72, 1235, 50, '#fff', { w: 900, fam: 'Nunito' });
  let ns = 430; while (tw(g, String(D.n), ns) > W - 144 && ns > 200) ns -= 10;
  T(g, String(D.n), 60, 1235 + ns * 0.86, ns, '#fff');
  const py = 1235 + ns * 0.86 + 50, pw = pill(g, rankPill(D.rank.p), 72, py, 64, C.yellow, INK);
  T(g, 'of ' + D.rank.who, 72 + pw + 26, py + 54, 38, '#fff', { w: 800, fam: 'Nunito' });
  trace(g, D, 72, 1800, W - 144, 46, { col: 'rgba(255,255,255,.9)', lw: 6 });
}

function cardTrace(g, D) {
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.75, H * 0.28, 40, W * 0.75, H * 0.28, 900); rg.addColorStop(0, 'rgba(91,46,255,.55)'); rg.addColorStop(1, 'rgba(91,46,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  logo(g, 72, 170, 62); T(g, when(D.date), W - 72, 166, 36, 'rgba(255,255,255,.75)', { w: 800, fam: 'Nunito', align: 'right' });
  T(g, 'every rep, traced', 72, 430, 38, 'rgba(255,255,255,.6)', { w: 800, fam: 'Nunito' });
  trace(g, D, 72, 490, W - 144, 430, { col: C.yellow, lw: 14, glow: 34, marks: true, line75: 'rgba(255,90,54,.7)' });
  T(g, '- - - full depth', 72, 490 + 430 + 56, 30, 'rgba(255,90,54,.95)', { w: 800, fam: 'Nunito' });
  T(g, '● full rep   ○ half rep', W - 72, 490 + 430 + 56, 30, 'rgba(255,255,255,.6)', { w: 800, fam: 'Nunito', align: 'right' });
  let ns = 360; while (tw(g, String(D.n), ns) > 520 && ns > 200) ns -= 10;
  const nw = T(g, String(D.n), 60, 1060 + ns * 0.86, ns, '#fff');
  const cx = 60 + nw + 40; T(g, 'real', cx, 1170, 64, '#fff', { w: 900, fam: 'Nunito' }); T(g, 'push ups', cx, 1240, 64, '#fff', { w: 900, fam: 'Nunito' });
  pill(g, rankPill(D.rank.p), cx, 1280, 56, C.yellow, INK);
  // Strava style stat row
  const y = 1520, cols = [['half reps', String(D.no)], ['time', mmss(D.t1 - D.t0)], D.rank.p >= 50 ? ['top', Math.max(1, 100 - D.rank.p) + '%'] : ['better than', D.rank.p + '%']];
  g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(72, y - 70, W - 144, 3);
  cols.forEach(([k, v], i) => { const x = 72 + i * (W - 144) / 3; T(g, k, x, y, 34, 'rgba(255,255,255,.6)', { w: 800, fam: 'Nunito' }); T(g, v, x, y + 120, 112, '#fff'); });
  T(g, 'ranked against ' + D.rank.who, 72, 1790, 32, 'rgba(255,255,255,.55)', { w: 700, fam: 'Nunito' });
  T(g, 'only full reps count', 72, 1840, 32, 'rgba(255,255,255,.55)', { w: 700, fam: 'Nunito' });
}

function cardSticker(g, D) {
  // transparent: nothing is painted behind it, every mark carries its own shadow so it reads on any photo
  trace(g, D, 190, 700, W - 380, 200, { col: '#fff', lw: 11, marks: true, ring: 'rgba(18,16,31,.9)', shadow: 22 });
  let ns = 330; while (tw(g, String(D.n), ns) > W - 200 && ns > 180) ns -= 10;
  T(g, String(D.n), W / 2, 1020 + ns * 0.86, ns, '#fff', { align: 'center', shadow: 40 });
  T(g, 'real push ups', W / 2, 1420, 62, '#fff', { w: 900, fam: 'Nunito', align: 'center', shadow: 26 });
  T(g, rankPill(D.rank.p) + ' of ' + D.rank.who, W / 2, 1500, 42, C.yellow, { w: 900, fam: 'Nunito', align: 'center', shadow: 22 });
  logo(g, W / 2, 1640, 52, '#fff', 'center', 22);
}

const STYLES = [
  { id: 'photo', name: 'photo', draw: cardPhoto },
  { id: 'trace', name: 'trace', draw: cardTrace },
  { id: 'sticker', name: 'sticker · paste it on your story', draw: cardSticker, clear: true },
];

function render(st, D) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; st.draw(c.getContext('2d'), D);
  return new Promise(res => c.toBlob(b => res({ c, b }), 'image/png'));
}
function preview(D, out) {
  // the sticker is shown on your blurred photo so you can see it is see-through
  const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2; const g = c.getContext('2d');
  if (D.photo) { if ('filter' in g) { g.filter = 'blur(18px)'; g.drawImage(D.photo, -40, -40, c.width + 80, c.height + 80); g.filter = 'none'; } else { const sm = document.createElement('canvas'); sm.width = 54; sm.height = 96; sm.getContext('2d').drawImage(D.photo, 0, 0, 54, 96); g.drawImage(sm, 0, 0, c.width, c.height); } g.fillStyle = 'rgba(18,16,31,.35)'; g.fillRect(0, 0, c.width, c.height); }
  else { const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, '#7a8a6a'); gr.addColorStop(1, '#3a4a5a'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(out, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.85);
}

const CSS = `
#studio{position:fixed;inset:0;z-index:9;background:#12101F;color:#fff;display:flex;flex-direction:column;padding:calc(8px + env(safe-area-inset-top)) 0 calc(14px + env(safe-area-inset-bottom));font-family:'Nunito',sans-serif}
#studio .hd{display:flex;align-items:center;justify-content:space-between;padding:0 16px;height:48px;flex:none}
#studio .hd b{font-family:'Archivo',sans-serif;font-weight:900;font-stretch:80%;font-size:26px}
#studio .x{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;padding:0;box-shadow:none;font-size:18px}
#studio .strip{--cw:min(70vw,calc((100svh - 250px) * 9 / 16));flex:1;min-height:0;display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px calc(50vw - var(--cw) / 2);align-items:center;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#studio .strip::-webkit-scrollbar{display:none}
#studio .card{flex:none;width:var(--cw);aspect-ratio:9/16;border-radius:20px;overflow:hidden;scroll-snap-align:center;box-shadow:0 18px 50px rgba(0,0,0,.55);background:#22203a;transition:transform .25s,opacity .25s}
#studio .card:not(.on){transform:scale(.92);opacity:.55}
#studio .card img{width:100%;height:100%;display:block;object-fit:cover}
#studio .nm{text-align:center;font-weight:900;font-size:15px;margin:10px 0 6px;flex:none}
#studio .dots{display:flex;gap:6px;justify-content:center;margin-bottom:12px;flex:none}
#studio .dots i{width:7px;height:7px;border-radius:4px;background:rgba(255,255,255,.3);transition:width .2s}
#studio .dots i.on{background:#FFD23F;width:22px}
#studio .act{display:flex;gap:10px;padding:0 16px;flex:none}
#studio .act button{flex:1;padding:15px 10px;font-size:17px;box-shadow:none}
#studio .act .p{background:#FFD23F;color:#12101F}
#studio .act .s{background:rgba(255,255,255,.12);color:#fff}`;

export async function openStudio(D) {
  if (!document.getElementById('studioCss')) { const s = document.createElement('style'); s.id = 'studioCss'; s.textContent = CSS; document.head.appendChild(s); }
  await Promise.all(["900 40px Archivo", "900 40px Nunito", "800 40px Nunito"].map(f => document.fonts.load(f).catch(() => {})));
  const el = document.createElement('div'); el.id = 'studio';
  el.innerHTML = `<div class="hd"><button class="x" aria-label="close">✕</button><b>share</b><span style="width:42px"></span></div>
    <div class="strip">${STYLES.map(s => `<div class="card" data-id="${s.id}"><img alt="${s.name}"></div>`).join('')}</div>
    <div class="nm"></div><div class="dots">${STYLES.map(() => '<i></i>').join('')}</div>
    <div class="act"><button class="p"></button><button class="s"></button></div>`;
  document.body.appendChild(el);
  const row = el.querySelector('.strip'), cards = [...el.querySelectorAll('.card')], dots = [...el.querySelectorAll('.dots i')], nm = el.querySelector('.nm'), bp = el.querySelector('.p'), bs = el.querySelector('.s');
  const toast = s => { const t = document.getElementById('toast'); if (!t) return; t.textContent = s; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600); };
  const out = [];
  let cur = 0;
  const pick = i => {
    cur = i; cards.forEach((c, k) => c.classList.toggle('on', k === i)); dots.forEach((d, k) => d.classList.toggle('on', k === i));
    const st = STYLES[i]; nm.textContent = st.name;
    bp.textContent = st.clear ? 'copy sticker' : 'share'; bs.textContent = st.clear ? 'share' : 'copy beat me link';
  };
  pick(0);
  row.addEventListener('scroll', () => { const mid = row.scrollLeft + row.clientWidth / 2; let best = 0, bd = 1e9; cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } }); if (best !== cur) pick(best); }, { passive: true });
  cards.forEach((c, k) => c.onclick = () => c.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }));
  el.querySelector('.x').onclick = () => el.remove();

  // draw one at a time so the first card shows at once
  for (let i = 0; i < STYLES.length; i++) {
    const r = await render(STYLES[i], D); out[i] = r;
    cards[i].querySelector('img').src = STYLES[i].clear ? preview(D, r.c) : URL.createObjectURL(r.b);
  }

  const file = i => new File([out[i].b], `bodymark-pushups-${D.n}-${STYLES[i].id}.png`, { type: 'image/png' });
  const msg = `${D.n} real push ups, ${rankPill(D.rank.p)} of ${D.rank.who}. beat me: ${D.link}`;
  async function share(i) {
    if (!out[i]) return; const f = file(i);
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: msg }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(out[i].b); a.download = f.name; a.click(); toast('image saved');
  }
  async function copySticker() {
    try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': out[cur].b })]); toast('sticker copied. open your instagram story and paste it.'); }
    catch (e) { share(cur); }
  }
  async function copyLink() { try { await navigator.clipboard.writeText(msg); toast('beat me link copied'); } catch (e) { toast(D.link); } }
  bp.onclick = () => STYLES[cur].clear ? copySticker() : share(cur);
  bs.onclick = () => STYLES[cur].clear ? share(cur) : copyLink();
}

// test hook: ?studio=1 on app.html opens the studio with a made up set, to check the design without doing push ups
export function demoData() {
  const trace = [], reps = []; let t = 0;
  for (let r = 0; r < 18; r++) { const deep = r % 7 !== 4, dd = deep ? 0.85 + Math.random() * 0.15 : 0.5; for (let k = 0; k <= 24; k++) { const d = Math.sin(k / 24 * Math.PI) * dd; trace.push({ t, d }); t += 0.066; } reps.push({ t: t - 0.8, d: dd, ok: deep }); for (let k = 0; k < 4; k++) { trace.push({ t, d: 0.02 }); t += 0.066; } }
  return { n: reps.filter(r => r.ok).length, no: reps.filter(r => !r.ok).length, rank: { p: 72, who: 'men aged 20 to 29' }, trace, reps, t0: 0, t1: t, date: new Date(), photo: null, pts: null, link: location.origin + '/bodymark/app.html?a=pushups&beat=16' };
}
