// "Build it in 20 seconds": a no-voice reel for a space (dev only, kept off the live site). Open /<room>?reel=build
// (tap to play) or record it with: node tools/record-reel.mjs <room> --reel build  -> _reels/<room>/final-build.mp4
// Everything sits on a 120 BPM grid (a beat every 0.5 s) so any 120 BPM track added in Instagram lands with it:
// the empty home fills piece by piece on the eighth notes, the lamps click on, the camera swings slowly round the
// whole home, then every piece pops back off and the reel ends on its first frame, so it loops.
// Sounds are real recordings from Pixabay (CreativeCoding/_sfx, copied to _reels/sfx), one per landing, by weight.

const FPS = 30, BEAT = 0.5, E = BEAT / 2, T_END = 40 * BEAT;   // 20 s: build, lights, dive, bedroom, pop off, a beat of the empty home
const REC = new URLSearchParams(location.search).has('rec');

let seed = 11;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = x => Math.pow(clamp01(x), 3);
const easeIO = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

// ---- samples: fetched once, decoded per audio context, trimmed to their first sound ----
const SAMPLES = ['sack_flour', 'crate_box', 'paper_slide', 'page_flip', 'clink', 'clink2', 'tv_button', 'pop_soft', 'pop_clean', 'whoosh_airy', 'whoosh_slow', 'whoosh_thin', 'stamp', 'mug_clanks'];
const raw = {};
async function fetchSamples() { await Promise.all(SAMPLES.map(async n => { raw[n] = await (await fetch(`/_reels/sfx/${n}.mp3`)).arrayBuffer(); })); }
async function decodeAll(ac) {
  const out = {};
  await Promise.all(SAMPLES.map(async n => {
    const b = await ac.decodeAudioData(raw[n].slice(0)), d = b.getChannelData(0);
    let i = 0; while (i < d.length && Math.abs(d[i]) < 0.02) i++;
    out[n] = { b, off: Math.max(0, i / b.sampleRate - 0.004) };
  }));
  return out;
}
function play(ac, dest, S, name, at, { gain = 1, rate = 1, pan = 0 } = {}) {
  const s = S[name]; if (!s || at < 0) return;
  const src = ac.createBufferSource(); src.buffer = s.b; src.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = gain; const p = ac.createStereoPanner(); p.pan.value = pan;
  src.connect(g); g.connect(p); p.connect(dest); src.start(at, s.off, Math.min(2.5, s.b.duration - s.off));
}
// a tiny bright tick for the price ticker (synthesised: no recording is this short)
function tick(ac, dest, at, level = 0.05) {
  const n = Math.ceil(ac.sampleRate * 0.01), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.15));
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 8000; f.Q.value = 1.2;
  const g = ac.createGain(); g.gain.value = level * 6; s.connect(f); f.connect(g); g.connect(dest); s.start(at);
}

