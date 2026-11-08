// Bodymark engine: camera, body / face / ball tracking, voice, hook card, screen recording, results history.
// Every app in apps.js and apps2.js is a small object; this file does the shared work.
import { FilesetResolver, PoseLandmarker, FaceLandmarker, ObjectDetector } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MP = 'https://storage.googleapis.com/mediapipe-models/';
const MODELS = {
  lite: MP + 'pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: MP + 'pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  face: MP + 'face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  ball: MP + 'object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
};
export const BRAND = 'bodymark';
const NO_UNIT_SPACE = ['%'];
export function fmtVal(v, unit = '') {
  if (unit === 's') return v.toFixed(2) + ' s';
  if (unit === '%' ) return Math.round(v) + '%';
  if (unit === 'W') return Math.round(v).toLocaleString('en-US') + ' W';
  if (['reps', 'touches', 'jumps', 'walls', 'dodged', 'level', 'jacks'].includes(unit)) return Math.round(v) + ' ' + unit;
  if (unit === 'deg') return Math.round(v) + '°';
  return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + (NO_UNIT_SPACE.includes(unit) ? '' : ' ') + unit;
}
// Bodymark palette (brand board 2026-11-09). Old names kept so every app picks up the new colours:
// ind = violet (brand), mad = coral (beat me, ghost, hard mode), saf = yellow (rank only), wi = light violet, paper = white text on dark
export const C = { paper: '#FFFFFF', card: '#FFFFFF', ind: '#5B2EFF', ink: '#12101F', mad: '#FF5A36', wi: '#B9A6FF', saf: '#FFD23F', wm: '#FF8A6B', violet: '#5B2EFF', yellow: '#FFD23F', coral: '#FF5A36' };
const fontFor = (size, weight) => size >= 8 ? `900 ${size}px 'Archivo', sans-serif` : `${Math.max(700, weight)} ${size}px 'Nunito', sans-serif`;
function setFont(g, px, size, weight) { g.font = fontFor(px, weight).replace(String(px) + 'px', px + 'px'); if ('fontStretch' in g) g.fontStretch = size >= 8 ? 'condensed' : 'normal'; }
export const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[27,29],[28,30]];

/* ---------- small maths helpers apps use ---------- */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
export const angle = (a, b, c) => { // angle at b, degrees
  const v1 = Math.atan2(a.y - b.y, a.x - b.x), v2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(v1 - v2) * 180 / Math.PI; return d > 180 ? 360 - d : d;
};
export const seen = (P, ids, th = 0.45) => !!P && ids.every(i => P[i] && P[i].v > th);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// pick the body side the camera sees best: returns [shoulder, elbow, wrist, hip, knee, ankle, heel, toe] indices
export const side = P => { const l = [11,13,15,23,25,27].reduce((s, i) => s + (P ? P[i].v : 0), 0), r = [12,14,16,24,26,28].reduce((s, i) => s + (P ? P[i].v : 0), 0); return l >= r ? [11,13,15,23,25,27,29,31] : [12,14,16,24,26,28,30,32]; };

/* ---------- storage, profile, history, voice, beep ---------- */
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
export const ME = Object.assign({ height: 175, weight: 75 }, store.get('moves:me', {}));
export function logResult(app, value, unit, better = 'high') {
  const h = store.get('moves:history', []); h.push({ a: app, v: Math.round(value * 1000) / 1000, u: unit, b: better, t: Date.now() }); store.set('moves:history', h.slice(-3000));
}
let actx = null;
export function audio() { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; }
export function beep(f = 880, d = 0.15, vol = 0.35, type = 'square') {
  try { const a = audio(), o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + d); } catch (e) {}
}
export function say(text, rate = 1.05) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function unlockAudio() {
  try { const a = audio(); a.resume(); beep(440, 0.01, 0); } catch (e) {}
  try { speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) {}
}

