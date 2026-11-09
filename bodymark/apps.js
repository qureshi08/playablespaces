// The six first apps. Each one: setup text, settings, frame(E) logic, draw(g, E) on screen.
import { store, C, dist, mid, angle, seen, clamp, card, text, dashed, panel, beep, say, meter } from './engine.js';

/* Bolt, Berlin 2009 (9.58 WR), official cumulative splits from the gun, reaction 0.146 s */
const BOLT = [[0, 0], [0.146, 0], [1.89, 10], [2.88, 20], [3.78, 30]];
function boltDist(t) {
  if (t <= 0.146) return 0;
  if (t <= 1.89) return 10 * Math.pow((t - 0.146) / (1.89 - 0.146), 1.6);
  for (let i = 2; i < BOLT.length - 1; i++) if (t <= BOLT[i + 1][0]) return L(BOLT[i][1], BOLT[i + 1][1], (t - BOLT[i][0]) / (BOLT[i + 1][0] - BOLT[i][0]));
  return 30 + (t - 3.78) * 11.5;
}
const BOLT_TIME = { 10: 1.89, 20: 2.88, 30: 3.78 };
const L = (a, b, u) => a + (b - a) * u;
const fmt = s => s.toFixed(2) + ' s';

/* shared hold timer: call with inHold every frame; returns finished hold length or 0 */
function holdTimer(st, E, inHold, grace = 0.3) {
  if (inHold) { if (st.hs == null) { st.hs = E.t; beep(1100, 0.07); } st.lastIn = E.t; st.cur = E.t - st.hs; return 0; }
  if (st.hs != null && E.t - st.lastIn > grace) { const d = st.lastIn - st.hs; st.hs = null; st.cur = 0; return d; }
  return 0;
}
/* crossing time of a moving x past a line, interpolated between frames */
function crossed(prevX, x, line, prevT, t) {
  if (prevX == null || (prevX - line) * (x - line) > 0 || prevX === x) return null;
  return prevT + (t - prevT) * (line - prevX) / (x - prevX);
}

