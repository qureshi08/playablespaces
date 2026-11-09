// The other 44 apps. Most are built from four patterns: rep counter, hold timer, line timer and jump detector.
import { C, dist, mid, angle, seen, clamp, side, card, text, dashed, panel, beep, say, meter, scoreCard, bigNote, wrap, store, audio, logResult } from './engine.js';
import { PROFILE, jumpRank, balanceRank, plankRank, reactionRank, rankLine } from './norms.js';

const L = (a, b, u) => a + (b - a) * u;
const f2 = s => s.toFixed(2) + ' s';
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
// pixels per metre: learned while standing, otherwise from leg length (hip to ankle is about 48% of height)
const ppmOf = (E, P) => E.ppm || (seen(P, [23, 27], 0.4) ? (dist(P[23], P[27]) + (P[24] ? dist(P[24], P[28]) : dist(P[23], P[27]))) / 2 / (0.48 * E.ME.height / 100) : null);
const crossT = (px, x, line, pt, t) => (px == null || px === x || (px - line) * (x - line) > 0) ? null : pt + (t - pt) * (line - px) / (x - px);
const legLen = P => (dist(P[23], P[27]) + dist(P[24], P[28])) / 2;
const hipX = P => (P[23].x + P[24].x) / 2, hipY = P => (P[23].y + P[24].y) / 2;
const footY = P => Math.max(P[27].y, P[28].y, P[29] ? Math.max(P[29].y, P[30].y) : 0);
const bodyH = P => Math.abs(footY(P) - P[0].y);
// angle of a segment from the horizontal, 0 to 90 degrees
const fromHoriz = (a, b) => Math.abs(Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180 / Math.PI);

function holdTick(st, E, ok, grace = 0.3) {
  if (ok) { if (st.hs == null) { st.hs = E.t; beep(1100, 0.07); } st.lastIn = E.t; st.cur = E.t - st.hs; return 0; }
  if (st.hs != null && E.t - st.lastIn > grace) { const d = st.lastIn - st.hs; st.hs = null; st.cur = 0; return d; }
  return 0;
}
// jump detector on a "lowest point" signal y (bigger y = lower on screen)
function flight(st, E, y, size, th = 0.04) {
  const t = E.t; let ev = null;
  if (!st.air && st.py != null && Math.abs(y - st.py) < size * 0.012) st.base = st.base == null ? y : st.base * 0.85 + y * 0.15;
  if (st.base != null) {
    const lim = st.base - size * th;
    if (!st.air && y < lim) { st.air = true; st.t0 = crossT(st.py, y, lim, st.pt, t) ?? t; ev = { type: 'up', contact: st.tl != null ? st.t0 - st.tl : null }; }
    else if (st.air && y >= lim) { st.air = false; const t1 = crossT(st.py, y, lim, st.pt, t) ?? t; st.tl = t1; ev = { type: 'down', ft: t1 - st.t0 }; }
  }
  st.py = y; st.pt = t; return ev;
}
const cm = ft => 9.81 * ft * ft / 8 * 100; // jump height from time in the air

/* ---------- pattern 1: rep counter from a depth signal (0 = start, 1 = full depth) ---------- */
function reps(o) {
  return Object.assign({
    reset(E) { this.st = { n: 0, no: 0, phase: 'top', d: 0, deep: false, last: '', lastAt: 0 }; o.init && o.init(this.st, E); },
    frame(E) {
      const st = this.st, d = o.depth(E, st);
      if (d == null) { E.msg = o.need; return; }
      st.d = d; const down = (E.S.depth ?? 75) / 100;
      if (st.phase === 'top') { if (d > 0.35) { st.phase = 'move'; st.deep = false; } return; }
      if (d >= down && !st.deep) { st.deep = true; beep(1300, 0.05); }
      if (d < 0.2) {
        if (st.deep) { st.n++; say(String(st.n)); st.last = 'good'; E.log(st.n, 'reps'); } else { st.no++; say('No rep'); st.last = 'no'; }
        st.lastAt = E.t; st.phase = 'top';
      }
    },
    draw(g, E) {
      const st = this.st, U = E.U, H = E.H, W = E.W;
      const c = card(g, E, [[o.label || 'Reps', 4, C.ink, 600], [String(st.n), 16, C.mad]], U * 5, H * 0.62, 'left');
      card(g, E, [['No reps', 3.4, C.ink, 600], [String(st.no), 7, C.ind]], U * 5 + c.w + U * 3, H * 0.62 + c.h - U * 17, 'left');
      meter(g, E, st.d, (E.S.depth ?? 75) / 100, W - U * 12, H * 0.35, H * 0.3, 'depth');
      if (E.t - st.lastAt < 1.2 && st.last) bigNote(g, E, st.last === 'good' ? (o.label || 'Rep') + ' ' + st.n + ' ✓' : 'No rep: ' + o.short, st.last === 'good' ? C.ind : C.mad);
      else if (st.phase === 'move' && st.deep) bigNote(g, E, o.deepText || 'Deep enough ✓');
      o.extra && o.extra(g, E, st);
    },
  }, o, { settings: [{ k: 'depth', label: 'Full rep at (% of depth)', def: 75 }, ...(o.settings || [])] });
}

/* ---------- pattern 2: hold timer ---------- */
function hold(o) {
  return Object.assign({
    reset(E) { this.st = { hs: null, cur: 0, last: 0, best: 0, lastAt: 0 }; o.init && o.init(this.st, E); },
    frame(E) {
      const st = this.st, ok = this.ok(E, st);
      if (ok == null) { E.msg = o.need; const d = holdTick(st, E, false, o.grace); if (d) this.done(E, d); return; }
      const d = holdTick(st, E, ok, o.grace ?? 0.3); if (d) this.done(E, d);
    },
    done(E, d) {
      const st = this.st; if (d < (o.min ?? 1)) return; st.last = d; st.lastAt = E.t; st.best = Math.max(st.best, d);
      st.rank = o.rank ? rankLine(o.rank(E, d)) : null;
      say((o.stopWord ? o.stopWord + '. ' : '') + Math.round(d) + ' seconds.' + (st.rank ? ' ' + st.rank : ''));
      E.log(d, 's', 'high', st.rank);
    },
    draw(g, E) {
      const st = this.st, U = E.U, H = E.H, holding = st.hs != null;
      const lines = [[o.label || 'Hold', 4, C.ink, 600], [holding ? mmss(st.cur) + '.' + Math.floor(st.cur * 10 % 10) : (st.last ? st.last.toFixed(1) + ' s' : '0.0 s'), 12, holding ? C.mad : C.ind]];
      if (st.best) lines.push(['best ' + st.best.toFixed(1) + ' s', 3.6, C.ink, 600]);
      if (st.rank && !holding) lines.push([st.rank, 3.4, C.ind, 700]);
      card(g, E, lines, U * 5, H * 0.6, 'left');
      if (!holding && st.last && E.t - st.lastAt < 2) bigNote(g, E, (o.stopWord || 'Stopped') + ' at ' + st.last.toFixed(1) + ' s', C.mad);
      o.extra && o.extra(g, E, st);
    },
  }, o);
}

/* ---------- pattern 3: time between lines (hips cross the lines you tap on screen) ---------- */
function lines(o) {
  return Object.assign({
    gates: o.gates || 2, gateNames: o.gateNames || ['first cone', 'second cone'], gateLabels: o.gateLabels || ['A', 'B'],
    reset(E) { this.st = { phase: 'ready', px: null, pt: 0, res: null, best: null, resAt: 0 }; },
    frame(E) {
      const st = this.st, P = E.P, S = E.S; if (!S.gates || S.gates.length < this.gates) return;
      if (!seen(P, [23, 24], 0.35)) { st.px = null; return; }
      const x = hipX(P), t = E.t, gx = S.gates.map(v => v * E.W);
      if (st.phase === 'done' && t - st.resAt > 2.5) st.phase = 'ready';
      o.step.call(this, E, st, x, t, gx);
      st.px = x; st.pt = t;
    },
    finish(E, time, extra) {
      const st = this.st; st.res = time; st.phase = 'done'; st.resAt = E.t; st.extra = extra;
      if (st.best == null || time < st.best) st.best = time; say(time.toFixed(2) + ' seconds.'); E.log(time, 's', 'low');
    },
    draw(g, E) {
      const st = this.st, U = E.U, H = E.H;
      if (st.phase === 'run') card(g, E, [[f2(E.t - st.t0), 12, C.mad]], E.W / 2, H * 0.08);
      if (st.res != null) scoreCard(g, E, o.resLabel || 'Time', f2(st.res), st.extra || (st.best != null ? 'best ' + f2(st.best) : ''));
      o.extra && o.extra(g, E, st);
    },
  }, o);
}

