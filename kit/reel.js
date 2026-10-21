// Promo reel for a space (dev only, kept off the live site), cut like a product ad over a voiceover.
// Open /<room>?reel in a 9:16 window (kit/reel-preview.html does that) and tap to play; the recorder
// (tools/record-reel.mjs) opens /<room>?reel&rec and steps it frame by frame.
// Everything on screen is the real room: the script cuts between shots, moves the camera, drops and lifts pieces,
// swaps colours and sets the time. The voice and its word timings come from _reels/<room>/voice.js
// (Animations/_sketch/voice.mjs), so every cut and caption lands on a spoken word.
// Structure (researched 2026-10-22): the hook is the result, the empty flat filling with furniture as a price ticker
// counts the real Habitt total, lights on last; then one action per line, a cut every 2 to 3 s; one ask at the end.

const FPS = 30;
const REC = new URLSearchParams(location.search).has('rec');
const ROOM = location.pathname.replace(/^\/+|\/+$/g, '') || 'habitt-studio';

// a seeded random so the preview and the export swing the same way
let seed = 7;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeIO = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

function loadVoice() {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = `/_reels/${ROOM}/voice.js`; s.onload = () => ok(eval('VOICE')); s.onerror = fail; document.head.appendChild(s); });
}

export async function start(A) {
  const V = await loadVoice();
  // the take has a lead before the first word; the video starts just before it so the voice is there from frame 0
  const OFF = Math.max(0, V.scenes[0].start - 0.12), T_END = V.total - 0.1;
  const L = i => V.scenes[i];
  const W = (li, word) => { const w = L(li).words.find(x => x.w.toLowerCase().replace(/[^a-z']/g, '').startsWith(word)); return w ? w.t : L(li).start; };

  const P = it => A.PIECES[it.type];
  const find = (type, z) => A.items.find(it => it.type === type && (z === undefined || Math.abs(it.z - z) < 0.05));
  const sofa = find('habitt-billy-3-seater-sofa'), bed = find('habitt-marq-king-size-bed'), table = find('habitt-hendrick-dining-table');
  const WD = A.HOME.dist;
  const price = it => +(P(it).price || '').replace(/[^\d]/g, '') || 0;

  // ---- shots: one continuous camera move each, meeting in hard cuts on the voice ----
  // the story (researched 2026-10-22, playablespaces/_reels/<room>/research.md): you are furnishing your first home,
  // every piece costs real money and a delivered sofa is one you live with, so you try it here first, then buy it.
  // [start, hour(u, t), from [target, yaw, pitch, dist], to [...]]; medium and wide shots, never tight on a cushion
  const DAY = 15.4, EVE = 21.3;
  const tSofa = W(1, 'sofa'), tDeliv = W(1, 'delivered'), tTry = W(2, 'try'), tMove = W(3, 'move'), tGreen = W(3, 'green');
  const tSee = W(3, 'see'), tNight = W(3, 'night'), tHome = L(4).start, tTap = W(4, 'tap'), tBuy = W(4, 'buy');
  const c2 = L(1).start - 0.15, c2b = W(1, 'but') - 0.12, c3 = L(2).start - 0.15, c4 = tMove - 0.18, c5 = W(3, 'try') - 0.15, c6 = W(3, 'and') - 0.12, c7 = tHome - 0.15, c8 = tTap - 0.3, c9 = L(5).start - 0.2;
  const SOFA_TO = { x: -1.0, z: 0.85, rot: 0 };
  const SHOTS = [
    [OFF, () => 16.6, [[0, 1.3, 0.4], 0, 0.66, WD * 0.98], [[0, 1.1, 0.35], 0, 0.62, WD * 0.86]],                     // the empty home fills, symmetric, pushing in
    [c2, () => DAY, [[0.35, 0.75, -0.6], -0.42, 0.34, 8.4], [[0.35, 0.75, -0.6], -0.6, 0.36, 7.8]],                   // the grey sofa and its card, like the photo online
    [c2b, () => 18.4, [[-0.5, 0.45, -0.45], 0.22, 0.5, 9.4], [[-0.5, 0.45, -0.45], 0.4, 0.48, 8.5]],                  // delivered: it drops in, and you live with it
    [c3, () => DAY, [[0.1, 0.6, -0.4], -0.4, 0.44, 9.8], [[0.1, 0.6, -0.4], -0.55, 0.44, 9.0]],                       // try it here first: a tap lifts it
    [c4, () => DAY, [[-0.3, 0.0, 0.1], 0.0, 0.86, 16.5], [[-0.3, 0.0, 0.1], 0.12, 0.82, 15.5]],                      // wide from above: it travels across the room
    [c5, () => DAY, [[-1.0, 0.75, 0.85], -0.22, 0.38, 8.8], [[-1.0, 0.75, 0.85], -0.04, 0.38, 8.2]],                  // it turns green
    [c6, (u, t) => DAY + (EVE + 0.6 - DAY) * easeIO((t - tSee) / (tNight + 0.45 - tSee)), [[-0.6, 0.35, 0.2], 0.38, 0.56, 10.5], [[-0.6, 0.35, 0.2], 0.2, 0.54, 9.6]],   // day to night
    [c7, () => EVE + 0.6, [[-0.7, 0.55, 0.1], -0.38, 0.42, 9.0], [[-0.7, 0.55, 0.1], -0.6, 0.4, 8.2]],                  // feels like home: lamps on
    [c8, () => EVE + 0.6, [[-1.0, 0.8, 0.85], 0.22, 0.4, 8.8], [[-1.0, 0.8, 0.85], 0.05, 0.4, 8.2]],                 // the real price, and buy
    [c9, () => EVE + 0.4, [[0, -0.3, 0.1], 0.3, 0.62, WD * 1.06], [[0, -0.3, 0.1], 0.05, 0.6, WD * 0.95]],            // the whole home at night, the ask
  ];
  const lerpV = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
  const shotAt = t => { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++; return i; };
  function placeShot(t) {
    const i = shotAt(t), [t0, hour, a, b] = SHOTS[i], t1 = i < SHOTS.length - 1 ? SHOTS[i + 1][0] : T_END;
    const raw = clamp01((t - t0) / (t1 - t0)), u = raw * 0.6 + easeIO(raw) * 0.4;   // a steady dolly with soft ends
    const tg = lerpV(a[0], b[0], u);
    for (const c of [A.cam, A.camGoal]) { c.target.set(tg[0], tg[1], tg[2]); c.yaw = a[1] + (b[1] - a[1]) * u; c.pitch = a[2] + (b[2] - a[2]) * u; c.dist = a[3] + (b[3] - a[3]) * u; }
    A.setTime(hour(u, t));
  }

  // ---- the hook: the home starts empty and every piece drops into place ----
  for (const o of A.overlays) o.visible = false;
  for (const it of A.items) it.g.visible = false;
  const floor = A.items.filter(it => !P(it).onTop && !P(it).wall), tops = A.items.filter(it => P(it).onTop), walls = A.items.filter(it => P(it).wall);
  // a sweep from the back left corner to the front right, then what sits on top, then the prints
  const order = [...floor.sort((a, b) => (a.x - a.z * 0.6) - (b.x - b.z * 0.6)), ...tops, ...walls];
  const d0 = OFF + 0.05, d1 = W(0, 'money') - 0.35;
  const DROPS = order.map((it, i) => [d0 + (d1 - d0) * Math.pow(i / Math.max(1, order.length - 1), 0.9), it]);
  const drop = it => { it.g.visible = true; it.lift = P(it).wall ? 0.35 : P(it).onTop ? 0.45 : 1.3; it.liftV = -1.5; it.awake = true; A.kick(it, 0.35); };
  const TOTAL = A.items.reduce((s, it) => s + price(it), 0);
  const LANDS = DROPS.filter(([, it]) => price(it)).map(([at, it]) => [at + 0.22, price(it)]);
  const totalAt = t => LANDS.reduce((s, [at, p]) => s + (t >= at ? p : 0), 0);

  // ---- overlay ----
  const css = document.createElement('style');
  css.textContent = `
    .side, .tools, .card.light, #tray, #notes-layer, #cards, #tip, #ui-hint, #ghost, .sel-row button, dialog { display: none !important; }
    #reel { position: fixed; inset: 0; z-index: 20; pointer-events: none; font-family: var(--serif); }
    #reel .cap { position: absolute; left: 18px; right: 18px; top: 8.5%; text-align: center; font: italic 800 34px/1.12 var(--serif); color: var(--paper-hi); letter-spacing: -.01em; text-shadow: 0 2px 18px #00000070; }
    #reel .cap span { display: inline-block; white-space: pre; will-change: transform, opacity, filter; }
    #reel .cap span.hi { color: #FF8A3D; } #reel .cap span.gr { color: #6FD39A; } #reel .cap span.rd { color: #FF5A4A; }
    #reel .tick { position: absolute; left: 0; right: 0; top: 23%; display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: 0; }
    #reel .tick small { font: 600 12px var(--ui); letter-spacing: .08em; text-transform: uppercase; color: #FFFEFAcc; }
    #reel .tick b { font: 800 40px/1 var(--display); color: var(--paper-hi); font-variant-numeric: tabular-nums; text-shadow: 0 4px 20px #00000070; }
    #reel .touch { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: #FFFEFAcc; box-shadow: 0 4px 18px #00000040; opacity: 0; }
    #reel .ring { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 2px solid #FFFEFA; opacity: 0; }
    #reel .end { position: absolute; left: 0; right: 0; bottom: 15%; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    #reel .end > div { opacity: 0; }
    #reel .end .pre { font: italic 800 34px/1 var(--serif); color: var(--paper-hi); text-shadow: 0 2px 18px #00000066; }
    #reel .end .word { font: 800 92px/1 var(--display); color: #FF8A3D; letter-spacing: .01em; text-shadow: 0 6px 30px #00000066; }
    #reel .end .post { font: italic 600 21px/1.2 var(--serif); color: var(--paper-hi); }
    #reel .end .mark { margin-top: 16px; font: italic 800 18px var(--serif); color: var(--paper-hi); }
    #reel .end .mark b { font: 800 18px var(--display); color: #44B977; letter-spacing: .02em; }
    #pc-buy.press { transform: scale(.94); filter: brightness(1.15); }
    #reel .go { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto; cursor: pointer; background: #1A120588; color: var(--paper-hi); font: 600 16px var(--ui); }
  `;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'reel';
  root.innerHTML = `<div class="cap"></div><div class="tick"><small>Habitt furniture so far</small><b>Rs 0</b></div><div class="touch"></div><div class="ring"></div>
    <div class="end"><div class="pre">Comment</div><div class="word">PLAY</div><div class="post">and I'll send you the link.</div><div class="mark">Playable <b>SPACES</b></div></div>`;
  document.body.appendChild(root);
  const $r = s => root.querySelector(s);
  const capEl = $r('.cap'), tickEl = $r('.tick'), tickNum = $r('.tick b'), touchEl = $r('.touch'), ringEl = $r('.ring'), endEl = $r('.end');

  // captions: each spoken line builds word by word on its words; the last line is the end card instead
  const cls = w => /^(real|habitt|play|home)\b/i.test(w) ? 'hi' : /^green/i.test(w) ? 'gr' : /^red/i.test(w) ? 'rd' : '';
  let capShown = -1;
  const last = V.scenes.length - 1;
  function drawCaption(t) {
    let i = -1;
    for (let k = 0; k < last; k++) if (t >= L(k).start - 0.05 && t < (k < last - 1 ? L(k + 1).start - 0.12 : L(k).end + 0.3)) i = k;
    if (i !== capShown) { capShown = i; capEl.innerHTML = i < 0 ? '' : L(i).words.map(w => `<span class="${cls(w.w)}">${w.w} </span>`).join(''); }
    if (i < 0) return;
    const out = i === last - 1 ? easeOut((t - L(i).end) / 0.3) : 0;
    capEl.querySelectorAll('span').forEach((s, n) => {
      const k = easeOut((t - L(i).words[n].t + 0.06) / 0.2);
      s.style.opacity = k * (1 - out); s.style.transform = `translateY(${(1 - k) * 12}px) scale(${0.9 + 0.1 * k})`; s.style.filter = `blur(${(1 - k) * 5}px)`;
    });
  }
  // the ticker rolls up to the running total as each Habitt piece lands, then leaves with the hook
  let shownTotal = 0;
  function drawTicker(t, dt) {
    const target = totalAt(t);
    shownTotal += (target - shownTotal) * (1 - Math.exp(-dt * 14));
    if (Math.abs(target - shownTotal) < 1) shownTotal = target;
    tickNum.textContent = 'Rs ' + Math.round(shownTotal).toLocaleString('en-US');
    const k = easeOut((t - OFF - 0.05) / 0.3) * (1 - easeOut((t - c2 + 0.15) / 0.2));
    tickEl.style.opacity = k;
    const pulse = LANDS.some(([at]) => t >= at && t < at + 0.12) ? 1.06 : 1;
    tickNum.style.transform = `scale(${pulse})`;
  }

  // touches: [time, where]; where returns screen x, y
  const onPiece = (it, up = 0.5) => () => A.toScreen(it.g.localToWorld(it.g.position.clone().set(0, up, 0)));
  const onEl = sel => () => { const d = document.querySelector(sel); if (!d) return [-99, -99]; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const TOUCHES = [[tTry, onPiece(sofa, 0.5)], [tGreen, onEl('#pc-sw .dot[title="Light Green"]')], [tBuy, onEl('#pc-buy')], [tTap, onPiece(sofa, 0.5)]];
  let touchPos = null, touchFor = null;
  function drawTouch(t) {
    const tc = TOUCHES.find(([a]) => t >= a - 0.2 && t < a + 0.7);
    if (!tc) { touchEl.style.opacity = ringEl.style.opacity = 0; touchFor = null; return; }
    const d = t - tc[0];
    if (touchFor !== tc) { touchPos = tc[1](); touchFor = tc; }
    const [x, y] = touchPos;
    const k = d < 0 ? easeOut((d + 0.2) / 0.2) : 1, press = d < 0 ? 1 : d < 0.12 ? 1 - 0.18 * easeOut(d / 0.12) : 0.82 + 0.18 * easeOut((d - 0.12) / 0.2);
    const fade = 1 - easeOut((d - 0.3) / 0.35);
    Object.assign(touchEl.style, { left: x + 'px', top: y + 'px', opacity: k * fade * 0.9, transform: `scale(${(0.6 + 0.4 * k) * press})` });
    const r = easeOut(d / 0.55);
    Object.assign(ringEl.style, { left: x + 'px', top: y + 'px', opacity: d > 0 ? (1 - r) * 0.8 : 0, transform: `scale(${1 + r * 1.4})` });
    const buy = document.getElementById('pc-buy'); if (buy) buy.classList.toggle('press', tc === TOUCHES[2] && d >= 0 && d < 0.18);
  }
  const tEnd = L(last).start - 0.1;
  function drawEnd(t) {
    endEl.querySelectorAll(':scope > div').forEach((d, n) => {
      const at = [tEnd, W(last, 'play') - 0.05, W(last, 'send') - 0.1, W(last, 'link') + 0.3][n], k = easeOut((t - at) / 0.4);
      d.style.opacity = k; d.style.transform = n === 1 ? `scale(${0.6 + 0.4 * easeOut((t - at) / 0.32) + 0.06 * Math.sin(Math.min(1, (t - at) / 0.5) * Math.PI)})` : `translateY(${(1 - k) * 14}px)`;
    });
  }
  // the product card never sits under a caption: when they would touch, it drops just below the caption
  const selEl = document.getElementById('sel');
  function clearCaption() {
    if (!selEl.classList.contains('on') || !capEl.textContent) return;
    const gap = capEl.getBoundingClientRect().bottom + 12 - selEl.getBoundingClientRect().top;
    if (gap > 0) selEl.style.top = (parseFloat(selEl.style.top) + gap) + 'px';
  }

  // ---- events on the room ----
  // the sofa is held up out of shot after the cut, then dropped so it lands on "delivered"
  let holdSofa = false;
  const SOFA_FROM = { x: sofa.x, z: sofa.z, rot: sofa.rot }, MOVE_D = 0.95;
  function steer(t) {
    selEl.style.visibility = t >= c4 && t < c5 ? 'hidden' : '';   // the card would hide the sofa while it travels
    if (holdSofa) { sofa.lift = 1.7; sofa.liftV = 0; sofa.awake = true; }
    // the move: the spot glides across the room over a second; the float physics trails and swings behind it
    if (t >= tMove && t <= tMove + MOVE_D + 0.05) {
      const u = easeIO((t - tMove) / MOVE_D);
      sofa.x = SOFA_FROM.x + (SOFA_TO.x - SOFA_FROM.x) * u; sofa.z = SOFA_FROM.z + (SOFA_TO.z - SOFA_FROM.z) * u; sofa.rot = SOFA_FROM.rot + (SOFA_TO.rot - SOFA_FROM.rot) * u;
    }
  }
  const EVENTS = [
    ...DROPS.map(([at, it]) => [at, () => drop(it)]),
    [tSofa - 0.1, () => A.selectItem(sofa)],
    [c2b, () => { A.selectItem(null); holdSofa = true; }],
    [tDeliv - 0.22, () => { holdSofa = false; sofa.liftV = -2; }],
    [tTry, () => A.selectItem(sofa)],
    [tGreen + 0.06, () => { A.setVariant(sofa, 'Light Green'); A.selectItem(sofa); }],
    [c6, () => A.selectItem(null)],
    [tTap, () => A.selectItem(sofa)],
    [c9, () => A.selectItem(null)],
  ].sort((a, b) => a[0] - b[0]);

  const cuts = SHOTS.slice(1).map(s => s[0]);
  const SFX = [
    ...DROPS.map(([at, it]) => [at + 0.22, P(it).onTop || P(it).wall ? 'tap' : 'thump', { l: P(it).onTop || P(it).wall ? 0.4 : (P(it).h > 0.8 ? 0.55 : 0.32) }]),
    ...LANDS.map(([at]) => [at + 0.02, 'tk', { l: 0.6, p: 1.1 }]),
    ...cuts.map(c => [c, 'air', { l: 0.3, d: 0.22 }]),
    [tSofa - 0.1, 'flick', { l: 0.5 }],
    [tDeliv, 'thump', { l: 1.2 }],
    [tTry, 'tap', { l: 1 }], [tTry + 0.05, 'rise', { l: 0.5, d: 0.25 }], [tTry + 0.05, 'flick', { l: 0.5 }],
    [tMove + 0.1, 'air', { l: 0.6, d: MOVE_D }],
    [tGreen, 'tap', { l: 0.9 }], [tGreen + 0.06, 'bloop', { f: 520, l: 0.6 }],
    [c6 + 0.05, 'thump', { l: 0.6 }],
    ...Array.from({ length: 16 }, (_, i) => [tSee + i * 0.07, 'tk', { l: 0.4, p: 1 + i * 0.02 }]),
    [tTap, 'tap', { l: 1 }], [tTap + 0.05, 'flick', { l: 0.5 }],
    [tBuy, 'tap', { l: 1 }],
    [W(5, 'play') - 0.05, 'thump', { l: 0.6 }], [W(5, 'play') - 0.05, 'bloop', { f: 440, l: 0.6 }],
  ];

  // ---- the clock (voice time) ----
  let t = OFF, ei = 0;
  function advance(dt) {
    t += dt;
    while (ei < EVENTS.length && EVENTS[ei][0] <= t) EVENTS[ei++][1]();
    steer(t);
    placeShot(t);
    A.renderer.shadowMap.needsUpdate = true;
    A.frame(dt, true);
    drawCaption(t); clearCaption(); drawTicker(t, dt); drawTouch(t); drawEnd(t);
  }
  placeShot(t); A.frame(1 / FPS, true); drawTicker(t, 0); drawEnd(t);
  console.log('reel: Habitt total in the flat Rs ' + TOTAL.toLocaleString('en-US'));

  if (REC) {
    // the recorder calls step() once per video frame, then takes a screenshot
    window.__reel = { fps: FPS, frames: Math.ceil((T_END - OFF) * FPS), total: TOTAL, step: () => advance(1 / FPS), audio: () => renderAudio(SFX, V.b64, OFF, T_END - OFF) };
    return;
  }
  const go = document.createElement('div'); go.className = 'go'; go.textContent = 'Tap to play';
  root.appendChild(go);
  go.onclick = async () => {
    go.remove();
    const ac = new AudioContext(), w0 = ac.currentTime + 0.1;
    const voice = await ac.decodeAudioData(b64buf(V.b64));
    const src = ac.createBufferSource(); src.buffer = voice; src.connect(ac.destination); src.start(w0, OFF);
    for (const [at, kind, a] of SFX) if (at >= OFF) SOUND[kind](ac, ac.destination, w0 + at - OFF, a);
    const startMs = performance.now() + 100; let lastMs = startMs;
    const loop = () => {
      const nowMs = performance.now();
      if (nowMs >= startMs) { const dt = Math.min(0.05, (nowMs - lastMs) / 1000); lastMs = nowMs; advance(dt); }
      if (t < T_END) requestAnimationFrame(loop);
      else { const again = document.createElement('div'); again.className = 'go'; again.textContent = 'Tap to replay'; again.onclick = () => location.reload(); root.appendChild(again); }
    };
    requestAnimationFrame(loop);
  };
}
const b64buf = b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };

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
// (the voice take plays from `off`, the effects at their voice times minus `off`, so the WAV starts on video frame 0)
async function renderAudio(sfx, voiceB64, off, dur) {
  const sr = 48000, ac = new OfflineAudioContext(2, Math.ceil(sr * (dur + 0.5)), sr);
  const src = ac.createBufferSource(); src.buffer = await ac.decodeAudioData(b64buf(voiceB64)); src.connect(ac.destination); src.start(0, off);
  for (const [at, kind, a] of sfx) if (at >= off) SOUND[kind](ac, ac.destination, at - off, a);
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