export const APPS = {

/* 1 ---------------------------------------------------------------- */
pullup: {
  id: 'pullup', featured: 1, title: 'Strict pull up check', hook: 'Only chin over bar counts.', cam: 'environment',
  cat: 'Calisthenics',
  settings: [{ k: 'top', label: 'Top counts at (% of the way up)', def: 80 }],
  setup: ['Phone on the ground or a tripod, 2 to 3 m from the bar, filming from the front or from behind.', 'Your hands, elbows and shoulders must be in the picture.', 'Hang with straight arms, then go. A rep counts when your shoulders rise to the bar (chin over bar) and your arms straighten again.'],
  reset(E) { this.st = { reps: 0, no: 0, phase: 'off', arm: null, h: 0, last: '', lastAt: 0, barY: null }; },
  frame(E) {
    // height = how far the shoulders have climbed toward the hands: 0 at a dead hang, 1 with shoulders at the bar
    const st = this.st, P = E.Sm;
    if (!seen(P, [11, 12, 13, 14, 15, 16], 0.4)) { E.msg = 'Show your hands, elbows and shoulders'; return; }
    const arm = (dist(P[11], P[13]) + dist(P[13], P[15]) + dist(P[12], P[14]) + dist(P[14], P[16])) / 2;
    const wy = (P[15].y + P[16].y) / 2, sy = (P[11].y + P[12].y) / 2;
    st.barY = st.barY == null ? wy : st.barY * 0.9 + wy * 0.1;
    if (wy > sy + arm * 0.3) { st.phase = 'off'; E.msg = 'Grab the bar'; return; }
    const ext = Math.min(angle(P[11], P[13], P[15]), angle(P[12], P[14], P[16])) > 145;
    if (ext) st.arm = st.arm ? Math.max(st.arm * 0.995, arm) : arm; // straight arm length, slowly forgetting
    if (!st.arm) { E.msg = 'Hang with straight arms first'; return; }
    st.h = clamp(1 - (sy - wy) / st.arm, 0, 1.2);
    const topAt = E.S.top / 100;
    if (st.phase === 'off') { if (st.h < 0.25) st.phase = 'bottom'; return; }
    if (st.phase === 'bottom') { if (st.h > 0.4) { st.phase = 'up'; st.top = false; } return; }
    if (st.phase === 'up') {
      if (st.h >= topAt && !st.top) { st.top = true; beep(1300, 0.06); }
      if (st.h < 0.25) {
        if (st.top) { st.reps++; say(String(st.reps)); st.last = 'good'; E.log(st.reps, 'reps'); }
        else { st.no++; say('No rep'); st.last = 'no'; }
        st.lastAt = E.t; st.phase = 'bottom';
      }
    }
  },
  draw(g, E) {
    const st = this.st, W = E.W, H = E.H, U = E.U;
    if (st.barY != null) { dashed(g, E, 0, st.barY, W, st.barY, C.mad, 0.7); text(g, E, 'bar', U * 6, st.barY - U * 3, 3.2, C.mad, 700); }
    const c = card(g, E, [['Reps', 4, C.ink, 600], [String(st.reps), 16, C.mad]], U * 5, H * 0.62, 'left');
    card(g, E, [['No reps', 3.4, C.ink, 600], [String(st.no), 7, C.ind]], U * 5 + c.w + U * 3, H * 0.62 + c.h - U * 17, 'left');
    meter(g, E, st.h, E.S.top / 100, W - U * 12, H * 0.35, H * 0.3, 'height');
    if (st.phase === 'up' && st.top) card(g, E, [['Chin over bar ✓', 5, C.ind]], W / 2, H * 0.26);
    else if (E.t - st.lastAt < 1.2 && st.last) card(g, E, [[st.last === 'good' ? 'Rep ' + st.reps + ' ✓' : 'No rep: not high enough', 5.5, st.last === 'good' ? C.ind : C.mad]], W / 2, H * 0.26);
  },
},

/* 2 ---------------------------------------------------------------- */
lever: {
  cat: 'Calisthenics', id: 'lever', title: 'Front lever angle', hook: 'Is my front lever actually flat?', cam: 'environment',
  settings: [{ k: 'tol', label: 'Counts as a hold within (degrees)', def: 10 }],
  setup: ['Phone on a tripod, side on to you, about 3 m away, level with the bar.', 'Your whole body, bar to feet, must be in the picture.', 'Pull into the lever. The app shows your body angle live and times every hold within the limit you set.'],
  reset(E) { this.st = { deg: null, best: 0, last: 0, lastAt: 0, cur: 0, hs: null }; },
  frame(E) {
    const st = this.st, P = E.Sm;
    const sideL = [11, 23, 27].reduce((s, i) => s + (P ? P[i].v : 0), 0), sideR = [12, 24, 28].reduce((s, i) => s + (P ? P[i].v : 0), 0);
    const ids = sideL >= sideR ? [11, 23, 27, 15] : [12, 24, 28, 16];
    if (!seen(P, ids, 0.35)) { st.deg = null; holdTimer(st, E, false); E.msg = 'Show your whole body side on'; return; }
    const [sh, hip, an, wr] = ids.map(i => P[i]);
    const dx = Math.abs(an.x - sh.x) || 1; st.deg = Math.atan2(an.y - sh.y, dx) * 180 / Math.PI; st.sh = sh; st.an = an; st.hip = hip;
    const hanging = wr.y < sh.y, flatish = dx > dist(sh, an) * 0.6;
    const done = holdTimer(st, E, hanging && flatish && Math.abs(st.deg) <= E.S.tol);
    if (done > 0.8) { st.last = done; st.lastAt = E.t; st.best = Math.max(st.best, done); say(Math.round(done) + ' seconds.'); E.log(done, 's'); }
  },
  draw(g, E) {
    const st = this.st, U = E.U, W = E.W, H = E.H;
    if (st.deg != null) {
      dashed(g, E, st.sh.x, st.sh.y, st.sh.x + (st.an.x > st.sh.x ? 1 : -1) * W, st.sh.y, C.wi, 0.6);
      g.strokeStyle = C.mad; g.lineWidth = U * 1.1; g.beginPath(); g.moveTo(st.sh.x, st.sh.y); g.lineTo(st.an.x, st.an.y); g.stroke();
      const d = Math.abs(st.deg), ok = d <= E.S.tol;
      card(g, E, [[Math.round(d) + '°', 15, ok ? C.ind : C.mad], [(st.deg >= 0 ? 'below' : 'above') + ' flat', 4.5, C.ink, 600]], W / 2, H * 0.6);
    }
    const lines = [['Hold', 3.6, C.ink, 600], [(st.hs != null ? st.cur : st.last).toFixed(1) + ' s', 8, st.hs != null ? C.mad : C.ind]];
    if (st.best) lines.push(['best ' + st.best.toFixed(1) + ' s', 3.4, C.ink, 600]);
    card(g, E, lines, U * 5, H * 0.08, 'left');
  },
},

/* 3 ---------------------------------------------------------------- */
handstand: {
  cat: 'Calisthenics', id: 'handstand', title: 'Handstand judge', hook: 'AI judges my handstand like an Olympic judge.', cam: 'environment',
  setup: ['Phone on a tripod 3 m away, from the side for line, or from the front for balance.', 'Leave space above your feet so the whole body stays in the picture.', 'Kick up and hold. When you come down the app gives a score out of 10 from your line and your hold time.'],
  reset(E) { this.st = { hs: null, cur: 0, sum: 0, n: 0, line: 0, result: null, resAt: 0 }; },
  frame(E) {
    const st = this.st, P = E.Sm;
    if (!seen(P, [11, 12, 15, 16, 23, 24, 27, 28], 0.35)) { const d = holdTimer(st, E, false, 0.4); if (d) this.finish(E, d); E.msg = 'Show your whole body, hands to feet'; return; }
    const Wr = mid(P[15], P[16]), Sh = mid(P[11], P[12]), Hp = mid(P[23], P[24]), An = mid(P[27], P[28]);
    const inv = An.y < Hp.y && Hp.y < Sh.y && Sh.y < Wr.y + dist(Wr, Sh) * 0.3;
    const a = (p, q) => Math.atan2(q.x - p.x, p.y - q.y) * 180 / Math.PI;
    const a1 = a(Wr, Sh), a2 = a(Sh, Hp), a3 = a(Hp, An);
    const dev = (Math.abs(a1 - a2) + Math.abs(a2 - a3)) / 2 + 0.5 * Math.abs((a1 + a2 + a3) / 3);
    st.line = clamp(100 - dev * 2.5, 0, 100); st.pts = [Wr, Sh, Hp, An];
    if (inv) { st.sum += st.line; st.n++; }
    const d = holdTimer(st, E, inv, 0.4);
    if (d) this.finish(E, d);
  },
  finish(E, d) {
    const st = this.st; if (d < 1.5 || !st.n) { st.sum = 0; st.n = 0; return; }
    const avg = st.sum / st.n, score = Math.round((4 + 4 * avg / 100 + 2 * Math.min(1, d / 30)) * 10) / 10;
    st.result = { score, avg, d, cards: [score - 0.1, score + 0.1, score].map(x => clamp(x, 0, 10).toFixed(1)) }; st.resAt = E.t;
    st.sum = 0; st.n = 0; say('Score. ' + score.toFixed(1)); E.log(score, '/10');
  },
  draw(g, E) {
    const st = this.st, U = E.U, W = E.W, H = E.H;
    if (st.hs != null && st.pts) {
      dashed(g, E, st.pts[0].x, st.pts[0].y, st.pts[0].x, st.pts[3].y - U * 8, C.wi, 0.6);
      g.strokeStyle = C.mad; g.lineWidth = U * 1; g.beginPath(); st.pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
      card(g, E, [['Hold', 3.6, C.ink, 600], [st.cur.toFixed(1) + ' s', 9, C.mad], ['line ' + Math.round(st.line) + '% straight', 3.6, C.ind, 600]], U * 5, H * 0.08, 'left');
    }
    if (st.result && st.hs == null) {
      const r = st.result, y = H * 0.55;
      card(g, E, [['Judges', 4, C.ink, 600], [r.score.toFixed(1) + ' / 10', 13, C.mad], ['hold ' + r.d.toFixed(1) + ' s, line ' + Math.round(r.avg) + '%', 3.6, C.ink, 600]], W / 2, y);
      r.cards.forEach((c, i) => { const x = W / 2 + (i - 1) * U * 16 - U * 6; panel(g, E, x, y - U * 18, U * 12, U * 14, '#fff'); text(g, E, c, x + U * 6, y - U * 11, 5, C.ind); });
      text(g, E, 'app score, not an official one', W / 2, H * 0.93, 3, C.paper, 500);
    }
  },
},

/* 4 ---------------------------------------------------------------- */
/* 5 ---------------------------------------------------------------- */
/* 6 ---------------------------------------------------------------- */
ghost: {
  cat: 'Speed', id: 'ghost', featured: 1, title: 'Bolt ghost race', hook: 'I raced Usain Bolt\'s ghost over 10 m.', cam: 'environment', model: 'full',
  gates: 2, gateNames: ['start cone', 'finish cone'], gateLabels: ['START', 'FINISH'],
  settings: [{ k: 'dist', label: 'Race distance (m)', type: 'select', options: [10, 20, 30], def: 10 }],
  setup: ['Put a cone on the start line and one at 10 m. Run across the picture, not toward the phone.', 'Phone on a tripod side on, far enough back to see both cones (about 8 m for 10 m).', 'Press Set lines and tap the start cone, then the finish cone.', 'Stand at the start line and press Race. On the beep, go. Bolt\'s ghost runs his real Berlin 2009 splits beside you.'],
  action: { label: 'Race', fn(E) { APPS.ghost.start(E); } },
  reset(E) { clearTimeout(this.timer); this.st = { phase: 'idle', prevX: null, prevT: 0, you: null, t0: null }; },
  start(E) {
    const st = this.st, S = E.S; if (!S.gates || S.gates.length < 2) { E.toast('Set the lines first'); return; }
    clearTimeout(this.timer); Object.assign(st, { phase: 'marks', you: null, t0: null, startX: null, fs: false, path: [] });
    say('On your marks'); this.timer = setTimeout(() => { st.phase = 'set'; say('Set'); st.startX = null;
      this.timer = setTimeout(() => { if (st.phase !== 'set') return; beep(1000, 0.3, 0.5); st.t0 = E.now(); st.phase = 'run'; }, 1600 + Math.random() * 1000); }, 2600);
  },
  frame(E) {
    const st = this.st, P = E.P, S = E.S; if (!S.gates || S.gates.length < 2) return;
    const gA = S.gates[0] * E.W, gB = S.gates[1] * E.W, dir = Math.sign(gB - gA) || 1, t = E.t;
    const ok = seen(P, [23, 24], 0.35), x = ok ? (P[23].x + P[24].x) / 2 : null;
    if (ok) { st.hipX = x; st.leg = (dist(P[23], P[27]) + dist(P[24], P[28])) / 2 || st.leg; st.feetY = Math.max(P[27].y, P[28].y); }
    if (st.phase === 'set' && ok) { if (st.startX == null) st.startX = x; else if ((x - st.startX) * dir > (st.leg || E.W * 0.05) * 0.35) { st.phase = 'idle'; clearTimeout(this.timer); say('False start'); E.toast('False start! Press Race again', 2500); } }
    if (st.phase === 'run') {
      const el = E.now() - st.t0; if (ok && st.you == null) st.path.push([Math.round(el * 1000) / 1000, Math.round((x - gA) / (gB - gA) * 1000) / 1000]);
      if (ok && st.you == null) { const ct = crossed(st.prevX, x, gB, st.prevT, t); if (ct != null) { st.you = el - (t - ct); beep(1400, 0.06); } }
      const bt = BOLT_TIME[S.dist];
      if (el > Math.max(bt, st.you || 0) + 0.4 && st.you != null) {
        st.phase = 'done'; st.gap = st.you - bt; st.pct = Math.round(bt / st.you * 100);
        const lastAll = store.get('moves:ghostlast', {}), last = lastAll[S.dist]; st.prev = last ? last.you : null;
        lastAll[S.dist] = { you: st.you, at: Date.now() }; store.set('moves:ghostlast', lastAll);
        st.rank = 'I ran ' + st.pct + '% of Bolt\'s speed';
        say(st.pct + ' percent of Bolt\'s speed.');
        E.log(st.you, 's', 'low', st.rank);
      }
      if (el > 15) { st.phase = 'idle'; E.toast('No finish seen. Press Race again'); }
    }
    st.prevX = x; st.prevT = t;
  },
  draw(g, E) {
    const st = this.st, U = E.U, W = E.W, H = E.H, S = E.S; if (!S.gates || S.gates.length < 2) return;
    const gA = S.gates[0] * W, gB = S.gates[1] * W, bt = BOLT_TIME[S.dist];
    if (st.phase === 'marks' || st.phase === 'set') card(g, E, [[st.phase === 'marks' ? 'On your marks' : 'Set', 9, C.mad]], W / 2, H * 0.3);
    if (st.phase === 'run' || st.phase === 'done') {
      const el = st.phase === 'run' ? E.now() - st.t0 : Math.max(bt, st.you || 0);
      const gx = gA + (gB - gA) * clamp(boltDist(el) / S.dist, 0, 1);
      this.drawGhost(g, E, gx);
      if (st.phase === 'run') card(g, E, [[el.toFixed(2) + ' s', 12, C.mad]], W / 2, H * 0.08);
    }
    if (st.phase === 'done') {
      const gapTxt = st.gap >= 0 ? st.gap.toFixed(2) + ' s behind Bolt' : (-st.gap).toFixed(2) + ' s ahead of Bolt';
      const lines = [['Bolt ' + fmt(bt) + ', you ' + fmt(st.you), 5.2, C.mad], [st.pct + '% of Bolt\'s speed', 4.6, C.ind], [gapTxt, 3.6, C.ink, 600]];
      if (st.prev != null) lines.push([(st.prev - st.you >= 0 ? (st.prev - st.you).toFixed(2) + ' s faster' : (st.you - st.prev).toFixed(2) + ' s slower') + ' than last time', 3.6, C.ink, 600]);
      card(g, E, lines, W / 2, H * 0.1);
    }
    if (st.phase === 'idle') card(g, E, [['Stand on the start line,', 4, C.ink, 600], ['then press Race', 4, C.ink, 600]], W / 2, H * 0.12);
  },
  drawGhost(g, E, gx) {
    const P = E.Sm, U = E.U;
    g.save(); g.globalAlpha = 0.6; g.strokeStyle = C.wi; g.lineCap = 'round';
    let topY;
    if (P && this.st.hipX != null && seen(P, [23, 24, 11, 12], 0.35)) {
      const dx = gx - (P[23].x + P[24].x) / 2;
      g.lineWidth = U * 2.4;
      [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]].forEach(([a, b]) => { g.beginPath(); g.moveTo(P[a].x + dx, P[a].y); g.lineTo(P[b].x + dx, P[b].y); g.stroke(); });
      g.beginPath(); g.arc(P[0].x + dx, P[0].y, U * 3.5, 0, 7); g.stroke(); topY = P[0].y - U * 7;
    } else {
      const fy = E.H * 0.8, s = E.H * 0.004; g.lineWidth = U * 2;
      g.beginPath(); g.moveTo(gx, fy - 44 * s); g.lineTo(gx - 12 * s, fy); g.moveTo(gx, fy - 44 * s); g.lineTo(gx + 12 * s, fy); g.moveTo(gx, fy - 44 * s); g.lineTo(gx + 6 * s, fy - 78 * s); g.stroke();
      g.beginPath(); g.arc(gx + 8 * s, fy - 90 * s, 10 * s, 0, 7); g.stroke(); topY = fy - 104 * s;
    }
    g.restore(); text(g, E, 'BOLT', gx, topY, 4, C.ind);
  },
},
};

function S_fmtGap(kmh) { const d = 44.7 - kmh; return d > 0 ? d.toFixed(1) + ' km/h slower than Bolt' : 'faster than Bolt?! Check the cones'; }