/* ---------- pattern 4: no camera games ---------- */
function screenGame(o) { return Object.assign({ noCamera: true, pose: false, skeleton: false }, o); }

/* ======================================================================= */
export const APPS2 = {

/* ---------------- SPEED ---------------- */
falsestart: {
  cat: 'Speed', id: 'falsestart', title: 'False start test', hook: 'Could you pass the Olympic false start rule?',
  setup: ['Phone on a tripod side on, about 3 m away, your whole body in the picture.', 'Get into your start position and press Go.', 'The app says "Set", then beeps after a random wait. React as fast as you can. Under 0.100 s counts as a false start in official racing, because nobody reacts that fast to the sound.'],
  buttons: [{ label: 'Go', fn(E) { this.go(E); } }],
  reset(E) { clearTimeout(this.timer); this.st = { phase: 'idle', res: null, best: null }; },
  go(E) {
    const st = this.st; clearTimeout(this.timer); Object.assign(st, { phase: 'marks', res: null, ref: null });
    say('Set'); this.timer = setTimeout(() => { st.phase = 'armed'; st.ref = null; this.timer = setTimeout(() => { if (st.phase !== 'armed') return; beep(1000, 0.25, 0.5); st.tb = E.now(); st.phase = 'wait'; }, rnd(1500, 3500)); }, 1200);
  },
  frame(E) {
    const st = this.st, P = E.P; if (!seen(P, [11, 12, 23, 24], 0.4)) { if (st.phase !== 'idle') E.msg = 'Keep your whole body in the picture'; return; }
    const pts = [11, 12, 23, 24, 0].map(i => P[i]), size = bodyH(P) || E.H * 0.5;
    if (st.phase === 'armed' || st.phase === 'wait') {
      if (!st.ref) st.ref = pts.map(p => ({ x: p.x, y: p.y }));
      const move = Math.max(...pts.map((p, i) => dist(p, st.ref[i]))) / size;
      if (move > 0.035) {
        if (st.phase === 'armed') { st.phase = 'done'; st.res = -1; clearTimeout(this.timer); say('False start. You moved before the beep.'); }
        else { const r = E.now() - st.tb - 0.033; st.res = r; st.phase = 'done'; if (r < 0.1) say('False start.'); else say(r < 0.15 ? 'Lightning fast!' : r < 0.2 ? 'Fast reaction.' : r < 0.3 ? 'Good reaction.' : 'Bit slow that time.'); if (r >= 0.1 && (st.best == null || r < st.best)) st.best = r; E.log(r, 's', 'low'); }
      }
    }
  },
  draw(g, E) {
    const st = this.st, W = E.W, H = E.H, U = E.U;
    if (st.phase === 'marks' || st.phase === 'armed') card(g, E, [['Set...', 10, C.mad]], W / 2, H * 0.25);
    if (st.phase === 'wait') card(g, E, [['GO!', 12, C.mad]], W / 2, H * 0.25);
    if (st.phase === 'done') {
      if (st.res < 0) bigNote(g, E, 'False start: you moved before the beep', C.mad);
      else scoreCard(g, E, 'Reaction', st.res.toFixed(3) + ' s', st.res < 0.1 ? 'FALSE START (under 0.100 s)' : st.best != null ? 'best ' + st.best.toFixed(3) + ' s' : '', U * 5, H * 0.6, st.res < 0.1 ? C.mad : C.ind);
    }
    const mx = W * 0.1, mw = W * 0.8, my = H * 0.9; panel(g, E, mx, my, mw, U * 4, '#fff');
    g.fillStyle = 'rgba(200,69,42,.5)'; g.fillRect(mx, my, mw / 3, U * 4); text(g, E, 'false start', mx + mw / 6, my - U * 3, 3, C.paper, 700); text(g, E, '0.3 s', mx + mw, my - U * 3, 3, C.paper, 700);
    if (st.phase === 'done' && st.res > 0) { const x = mx + mw * clamp(st.res / 0.3, 0, 1); g.fillStyle = C.ind; g.fillRect(x - U * 0.6, my - U, U * 1.2, U * 6); }
    if (st.phase === 'idle') bigNote(g, E, 'Get in position, press Go', C.ind);
  },
},

/* ---------------- POWER ---------------- */
broadjump: {
  cat: 'Power', id: 'broadjump', beta: 1, title: 'Standing broad jump', hook: 'How far can I jump from standing?', gates: 2, gateNames: ['take off line', 'marker'], gateLabels: ['0', 'MARK'],
  settings: [{ k: 'dist', label: 'Marker distance from the line (m)', def: 2 }],
  setup: ['Mark a take off line and put a marker 2 m in front of it (or set your own distance).', 'Phone on a tripod side on, about 4 m away, so the line and marker are both in the picture.', 'Press Set lines, tap the take off line, then the marker. Stand behind the line, jump forward, hold the landing.'],
  reset(E) { this.st = { air: false, res: null, best: null }; },
  frame(E) {
    const st = this.st, P = E.P, S = E.S; if (!S.gates || S.gates.length < 2) return;
    if (!seen(P, [23, 24, 27, 28], 0.4)) { E.msg = 'Show your whole body, feet included'; return; }
    const ev = flight(st, E, footY(P), legLen(P), 0.06);
    if (ev && ev.type === 'down' && ev.ft > 0.2) st.wait = E.t + 0.25;
    if (st.wait && E.t >= st.wait) {
      st.wait = 0; const A = S.gates[0] * E.W, B = S.gates[1] * E.W, dir = Math.sign(B - A);
      const heels = [P[29] || P[27], P[30] || P[28]].map(p => (p.x - A) * dir), back = Math.min(...heels) * dir + A;
      const m = (back - A) / (B - A) * S.dist; st.res = m; st.heelX = back; if (m > 0.3) { if (!st.best || m > st.best) st.best = m; say(m.toFixed(2) + ' metres.'); E.log(m, 'm'); }
    }
  },
  draw(g, E) {
    const st = this.st; if (st.air) bigNote(g, E, 'in the air...');
    if (st.res != null) { if (st.heelX) dashed(g, E, st.heelX, E.H * 0.6, st.heelX, E.H * 0.97, C.ind, 1); scoreCard(g, E, 'Distance', st.res.toFixed(2) + ' m', st.best ? 'best ' + st.best.toFixed(2) + ' m' : ''); }
  },
},

barpath: {
  cat: 'Power', id: 'barpath', title: 'Bar path tracker', hook: 'The line my bar really draws.', beta: 1,
  setup: ['Film a squat, deadlift or press side on, phone on a tripod about 3 m away.', 'The app follows your hands (they hold the bar) and draws the bar path.', 'Each rep shows its upward speed compared with your first rep, so you can see the set slowing down. Phone camera apps are not accurate for exact m/s, so the app does not claim it.'],
  settings: [{ k: 'height', label: 'Your height (cm)', def: 175, global: true }],
  reset(E) { this.st = { path: [], dir: 0, low: null, high: null, v: null, reps: 0 }; },
  frame(E) {
    const st = this.st, P = E.Sm; if (!seen(P, [15, 16], 0.35)) { E.msg = 'Keep your hands on the bar in the picture'; return; }
    const w = mid(P[15], P[16]); st.path.push({ x: w.x, y: w.y, t: E.t }); if (st.path.length > 240) st.path.shift();
    const n = st.path.length; if (n < 6) return;
    const vy = (st.path[n - 1].y - st.path[n - 6].y) / (st.path[n - 1].t - st.path[n - 6].t);
    const ppm = ppmOf(E, E.P);
    if (vy > 30 && st.dir !== 1) { st.dir = 1; st.high = { y: w.y, t: E.t }; }
    if (vy > 30) st.low = { y: w.y, t: E.t };
    if (vy < -30 && st.dir === 1) { st.dir = -1; st.up0 = st.low; }
    if (st.dir === -1 && vy > -10 && st.up0) {
      const d = st.up0.y - w.y, dt = E.t - st.up0.t, size = E.P && seen(E.P, [11, 23], 0.3) ? dist(E.P[11], E.P[23]) : E.H * 0.2;
      if (d > size * 0.3 && dt > 0.2) { const v = d / dt; st.reps++; if (st.reps === 1) st.v1 = v; st.v = v / st.v1 * 100; say(st.reps === 1 ? 'Rep one.' : Math.round(st.v) + ' percent.'); E.log(st.v, '%'); }
      st.dir = 0; st.up0 = null;
    }
  },
  draw(g, E) {
    const st = this.st, U = E.U; g.strokeStyle = C.mad; g.lineWidth = U * 1; g.beginPath(); st.path.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
    if (st.path.length) { const p = st.path[st.path.length - 1]; g.strokeStyle = C.ink; g.lineWidth = U * 0.8; g.beginPath(); g.arc(p.x, p.y, U * 6, 0, 7); g.stroke(); }
    if (st.v != null) scoreCard(g, E, 'Speed vs rep 1', Math.round(st.v) + '%', 'rep ' + st.reps + (st.v < 80 ? ', slowing down' : ''));
  },
},

/* ---------------- CALISTHENICS ---------------- */
lsit: hold({
  cat: 'Calisthenics', id: 'lsit', title: 'L sit timer', hook: 'My L sit, timed until my legs drop.', need: 'Show your whole body side on', stopWord: 'Legs dropped',
  settings: [{ k: 'tol', label: 'Legs count as level within (degrees)', def: 15 }],
  setup: ['Phone on a tripod side on, about 2.5 m away, at hip height.', 'Press up on the floor or parallettes and lift your legs straight out.', 'The clock runs while your legs stay level and stops when they sink.'],
  ok(E, st) { const P = E.Sm; if (!P) return null; const [s, , w, h, k, a] = side(P); if (!seen(P, [s, h, a], 0.35)) return null; st.leg = [P[h], P[a]]; return fromHoriz(P[h], P[a]) <= E.S.tol && P[a].y <= P[h].y + dist(P[h], P[a]) * 0.35 && P[w].y > P[s].y; },
  extra(g, E, st) { if (st.leg) { const [h, a] = st.leg; dashed(g, E, h.x, h.y, h.x + (a.x - h.x) * 1.3, h.y, C.wi, 0.6); g.strokeStyle = C.mad; g.lineWidth = E.U; g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(a.x, a.y); g.stroke(); text(g, E, Math.round(fromHoriz(h, a)) + '°', a.x, a.y - E.U * 5, 5, C.mad); } },
}),

pistol: reps({
  cat: 'Calisthenics', id: 'pistol', title: 'Pistol squat depth', hook: 'One leg. Full depth. Counted.', need: 'Show your whole body side on', short: 'not deep enough',
  setup: ['Phone on a tripod side on, about 3 m away, whole body in the picture.', 'Stand on one leg, other leg out in front. Squat down until your hip is at knee height or lower.', 'Only full depth reps count.'],
  depth(E) { const P = E.Sm; if (!seen(P, [23, 24, 25, 26], 0.4)) return null; const kn = [[23, 25, 27], [24, 26, 28]].map(([h, k, a]) => ({ ang: angle(P[h], P[k], P[a]), d: (P[h].y - (P[k].y - Math.abs(P[a].y - P[k].y))) })); const legs = kn.sort((a, b) => a.ang - b.ang); const s = [[23, 25], [24, 26]].map(([h, k]) => clamp((90 - fromHoriz(P[h], P[k]) * (P[h].y > P[k].y ? -1 : 1)) / 90, 0, 1.2)); return Math.max(...s); },
}),

dips: reps({
  cat: 'Calisthenics', id: 'dips', title: 'Dip depth counter', hook: 'Are your dips deep enough?', need: 'Show your arms and shoulders side on', short: 'shoulder above elbow',
  setup: ['Phone on a tripod side on to the dip bars, about 2.5 m away.', 'Go down until your shoulder is at elbow height, then press up to straight arms.'],
  depth(E) { const P = E.Sm; const [s, e, w] = side(P); if (!seen(P, [s, e, w], 0.4)) return null; const ang = angle(P[s], P[e], P[w]); return clamp((170 - ang) / (170 - 85), 0, 1.2); },
}),

/* ---------------- RUNNING ---------------- */
runform: {
  cat: 'Running', id: 'runform', title: 'Running cadence check', hook: 'My running cadence, counted by AI.', beta: 1,
  settings: [{ k: 'height', label: 'Your height (cm)', def: 175, global: true }],
  setup: ['Run on a treadmill, or run past the phone on a track, filmed side on from about 4 m.', 'Stand straight for a second first so the app learns your size.', 'It counts your cadence (steps a minute) and shows how much your hips bounce. It gives no overall form score, because a phone at 30 frames a second cannot judge form reliably.'],
  reset(E) { this.st = { ys: [], steps: [], bounce: [], knee: [], score: null }; },
  frame(E) {
    const st = this.st, P = E.P; if (!seen(P, [23, 24, 25, 26, 27, 28], 0.4)) { E.msg = 'Show your whole body side on'; return; }
    const y = hipY(P), t = E.t; st.ys.push({ y, t, k: Math.min(angle(P[23], P[25], P[27]), angle(P[24], P[26], P[28])) }); if (st.ys.length > 9) st.ys.shift();
    if (st.ys.length === 9) { const c = st.ys[4]; if (st.ys.every((q, i) => i === 4 || q.y <= c.y) && (!st.steps.length || t - st.steps[st.steps.length - 1] > 0.22)) { st.steps.push(c.t); st.knee.push(c.k); const top = Math.min(...st.ys.map(q => q.y)); st.bounce.push(c.y - top); } }
    st.steps = st.steps.filter(s => t - s < 8); st.knee = st.knee.slice(-12); st.bounce = st.bounce.slice(-12);
    if (st.steps.length >= 6) {
      const cad = (st.steps.length - 1) / (st.steps[st.steps.length - 1] - st.steps[0]) * 60, ppm = ppmOf(E, P);
      const b = ppm ? st.bounce.reduce((s, x) => s + x, 0) / st.bounce.length / ppm * 100 * 2 : null, kn = st.knee.reduce((s, x) => s + x, 0) / st.knee.length;
      const sc = (cad >= 165 && cad <= 190 ? 40 : Math.max(0, 40 - Math.abs(cad < 165 ? 165 - cad : cad - 190) * 2)) + (b == null ? 15 : b <= 9 ? 30 : Math.max(0, 30 - (b - 9) * 5)) + (kn >= 135 && kn <= 165 ? 30 : Math.max(0, 30 - Math.abs(kn < 135 ? 135 - kn : kn - 165)));
      st.cad = cad; st.b = b; st.kn = kn; st.score = Math.round(sc);
      if (!st.said || t - st.said > 8) { st.said = t; say(Math.round(cad) + ' steps a minute.'); E.log(cad, 'spm'); }
    }
  },
  draw(g, E) {
    const st = this.st; if (st.score == null) { bigNote(g, E, 'Keep running...'); return; }
    scoreCard(g, E, 'Cadence', Math.round(st.cad) + ' spm', 'steps a minute');
    card(g, E, [['cadence', 3.4, C.ink, 600], [Math.round(st.cad) + ' steps/min', 4.6, C.ind], ['bounce', 3.4, C.ink, 600], [st.b == null ? 'stand still once' : st.b.toFixed(1) + ' cm', 4.6, C.ind], ['knee at landing', 3.4, C.ink, 600], [Math.round(st.kn) + '°', 4.6, C.ind]], E.W - E.U * 5, E.H * 0.1, 'right');
  },
},

kneecheck: {
  cat: 'Running', id: 'kneecheck', title: 'Landing knee check', hook: 'Is my knee caving when I land?', beta: 1,
  setup: ['Phone on a tripod facing you (front on), about 3 m away, whole body in the picture.', 'Step off a low box or jump in place and land on both feet.', 'At the lowest point of each landing the app compares the gap between your knees with the gap between your ankles, a measure that matches 3D lab results well. Under about 0.8 means your knees came in. It is a flag, not a diagnosis.'],
  reset(E) { this.st = { air: false, res: null, low: null }; },
  frame(E) {
    const st = this.st, P = E.Sm; if (!seen(P, [23, 24, 25, 26, 27, 28], 0.4)) { E.msg = 'Face the phone, whole body in the picture'; return; }
    const ev = flight(st, E, footY(E.P), legLen(P), 0.05);
    if (ev && ev.type === 'down') st.track = { until: E.t + 0.6, low: -1 };
    if (st.track) {
      const y = hipY(P); if (y > st.track.low) { st.track.low = y; st.track.snap = P.map(p => ({ ...p })); }
      if (E.t > st.track.until) {
        const Q = st.track.snap, ratio = Math.abs(Q[25].x - Q[26].x) / (Math.abs(Q[27].x - Q[28].x) || 1);
        st.res = ratio; st.snap = Q; st.track = null; say(ratio < 0.8 ? 'Knees came in.' : 'Knees tracked well.'); E.log(ratio, 'ratio');
      }
    }
  },
  draw(g, E) {
    const st = this.st; if (st.res == null) { bigNote(g, E, 'Land!'); return; }
    const bad = st.res < 0.8; scoreCard(g, E, 'Knee gap vs ankle gap', st.res.toFixed(2), bad ? 'knees came in (guide: under 0.8)' : 'knees tracked ✓', E.U * 5, E.H * 0.6, bad ? C.mad : C.ind);
    if (st.snap) { const Q = st.snap; g.strokeStyle = bad ? C.mad : C.ind; g.lineWidth = E.U * 1.2; [[23, 25, 27], [24, 26, 28]].forEach(([h, k, a]) => { g.beginPath(); g.moveTo(Q[h].x, Q[h].y); g.lineTo(Q[k].x, Q[k].y); g.lineTo(Q[a].x, Q[a].y); g.stroke(); }); }
  },
},

/* ---------------- ATHLETE DATA ---------------- */
daily: screenGame({
  cat: 'Athlete data', id: 'daily', title: 'Daily test series', hook: 'Day 47 of testing my speed every morning.',
  setup: ['Every result from every Moves app is saved on this phone.', 'Open this page to see your progress chart for any test. Tap the arrows at the top to switch tests.', 'Record it at the end of your daily video, so people see the trend.'],
  reset(E) { const h = store.get('moves:history', []); this.h = h; this.apps = [...new Set(h.map(x => x.a))]; this.i = this.i || 0; },
  tap(E, x, y) { if (!this.apps.length) return; if (y < E.H * 0.2) { this.i = (this.i + (x > E.W / 2 ? 1 : this.apps.length - 1)) % this.apps.length; } },
  draw(g, E) {
    const W = E.W, H = E.H, U = E.U;
    if (!this.apps.length) { bigNote(g, E, 'No results yet. Do any test first, then come back here.', C.ind, H * 0.4); return; }
    const id = this.apps[this.i], rows = this.h.filter(x => x.a === id), byDay = {};
    rows.forEach(r => { const d = new Date(r.t).toDateString(); const cur = byDay[d]; if (!cur || (r.b === 'low' ? r.v < cur.v : r.v > cur.v)) byDay[d] = r; });
    const days = Object.values(byDay).sort((a, b) => a.t - b.t), vals = days.map(d => d.v), lo = Math.min(...vals), hi = Math.max(...vals), low = rows[0].b === 'low';
    text(g, E, '‹', U * 8, H * 0.08, 10, C.ind); text(g, E, '›', W - U * 8, H * 0.08, 10, C.ind);
    text(g, E, ALL_TITLES[id] || id, W / 2, H * 0.08, 5.4, C.ind);
    text(g, E, 'Day ' + days.length, W / 2, H * 0.16, 12, C.mad);
    const x0 = W * 0.1, x1 = W * 0.9, y0 = H * 0.3, y1 = H * 0.75; g.strokeStyle = C.ink; g.lineWidth = U * 0.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.stroke();
    const X = i => days.length === 1 ? (x0 + x1) / 2 : L(x0, x1, i / (days.length - 1)), Y = v => { const u = hi === lo ? 0.5 : (v - lo) / (hi - lo); return L(y1, y0, low ? 1 - u : u) ; };
    g.strokeStyle = C.ind; g.lineWidth = U * 0.9; g.beginPath(); days.forEach((d, i) => i ? g.lineTo(X(i), Y(d.v)) : g.moveTo(X(i), Y(d.v))); g.stroke();
    days.forEach((d, i) => { g.beginPath(); g.arc(X(i), Y(d.v), U * 1.3, 0, 7); g.fillStyle = i === days.length - 1 ? C.mad : C.ind; g.fill(); });
    text(g, E, 'better ↑', x0 + U * 6, y0 - U * 3, 3, C.ink, 600);
    const first = days[0], last = days[days.length - 1];
    card(g, E, [['first day: ' + first.v.toFixed(2) + ' ' + first.u, 4, C.ink, 600], ['today: ' + last.v.toFixed(2) + ' ' + last.u, 5, C.mad]], W / 2, H * 0.8);
  },
}),

/* ---------------- BALL SPORTS ---------------- */
shotspeed: {
  cat: 'Ball sports', id: 'shotspeed', beta: 1, title: 'Football shot speed', hook: 'How hard can I actually kick?', ball: true, gates: 2, gateNames: ['first marker', 'second marker'], gateLabels: ['A', 'B'],
  settings: [{ k: 'dist', label: 'Distance between the markers (m)', def: 3 }],
  setup: ['Put two markers 3 m apart along the path of the ball, just after where you kick.', 'Phone on a tripod side on, 5 to 6 m back, both markers in the picture, good light.', 'Press Set lines and tap each marker. Kick hard across the picture. The app times the ball between the lines.', 'Fast balls blur on phone cameras, so use bright daylight and a contrasting ball.'],
  reset(E) { this.st = { px: null, pt: 0, t0: null, res: null, best: null }; },
  frame(E) {
    const st = this.st, S = E.S, b = E.ball; if (!S.gates || S.gates.length < 2 || !b) return;
    if (b.t !== E.t) return; const gA = S.gates[0] * E.W, gB = S.gates[1] * E.W, t = E.t;
    if (st.t0 == null) { for (const [g1, g2] of [[gA, gB], [gB, gA]]) { const c = crossT(st.px, b.x, g1, st.pt, t); if (c != null) { st.t0 = c; st.target = g2; } } }
    else { const c = crossT(st.px, b.x, st.target, st.pt, t); if (c != null) { const dt = c - st.t0; if (dt > 0.02) { const k = S.dist / dt * 3.6; st.res = k; if (!st.best || k > st.best) st.best = k; say(Math.round(k) + ' kilometres per hour.'); E.log(k, 'km/h'); } st.t0 = null; } else if (t - st.t0 > 1.5) st.t0 = null; }
    st.px = b.x; st.pt = t;
  },
  draw(g, E) { const st = this.st; if (st.res != null) scoreCard(g, E, 'Shot speed', Math.round(st.res) + ' km/h', 'best ' + Math.round(st.best) + ' km/h'); else if (!E.ball) E.msg = E.msg || 'Put the ball in the picture'; },
},

keepyups: {
  cat: 'Ball sports', id: 'keepyups', beta: 1, title: 'Keepy ups counter', hook: 'Every touch counted. No drops allowed.', ball: true,
  setup: ['Phone on a tripod 3 to 4 m away, your whole body and some space above your head in the picture.', 'Juggle the ball. Every time it changes from falling to rising near your body, that is a touch.', 'If the ball hits the ground or leaves the picture for a second, the count ends.'],
  reset(E) { this.st = { n: 0, best: 0, ys: [], lastSeen: 0, down: false }; },
  frame(E) {
    const st = this.st, b = E.ball, P = E.P;
    if (b && b.t === E.t) {
      st.lastSeen = E.t; st.ys.push(b.y); if (st.ys.length > 4) st.ys.shift();
      if (st.ys.length === 4) { const falling = st.ys[1] > st.ys[0] && st.ys[2] >= st.ys[1], rising = st.ys[3] < st.ys[2]; if (falling && rising && E.t - (st.lastHit || 0) > 0.25) { const ground = P ? footY(P) : E.H; if (b.y < ground - b.r) { st.n++; st.lastHit = E.t; beep(1200, 0.04); if (st.n % 5 === 0) say(String(st.n)); } } }
      if (P && b.y > footY(P) + b.r * 0.2 && st.n) this.drop(E);
    } else if (st.n && E.t - st.lastSeen > 1.2) this.drop(E);
  },
  drop(E) { const st = this.st; say('Dropped! ' + st.n + '.'); E.log(st.n, 'touches'); st.best = Math.max(st.best, st.n); st.lastRun = st.n; st.n = 0; st.dropAt = E.t; },
  draw(g, E) { const st = this.st; scoreCard(g, E, 'Touches', String(st.n), 'best ' + st.best); if (st.dropAt && E.t - st.dropAt < 2) bigNote(g, E, 'Dropped at ' + st.lastRun, C.mad); },
},

vjump: {
  cat: 'Power', id: 'vjump', title: 'Vertical jump', hook: 'How rare is my vertical jump?', featured: 1,
  settings: [...PROFILE, { k: 'weight', label: 'Body weight (kg, for watts)', def: 75, global: true }],
  setup: ['Phone on a tripod or the floor, 3 m away, your whole body in the picture with space above your head.', 'Stand still for a second, then jump as high as you can, hands on hips, and land on the same spot.', 'Height comes from time in the air, the method the validated My Jump app uses. A phone browser films at 30 to 60 frames a second, so each result shows its error range.', 'Your rank uses the Canadian Health Measures Survey norms for your age and sex. Watts use the Sayers formula and are a rough guide only.'],
  reset(E) { this.st = { air: false, res: null, best: null }; },
  frame(E) {
    const st = this.st, P = E.P; if (!seen(P, [23, 24, 27, 28], 0.4)) { E.msg = 'Show your whole body, feet included'; return; }
    const ev = flight(st, E, footY(P), legLen(P), 0.04);
    if (ev && ev.type === 'down' && ev.ft > 0.15 && ev.ft < 1.2) {
      const c = cm(ev.ft), fps = E.fps || 30, err = 9.81 * ev.ft * (1 / fps) / 4 * 100, r = jumpRank(c, E.S.age, E.S.sex), w = 60.7 * c + 45.3 * E.S.weight - 2055;
      st.res = c; st.ft = ev.ft; st.err = err; st.rank = rankLine(r); st.w = w; if (!st.best || c > st.best) st.best = c;
      say(Math.round(c) + ' centimetres. ' + st.rank); E.log(c, 'cm', 'high', st.rank);
    }
  },
  draw(g, E) {
    const st = this.st; if (st.air) bigNote(g, E, 'in the air...');
    if (st.res != null) card(g, E, [['Jump', 4, C.ink, 600], [Math.round(st.res) + ' cm', 13, C.mad], ['± ' + Math.max(1, Math.round(st.err)) + ' cm at ' + Math.round(E.fps || 30) + ' fps', 3.4, C.ink, 600], [st.rank, 3.8, C.ind], ['about ' + Math.round(st.w / 100) * 100 + ' W, best ' + Math.round(st.best) + ' cm', 3.4, C.ink, 600]], E.U * 5, E.H * 0.55, 'left');
    else if (st.base != null) bigNote(g, E, 'Ready. Jump!');
  },
},

sprint: lines({
  cat: 'Ball sports', id: 'sprint', title: 'Sprint timer', hook: 'My 20 m time, every single morning.', gateNames: ['start cone', 'finish cone'], gateLabels: ['START', 'FINISH'],
  setup: ['Put a start cone and a finish cone (for example 10 or 20 m apart).', 'Phone on a tripod side on, far enough back to see both cones.', 'Press Set lines and tap both cones. Start just behind the line. The clock starts as your hips cross the start and stops at the finish.'],
  step(E, st, x, t, gx) {
    if (st.phase === 'ready') { const c = crossT(st.px, x, gx[0], st.pt, t); if (c != null) { st.phase = 'run'; st.t0 = c; beep(1200, 0.05); } }
    else if (st.phase === 'run') { const c = crossT(st.px, x, gx[1], st.pt, t); if (c != null) this.finish(E, c - st.t0); else if (t - st.t0 > 15) st.phase = 'ready'; }
  },
}),

sixcorner: {
  cat: 'Ball sports', id: 'sixcorner', title: 'Reaction footwork', hook: 'Six corners. Random order. Go.', cam: 'user',
  setup: ['Use the front camera. Phone propped up facing you, 3 to 4 m away, your whole body in the picture.', 'Stand in the middle and press Go. Six cues come in random order: front left, front right, left, right, back left, back right.', 'Move to that corner, then back to the middle. The clock stops after the sixth corner.'],
  buttons: [{ label: 'Go', fn(E) { this.go(E); } }],
  reset(E) { this.st = { phase: 'idle', res: null, best: null }; },
  go(E) { const st = this.st, P = E.P; if (!seen(P, [11, 12, 23, 24], 0.4)) { E.toast('Stand in the picture first'); return; } Object.assign(st, { phase: 'run', t0: E.now(), order: ['FL', 'FR', 'L', 'R', 'BL', 'BR'].sort(() => Math.random() - 0.5), i: 0, home: { x: hipX(P), s: dist(P[11], P[12]) }, out: false }); this.cue(E); },
  cue(E) { const n = { FL: 'front left', FR: 'front right', L: 'left', R: 'right', BL: 'back left', BR: 'back right' }; say(n[this.st.order[this.st.i]], 1.3); beep(900, 0.06); },
  frame(E) {
    const st = this.st, P = E.P; if (st.phase !== 'run' || !seen(P, [11, 12, 23, 24], 0.4)) return;
    const c = st.order[st.i], dx = (hipX(P) - st.home.x) / st.home.s, ds = dist(P[11], P[12]) / st.home.s;
    const wantX = c.includes('L') ? -1 : 1, wantZ = c[0] === 'F' ? 1 : c[0] === 'B' ? -1 : 0;
    const hit = dx * wantX > 0.6 && (wantZ === 0 || (wantZ > 0 ? ds > 1.12 : ds < 0.9));
    if (!st.out && hit) { st.out = true; beep(1300, 0.04); }
    if (st.out && Math.abs(dx) < 0.3 && Math.abs(ds - 1) < 0.08) { st.out = false; st.i++; if (st.i >= 6) { const r = E.now() - st.t0; st.res = r; st.phase = 'done'; if (!st.best || r < st.best) st.best = r; say(r.toFixed(1) + ' seconds.'); E.log(r, 's', 'low'); } else this.cue(E); }
  },
  draw(g, E) {
    const st = this.st, W = E.W, H = E.H, U = E.U;
    if (st.phase === 'run') { const c = st.order[st.i], arrows = { FL: '↖', FR: '↗', L: '←', R: '→', BL: '↙', BR: '↘' }; text(g, E, arrows[c], W / 2, H * 0.3, 36, C.mad); card(g, E, [[f2(E.now() - st.t0), 9, C.mad], ['corner ' + (st.i + 1) + ' of 6', 3.6, C.ink, 600]], W / 2, H * 0.05); }
    if (st.res != null && st.phase !== 'run') scoreCard(g, E, 'Six corners', f2(st.res), st.best ? 'best ' + f2(st.best) : '');
    if (st.phase === 'idle') bigNote(g, E, 'Stand in the middle, press Go');
  },
},

/* ---------------- HOME FITNESS ---------------- */
pushup: reps({
  cat: 'Home fitness', id: 'pushup', featured: 1, title: 'Push up form counter', hook: 'The AI only counts real push ups.', need: 'Show your whole body side on', short: 'not low enough',
  setup: ['Phone on the floor side on, about 2 m away, whole body in the picture.', 'Go down until your elbows reach 90 degrees, then push up to straight arms. Half reps do not count.'],
  depth(E) { const P = E.Sm, [s, e, w, h, , a] = side(P); if (!seen(P, [s, e, w], 0.4)) return null; if (seen(P, [h, a], 0.3) && fromHoriz(P[s], P[a]) > 45) return null; return clamp((165 - angle(P[s], P[e], P[w])) / (165 - 90), 0, 1.2); },
}),

plank: hold({
  cat: 'Home fitness', id: 'plank', title: 'Honest plank timer', hook: 'This plank timer stops when you cheat.', need: 'Show your whole body side on', stopWord: 'Hips dropped',
  settings: [{ k: 'tol', label: 'Allowed bend at the hips (degrees)', def: 15 }, PROFILE[1]], rank: (E, d) => plankRank(d, E.S.sex),
  setup: ['Phone on the floor side on, about 2 m away, whole body in the picture.', 'Hold a plank. The clock runs while shoulders, hips and ankles stay in a line, and stops when your hips sag or pike.'],
  ok(E, st) { const P = E.Sm, [s, , , h, , a] = side(P); if (!seen(P, [s, h, a], 0.35)) return null; st.l = [P[s], P[h], P[a]]; return fromHoriz(P[s], P[a]) < 40 && angle(P[s], P[h], P[a]) > 180 - E.S.tol; },
  extra(g, E, st) { if (st.l) { const [s, h, a] = st.l; dashed(g, E, s.x, s.y, a.x, a.y, C.wi, 0.6); g.strokeStyle = C.mad; g.lineWidth = E.U; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(h.x, h.y); g.lineTo(a.x, a.y); g.stroke(); } },
}),

squat: reps({
  cat: 'Home fitness', id: 'squat', title: 'Squat depth checker', hook: 'Half squats do not count here.', need: 'Show your whole body side on', short: 'hips above knees', deepText: 'Parallel ✓',
  setup: ['Phone on a tripod side on, about 3 m away, whole body in the picture.', 'Squat until your hip crease reaches knee height, then stand all the way up.'],
  depth(E) { const P = E.Sm, [, , , h, k] = side(P); if (!seen(P, [h, k], 0.4)) return null; const a = Math.atan2(P[k].y - P[h].y, Math.abs(P[k].x - P[h].x)) * 180 / Math.PI; return clamp((90 - a) / 90, 0, 1.2); },
}),

rope: {
  cat: 'Home fitness', id: 'rope', title: 'Skipping rope counter', hook: '140 jumps a minute. Can you beat it?',
  setup: ['Phone on a tripod 3 m away, whole body in the picture.', 'Stand still for a second, then skip. Each jump is counted, with your jumps per minute.'],
  reset(E) { this.st = { n: 0, times: [], air: false }; },
  frame(E) { const st = this.st, P = E.P; if (!seen(P, [27, 28], 0.4)) { E.msg = 'Show your feet'; return; } const ev = flight(st, E, footY(P), legLen(P), 0.02); if (ev && ev.type === 'up') { st.n++; st.times.push(E.t); st.times = st.times.filter(x => E.t - x < 10); if (st.n % 20 === 0) { say(String(st.n)); E.log(st.n, 'jumps'); } } },
  draw(g, E) { const st = this.st, rpm = st.times.length > 3 ? (st.times.length - 1) / (st.times[st.times.length - 1] - st.times[0]) * 60 : 0; scoreCard(g, E, 'Jumps', String(st.n), Math.round(rpm) + ' a minute'); },
},

balance: hold({
  cat: 'Home fitness', id: 'balance', title: 'One leg balance test', hook: 'Eyes closed, one leg. How long can you last?', need: 'Show your whole body, feet included', stopWord: 'Foot down', grace: 0.25, featured: 1,
  settings: PROFILE, rank: (E, d) => balanceRank(d, E.S.age),
  setup: ['Phone on a tripod 3 m away, whole body in the picture.', 'Lift one foot off the floor and close your eyes. The clock runs until your foot touches down. The standard test stops at 30 seconds.', 'Your rank uses Springer 2007 norms: adults aged 20 to 49 average about 21 seconds, and the time drops sharply after 50.'],
  ok(E) { const P = E.P; if (!seen(P, [23, 24, 27, 28], 0.4)) return null; return Math.abs(P[27].y - P[28].y) > legLen(P) * 0.12; },
}),

wallsit: hold({
  cat: 'Home fitness', id: 'wallsit', title: 'Wall sit timer', hook: 'My legs started shaking at 1:15.', need: 'Show your whole body side on', stopWord: 'Hips up',
  setup: ['Phone on a tripod side on, about 2.5 m away.', 'Back flat on the wall, slide down until your thighs are level. The clock stops when your hips rise.'],
  ok(E) { const P = E.Sm, [, , , h, k, a] = side(P); if (!seen(P, [h, k, a], 0.35)) return null; return fromHoriz(P[h], P[k]) < 25 && angle(P[h], P[k], P[a]) < 120; },
}),

burpee: {
  cat: 'Home fitness', id: 'burpee', title: 'Burpee counter', hook: 'Only full burpees count.',
  setup: ['Phone on a tripod side on, 3 m away, whole body in the picture.', 'A burpee counts when you go all the way down (body flat), come back up and jump.'],
  reset(E) { this.st = { n: 0, floor: false, air: false }; },
  frame(E) {
    const st = this.st, P = E.P; if (!seen(P, [11, 12, 27, 28], 0.35)) { E.msg = 'Show your whole body side on'; return; }
    const [s, , , , , a] = side(P); if (fromHoriz(P[s], P[a]) < 30) { st.floor = true; st.py = null; return; }
    if (fromHoriz(P[s], P[a]) > 60) { const ev = flight(st, E, footY(P), legLen(P), 0.05); if (ev && ev.type === 'up' && st.floor) { st.n++; st.floor = false; say(String(st.n)); E.log(st.n, 'reps'); } }
  },
  draw(g, E) { const st = this.st; scoreCard(g, E, 'Burpees', String(st.n), st.floor ? 'down ✓ now jump' : ''); },
},

sitreach: {
  cat: 'Home fitness', id: 'sitreach', beta: 1, title: 'Sit and reach', hook: 'Can you reach past your toes?',
  settings: [{ k: 'height', label: 'Your height (cm)', def: 175, global: true }],
  setup: ['Sit on the floor, legs straight, side on to the phone, about 2 m away.', 'Reach forward slowly as far as you can and hold for 2 seconds.', 'The app reads how far your fingertips go past your toes, in cm.'],
  reset(E) { this.st = { cur: null, best: null, hold: 0 }; },
  frame(E) {
    const st = this.st, P = E.Sm, [, , w, h, , a, , toe] = side(P); if (!seen(P, [w, h, a], 0.35)) { E.msg = 'Sit side on, whole body in the picture'; return; }
    const ppm = seen(P, [h, a], 0.35) ? dist(P[h], P[a]) / (0.48 * E.ME.height / 100) : null; if (!ppm) return;
    const dir = Math.sign(P[a].x - P[h].x) || 1, tip = P[w === 15 ? 19 : 20] || P[w], tx = (P[toe] && P[toe].v > 0.3 ? P[toe] : P[a]).x;
    st.cur = (tip.x - tx) * dir / ppm * 100;
    if (st.best == null || st.cur > st.best) { st.best = st.cur; st.hold = E.t; }
    if (st.hold && E.t - st.hold > 2 && !st.said) { st.said = true; say(Math.round(st.best) + ' centimetres'); E.log(st.best, 'cm'); }
  },
  draw(g, E) { const st = this.st; if (st.cur != null) scoreCard(g, E, 'Reach', (st.cur > 0 ? '+' : '') + Math.round(st.cur) + ' cm', 'best ' + (st.best > 0 ? '+' : '') + Math.round(st.best) + ' cm (0 = toes)'); },
},

deadhang: hold({
  cat: 'Home fitness', id: 'deadhang', title: 'Dead hang timer', hook: 'How long can you just hang?', need: 'Show your hands and head', stopWord: 'Let go', grace: 0.5,
  setup: ['Phone on a tripod 2 to 3 m from the bar, hands and body in the picture.', 'Hang with straight arms. The clock runs until you let go.'],
  ok(E) { const P = E.Sm; if (!seen(P, [0, 15, 16], 0.35)) return null; return P[15].y < P[0].y && P[16].y < P[0].y; },
}),

/* ---------------- CHALLENGES ---------------- */
reaction: screenGame({
  cat: 'Challenges', id: 'reaction', title: 'Reaction time test', hook: 'Tap the moment it turns yellow.', featured: 1,
  setup: ['No camera needed. Hold the phone, or film yourself with a second phone.', 'Tap anywhere to start. Wait for the screen to turn yellow, then tap as fast as you can.', 'Typical adult reaction to a visual signal is about 0.25 s.'],
  reset(E) { clearTimeout(this.timer); this.st = { st: 'idle', best: null, res: null }; },
  tap(E) {
    const s = this.st;
    if (s.st === 'wait') { clearTimeout(this.timer); s.st = 'early'; return; }
    if (s.st === 'go') { if (!s.t0) return; s.res = performance.now() / 1000 - s.t0; s.st = 'done'; if (!s.best || s.res < s.best) s.best = s.res; s.rank = rankLine(reactionRank(s.res)); E.log(s.res, 's', 'low', s.rank); say((s.res < 0.2 ? 'Lightning fast!' : s.res < 0.25 ? 'Fast reaction.' : s.res < 0.32 ? 'Good reaction.' : 'Bit slow that time.') + ' ' + s.rank); return; }
    s.st = 'wait'; s.t0 = null; this.timer = setTimeout(() => { s.st = 'go'; }, rnd(1500, 4000));
  },
  draw(g, E) {
    const s = this.st, W = E.W, H = E.H; if (s.st === 'go') { if (!s.t0) requestAnimationFrame(() => { if (!s.t0) s.t0 = performance.now() / 1000; }); g.fillStyle = C.saf; g.fillRect(0, 0, W, H); text(g, E, 'TAP!', W / 2, H / 2, 24, C.ink); return; }
    if (s.st === 'idle') bigNote(g, E, 'Tap anywhere to start', C.ind, H * 0.45);
    if (s.st === 'wait') { text(g, E, 'wait...', W / 2, H * 0.45, 16, C.mad); }
    if (s.st === 'early') bigNote(g, E, 'Too soon! Tap to try again', C.mad, H * 0.45);
    if (s.st === 'done') { text(g, E, s.res.toFixed(3) + ' s', W / 2, H * 0.4, 18, C.mad); wrap(g, E, s.rank, 4.2, W * 0.86).forEach((l, i) => text(g, E, l, W / 2, H * 0.49 + i * E.U * 5.5, 4.2, C.ind)); text(g, E, 'best ' + s.best.toFixed(3) + ' s', W / 2, H * 0.6, 4, C.ink, 600); text(g, E, 'tap to go again', W / 2, H * 0.66, 4, C.ink, 600); }
  },
}),

simon: {
  cat: 'Challenges', id: 'simon', title: 'Body Simon Says', hook: 'Copy the poses. One mistake and you are out.', cam: 'user',
  setup: ['Front camera, phone propped up 2 to 3 m away, upper body in the picture.', 'Press Go. Watch the poses, then copy the whole chain, one pose at a time. Each round adds one pose.'],
  buttons: [{ label: 'Go', fn(E) { Object.assign(this.st, { seq: [], level: 0, over: false }); this.next(E); } }],
  POSES: { up: ['Both arms up', '↑↑'], left: ['Left arm out', '←'], right: ['Right arm out', '→'], t: ['Both arms out', '← →'], down: ['Hands down', '↓↓'] },
  reset(E) { this.st = { seq: [], level: 0, phase: 'idle' }; },
  next(E) { const st = this.st; st.seq.push(pick(Object.keys(this.POSES))); st.level = st.seq.length; st.phase = 'show'; st.i = 0; st.showAt = E.now(); say('Watch'); },
  pose(P) {
    if (!seen(P, [11, 12, 15, 16], 0.4)) return null; const sw = dist(P[11], P[12]);
    const lUp = P[15].y < P[0].y, rUp = P[16].y < P[0].y, lOut = Math.abs(P[15].x - P[11].x) > sw * 1.1 && Math.abs(P[15].y - P[11].y) < sw * 0.8, rOut = Math.abs(P[16].x - P[12].x) > sw * 1.1 && Math.abs(P[16].y - P[12].y) < sw * 0.8;
    const lDown = P[15].y > P[11].y + sw * 0.8, rDown = P[16].y > P[12].y + sw * 0.8;
    const scrL = P[15].x < P[16].x ? [lUp, lOut, lDown] : [rUp, rOut, rDown], scrR = P[15].x < P[16].x ? [rUp, rOut, rDown] : [lUp, lOut, lDown];
    if (scrL[0] && scrR[0]) return 'up'; if (scrL[1] && scrR[1]) return 't'; if (scrL[1] && scrR[2]) return 'left'; if (scrR[1] && scrL[2]) return 'right'; if (scrL[2] && scrR[2]) return 'down'; return null;
  },
  frame(E) {
    const st = this.st; if (st.phase === 'show') { const k = Math.floor((E.now() - st.showAt) / 1.1); if (k >= st.seq.length) { st.phase = 'copy'; st.i = 0; st.since = E.now(); say('Go'); } else if (k !== st.shown) { st.shown = k; say(this.POSES[st.seq[k]][0], 1.2); } return; }
    if (st.phase !== 'copy') return; const p = this.pose(E.Sm), want = st.seq[st.i];
    if (p === want) { if (!st.hold) st.hold = E.now(); if (E.now() - st.hold > 0.35) { beep(1300, 0.05); st.i++; st.hold = 0; st.since = E.now(); if (st.i >= st.seq.length) { setTimeout(() => this.next(E), 700); st.phase = 'wait'; } } }
    else { st.hold = 0; if (E.now() - st.since > 4) { st.phase = 'out'; say('Out! Level ' + (st.level - 1)); E.log(st.level - 1, 'level'); } }
  },
  draw(g, E) {
    const st = this.st, U = E.U, W = E.W;
    if (st.phase === 'idle') { bigNote(g, E, 'Press Go'); return; }
    st.seq.forEach((k, j) => { const x = W / 2 + (j - (st.seq.length - 1) / 2) * U * 13, active = (st.phase === 'show' && j === st.shown) || (st.phase === 'copy' && j === st.i); panel(g, E, x - U * 5.5, E.H * 0.04, U * 11, U * 9, active ? C.saf : (st.phase === 'copy' && j < st.i ? C.wi : '#fff')); if (st.phase !== 'copy' || j <= st.i || st.phase === 'show') text(g, E, this.POSES[k][1], x, E.H * 0.04 + U * 4.5, 4, C.ink); });
    scoreCard(g, E, 'Level', String(st.level), st.phase === 'copy' ? 'copy: ' + this.POSES[st.seq[st.i]][0] : st.phase === 'out' ? 'out!' : '');
  },
},

holewall: {
  cat: 'Challenges', id: 'holewall', title: 'Hole in the wall', hook: 'Match the hole before the wall hits you.', cam: 'user',
  setup: ['Front camera, phone propped up 2.5 to 3 m away, whole body in the picture.', 'Press Go. A wall with a body shaped hole comes at you. Match the pose before it arrives.'],
  buttons: [{ label: 'Go', fn(E) { Object.assign(this.st, { phase: 'run', t0: E.now(), score: 0, round: 0 }); this.newWall(E); } }],
  SHAPES: [{ l: -2.6, r: 2.6, ll: -0.2, rl: 0.2 }, { l: -1.57, r: 1.57, ll: -0.2, rl: 0.2 }, { l: -2.6, r: 1.57, ll: -0.5, rl: 0.15 }, { l: -1.57, r: 2.6, ll: -0.15, rl: 0.5 }, { l: -0.6, r: 0.6, ll: -0.5, rl: 0.5 }],
  reset(E) { this.st = { phase: 'idle', score: 0 }; },
  newWall(E) { const st = this.st; st.shape = pick(this.SHAPES); st.w0 = E.now(); st.round++; },
  limb(P, a, b) { return Math.atan2(P[b].x - P[a].x, P[b].y - P[a].y); },
  frame(E) {
    const st = this.st; if (st.phase !== 'run') return; const P = E.Sm, el = E.now() - st.w0, T = Math.max(2.2, 4 - st.round * 0.15);
    if (el >= T) {
      let ok = 0; if (seen(P, [11, 12, 15, 16, 23, 24, 27, 28], 0.35)) { const leftIsScreenLeft = P[11].x < P[12].x; const [lsA, lsB, rsA, rsB] = leftIsScreenLeft ? [11, 15, 12, 16] : [12, 16, 11, 15]; const [lhA, lhB, rhA, rhB] = leftIsScreenLeft ? [23, 27, 24, 28] : [24, 28, 23, 27]; const errs = [[this.limb(P, lsA, lsB), st.shape.l], [this.limb(P, rsA, rsB), st.shape.r], [this.limb(P, lhA, lhB), st.shape.ll], [this.limb(P, rhA, rhB), st.shape.rl]].map(([a, b]) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))); ok = clamp(100 - errs.reduce((s, x) => s + x, 0) / 4 * 120, 0, 100); }
      st.last = ok; if (ok >= 60) { st.score++; beep(1400, 0.08); say('Fit!'); this.newWall(E); } else { st.phase = 'out'; say('Crash! ' + st.score + ' walls.'); E.log(st.score, 'walls'); }
    }
  },
  draw(g, E) {
    const st = this.st, W = E.W, H = E.H, U = E.U; if (st.phase === 'idle') { bigNote(g, E, 'Press Go'); return; }
    if (st.phase === 'run') {
      const el = E.now() - st.w0, T = Math.max(2.2, 4 - st.round * 0.15), sc = L(0.25, 1, clamp(el / T, 0, 1)), cx = W / 2, cy = H * 0.5, s = st.shape, Ls = H * 0.17 * sc;
      g.save(); g.globalAlpha = 0.45; g.fillStyle = C.saf; g.fillRect(cx - W * 0.45 * sc, cy - H * 0.42 * sc, W * 0.9 * sc, H * 0.84 * sc); g.restore();
      g.strokeStyle = C.paper; g.lineCap = 'round'; g.lineWidth = U * 7 * sc; const sh = { x: cx, y: cy - Ls * 0.9 }, hp = { x: cx, y: cy + Ls * 0.2 };
      const seg = (p, a, len) => { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.sin(a) * len, p.y + Math.cos(a) * len); g.stroke(); };
      seg(sh, Math.PI, 0); g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(hp.x, hp.y); g.stroke(); seg(sh, s.l, Ls * 0.8); seg(sh, s.r, Ls * 0.8); seg(hp, s.ll, Ls); seg(hp, s.rl, Ls); g.beginPath(); g.arc(cx, sh.y - Ls * 0.3, Ls * 0.18, 0, 7); g.fillStyle = C.paper; g.fill();
    }
    scoreCard(g, E, 'Walls', String(st.score), st.phase === 'out' ? 'crash! press Go' : st.last != null ? 'last fit ' + Math.round(st.last) + '%' : '');
  },
},

