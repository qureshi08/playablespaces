// The push up coach: Bodymark's launch product. Copies Clicky's shape (an ai buddy that watches and talks), applied to
// Anas's own training: phone leaned on a shoe on plain ground, about 2 m away at a slight diagonal (best angle for counting).
// Flow from the UX research: setup gate (whole body, in a plank) -> spoken countdown -> count only real reps out loud ->
// ends by itself when you stand up -> result. No buttons while you train; every element has its own fixed zone.
import { C, seen, angle, side, clamp, text, say, comment, sfx, scribble } from './engine.js';

const fromHoriz = (a, b) => Math.abs(Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180 / Math.PI);
// one zone each, drawn in this order, never stacked: TOP (cue or count), MID (nothing, the person), BOTTOM (depth bar)
function pill(g, E, s, y, size, col = '#fff', bg = 'rgba(18,16,31,.72)') {
  g.font = `900 ${size * E.U}px 'Archivo', sans-serif`; if ('fontStretch' in g) g.fontStretch = 'condensed';
  const w = g.measureText(s).width + E.U * 8, h = size * E.U * 1.25;
  g.save(); g.fillStyle = bg; g.beginPath(); g.roundRect(E.W / 2 - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.restore();
  text(g, E, s, E.W / 2, y + size * E.U * 0.04, size, col, 900);
}

export const PUSHUPS = {
  id: 'pushups', title: 'push ups', hook: 'The AI only counts real push ups.', immersive: true, model: 'full',
  setup: [
    'Lean your phone against your shoe or a bottle on the ground, about 2 steps away, a little to the side of you.',
    'Get into a plank. The coach starts by itself when it can see all of you.',
    'Go all the way down for every rep. Half reps get called out. Stand up when you are done.',
  ],
  reset(E) { this.st = { state: 'setup', n: 0, no: 0, phase: 'top', d: 0, deep: false, seen0: 0, lastMove: 0, best: null, cue: '', cueAt: 0 }; },
  barVisible(E) { return this.st.state === 'done'; },
  // depth of the current rep from the elbow angle (side or diagonal view): 0 = arms straight, 1 = elbows at 90 degrees
  read(E) {
    const P = E.Sm; if (!P) return { ok: false, why: 'far' };
    const [s, e, w, h, , a] = side(P);
    if (!seen(P, [s, e, w], 0.4)) return { ok: false, why: 'far' };
    if (!seen(P, [h, a], 0.3)) return { ok: false, why: 'feet' };
    const flat = fromHoriz(P[s], P[a]) < 40;
    return { ok: true, flat, d: clamp((165 - angle(P[s], P[e], P[w])) / 75, 0, 1.2) };
  },
  frame(E) {
    const st = this.st, r = this.read(E), now = E.now();
    if (st.state === 'setup') {
      st.cue = !r.ok ? (r.why === 'feet' ? 'feet in view' : 'step back') : !r.flat ? 'get in a plank' : 'hold it';
      if (r.ok && r.flat) { st.seen0 = st.seen0 || now; if (now - st.seen0 > 1) { st.state = 'count'; st.c0 = now; say('Three, two, one, go!'); } }
      else st.seen0 = 0;
      return;
    }
    if (st.state === 'count') { if (now - st.c0 > 2.6) { st.state = 'run'; st.lastMove = now; st.lastFlat = now; sfx.go(); } return; }
    if (st.state !== 'run') return;
    if (r.ok && r.flat) st.lastFlat = now;
    if (r.ok) {
      st.d = r.d;
      if (st.phase === 'top' && r.d > 0.35) { st.phase = 'move'; st.deep = false; st.lastMove = now; }
      if (st.phase === 'move') {
        if (r.d >= 0.75 && !st.deep) { st.deep = true; }
        if (r.d < 0.2) {
          if (st.deep) { st.n++; say(String(st.n)); st.flash = { ok: true, t: now }; } else { st.no++; say('No rep.'); st.flash = { ok: false, t: now }; }
          st.phase = 'top'; st.lastMove = now;
        }
      }
    }
    // done when you stand up (no plank for 2.5 s) after at least one attempt, or nothing happens for 10 s
    if ((st.n + st.no > 0 && now - st.lastFlat > 2.5) || now - st.lastMove > 10) this.finish(E);
  },
  finish(E) {
    const st = this.st; st.state = 'done';
    say('Done. Nice work.');
    if (st.n > 0) E.log(st.n, 'reps', 'high', null, { pill: st.no ? st.no + ' HALF REPS CALLED OUT' : 'ZERO HALF REPS', who: 'real push ups only' });
    document.getElementById('doneN').textContent = st.n;
    document.getElementById('doneSub').textContent = st.no ? `${st.no} half rep${st.no > 1 ? 's' : ''} didn't count` : 'not a single half rep. clean.';
    document.getElementById('done').classList.add('on');
  },
  draw(g, E) {
    const st = this.st, U = E.U, W = E.W, H = E.H, now = E.now(), hookOn = now < E.hookUntil;
    if (st.state === 'setup') {
      // a dashed plank outline shows where to be; the cue word is the only text
      g.save(); g.setLineDash([U * 2.4, U * 1.8]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = U * 0.9; g.lineCap = 'round';
      const y = H * 0.72; g.beginPath(); g.moveTo(W * 0.18, y); g.lineTo(W * 0.78, y - H * 0.06); g.stroke();
      g.beginPath(); g.arc(W * 0.82, y - H * 0.075, U * 3.2, 0, 7); g.stroke(); g.beginPath(); g.moveTo(W * 0.74, y - H * 0.055); g.lineTo(W * 0.74, y + H * 0.02); g.stroke(); g.restore();
      if (!hookOn) pill(g, E, st.cue, H * 0.16, 11);
      return;
    }
    if (st.state === 'count') { const k = Math.min(3, Math.floor((now - st.c0) / 0.75)); pill(g, E, ['3', '2', '1', 'go!'][k], H * 0.2, 26, C.yellow); return; }
    if (st.state === 'run' || st.state === 'done') {
      // TOP zone: the count, nothing else
      if (!hookOn) pill(g, E, String(st.n), H * 0.17, 30);
      // a short tick or cross next to the count right after each rep
      if (st.flash && now - st.flash.t < 0.9) scribble(g, E, st.flash.ok ? 'clean!' : 'half rep', W / 2, H * 0.31, 7, st.flash.ok ? C.yellow : C.coral);
      // BOTTOM zone: how deep you are right now, with the line you must reach
      const bx = W * 0.12, bw = W * 0.76, by = H * 0.9, bh = U * 3.2;
      g.save(); g.fillStyle = 'rgba(18,16,31,.6)'; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.fill();
      g.fillStyle = st.d >= 0.75 ? C.yellow : '#fff'; g.beginPath(); g.roundRect(bx, by, Math.max(bh, bw * clamp(st.d, 0, 1)), bh, bh / 2); g.fill();
      g.fillStyle = C.coral; g.fillRect(bx + bw * 0.75 - U * 0.4, by - U * 1.2, U * 0.8, bh + U * 2.4); g.restore();
      text(g, E, 'depth', bx, by - U * 3, 3.2, '#fff', 800, 'left');
    }
  },
};