/* ---------- drawing helpers (all sizes in units of U = short side / 100) ---------- */
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
export function panel(g, E, x, y, w, h, fill = C.card) {
  g.save(); g.shadowColor = 'rgba(18,16,31,.25)'; g.shadowBlur = E.U * 3; g.shadowOffsetY = E.U * 0.8;
  g.globalAlpha = 0.96; g.fillStyle = fill; rrect(g, x, y, w, h, E.U * 3.4); g.fill(); g.restore();
}
// numbers and headlines (size 8 and up) in condensed Archivo Black, everything else in rounded Nunito
export function text(g, E, s, x, y, size, col = C.ink, weight = 800, align = 'center') {
  setFont(g, size * E.U, size, weight); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
export function measure(g, E, s, size, weight = 800) { setFont(g, size * E.U, size, weight); return g.measureText(s).width; }
export function scribble(g, E, s, x, y, size, col = C.coral, rot = -0.06) { g.save(); g.translate(x, y); g.rotate(rot); if ('fontStretch' in g) g.fontStretch = 'normal'; g.font = `800 ${size * E.U}px 'Shantell Sans', cursive`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore(); }
// a card that fits its text: lines = [[text, size, colour, weight], ...]
export function card(g, E, lines, x, y, align = 'center', fill) {
  const pad = E.U * 3; let w = 0, h = pad;
  lines.forEach(([s, size, , wt]) => { w = Math.max(w, measure(g, E, s, size, wt || 800)); h += size * E.U * 1.25; });
  w += pad * 2; h += pad * 0.6;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  panel(g, E, left, y, w, h, fill);
  let cy = y + pad;
  lines.forEach(([s, size, col, wt]) => { cy += size * E.U * 0.62; text(g, E, s, left + w / 2, cy, size, col || C.ink, wt || 800); cy += size * E.U * 0.63; });
  return { x: left, y, w, h };
}
export function dashed(g, E, x1, y1, x2, y2, col = C.mad, w = 0.6) {
  g.save(); g.setLineDash([E.U * 2, E.U * 1.6]); g.strokeStyle = col; g.lineWidth = E.U * w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
export function wrap(g, E, s, size, maxW) {
  const words = s.split(' '), out = []; let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (measure(g, E, t, size) > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line); return out;
}
// big score card used by most apps: label, value, optional small line
export function scoreCard(g, E, label, value, sub, x = E.U * 5, y = E.H * 0.6, col = C.violet, align = 'left') {
  const lines = [[label.toUpperCase(), 3.4, '#6b6880', 900], [value, 14, col === C.mad ? C.violet : col]]; if (sub) lines.push([sub, 3.6, C.ink, 700]);
  return card(g, E, lines, x, y, align);
}
export function bigNote(g, E, s, col = C.ind, y = E.H * 0.24) { const lines = wrap(g, E, s, 5.4, E.W * 0.86); return card(g, E, lines.map(l => [l, 5.4, col]), E.W / 2, y); }
export function meter(g, E, frac, mark, x, y, h, label) { // vertical meter with a target line
  const w = E.U * 5; panel(g, E, x, y, w, h, '#fff');
  g.fillStyle = frac >= mark ? C.ind : C.saf; g.fillRect(x + E.U, y + h - (h - E.U * 2) * clamp(frac, 0, 1) - E.U, w - E.U * 2, (h - E.U * 2) * clamp(frac, 0, 1));
  const my = y + h - (h - E.U * 2) * mark - E.U; g.strokeStyle = C.mad; g.lineWidth = E.U * 0.6; g.beginPath(); g.moveTo(x - E.U, my); g.lineTo(x + w + E.U, my); g.stroke();
  if (label) text(g, E, label, x + w / 2, y + h + E.U * 3, 3, C.paper, 700);
}

/* ---------- mascot: stick figure from the tracked body points, with a light line boil ---------- */
export function mascot(g, o) {
  const s = o.s || 1, x = o.x, y = o.y, T = 60 * s, U = 34 * s, G = 40 * s, R = 19 * s, b = o.b || 0, bf = Math.floor(performance.now() / 80) % 3;
  const jit = (a, c) => { const v = Math.sin(a * 0.37 + c * 1.91 + bf * 13.1) * 43758.5453; return (v - Math.floor(v) - 0.5) * 2.4 * s; };
  const L = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2 + jit(x1, y2), (y1 + y2) / 2 + jit(y1, x2), x2, y2); g.stroke(); };
  const Dv = a => [Math.sin(a), Math.cos(a)];
  g.save(); g.strokeStyle = o.col || C.ink; g.lineWidth = (o.lw || 13) * s; g.lineCap = 'round'; g.lineJoin = 'round';
  const nk = [x + Math.sin(b) * T, y - Math.cos(b) * T], hd = [nk[0] + Math.sin(b) * R * 1.6, nk[1] - Math.cos(b) * R * 1.6];
  const lim = (p, a1, a2, l) => { const d1 = Dv(a1), e = [p[0] + d1[0] * l, p[1] + d1[1] * l], d2 = Dv(a2); L(p[0], p[1], e[0], e[1]); L(e[0], e[1], e[0] + d2[0] * l, e[1] + d2[1] * l); };
  L(x, y, nk[0], nk[1]);
  lim(nk, o.la ?? -0.4, o.la2 ?? o.la ?? -0.4, U); lim(nk, o.ra ?? 0.4, o.ra2 ?? o.ra ?? 0.4, U); lim([x, y], o.ll ?? -0.2, o.ll2 ?? o.ll ?? -0.2, G); lim([x, y], o.rl ?? 0.2, o.rl2 ?? o.rl ?? 0.2, G);
  g.beginPath(); g.arc(hd[0], hd[1], R, 0, 7); g.fillStyle = o.col || C.ink; g.fill(); g.restore();
}
// fun identity label from a percentile, per test (bad results get a friendly label too, so they are shareable)
const LABELS = {
  vjump: ['Glued to the floor', 'Hopper', 'Springy', 'Kangaroo legs', 'Rocket legs'],
  balance: ['Wobbly', 'Steady-ish', 'Steady', 'Rock solid', 'Statue mode'],
  reaction: ['Sleepy thumbs', 'Normal human', 'Quick', 'Lightning hands', 'Ninja reflexes'],
  plank: ['Jelly core', 'Holding on', 'Solid', 'Iron core', 'Plank lord'],
  bodyage: ['Time to move more', 'About your age', 'Younger than you look', 'Way younger', 'Ageless'],
  _: ['Just started', 'Getting there', 'Solid', 'Strong', 'Elite'],
};
export const labelFor = (id, p) => (LABELS[id] || LABELS._)[p >= 90 ? 4 : p >= 70 ? 3 : p >= 45 ? 2 : p >= 20 ? 1 : 0];