dodge: {
  cat: 'Challenges', id: 'dodge', title: 'Body dodge game', hook: 'My body is the game controller.', cam: 'user',
  setup: ['Front camera, phone propped up 2 to 3 m away, whole body in the picture.', 'Press Go. Balls fall from the top. Move your body so they miss you. Three hits and you are out.'],
  buttons: [{ label: 'Go', fn(E) { Object.assign(this.st, { phase: 'run', balls: [], score: 0, hits: 0, next: E.now() }); } }],
  reset(E) { this.st = { phase: 'idle', balls: [], score: 0, hits: 0 }; },
  frame(E) {
    const st = this.st; if (st.phase !== 'run') return; const now = E.now(), W = E.W, H = E.H, P = E.Sm;
    if (now >= st.next) { st.balls.push({ x: rnd(W * 0.08, W * 0.92), y: -E.U * 5, v: H * rnd(0.35, 0.55) * (1 + st.score * 0.02), r: E.U * rnd(4, 6), t: now }); st.next = now + Math.max(0.35, 1.1 - st.score * 0.02); }
    st.balls.forEach(b => { b.y += b.v * (now - b.t); b.t = now; });
    if (P) st.balls.forEach(b => { if (!b.hit && [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26].some(i => P[i].v > 0.4 && dist(P[i], b) < b.r + E.U * 2)) { b.hit = true; st.hits++; beep(220, 0.15); if (st.hits >= 3) { st.phase = 'out'; say('Out! ' + st.score + ' dodged.'); E.log(st.score, 'dodged'); } } });
    st.balls = st.balls.filter(b => { if (b.y > H + b.r) { if (!b.hit) st.score++; return false; } return !b.hit; });
  },
  draw(g, E) { const st = this.st; st.balls.forEach(b => { g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fillStyle = C.mad; g.fill(); g.lineWidth = E.U * 0.5; g.strokeStyle = C.paper; g.stroke(); }); if (st.phase === 'idle') bigNote(g, E, 'Press Go'); scoreCard(g, E, 'Dodged', String(st.score), 'hits ' + st.hits + ' of 3' + (st.phase === 'out' ? ', out!' : ''), E.U * 5, E.H * 0.05); },
},

