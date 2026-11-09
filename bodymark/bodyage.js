// Body Age: three quick tests in a row, combined into one "body age". A wellness estimate, not a diagnosis.
// 1. One leg stand, eyes closed (Springer 2007 age means). 2. Countermovement jump (Canadian Health Measures Survey medians).
// 3. Sitting rising test, scored 0 to 10 (Brito et al. 2012); reported beside the body age, not mixed into it, because it has no age norms we can use.
import { C, dist, seen, clamp, card, text, beep, say, scoreCard, bigNote, labelFor } from './engine.js';
import { PROFILE } from './norms.js';

const L = (a, b, u) => a + (b - a) * u;
// piecewise linear lookup through sorted [x, y] points (x ascending), clamped at the ends
const lookup = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) return L(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])); return pts[pts.length - 1][1]; };
// eyes closed seconds -> age whose average matches (Springer: 20 to 49 about 20.7 s, 50s 6.1 s, 60s 2.0 s, 70s 1.0 s)
const BAL_AGE = [[0, 82], [1.0, 75], [2.0, 65], [6.1, 55], [20.7, 35], [30, 22]];
// jump cm -> age whose median matches (CHMS medians: men 49.4 / 45.8 / 41.1 cm at 22 / 32 / 42; women 31.8 / 30.9 / 29.1)
const JUMP_AGE = { Male: { at: 22, med: 49.4, perYear: (49.4 - 41.1) / 20 }, Female: { at: 22, med: 31.8, perYear: (31.8 - 29.1) / 20 } };
const jumpAge = (cm, sex) => { const j = JUMP_AGE[sex === 'Female' ? 'Female' : 'Male']; return clamp(j.at + (j.med - cm) / j.perYear, 18, 85); };
const legLen = P => (dist(P[23], P[27]) + dist(P[24], P[28])) / 2;
const footY = P => Math.max(P[27].y, P[28].y, P[29] ? Math.max(P[29].y, P[30].y) : 0);
const hipY = P => (P[23].y + P[24].y) / 2;