/* ---------- the engine ---------- */
export async function run(app) {
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const cv = $('#cv'), g = cv.getContext('2d'), video = $('#vid');
  const key = 'moves:' + app.id;
  const S = Object.assign({}, ...(app.settings || []).map(s => ({ [s.k]: s.def })), store.get(key, {}));
  (app.settings || []).forEach(s => { if (s.global) S[s.k] = ME[s.k] ?? s.def; });
  const save = () => { store.set(key, S); (app.settings || []).forEach(s => { if (s.global) ME[s.k] = S[s.k]; }); store.set('moves:me', ME); };
  const E = {
    app, S, save, U: 4, W: 720, H: 1280, P: null, Sm: null, Ps: [], F: null, B: {}, ball: null, t: 0, ppm: null,
    facing: S.facing || app.cam || 'environment', hookUntil: 0, msg: '', gateMode: 0, recording: false, say, beep, ME,
    now: () => performance.now() / 1000,
    log: (v, unit, better = 'high', rank, extra) => {
      logResult(app.id, v, unit, better);
      // keep the result and a snapshot of this moment for the share card
      E.result = { v, unit, better, rank, extra };
      // snapshot a moment later, so the photo shows the score on screen
      setTimeout(() => { try { const s = document.createElement('canvas'), k = 540 / Math.max(cv.width, cv.height); s.width = Math.round(cv.width * k); s.height = Math.round(cv.height * k); s.getContext('2d').drawImage(cv, 0, 0, s.width, s.height); E.snap = s; } catch (e) {} }, 180);
      shareBtn.style.display = '';
      if (E.beat != null) { const won = better === 'low' ? v < E.beat : v > E.beat; if (won && !E.beatWon) { E.beatWon = true; setTimeout(() => say('You beat the challenge!'), 1200); } }
    },
    toast(s, ms = 1800) { const el = $('#toast'); el.textContent = s; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms); },
    m(px) { return E.ppm ? px / E.ppm : null; }, // pixels to metres, once the app has seen you standing
  };
  E.video = video;
  app.reset && app.reset(E);

  /* intro screen */
  $('#title').textContent = app.title;
  $('#hook').textContent = '“' + app.hook + '”';
  $('#steps').innerHTML = app.setup.map(s => `<li>${s}</li>`).join('');
  const form = $('#settings');
  (app.settings || []).forEach(s => {
    const lab = document.createElement('label');
    lab.innerHTML = s.type === 'select'
      ? `<span>${s.label}</span><select data-k="${s.k}">${s.options.map(o => `<option value="${o}" ${String(S[s.k]) === String(o) ? 'selected' : ''}>${o}</option>`).join('')}</select>`
      : `<span>${s.label}</span><input data-k="${s.k}" type="number" inputmode="decimal" value="${S[s.k]}">`;
    form.appendChild(lab);
  });
  form.addEventListener('change', e => { const k = e.target.dataset.k; if (k) { const v = e.target.value; S[k] = isNaN(+v) ? v : +v; save(); app.reset && app.reset(E); } });
  document.title = app.title + ' · Bodymark';
  if (app.noCamera) { $('#startState').textContent = 'No camera needed. Turn the sound on.'; }

  /* bottom bar buttons */
  const bar = $('#bar');
  const addBtn = (label, fn, cls = '') => { const b = document.createElement('button'); b.textContent = label; b.className = cls; b.onclick = fn; bar.appendChild(b); return b; };
  addBtn('←', () => { location.href = './'; }, 'icon');
  if (!app.noCamera) addBtn('Flip', async () => {
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    if (cams.length > 1 && !/iPhone|iPad|Android/i.test(navigator.userAgent)) { const i = cams.findIndex(c => c.deviceId === E.camId); S.cam = cams[(i + 1) % cams.length].deviceId; }
    else { E.facing = E.facing === 'user' ? 'environment' : 'user'; S.facing = E.facing; S.cam = null; }
    save(); try { await openCamera(); } catch (e) { E.toast(cameraError(e), 5000); }
  }, 'icon');
  if (app.gates) addBtn('Set lines', () => { E.gateMode = 'lines'; S.gates = []; E.toast('Tap on the ' + app.gateNames[0]); }, '');
  if (app.points) addBtn('Set spot', () => { E.gateMode = 'pts'; S.pts = []; E.toast('Tap on the ' + app.pointNames[0]); }, '');
  (app.buttons || (app.action ? [app.action] : [])).forEach(b => addBtn(b.label, () => b.fn.call(app, E), 'go'));
  addBtn('Reset', () => { app.reset && app.reset(E); E.toast('Reset'); }, '');
  const recBtn = addBtn('● Rec', () => toggleRec(), 'rec');
  const shareBtn = addBtn('Share score', () => shareCard(), 'go'); shareBtn.style.display = 'none';

  /* challenge links: ?a=<app>&beat=<score>&u=<unit> */
  if (params.get('beat') != null && !isNaN(+params.get('beat'))) {
    E.beat = +params.get('beat'); E.beatUnit = params.get('u') || '';
    const ch = document.createElement('p'); ch.className = 'challenge'; ch.textContent = 'Challenge: beat ' + fmtVal(E.beat, E.beatUnit); $('#hook').after(ch);
  }

  /* share card: a 9:16 image for Stories with the score, a photo of the moment and a challenge link */
  async function shareCard() {
    const r = E.result; if (!r) return;
    const link = location.origin + location.pathname + '?a=' + app.id + '&beat=' + (Math.round(r.v * 100) / 100) + '&u=' + encodeURIComponent(r.unit || '');
    const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), F = { U: 10.8, W, H };
    const bg = app.group === 'hard' ? C.coral : app.group === 'play' ? C.ink : C.violet, acc = C.yellow;
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.12; x.beginPath(); x.arc(W * 0.9, H * 0.2, 420, 0, 7); x.fillStyle = '#fff'; x.fill(); x.globalAlpha = 1;
    text(x, F, BRAND, W / 2, 330, 4.4, '#fff', 900); text(x, F, app.title.toUpperCase(), W / 2, 450, 4.8, '#fff', 900);
    // number and unit as one centred group
    const val = fmtVal(r.v, r.unit), sp = val.lastIndexOf(' '), num = sp > 0 ? val.slice(0, sp) : val, unit = sp > 0 ? val.slice(sp + 1) : '';
    let ns = 37; while (measure(x, F, num, ns) > W * 0.78 && ns > 18) ns -= 1;
    const nw = measure(x, F, num, ns), uw = unit ? measure(x, F, unit, 7.4, 900) + 24 : 0, nx = W / 2 - (nw + uw) / 2;
    text(x, F, num, nx, 760, ns, '#fff', 900, 'left'); if (unit) text(x, F, unit, nx + nw + 24, 840, 7.4, '#fff', 900, 'left');
    let y = 1000; const m = r.rank && /Better than (\d+)% of (.*)/.exec(r.rank);
    if (r.extra && r.extra.pill) {
      const pw = measure(x, F, r.extra.pill, 5.6, 900) + 120;
      x.beginPath(); x.roundRect(W / 2 - pw / 2, y, pw, 120, 60); x.fillStyle = acc; x.fill(); text(x, F, r.extra.pill, W / 2, y + 62, 5.6, C.ink, 900);
      y += 200; if (r.extra.who) { text(x, F, r.extra.who, W / 2, y, 3.6, '#fff', 700); y += 90; }
      if (r.extra.label) { text(x, F, r.extra.label, W / 2, y, 6, '#fff', 900); y += 40; }
    } else if (m) {
      const p = +m[1], pill = 'TOP ' + Math.max(1, 100 - p) + '%', pw = measure(x, F, pill, 6, 900) + 120;
      x.beginPath(); x.roundRect(W / 2 - pw / 2, y, pw, 120, 60); x.fillStyle = acc; x.fill(); text(x, F, pill, W / 2, y + 62, 6, C.ink, 900);
      y += 180; x.beginPath(); x.roundRect(150, y, 780, 22, 11); x.fillStyle = 'rgba(255,255,255,.35)'; x.fill();
      const mx = 150 + 780 * p / 100; x.beginPath(); x.arc(mx, y + 11, 34, 0, 7); x.fillStyle = acc; x.fill(); x.lineWidth = 8; x.strokeStyle = bg; x.stroke();
      y += 100; wrap(x, F, 'of ' + m[2], 3.6, W * 0.8).slice(0, 2).forEach(l => { text(x, F, l, W / 2, y, 3.6, '#fff', 700); y += 48; });
      y += 50; text(x, F, labelFor(app.id, p), W / 2, y, 6, '#fff', 900); y += 40;
    } else if (r.rank) { wrap(x, F, r.rank, 4.4, W * 0.8).slice(0, 2).forEach(l => { text(x, F, l, W / 2, y + 40, 4.4, '#fff', 900); y += 60; }); y += 80; }
    else { wrap(x, F, '“' + app.hook + '”', 4.4, W * 0.8).slice(0, 2).forEach(l => { text(x, F, l, W / 2, y + 40, 4.4, '#fff', 800); y += 60; }); y += 80; }
    y = Math.max(y + 50, 1380);
    mascot(x, { x: W / 2 - 230, y: y + 40, s: 0.85, col: acc, la: -2.5, ra: 2.5, ll: -0.35, rl: 0.35 });
    scribble(x, F, 'beat me!', W / 2 + 60, y + 60, 7.8, acc);
    text(x, F, location.host + location.pathname.replace(/app\.html$/, ''), W / 2, y + 200, 3.6, '#fff', 800);
    const blob = await new Promise(res => c.toBlob(res, 'image/png'));
    const file = new File([blob], app.id + '-score.png', { type: 'image/png' });
    const msg = `${app.title}: ${fmtVal(r.v, r.unit)}. Beat me: ${link}`;
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: msg }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(msg); E.toast('Challenge link copied. The image is downloading.', 3000); } catch (e) {}
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  }

  /* taps: set lines or spots, otherwise the app gets the tap */
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), sc = Math.min(r.width / cv.width, r.height / cv.height);
    const ox = r.left + (r.width - cv.width * sc) / 2, oy = r.top + (r.height - cv.height * sc) / 2;
    const x = (e.clientX - ox) / sc, y = (e.clientY - oy) / sc;
    if (E.gateMode === 'lines') {
      S.gates.push(clamp(x / cv.width, 0, 1));
      if (S.gates.length >= app.gates) { E.gateMode = 0; save(); app.reset && app.reset(E); E.toast('Lines set'); } else E.toast('Now tap on the ' + app.gateNames[S.gates.length]);
      return;
    }
    if (E.gateMode === 'pts') {
      S.pts.push({ x: clamp(x / cv.width, 0, 1), y: clamp(y / cv.height, 0, 1) });
      if (S.pts.length >= app.points) { E.gateMode = 0; save(); app.reset && app.reset(E); E.toast('Spot set'); } else E.toast('Now tap on the ' + app.pointNames[S.pts.length]);
      return;
    }
    if (app.tap) app.tap(E, x, y);
  });

  /* camera or test video */
  async function openCamera() {
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    if (params.get('video')) { video.srcObject = null; video.src = params.get('video'); video.loop = true; E.facing = 'environment'; await playVideo(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('NOAPI');
    const tries = [
      { facingMode: E.facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
      { facingMode: E.facing },
      true,
    ];
    if (S.cam) tries.unshift({ deviceId: { exact: S.cam } });
    let st = null, err = null;
    const get = async v => { try { st = await navigator.mediaDevices.getUserMedia({ audio: false, video: v }); return true; } catch (e) { err = e; return false; } };
    for (const v of tries) { if (await get(v)) break; if (err.name === 'NotAllowedError' || err.name === 'SecurityError') break; }
    if (!st && err && err.name !== 'NotAllowedError' && err.name !== 'SecurityError') {
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      E.camNames = cams.map(c => c.label || 'camera');
      for (const c of cams) { if (await get({ deviceId: { exact: c.deviceId } })) { S.cam = c.deviceId; save(); break; } }
    }
    if (!st) throw err;
    E.camId = st.getVideoTracks()[0]?.getSettings?.().deviceId;
    const fm = st.getVideoTracks()[0]?.getSettings?.().facingMode;
    if (fm) E.facing = fm === 'environment' ? 'environment' : 'user';
    else if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) E.facing = 'user';
    video.srcObject = st; await playVideo();
  }
  // play() can be interrupted on some browsers; that is not a camera problem, so retry quietly
  async function playVideo() { for (let i = 0; i < 5; i++) { try { await video.play(); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } } }
  function cameraError(e) {
    const n = e && e.name, m = e && e.message;
    if (m === 'NOAPI') return 'This browser cannot open the camera here. Open the link in Chrome, Safari or Edge, using the https address.';
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera permission is blocked. Click the camera icon in the address bar (on iPhone: Settings, Safari, Camera) and allow it, then press Start again.';
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'Windows says every camera is busy' + (E.camNames && E.camNames.length ? ' (tried: ' + E.camNames.join(', ') + ')' : '') + '. Check three things, then press Start again: 1. Windows Settings, Privacy and security, Camera: turn on "Let desktop apps access your camera". 2. A camera shutter slider above the screen, or a camera key on the keyboard (often F8 or F10), is not switched off. 3. No other program (Zoom, Teams, OBS, the Camera app) has the camera open. Test: if the Windows Camera app also shows nothing, the block is in Windows, not this page.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No camera was found on this device.';
    return 'Could not start: ' + (m || e) + '. Reload the page and press Start again.';
  }
  async function loadModels() {
    const files = await FilesetResolver.forVisionTasks(V + '/wasm');
    const make = async (Cls, o) => { try { return await Cls.createFromOptions(files, { ...o, baseOptions: { ...o.baseOptions, delegate: 'GPU' } }); } catch (e) { return await Cls.createFromOptions(files, { ...o, baseOptions: { ...o.baseOptions, delegate: 'CPU' } }); } };
    const m = {};
    if (app.pose !== false) m.pose = await make(PoseLandmarker, { baseOptions: { modelAssetPath: MODELS[app.model || 'full'] }, runningMode: 'VIDEO', numPoses: app.people || 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    if (app.face) m.face = await make(FaceLandmarker, { baseOptions: { modelAssetPath: MODELS.face }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true });
    if (app.ball) m.ball = await make(ObjectDetector, { baseOptions: { modelAssetPath: MODELS.ball }, runningMode: 'VIDEO', scoreThreshold: 0.2, maxResults: 3, categoryAllowlist: ['sports ball'] });
    return m;
  }

  /* recording */
  let rec = null, chunks = [];
  function toggleRec() {
    if (rec) { rec.stop(); return; }
    try {
      const stream = cv.captureStream(30);
      const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const mt = types.find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
      rec = new MediaRecorder(stream, mt ? { mimeType: mt, videoBitsPerSecond: 8e6 } : {});
      chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { const type = rec.mimeType || mt || 'video/mp4'; offerSave(new Blob(chunks, { type }), type); rec = null; E.recording = false; recBtn.textContent = '● Rec'; recBtn.classList.remove('on'); };
      rec.start(500); E.recording = true; E.hookUntil = E.now() + 2.8; recBtn.textContent = '■ Stop'; recBtn.classList.add('on');
    } catch (e) { E.toast('Recording is not supported here. Use the phone screen recorder.', 3500); rec = null; }
  }
  function offerSave(blob, type) {
    const ext = type.includes('mp4') ? 'mp4' : 'webm', file = new File([blob], `${app.id}-${Date.now()}.${ext}`, { type });
    const sheet = $('#saveSheet'); sheet.classList.add('on');
    $('#saveBtn').onclick = async () => {
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); sheet.classList.remove('on'); return; } } catch (e) { if (e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); sheet.classList.remove('on');
    };
    $('#closeSave').onclick = () => sheet.classList.remove('on');
  }

  /* start button */
  $('#startBtn').onclick = async () => {
    unlockAudio();
    const st = $('#startState');
    try {
      let models = {};
      if (!app.noCamera) {
        st.textContent = 'Opening the camera...';
        try { await openCamera(); } catch (e) { st.textContent = cameraError(e); return; }
        st.textContent = 'Loading the tracker (first time takes a few seconds)...';
        models = await loadModels();
      }
      try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) {}
      $('#intro').classList.add('off');
      E.hookUntil = E.now() + 2.8;
      app.start && app.start(E);
      loop(models);
    } catch (e) { console.error(e); st.textContent = 'Could not load the tracker. Check the internet connection and press Start again.'; }
  };

  /* main loop */
  function loop(m) {
    let lastTs = 0;
    const step = (now) => {
      let W = video.videoWidth, H = video.videoHeight;
      if (app.noCamera) { W = 720; H = Math.round(720 * clamp(innerHeight / innerWidth, 1.2, 2.2)); }
      if (W && H) {
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        E.W = W; E.H = H; E.U = Math.min(W, H) / 100;
        const ts = Math.max(performance.now(), lastTs + 1); lastTs = ts;
        const tNow = (now || performance.now()) / 1000; if (E.t && tNow > E.t) { const f = 1 / (tNow - E.t); if (f < 240) E.fps = E.fps ? E.fps * 0.95 + f * 0.05 : f; } E.t = tNow;
        const mirror = E.facing === 'user' && !app.noCamera;
        const px = p => ({ x: (mirror ? 1 - p.x : p.x) * W, y: p.y * H, v: p.visibility ?? 1 });
        if (m.pose) {
          let res = null; try { res = m.pose.detectForVideo(video, ts); } catch (e) {}
          const people = (res && res.landmarks ? res.landmarks : []).map(l => l.map(px));
          people.sort((a, b) => (a[23].x + a[24].x) - (b[23].x + b[24].x)); E.Ps = people;
          const main = people.slice().sort((a, b) => Math.abs(b[0].y - b[27].y) - Math.abs(a[0].y - a[27].y))[0];
          if (main) { E.P = main; E.Sm = E.Sm ? E.Sm.map((q, i) => ({ x: q.x * 0.45 + main[i].x * 0.55, y: q.y * 0.45 + main[i].y * 0.55, v: main[i].v })) : main.map(p => ({ ...p })); }
          else { E.P = null; E.Sm = null; }
          scaleFrom(E.P);
        }
        if (m.face) {
          let r = null; try { r = m.face.detectForVideo(video, ts); } catch (e) {}
          E.F = r && r.faceLandmarks && r.faceLandmarks[0] ? r.faceLandmarks[0].map(p => ({ x: (mirror ? 1 - p.x : p.x) * W, y: p.y * H, v: 1 })) : null;
          E.B = {}; if (r && r.faceBlendshapes && r.faceBlendshapes[0]) r.faceBlendshapes[0].categories.forEach(c => { E.B[c.categoryName] = c.score; });
        }
        if (m.ball) {
          let r = null; try { r = m.ball.detectForVideo(video, ts); } catch (e) {}
          const d = r && r.detections && r.detections.sort((a, b) => b.categories[0].score - a.categories[0].score)[0];
          if (d) { const bb = d.boundingBox, cx = bb.originX + bb.width / 2; E.ball = { x: mirror ? W - cx : cx, y: bb.originY + bb.height / 2, r: Math.max(bb.width, bb.height) / 2, t: E.t }; }
          else if (E.ball && E.t - E.ball.t > 0.3) E.ball = null;
        }
        E.msg = '';
        try { app.frame && app.frame(E); } catch (e) { console.error(e); }
        drawFrame(mirror);
      }
      if (!app.noCamera && video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else requestAnimationFrame(step);
    };
    if (!app.noCamera && video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else requestAnimationFrame(step);
  }
  // metres from pixels: learned whenever you stand straight (nose to ankle is about 89% of height)
  function scaleFrom(P) {
    if (!seen(P, [0, 11, 12, 23, 24, 25, 26, 27, 28], 0.5)) return;
    const ank = (P[27].y + P[28].y) / 2, hip = (P[23].y + P[24].y) / 2, sh = (P[11].y + P[12].y) / 2;
    const upright = P[0].y < sh && sh < hip && hip < ank && Math.abs((P[23].x + P[24].x) / 2 - (P[27].x + P[28].x) / 2) < (ank - hip) * 0.25 && angle(P[23], P[25], P[27]) > 160 && angle(P[24], P[26], P[28]) > 160;
    if (upright) { const v = (ank - P[0].y) / (0.89 * ME.height / 100); E.ppm = E.ppm ? E.ppm * 0.95 + v * 0.05 : v; }
  }

  function drawFrame(mirror) {
    const W = E.W, H = E.H, U = E.U;
    if (app.noCamera) { g.fillStyle = C.paper; g.fillRect(0, 0, W, H); }
    else { g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(video, 0, 0, W, H); g.restore(); }
    const people = app.people > 1 ? E.Ps : (E.Sm ? [E.Sm] : []);
    if (app.skeleton !== false) people.forEach(P => {
      g.lineCap = 'round'; g.strokeStyle = C.yellow; g.lineWidth = U * 1.1;
      BONES.forEach(([a, b]) => { if (P[a].v > 0.4 && P[b].v > 0.4) { g.beginPath(); g.moveTo(P[a].x, P[a].y); g.lineTo(P[b].x, P[b].y); g.stroke(); } });
      [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(i => { if (P[i].v > 0.4) { g.beginPath(); g.arc(P[i].x, P[i].y, U * 1.1, 0, 7); g.fillStyle = C.violet; g.fill(); g.lineWidth = U * 0.45; g.strokeStyle = '#fff'; g.stroke(); } });
    });
    if (app.ball && E.ball) { g.strokeStyle = C.mad; g.lineWidth = U * 0.8; g.beginPath(); g.arc(E.ball.x, E.ball.y, E.ball.r * 1.2, 0, 7); g.stroke(); }
    if (app.gates && S.gates && S.gates.length) S.gates.forEach((gx, i) => { const x = gx * W; dashed(g, E, x, H * 0.08, x, H * 0.97, C.mad, 0.8); text(g, E, app.gateLabels[i], x, H * 0.06, 3.6, C.mad); });
    if (app.gates && (!S.gates || S.gates.length < app.gates) && !E.gateMode) card(g, E, [['Press Set lines,', 4, C.ink], ['then tap each cone on screen', 3.4, C.ink, 500]], W / 2, H * 0.4);
    if (app.points && S.pts && S.pts.length) S.pts.forEach((p, i) => { g.strokeStyle = C.mad; g.lineWidth = U * 0.7; g.beginPath(); g.arc(p.x * W, p.y * H, U * 5, 0, 7); g.stroke(); text(g, E, app.pointLabels[i], p.x * W, p.y * H - U * 8, 3.4, C.mad); });
    if (app.points && (!S.pts || S.pts.length < app.points) && !E.gateMode) card(g, E, [['Press Set spot,', 4, C.ink], ['then tap the ' + app.pointNames[0], 3.4, C.ink, 500]], W / 2, H * 0.4);
    try { app.draw && app.draw(g, E); } catch (e) { console.error(e); }
    if (E.beat != null) card(g, E, [[E.beatWon ? 'Challenge beaten ✓' : 'Beat ' + fmtVal(E.beat, E.beatUnit), 4.2, E.beatWon ? C.ind : C.mad]], W - U * 4, H * 0.2, 'right');
    if (E.msg) card(g, E, wrap(g, E, E.msg, 3.6, W * 0.85).map(l => [l, 3.6, C.ink, 600]), W / 2, H * 0.86);
    if (E.now() < E.hookUntil) { const lines = wrap(g, E, app.hook, 6, W * 0.84); card(g, E, lines.map(l => [l, 6, '#fff', 900]), W / 2, H * 0.1, 'center', C.violet); }
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = U * 1.5; text(g, E, BRAND, W - U * 3, H - U * 3.5, 4.2, '#fff', 900, 'right'); g.restore();
  }
}