nolaugh: {
  cat: 'Challenges', id: 'nolaugh', title: 'Try not to laugh', hook: 'The AI catches your first smile.', cam: 'user', face: true, pose: false, skeleton: false,
  setup: ['Front camera, face the phone, good light.', 'Play a funny clip on another screen (or have a friend try to make you laugh). Press Go and keep a straight face. The timer stops at your first smile.'],
  buttons: [{ label: 'Go', fn(E) { Object.assign(this.st, { phase: 'run', t0: E.now() }); say('Go! Straight face.'); } }],
  reset(E) { this.st = { phase: 'idle', best: 0, sm: 0 }; },
  frame(E) { const st = this.st; if (!E.F) { E.msg = 'Show your face'; return; } st.sm = ((E.B.mouthSmileLeft || 0) + (E.B.mouthSmileRight || 0)) / 2; if (st.phase === 'run' && st.sm > 0.45) { st.res = E.now() - st.t0; st.phase = 'done'; st.best = Math.max(st.best, st.res); say('You smiled! ' + Math.round(st.res) + ' seconds.'); E.log(st.res, 's'); } },
  draw(g, E) { const st = this.st; meter(g, E, st.sm, 0.45, E.W - E.U * 12, E.H * 0.3, E.H * 0.3, 'smile'); if (st.phase === 'run') scoreCard(g, E, 'Straight face', mmss(E.now() - st.t0), ''); if (st.phase === 'done') scoreCard(g, E, 'Smiled at', mmss(st.res), 'best ' + st.best.toFixed(1) + ' s', E.U * 5, E.H * 0.6, C.mad); if (st.phase === 'idle') bigNote(g, E, 'Press Go. Do not smile.'); },
},