export async function start(A) {
  await fetchSamples();
  const P = it => A.PIECES[it.type];
  const price = it => +(P(it).price || '').replace(/[^\d]/g, '') || 0;
  const WD = A.HOME.dist;
  const name = it => P(it).name.toLowerCase();

  // ---- the build order and its grid ----
  for (const o of A.overlays) o.visible = false;
  for (const it of A.items) it.g.visible = false;
  const rugs = A.items.filter(it => P(it).rug), floor = A.items.filter(it => !P(it).rug && !P(it).onTop && !P(it).wall);
  const tops = A.items.filter(it => P(it).onTop), walls = A.items.filter(it => P(it).wall);
  floor.sort((a, b) => (a.x - a.z * 0.6) - (b.x - b.z * 0.6));
  const LAND = [];   // [landing time, item]
  rugs.forEach((it, i) => LAND.push([2 * BEAT + i * E, it]));
  floor.forEach((it, i) => LAND.push([3 * BEAT + i * E, it]));
  const tAfter = 3 * BEAT + floor.length * E + BEAT;
  [...tops, ...walls].forEach((it, i) => LAND.push([tAfter + i * E, it]));
  const FALL = 0.22;   // a dropped piece takes about this long to land
  const tLights = Math.ceil((tAfter + (tops.length + walls.length) * E) / BEAT) * BEAT + BEAT;
  const lamps = A.items.filter(it => /lamp/i.test(it.type));
  const TOTAL_LANDS = LAND.filter(([, it]) => price(it)).map(([t, it]) => [t, price(it)]);
  const totalAt = t => TOTAL_LANDS.reduce((s, [at, p]) => s + (t >= at ? p : 0), 0);

  // ---- camera: one path from the wide shot into the living room, a cut to the bedroom, a cut back to frame one ----
  const START = [[0, 1.2, 0.35], 0, 0.64, WD * 0.98];
  const tDive = tLights + BEAT, tCut1 = tDive + 5 * BEAT, tCut2 = tCut1 + 3 * BEAT, tOut = tCut2 + BEAT;
  const KEYS = [
    [0, ...START], [tDive, [0, 1.05, 0.3], 0.24, 0.6, WD * 0.85],   // a slow turn round the home while it fills
    [tDive + 2.5 * BEAT, [-0.45, 0.6, -0.45], -0.5, 0.38, 6.6], [tCut1, [-0.45, 0.6, -0.45], -0.62, 0.36, 6.0],   // (further round, the camera leaves the left wall)
  ];
  const lerp = (a, b, u) => a + (b - a) * u;
  // the whole home stays in frame (Anas: no close ups): a slow turn while it fills, a wider swing the other way once
  // the lamps are on, then back to the opening angle for the loop, all one continuous move with no cuts
  const SWING = [[0, 0, 0.64, WD * 0.98], [tDive, 0.24, 0.6, WD * 0.86], [tCut2, -0.26, 0.58, WD * 0.88], [T_END - BEAT, 0, 0.64, WD * 0.98]];
  function camAt(t) {
    let i = 0; while (i < SWING.length - 2 && t > SWING[i + 1][0]) i++;
    const [t0, y0, p0, d0] = SWING[i], [t1, y1, p1, d1] = SWING[i + 1], u = i === 0 ? clamp01((t - t0) / (t1 - t0)) : easeIO((t - t0) / (t1 - t0));
    return [START[0], lerp(y0, y1, u), lerp(p0, p1, u), lerp(d0, d1, u)];
  }
  const hourAt = t => t < tLights ? 16.4 : t < tOut + 3 * BEAT ? 16.4 + 2.8 * easeOut((t - tLights) / BEAT) : 19.2 - 2.8 * easeIO((t - tOut - 3 * BEAT) / (2 * BEAT));

  // ---- the end: every piece pops back off in reverse, so the last frame is the first ----
  const EXIT = [...LAND].reverse().map(([, it], i) => [tOut + 2 * BEAT + i * (5 * BEAT / LAND.length), it]);

  // ---- overlay: two lines of words and the ticker ----
  const css = document.createElement('style');
  css.textContent = `
    .side, .tools, .card.light, #tray, #notes-layer, #cards, #tip, #ui-hint, #ghost, #sel, dialog { display: none !important; }
    #reel { position: fixed; inset: 0; z-index: 20; pointer-events: none; }
    #reel .line { position: absolute; left: 22px; right: 22px; text-align: center; font: italic 800 31px/1.15 var(--serif); color: var(--paper-hi); text-shadow: 0 2px 18px #00000070; opacity: 0; }
    #reel .line i { font-style: inherit; color: #FF8A3D; }
    #reel .hook, #reel .end { top: 9%; }
    #reel .end b { display: block; margin-top: 10px; font: 800 30px var(--display); color: #44B977; font-style: normal; }
    #reel .tick { position: absolute; left: 0; right: 0; top: 23%; display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: 0; }
    #reel .tick small { font: 600 12px var(--ui); letter-spacing: .08em; text-transform: uppercase; color: #FFFEFAcc; }
    #reel .tick b { font: 800 40px/1 var(--display); color: var(--paper-hi); font-variant-numeric: tabular-nums; text-shadow: 0 4px 20px #00000070; }
    #reel .go { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto; cursor: pointer; background: #1A120588; color: var(--paper-hi); font: 600 16px var(--ui); }
  `;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'reel';
  root.innerHTML = `<div class="line hook">Every piece and every price is <i>real</i>.</div>
    <div class="tick"><small>Habitt furniture in this home</small><b>Rs 0</b></div>
    <div class="line end">Play it yourself at the link in bio.<b><span style="font:italic 800 30px var(--serif);color:var(--paper-hi)">Playable</span> SPACES</b></div>`;
  document.body.appendChild(root);
  const hookEl = root.querySelector('.hook'), endEl = root.querySelector('.end'), tickEl = root.querySelector('.tick'), tickNum = root.querySelector('.tick b');
  const fade = (el, t, a, b) => { const k = easeOut((t - a) / 0.35) * (1 - easeOut((t - b) / 0.35)); el.style.opacity = k; el.style.transform = `translateY(${(1 - easeOut((t - a) / 0.35)) * 14}px)`; };
  let shown = 0;
  function drawText(t, dt) {
    fade(hookEl, t, 0.2, tAfter);
    fade(endEl, t, tOut, T_END - 0.5);
    const target = totalAt(t); shown += (target - shown) * (1 - Math.exp(-dt * 14)); if (Math.abs(target - shown) < 1) shown = target;
    tickNum.textContent = 'Rs ' + Math.round(shown).toLocaleString('en-US');
    tickEl.style.opacity = easeOut((t - BEAT) / 0.3) * (1 - easeOut((t - tLights) / 0.4));
    tickNum.style.transform = `scale(${TOTAL_LANDS.some(([at]) => t >= at && t < at + 0.1) ? 1.06 : 1})`;
  }

  // ---- events ----
  const drop = it => { it.g.visible = true; it.g.scale.setScalar(1); it.lift = P(it).wall ? 0.35 : P(it).onTop ? 0.45 : 1.2; it.liftV = -1.8; it.awake = true; A.kick(it, 0.3); };
  const EVENTS = [...LAND.map(([t, it]) => [t - FALL, () => drop(it)])].sort((a, b) => a[0] - b[0]);
  const exitAt = new Map(EXIT.map(([t, it]) => [it, t]));
  function popOff(t) {
    for (const [it, t0] of exitAt) {
      if (t < t0) continue;
      const u = (t - t0) / 0.22, s = u < 0.35 ? 1 + 0.12 * Math.sin(u / 0.35 * Math.PI / 2) : 1.12 * (1 - easeIn((u - 0.35) / 0.65));
      it.g.scale.setScalar(Math.max(0.001, s));
      if (u >= 1) it.g.visible = false;
    }
  }

  // ---- sound: one recording per landing, chosen by what landed ----
  const soundFor = it => {
    const n = name(it), ty = it.type;
    if (P(it).rug) return [['whoosh_thin', 0.45, 1], ['paper_slide', 0.55, 0.9]];
    if (P(it).wall) return [['paper_slide', 0.5, 1.1]];
    if (ty === 'tabledecor') return [['page_flip', 0.55, 1]];
    if (ty === 'tablelamp') return [['clink', 0.45, 1.05]];
    if (ty === 'sofadress') return [['whoosh_airy', 0.35, 1.2]];
    if (/plant|snake|paradise|fig/.test(n) || /plant|snake/.test(ty)) return [['pop_soft', 0.5, 0.9]];
    if (ty === 'lamp') return [['clink2', 0.4, 0.8]];
    if (/sofa|bed|kitchen|workstation|shelf|dining table/.test(n) || ty === 'kitchen') return [['sack_flour', 0.95, /bed/.test(n) ? 0.85 : 0.95]];
    return [['crate_box', 0.6, 1.1]];
  };
  const SFX = [];
  for (const [t, it] of LAND) for (const [s, g, r] of soundFor(it)) SFX.push([t, s, { gain: g, rate: r * (0.97 + Math.random() * 0.06), pan: Math.max(-0.4, Math.min(0.4, it.x / 10)) }]);
  lamps.forEach((it, i) => SFX.push([tLights + i * (E / 2), 'tv_button', { gain: 0.7, rate: 1 + i * 0.03 }]));
  SFX.push([tDive, 'whoosh_slow', { gain: 0.45 }]);   // no bell or chime on the end line, ever (Anas)
  for (const [t] of EXIT) SFX.push([t + 0.05, 'pop_clean', { gain: 0.22, rate: 1.1 + Math.random() * 0.3 }]);
  const TICKS = TOTAL_LANDS.map(([t]) => t + 0.02);

  // ---- the clock ----
  let t = 0, ei = 0;
  function advance(dt) {
    t += dt;
    while (ei < EVENTS.length && EVENTS[ei][0] <= t) EVENTS[ei++][1]();
    const [tg, yaw, pitch, dist] = camAt(t);
    for (const c of [A.cam, A.camGoal]) { c.target.set(tg[0], tg[1], tg[2]); c.yaw = yaw; c.pitch = pitch; c.dist = dist; }
    A.setTime(hourAt(t));
    A.renderer.shadowMap.needsUpdate = true;
    A.frame(dt, true);
    popOff(t);
    drawText(t, dt);
  }
  advance(0);
  console.log(`reel-build: ${LAND.length} pieces, lights at ${tLights} s, ends ${T_END} s`);

  async function renderAudio() {
    const sr = 48000, ac = new OfflineAudioContext(2, Math.ceil(sr * (T_END + 0.3)), sr), S = await decodeAll(ac);
    for (const [at, n, o] of SFX) play(ac, ac.destination, S, n, at, o);
    for (const at of TICKS) tick(ac, ac.destination, at);
    const buf = await ac.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1), n = buf.length;
    const v = new DataView(new ArrayBuffer(44 + n * 4)), w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); v.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(v.buffer); for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  if (REC) { window.__reel = { fps: FPS, frames: Math.round(T_END * FPS), step: () => advance(1 / FPS), audio: renderAudio }; return; }
  const go = document.createElement('div'); go.className = 'go'; go.textContent = 'Tap to play';
  root.appendChild(go);
  go.onclick = async () => {
    go.remove();
    const ac = new AudioContext(), S = await decodeAll(ac), w0 = ac.currentTime + 0.1;
    for (const [at, n, o] of SFX) play(ac, ac.destination, S, n, w0 + at, o);
    for (const at of TICKS) tick(ac, ac.destination, w0 + at);
    const t0 = performance.now() + 100; let last = t0;
    const loop = () => { const now = performance.now(); if (now >= t0) { advance(Math.min(0.05, (now - last) / 1000)); last = now; } if (t < T_END) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
}