export const BODYAGE = {
  id: 'bodyage', title: 'How old is your body?', hook: 'How old is my body, really?', cat: 'Body age', model: 'full',
  settings: PROFILE,
  setup: [
    'Prop the phone up about 3 m away so your whole body is in the picture, with space above your head. Clear the floor around you.',
    'Step 1, balance: stand on one leg and close your eyes. The clock stops when your foot touches down (30 seconds is the top score).',
    'Step 2, jump: jump as high as you can, twice. Your best counts.',
    'Step 3, sit to stand: sit down on the floor and stand back up, using your hands or knees as little as you can. Each support costs a point out of 10.',
    'Your body age compares your balance and jump with published averages for each age. It is a wellness estimate for fun and motivation, not a diagnosis.',
  ],
  buttons: [{ label: 'Next step', fn(E) { this.next(E); } }],
  reset(E) { this.st = { step: 0, bal: null, jumps: [], srt: null, res: null }; this.stepSt = {}; },
  start(E) { this.begin(E, 1); },
  begin(E, n) {
    const st = this.st; st.step = n; st.stepAt = E.now(); this.stepSt = {};
    if (n === 1) say('Step one. Stand on one leg and close your eyes.');
    if (n === 2) say('Step two. Jump as high as you can, twice.');
    if (n === 3) say('Step three. Sit down on the floor, then stand back up. Try not to use your hands.');
    if (n === 4) this.finish(E);
  },
  // a skipped test is left out of the body age, never counted as zero
  next(E) {
    const st = this.st, s = this.stepSt;
    if (st.step === 1 && st.bal == null && s.hs != null) st.bal = s.cur;
    if (st.step === 3 && st.srt == null && s.phase === 'up') st.srt = this.srtScore();
    if (st.step >= 1 && st.step <= 3) this.begin(E, Math.floor(st.step) + 1); else { this.reset(E); this.begin(E, 1); }
  },
  frame(E) {
    const st = this.st, s = this.stepSt, P = E.P;
    if (st.step < 1 || st.step > 3) return;
    if (!seen(P, [23, 24, 27, 28], 0.4)) { E.msg = 'Step back so your whole body, feet included, is in the picture'; return; }
    const leg = legLen(P), fy = footY(P);
    if (st.step === 1) {
      const up = Math.abs(P[27].y - P[28].y) > leg * 0.12;
      if (up) { if (s.hs == null) { s.hs = E.t; beep(1100, 0.07); } s.last = E.t; s.cur = E.t - s.hs; if (s.cur >= 30) { st.bal = 30; beep(1400, 0.1); say('Top score!'); this.begin(E, 2); } }
      else if (s.hs != null && E.t - s.last > 0.25) { st.bal = s.last - s.hs; say('Foot down. ' + Math.round(st.bal) + ' seconds.'); setTimeout(() => this.begin(E, 2), 1500); s.hs = null; st.step = 1.5; }
    }
    if (st.step === 2) {
      // jump from time in the air
      if (!s.air && s.py != null && Math.abs(fy - s.py) < leg * 0.012) s.base = s.base == null ? fy : s.base * 0.85 + fy * 0.15;
      if (s.base != null) {
        const lim = s.base - leg * 0.04;
        if (!s.air && fy < lim) { s.air = true; s.t0 = E.t; }
        else if (s.air && fy >= lim) { s.air = false; const ft = E.t - s.t0; if (ft > 0.15 && ft < 1.2) { const cm = 9.81 * ft * ft / 8 * 100; st.jumps.push(cm); say(Math.round(cm) + ' centimetres'); if (st.jumps.length >= 2) { st.step = 2.5; setTimeout(() => this.begin(E, 3), 1800); } } }
      }
      s.py = fy;
    }
    if (st.step === 3) {
      // sitting rising test: count hand and knee supports between standing, sitting and standing again
      const h = fy - hipY(P);
      s.top = Math.max(s.top || 0, h);
      if (!s.phase) s.phase = 'down';
      const floor = fy, near = leg * 0.09;
      const handDown = [15, 16].some(i => P[i].v > 0.4 && P[i].y > floor - near), kneeDown = [25, 26].some(i => P[i].v > 0.4 && P[i].y > floor - near) && h > leg * 0.45;
      s.hands = s.hands || 0; s.knees = s.knees || 0;
      if (handDown && !s.hd && E.t - (s.hdAt || 0) > 0.5) { s.hands++; s.hdAt = E.t; beep(300, 0.08); }
      if (kneeDown && !s.kd && E.t - (s.kdAt || 0) > 0.5) { s.knees++; s.kdAt = E.t; beep(300, 0.08); }
      s.hd = handDown; s.kd = kneeDown;
      if (s.phase === 'down' && h < leg * 0.35) { s.phase = 'up'; beep(1000, 0.06); say('Now stand up.'); }
      if (s.phase === 'up' && h > leg * 0.85 && s.top > 0) { st.srt = this.srtScore(); st.step = 3.5; say('Done.'); setTimeout(() => this.begin(E, 4), 1200); }
    }
  },
  srtScore() { const s = this.stepSt; return clamp(10 - (s.hands || 0) - (s.knees || 0), 0, 10); },
  finish(E) {
    const st = this.st, age = E.S.age, sex = E.S.sex, female = sex === 'Female';
    const bal = st.bal, jump = st.jumps.length ? Math.max(...st.jumps) : null;
    if (bal == null && jump == null) { st.res = { none: true }; say('Do the balance or the jump test first.'); return; }
    const parts = [];
    if (bal != null) parts.push([lookup(BAL_AGE, bal), female ? 0.75 : 0.5]);
    if (jump != null) parts.push([jumpAge(jump, sex), female ? 0.25 : 0.5]);
    const wsum = parts.reduce((a, p) => a + p[1], 0), body = Math.round(clamp(parts.reduce((a, p) => a + p[0] * p[1], 0) / wsum, 18, 85));
    const diff = body - age;
    const p = clamp(50 - diff * 4, 1, 99); // only for the fun label, not a published percentile
    st.res = { body, diff, bal, jump, srt: st.srt };
    const pill = diff < 0 ? (-diff) + ' YEARS YOUNGER' : diff > 0 ? diff + ' YEARS OLDER' : 'RIGHT ON YOUR AGE';
    st.res.pill = pill;
    say('Your body age is ' + body + '. ' + (diff < 0 ? (-diff) + ' years younger than you.' : diff > 0 ? diff + ' years older than you.' : 'Right on your age.'));
    E.log(body, 'yrs', 'low', null, { pill, who: 'I am ' + age + ' · wellness estimate', label: labelFor('bodyage', p) });
  },
  draw(g, E) {
    const st = this.st, s = this.stepSt, W = E.W, H = E.H, U = E.U;
    const stepNames = ['', 'Balance, eyes closed', 'Jump, twice', 'Sit to stand'];
    const n = Math.floor(st.step);
    if (n >= 1 && n <= 3) card(g, E, [['STEP ' + n + ' OF 3', 3.4, '#fff', 900], [stepNames[n], 6, '#fff', 900]], W / 2, H * 0.05, 'center', C.violet);
    if (n === 1) { if (s.hs != null) scoreCard(g, E, 'Balance', (s.cur || 0).toFixed(1) + ' s', 'eyes closed!'); else bigNote(g, E, 'Lift one foot and close your eyes', C.ink, H * 0.3); }
    if (n === 2) { if (s.air) bigNote(g, E, 'in the air...', C.violet, H * 0.3); else if (s.base == null) bigNote(g, E, 'Stand still for a second', C.ink, H * 0.3); else bigNote(g, E, st.jumps.length ? 'One more jump!' : 'Jump!', C.violet, H * 0.3); if (st.jumps.length) scoreCard(g, E, 'Best jump', Math.round(Math.max(...st.jumps)) + ' cm', ''); }
    if (n === 3) { bigNote(g, E, s.phase === 'up' ? 'Now stand up' : 'Sit down on the floor', C.ink, H * 0.3); scoreCard(g, E, 'Sit to stand', this.srtScore() + ' / 10', 'each hand or knee support costs 1'); }
    if (st.step === 4 && st.res && st.res.none) bigNote(g, E, 'You skipped balance and jump. Press Next step to start again.', C.ink, H * 0.3);
    if (st.step === 4 && st.res && !st.res.none) {
      const r = st.res;
      card(g, E, [['YOUR BODY AGE', 3.6, '#6b6880', 900], [String(r.body), 22, C.violet], [r.pill, 4.6, C.ink, 900],
        ['balance ' + (r.bal != null ? r.bal.toFixed(1) + ' s' : 'skipped') + ' · jump ' + (r.jump != null ? Math.round(r.jump) + ' cm' : 'skipped') + ' · sit to stand ' + (r.srt ?? '-') + '/10', 3.2, '#6b6880', 700],
        ['wellness estimate, not a diagnosis', 3, '#6b6880', 700]], W / 2, H * 0.2);
      if (r.srt != null) card(g, E, [[r.srt >= 8 ? 'Sit to stand ' + r.srt + '/10: great' : 'Sit to stand ' + r.srt + '/10: worth training', 3.8, C.ink, 800], ['In Brito 2012, people scoring 8 to 10 had the lowest risk.', 3, '#6b6880', 700]], W / 2, H * 0.68);
    }
    if (st.step === 0) bigNote(g, E, 'Press Next step to begin', C.violet, H * 0.3);
  },
};