/* ---------------- FAMILY ---------------- */
jacksrace: {
  cat: 'Family', id: 'jacksrace', title: 'Jumping jack race', hook: 'Dad vs son. 30 seconds of jumping jacks.', people: 2, model: 'full',
  settings: [{ k: 'secs', label: 'Race length (seconds)', def: 30 }],
  setup: ['Phone on a tripod 3 to 4 m away. Two people side by side, both whole bodies in the picture.', 'Press Go. The app counts full jumping jacks for each person (hands above head, feet apart) and calls the winner.'],
  buttons: [{ label: 'Go', fn(E) { const st = this.st; say('Three, two, one, go!'); Object.assign(st, { phase: 'count', t0: E.now() + 2.5, n: [0, 0], open: [false, false] }); } }],
  reset(E) { this.st = { phase: 'idle', n: [0, 0], open: [false, false] }; },
  frame(E) {
    const st = this.st, now = E.now(); if (st.phase !== 'count' || now < st.t0) return;
    E.Ps.slice(0, 2).forEach((P, i) => { if (!seen(P, [0, 15, 16, 27, 28, 23, 24], 0.35)) return; const open = P[15].y < P[0].y && P[16].y < P[0].y && Math.abs(P[27].x - P[28].x) > dist(P[23], P[24]) * 1.6, closed = P[15].y > P[11].y && P[16].y > P[12].y; if (open && !st.open[i]) { st.open[i] = true; } if (closed && st.open[i]) { st.open[i] = false; st.n[i]++; beep(i ? 1100 : 800, 0.03); } });
    if (now - st.t0 >= E.S.secs) { st.phase = 'done'; const [a, b] = st.n; say(a === b ? 'Draw!' : (a > b ? 'Left wins!' : 'Right wins!')); E.log(Math.max(a, b), 'jacks'); }
  },
  draw(g, E) {
    const st = this.st, W = E.W, H = E.H, U = E.U;
    ['LEFT', 'RIGHT'].forEach((n, i) => card(g, E, [[n, 4, C.ink, 600], [String(st.n[i]), 14, i ? C.mad : C.ind]], i ? W - U * 5 : U * 5, H * 0.06, i ? 'right' : 'left'));
    if (st.phase === 'count') { const left = st.t0 - E.now(); card(g, E, [[left > 0 ? String(Math.ceil(left)) : Math.ceil(E.S.secs - (E.now() - st.t0)) + ' s', 9, C.mad]], W / 2, H * 0.06); }
    if (st.phase === 'done') { const [a, b] = st.n; bigNote(g, E, a === b ? 'Draw!' : (a > b ? 'LEFT' : 'RIGHT') + ' wins!', C.mad, H * 0.3); }
    if (st.phase === 'idle') bigNote(g, E, 'Two players in the picture, then Go', C.ind, H * 0.3);
  },
},

