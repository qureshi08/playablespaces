// Promo reel for a space (dev only, kept off the live site). Open /<room>?reel in a 9:16 window (kit/reel-preview.html
// does that), tap to play. The recorder (tools/record-reel.mjs) opens /<room>?reel&rec and steps it frame by frame.
// Everything on screen is the real room: the script only moves the camera, picks pieces up, swaps colours and the time.

const T_END = 21.5, FPS = 30;
const REC = new URLSearchParams(location.search).has('rec');

// a seeded random so the preview and the export swing the same way
let seed = 7;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const easeOut = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const easeIO = x => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export function start(A) {
  const find = (type, z) => A.items.find(it => it.type === type && (z === undefined || Math.abs(it.z - z) < 0.05));
  const chair = find('habitt-cane-charm-armchair', -0.15), sofa = find('habitt-billy-3-seater-sofa');
  const W = A.HOME.dist;

  // ---- camera: one continuous path through these keys (target x y z, yaw, pitch, distance), never stopping ----
  const KEYS = [
    [0.0, [0.35, 0.45, -0.6], -0.95, 0.32, 4.4],  // close on the front of the Billy sofa and its cushions
    [2.7, [0, -0.3, 0.1], 0.3, 0.6, W],           // pull back and round: the whole flat on its plinth
    [4.4, [-1.35, 0.95, -0.1], 0.55, 0.5, 7.0],   // down to the cane chair, framed low so its card clears the caption
    [7.4, [-1.2, 0.95, 0.15], 0.75, 0.52, 7.2],   // drift while it moves
    [9.0, [0.35, 0.85, -0.6], -0.9, 0.34, 5.0],   // back to the opening's angle on the sofa (the arc lamp hangs clear, top left), framed low for the card
    [12.0, [0.35, 0.85, -0.55], -1.05, 0.36, 5.1],
    [13.4, [0, -0.25, 0.1], 0.32, 0.62, W * 0.98],// out to the whole flat for the colours
    [17.6, [0, -0.25, 0.1], 0.02, 0.6, W * 0.95],
    [21.5, [0, -0.3, 0.1], -0.12, 0.64, W * 1.06],
  ];
  const keyVals = KEYS.map(k => [...k[1], k[2], k[3], k[4]]);
  function camAt(t) {
    let i = 0; while (i < KEYS.length - 2 && t > KEYS[i + 1][0]) i++;
    const t0 = KEYS[i][0], t1 = KEYS[i + 1][0], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), h = t1 - t0;
    // monotone cubic Hermite: the camera keeps its speed through every key but never overshoots one
    // (a plain spline dipped the camera closer to the sofa than any key asked for)
    const tan = j => { const a = Math.max(0, j - 1), b = Math.min(KEYS.length - 1, j + 1); return keyVals[j].map((v, n) => {
      const s0 = j > 0 ? (v - keyVals[a][n]) / (KEYS[j][0] - KEYS[a][0]) : 0, s1 = j < KEYS.length - 1 ? (keyVals[b][n] - v) / (KEYS[b][0] - KEYS[j][0]) : 0;
      if (s0 * s1 <= 0) return 0;
      const m = (keyVals[b][n] - keyVals[a][n]) / (KEYS[b][0] - KEYS[a][0]);
      return Math.sign(m) * Math.min(Math.abs(m), 3 * Math.abs(s0), 3 * Math.abs(s1));
    }); };
    const m0 = tan(i), m1 = tan(i + 1), u2 = u * u, u3 = u2 * u;
    return keyVals[i].map((p0, n) => (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0[n] + (-2 * u3 + 3 * u2) * keyVals[i + 1][n] + (u3 - u2) * h * m1[n]);
  }
  function placeCam(t) {
    const v = camAt(t);
    for (const c of [A.cam, A.camGoal]) { c.target.set(v[0], v[1], v[2]); c.yaw = v[3]; c.pitch = v[4]; c.dist = v[5]; }
  }

  // ---- the time of day, eased between keys ----
  const HOURS = [[0, 17.2], [12.9, 17.2], [13.5, 12.8], [15.3, 12.8], [17.7, 21.6], [18.3, 21.6], [19.4, 18.4]];
  function hourAt(t) {
    let i = 0; while (i < HOURS.length - 2 && t > HOURS[i + 1][0]) i++;
    const [t0, a] = HOURS[i], [t1, b] = HOURS[i + 1];
    return a + (b - a) * easeIO((t - t0) / (t1 - t0));
  }

  // ---- overlay: captions, touch marks, the end card ----
  const css = document.createElement('style');
  css.textContent = `
    .side, .tools, .card.light, #tray, #notes-layer, #cards, #tip, #ui-hint, #ghost, .sel-row button, dialog { display: none !important; }
    #reel { position: fixed; inset: 0; z-index: 20; pointer-events: none; font-family: var(--serif); }
    #reel .cap { position: absolute; left: 22px; right: 22px; top: 9.5%; text-align: center; font: italic 800 33px/1.12 var(--serif); color: var(--paper-hi); letter-spacing: -.01em; text-shadow: 0 2px 18px #00000055; }
    #reel .cap span { display: inline-block; white-space: pre; will-change: transform, opacity, filter; }
    #reel .touch { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: #FFFEFAcc; box-shadow: 0 4px 18px #00000040; opacity: 0; }
    #reel .ring { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 2px solid #FFFEFA; opacity: 0; }
    #reel .end { position: absolute; left: 0; right: 0; bottom: 14%; display: flex; flex-direction: column; align-items: center; gap: 14px; opacity: 0; }
    #reel .end .mark { font: italic 800 20px var(--serif); color: var(--paper-hi); }
    #reel .end .mark b { font: 800 20px var(--display); color: #44B977; letter-spacing: .02em; }
    #reel .end .title { font: italic 800 44px/1 var(--serif); color: var(--paper-hi); text-shadow: 0 2px 18px #00000055; }
    #reel .end .url { font: 600 14px var(--ui); color: var(--paper-hi); background: var(--green); padding: 10px 16px; border-radius: 999px; box-shadow: 0 8px 24px #00000040; }
    #reel .go { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto; cursor: pointer; background: #1A120588; color: var(--paper-hi); font: 600 16px var(--ui); }
  `;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'reel';
  root.innerHTML = `<div class="cap"></div><div class="touch"></div><div class="ring"></div>
    <div class="end"><div class="mark">Playable <b>SPACES</b></div><div class="title">Play it yourself.</div><div class="url">playablespaces.vercel.app/habitt-studio</div></div>`;
  document.body.appendChild(root);
  const capEl = root.querySelector('.cap'), touchEl = root.querySelector('.touch'), ringEl = root.querySelector('.ring'), endEl = root.querySelector('.end');

  const CAPS = [
    [0.35, 3.2, 'This flat is built from real Habitt furniture.'],
    [3.8, 7.7, 'Pick anything up and move it.'],
    [8.5, 12.5, 'See the price and buy it from Habitt.'],
    [12.95, 15.1, 'Change the colours of the whole flat.'],
    [15.3, 18.1, 'Turn the day into night.'],
  ];
  let capShown = -1;
  function drawCaption(t) {
    const i = CAPS.findIndex(([a, b]) => t >= a && t < b + 0.35);
    if (i !== capShown) { capShown = i; capEl.innerHTML = i < 0 ? '' : CAPS[i][2].split(' ').map(w => `<span>${w} </span>`).join(''); }
    if (i < 0) return;
    const [a, b] = CAPS[i], out = easeOut((t - b) / 0.35);
    capEl.querySelectorAll('span').forEach((s, n) => {
      const k = easeOut((t - a - n * 0.07) / 0.35);
      s.style.opacity = k * (1 - out); s.style.transform = `translateY(${(1 - k) * 14 - out * 10}px)`; s.style.filter = `blur(${(1 - k) * 6}px)`;
    });
  }

  // touches: [time, where] where is a function returning screen x, y
  const onPiece = (it, up = 0.5) => () => { const p = it.g.localToWorld(it.g.position.clone().set(0, up, 0)); return A.toScreen(p); };
  const onDot = name => () => { const d = document.querySelector(`#pc-sw .dot[title="${name}"]`); if (!d) return [-99, -99]; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const TOUCHES = [[3.95, onPiece(chair, 0.45)], [8.95, onPiece(sofa, 0.45)], [10.3, onDot('Light Green')]];
  let touchPos = null;
  function drawTouch(t) {
    const tc = TOUCHES.find(([a]) => t >= a - 0.2 && t < a + 0.8);
    if (!tc) { touchEl.style.opacity = ringEl.style.opacity = 0; touchPos = null; return; }
    const d = t - tc[0];
    if (!touchPos || d < -0.1) touchPos = tc[1]();
    const [x, y] = touchPos;
    const k = d < 0 ? easeOut((d + 0.2) / 0.2) : 1, press = d < 0 ? 1 : d < 0.12 ? 1 - 0.18 * easeOut(d / 0.12) : 0.82 + 0.18 * easeOut((d - 0.12) / 0.2);
    const fade = 1 - easeOut((d - 0.35) / 0.4);
    Object.assign(touchEl.style, { left: x + 'px', top: y + 'px', opacity: k * fade * 0.9, transform: `scale(${(0.6 + 0.4 * k) * press})` });
    const r = easeOut(d / 0.6);
    Object.assign(ringEl.style, { left: x + 'px', top: y + 'px', opacity: d > 0 ? (1 - r) * 0.8 : 0, transform: `scale(${1 + r * 1.4})` });
  }
  function drawEnd(t) {
    const k = easeOut((t - 18.4) / 0.6);
    endEl.style.opacity = k; endEl.style.transform = `translateY(${(1 - k) * 18}px)`;
    endEl.querySelectorAll('div').forEach((d, n) => { const kk = easeOut((t - 18.4 - n * 0.18) / 0.5); d.style.opacity = kk; d.style.transform = `translateY(${(1 - kk) * 12}px)`; });
  }

  // ---- events: what happens to the room, and the one sound each makes ----
  const moodWipes = (t, key) => {
    const m = A.MOODS[key], out = [];
    let i = 0;
    for (const k of A.SLOT_KEYS) { const id = m.mats[k]; if (id && id !== cur[k]) { const tt = t + i * 0.07; out.push([tt, () => A.wipe(k, id)]); cur[k] = id; i++; } }
    return out;
  };
  const cur = Object.fromEntries(A.SLOT_KEYS.map(k => [k, A.curMat(k).id]));
  const EVENTS = [
    [3.95, () => A.selectItem(chair)],
    [4.9, () => { chair.x = -1.25; chair.z = 0.4; chair.rot = Math.PI / 4; }],
    [6.7, () => A.selectItem(null)],
    [8.95, () => A.selectItem(sofa)],
    [10.4, () => { A.setVariant(sofa, 'Light Green'); A.selectItem(sofa); }],
    [12.4, () => A.selectItem(null)],
    ...moodWipes(13.0, 'bright'),
    ...moodWipes(17.9, A.MOODS.cozy ? 'cozy' : Object.keys(A.MOODS)[0]),
  ].sort((a, b) => a[0] - b[0]);

  const SFX = [
    [1.0, 'air', { l: 0.8, d: 0.9 }],
    [3.95, 'tap', { l: 1.1 }], [4.0, 'rise', { l: 0.6, d: 0.25 }],
    [4.95, 'air', { l: 0.55, d: 0.6 }],
    [6.95, 'thump', { l: 0.8 }],
    [8.0, 'air', { l: 0.5, d: 0.7 }],
    [8.95, 'tap', { l: 1.1 }], [9.0, 'flick', { l: 0.8 }],
    [10.3, 'tap', { l: 0.9 }], [10.4, 'bloop', { f: 520, l: 0.8 }],
    [12.4, 'thump', { l: 0.5 }],
    [13.0, 'air', { l: 0.8, d: 0.6 }], [13.0, 'rise', { l: 0.5, d: 0.5 }],
    ...Array.from({ length: 28 }, (_, i) => [15.35 + i * 0.085, 'tk', { l: 0.45, p: 1 + i * 0.012 }]),
    [17.9, 'air', { l: 0.8, d: 0.6 }], [17.9, 'rise', { l: 0.5, d: 0.5 }],
    [18.4, 'bloop', { f: 440, l: 0.9 }],
    ...CAPS.flatMap(([a, , s]) => s.split(' ').map((_, n) => [a + n * 0.07, 'tap', { l: 0.35, p: 1.3 }])),
    ...[0, 1, 2].map(n => [18.4 + n * 0.18, 'tap', { l: 0.5, p: 1.2 }]),
  ];

  // ---- the clock ----
  let t = 0, ei = 0;
  function advance(dt) {
    t += dt;
    while (ei < EVENTS.length && EVENTS[ei][0] <= t) EVENTS[ei++][1]();
    A.setTime(hourAt(t));
    placeCam(t);
    A.frame(dt, true);
    drawCaption(t); clearCaption(); drawTouch(t); drawEnd(t);
  }
  // the product card never sits under a caption: when they would touch, it drops just below the caption
  const selEl = document.getElementById('sel');
  function clearCaption() {
    if (!selEl.classList.contains('on') || !capEl.textContent) return;
    const gap = capEl.getBoundingClientRect().bottom + 12 - selEl.getBoundingClientRect().top;
    if (gap > 0) selEl.style.top = (parseFloat(selEl.style.top) + gap) + 'px';
  }
  placeCam(0); A.setTime(hourAt(0)); A.frame(1 / FPS, true); drawCaption(0);

  if (REC) {
    // the recorder calls step() once per video frame, then takes a screenshot
    window.__reel = { fps: FPS, frames: Math.ceil(T_END * FPS), step: () => advance(1 / FPS), audio: () => renderAudio(SFX, T_END) };
    return;
  }
  const go = document.createElement('div'); go.className = 'go'; go.textContent = 'Tap to play';
  root.appendChild(go);
  go.onclick = () => {
    go.remove();
    const ac = new AudioContext(), w0 = ac.currentTime + 0.05;
    for (const [at, kind, a] of SFX) SOUND[kind](ac, ac.destination, w0 + at, a);
    let last = performance.now();
    const loop = () => {
      const nowMs = performance.now(), dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
      advance(dt);
      if (t < T_END) requestAnimationFrame(loop);
      else { const again = document.createElement('div'); again.className = 'go'; again.textContent = 'Tap to replay'; again.onclick = () => location.reload(); root.appendChild(again); }
    };
    requestAnimationFrame(loop);
  };
}

// ---- sound: the UI kit from Animations/_library/uisfx.js, ported to stand alone (dry clicks, no music) ----
const noiseSrc = (ac, w, d) => { const n = Math.ceil(ac.sampleRate * d), buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = buf; s.start(w); return s; };
const tone = (ac, type, f, w, d) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, w); o.start(w); o.stop(w + d + 0.02); return o; };
const env = (g, w, a, peak, dec) => { g.gain.setValueAtTime(0.0001, w); g.gain.exponentialRampToValueAtTime(peak, w + a); g.gain.exponentialRampToValueAtTime(0.0001, w + a + dec); };
const filt = (ac, type, f, q) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
const UIG = 1.4;
const dry = (ac, dest, node, pan = 0) => { const g = ac.createGain(); g.gain.value = UIG; const p = ac.createStereoPanner(); p.pan.value = pan; node.connect(g); g.connect(p); p.connect(dest); };
const click = (ac, dest, w, hz, q, peak, dec, pan) => { const s = noiseSrc(ac, w, dec + 0.01), f = filt(ac, 'bandpass', hz, q), g = ac.createGain(); env(g, w, 0.0008, peak, dec); s.connect(f); f.connect(g); dry(ac, dest, g, pan); };
const jit = (a, b) => a + Math.random() * (b - a);
const SOUND = {
  tap: (ac, d, w, a = {}) => { const l = a.l ?? 1, p = (a.p ?? 1) * jit(0.97, 1.03), pan = jit(-0.15, 0.15);
    click(ac, d, w, 3000 * p, 1.1, 0.14 * l, 0.016, pan);
    const o = tone(ac, 'sine', 1050 * p, w, 0.05); o.frequency.exponentialRampToValueAtTime(760 * p, w + 0.03); const g = ac.createGain(); env(g, w, 0.0015, 0.06 * l, 0.028); o.connect(g); dry(ac, d, g, pan); },
  tk: (ac, d, w, a = {}) => click(ac, d, w, 8800 * (a.p ?? 1), 1.4, 0.05 * (a.l ?? 1), 0.003, jit(-0.25, 0.25)),
  bloop: (ac, d, w, a = {}) => { const l = a.l ?? 1, f = a.f ?? 440, up = a.up ?? 1.45;
    const o = tone(ac, 'sine', f, w, 0.2); o.frequency.exponentialRampToValueAtTime(f * up, w + 0.07); const g = ac.createGain(); env(g, w, 0.003, 0.1 * l, 0.11); o.connect(g); dry(ac, d, g);
    click(ac, d, w, 2400, 1, 0.04 * l, 0.006, 0); },
  thump: (ac, d, w, a = {}) => { const l = a.l ?? 1;
    const o = tone(ac, 'sine', 120, w, 0.3); o.frequency.exponentialRampToValueAtTime(45, w + 0.15); const g = ac.createGain(); env(g, w, 0.002, 0.32 * l, 0.2); o.connect(g); dry(ac, d, g);
    click(ac, d, w, 1500, 0.8, 0.1 * l, 0.012, 0); },
  air: (ac, d, w, a = {}) => { const l = a.l ?? 1, dd = a.d ?? 0.35, t0 = Math.max(0, w - dd * 0.6);
    const s = noiseSrc(ac, t0, dd + 0.05), f = filt(ac, 'bandpass', 3000, 0.6); f.frequency.setValueAtTime(3000, t0); f.frequency.exponentialRampToValueAtTime(9000, w); f.frequency.exponentialRampToValueAtTime(5500, t0 + dd);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.035 * l, w); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dd);
    const pn = ac.createStereoPanner(); pn.pan.setValueAtTime(-0.35, t0); pn.pan.linearRampToValueAtTime(0.35, t0 + dd);
    const gg = ac.createGain(); gg.gain.value = UIG; s.connect(f); f.connect(g); g.connect(pn); pn.connect(gg); gg.connect(d); },
  rise: (ac, d, w, a = {}) => { const l = a.l ?? 1, dd = a.d ?? 0.4;
    const o = tone(ac, 'sine', 320, w, dd + 0.05); o.frequency.exponentialRampToValueAtTime(1150, w + dd); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, w); g.gain.exponentialRampToValueAtTime(0.035 * l, w + dd * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, w + dd); o.connect(g); dry(ac, d, g);
    SOUND.air(ac, d, w + dd * 0.7, { l: 0.5 * l, d: dd }); },
  flick: (ac, d, w, a = {}) => { const l = a.l ?? 1; click(ac, d, w, 2500, 0.8, 0.09 * l, 0.035, -0.1); click(ac, d, w + 0.05, 3400, 1, 0.05 * l, 0.025, 0.1); },
};
// offline render of the whole soundtrack to a 16 bit stereo WAV, returned as base64 for the recorder
async function renderAudio(sfx, dur) {
  const sr = 48000, ac = new OfflineAudioContext(2, Math.ceil(sr * (dur + 0.5)), sr);
  for (const [at, kind, a] of sfx) SOUND[kind](ac, ac.destination, at, a);
  const buf = await ac.startRendering(), n = buf.length, L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rr[i])) * 32767, true); }
  let bin = ''; const bytes = new Uint8Array(out.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