freezedance: {
  cat: 'Family', id: 'freezedance', title: 'Freeze dance', hook: 'When the music stops, the AI sees who moved.', people: 4, model: 'full',
  setup: ['Phone on a tripod 3 to 4 m away, up to 4 people in the picture. Sound on.', 'Press Go. Dance while the music plays. When it stops, freeze. Anyone still moving after half a second is out.'],
  buttons: [{ label: 'Go', fn(E) { this.st.phase = 'music'; this.st.until = E.now() + rnd(4, 9); this.st.out = new Set(); this.play(E); } }],
  reset(E) { this.stop(); this.st = { phase: 'idle', out: new Set(), moved: [] }; },
  play(E) {
    this.stop(); const a = audio(); const notes = [262, 330, 392, 523, 392, 330]; let i = 0;
    this.iv = setInterval(() => { const o = a.createOscillator(), gn = a.createGain(); o.type = 'triangle'; o.frequency.value = notes[i++ % notes.length] * (i % 8 < 4 ? 1 : 1.25); gn.gain.setValueAtTime(0.25, a.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22); o.connect(gn); gn.connect(a.destination); o.start(); o.stop(a.currentTime + 0.25); if (i % 2) beep(110, 0.05, 0.3, 'sine'); }, 250);
  },
  stop() { clearInterval(this.iv); },
  frame(E) {
    const st = this.st, now = E.now();
    if (st.phase === 'music' && now >= st.until) { this.stop(); st.phase = 'freeze'; st.fz = now; st.ref = null; st.moved = []; say('Freeze!'); }
    if (st.phase === 'freeze') {
      const Ps = E.Ps; if (now - st.fz > 0.6 && !st.ref) st.ref = Ps.map(P => P.map(p => ({ ...p })));
      if (st.ref) Ps.forEach((P, i) => { const R = st.ref[i]; if (!R || !seen(P, [0, 11, 12], 0.4)) return; const s = bodyH(P) || 1, m = [0, 11, 12, 15, 16, 25, 26].reduce((a, k) => a + dist(P[k], R[k]), 0) / 7 / s; if (m > 0.04 && !st.moved.includes(i)) { st.moved.push(i); beep(200, 0.2); } });
      if (now - st.fz > 2.6) { if (st.moved.length) say(st.moved.length === 1 ? 'Someone moved!' : 'A few people moved!'); st.phase = 'music'; st.until = now + rnd(4, 9); setTimeout(() => this.play(E), 1500); st.showMoved = st.moved.slice(); st.showAt = now; }
    }
  },
  draw(g, E) {
    const st = this.st, U = E.U;
    if (st.phase === 'idle') { bigNote(g, E, 'Press Go and dance'); return; }
    card(g, E, [[st.phase === 'freeze' ? 'FREEZE!' : '♪ dance ♪', 9, st.phase === 'freeze' ? C.mad : C.ind]], E.W / 2, E.H * 0.05);
    const list = st.phase === 'freeze' ? st.moved : (st.showAt && E.now() - st.showAt < 2.5 ? st.showMoved : []);
    (list || []).forEach(i => { const P = E.Ps[i]; if (!P) return; const xs = P.map(p => p.x), ys = P.map(p => p.y); g.strokeStyle = C.mad; g.lineWidth = U; g.strokeRect(Math.min(...xs) - U * 3, Math.min(...ys) - U * 6, Math.max(...xs) - Math.min(...xs) + U * 6, Math.max(...ys) - Math.min(...ys) + U * 9); text(g, E, 'moved!', (Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...ys) - U * 9, 5, C.mad); });
  },
},
};

export const ALL_TITLES = {};
