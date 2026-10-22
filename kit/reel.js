// Promo reel for a space (dev only, kept off the live site), cut like a product ad over a voiceover.
// Open /<room>?reel in a 9:16 window (kit/reel-preview.html does that) and tap to play; the recorder
// (tools/record-reel.mjs) opens /<room>?reel&rec and steps it frame by frame.
// Everything on screen is the real room: the script cuts between shots, moves the camera, drops and lifts pieces,
// swaps colours, palettes and the time. The voice and its word timings come from _reels/<room>/voice.js
// (Animations/_sketch/voice.mjs), so every cut, caption and action lands on its spoken word.
// Order Anas set (2026-10-22): I made this, what it is, why I made it, the benefits, then a long end that sells
// Playable Spaces itself. Research behind the story: rooms/<room>/reel-research.md.

const FPS = 30;
const REC = new URLSearchParams(location.search).has('rec');
const ROOM = location.pathname.replace(/^\/+|\/+$/g, '') || 'habitt-studio';

// a seeded random so the preview and the export swing the same way
let seed = 7;
Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

const clamp01 = x => Math.min(1, Math.max(0, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = x => Math.pow(clamp01(x), 3);
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
  const last = V.scenes.length - 1;

  const P = it => A.PIECES[it.type];
  const sofa = A.items.find(it => it.type === 'habitt-billy-3-seater-sofa'), table = A.items.find(it => it.type === 'habitt-hendrick-dining-table');
  const hoppers = ['habitt-cane-charm-armchair', 'habitt-kade-coffee-table', 'habitt-kade-side-table', 'tablelamp', 'tabledecor', 'sofadress', 'lamp']
    .flatMap(ty => A.items.filter(it => it.type === ty && it.x < 0.9));
  const WD = A.HOME.dist;
  const price = it => +(P(it).price || '').replace(/[^\d]/g, '') || 0;

  // ---- times, all on spoken words ----
  const tPlay = W(0, 'play'), tReal = W(1, 'real'), tPrice = W(1, 'price'), tPhoto = W(2, 'photo'), tGamble = W(2, 'gamble'), tDeliv = W(2, 'delivered');
  const tTry = W(3, 'try'), tMove = W(4, 'move'), tChange = W(4, 'change'), tRestyle = W(5, 'restyle'), tOne = W(5, 'one');
  const tSee = W(6, 'see'), tMorning = W(6, 'morning'), tNight = W(6, 'night'), tWhen = W(7, 'when'), tBuy = W(7, 'buy'), tSite = W(7, 'habitt');
  const tCalled = W(8, 'playable'), tComment = W(9, 'comment'), tPLAY = W(9, 'play'), tSell = W(10, 'sell');
  const c1 = L(1).start - 0.15, c2 = L(2).start - 0.15, c3 = W(2, 'and') - 0.12, c4 = L(3).start - 0.15, c5 = L(4).start - 0.18,
    c6 = W(4, 'and') - 0.12, c7 = L(5).start - 0.15, c8 = L(6).start - 0.15, c9 = L(7).start - 0.15, c10 = L(8).start - 0.2;

  // ---- shots: one continuous camera move each, meeting in hard cuts on the voice; medium and wide only ----
  // [start, hour(t), from [target, yaw, pitch, dist], to [...]]
  const DAY = 15.4, EVE = 21.6;
  const SOFA_TO = { x: -1.0, z: 0.85, rot: 0 };
  const SHOTS = [
    [OFF, () => 16.6, [[0, 1.3, 0.4], 0, 0.66, WD * 0.98], [[0, 1.1, 0.35], 0, 0.62, WD * 0.86]],                       // I built a home: it fills, symmetric, pushing in
    [c1, () => 17.0, [[-1.2, 0.45, -0.9], -0.28, 0.56, 11.5], [[-1.2, 0.45, -0.9], -0.45, 0.54, 10.4]],               // real Habitt furniture, real prices: cards
    [c2, () => DAY, [[0.35, 0.75, -0.6], -0.42, 0.34, 8.4], [[0.35, 0.75, -0.6], -0.6, 0.36, 7.8]],                    // buying from a photo
    [c3, () => 18.4, [[-0.5, 0.45, -0.45], 0.22, 0.5, 9.4], [[-0.5, 0.45, -0.45], 0.4, 0.48, 8.5]],                   // delivered: it drops in, you live with it
    [c4, () => DAY, [[0.1, 0.6, -0.4], -0.4, 0.44, 9.8], [[0.1, 0.6, -0.4], -0.55, 0.44, 9.0]],                        // here, you try it first: a tap lifts it
    [c5, () => DAY, [[-0.3, 0.0, 0.1], 0.0, 0.86, 16.5], [[-0.3, 0.0, 0.1], 0.12, 0.82, 15.5]],                        // move any piece: wide from above
    [c6, () => DAY, [[-1.0, 0.75, 0.85], -0.22, 0.38, 8.8], [[-1.0, 0.75, 0.85], -0.04, 0.38, 8.2]],                   // change its colours
    [c7, () => 13.0, [[0, -0.3, 0.1], 0.5, 0.62, WD * 0.96], [[0, -0.3, 0.1], 0.25, 0.6, WD * 0.9]],                   // restyle the whole home
    [c8, t => t < tMorning + 0.3 ? 8.2 + 1.2 * easeIO((t - c8) / (tMorning + 0.3 - c8)) : 9.4 + (EVE + 0.5 - 9.4) * easeIO((t - tMorning - 0.3) / (tNight + 0.4 - tMorning - 0.3)),
      [[0, -0.3, 0.1], 0.2, 0.62, WD * 0.94], [[0, -0.3, 0.1], -0.05, 0.6, WD * 0.88]],                               // morning to night
    [c9, () => EVE, [[-1.0, 0.8, 0.85], 0.22, 0.4, 8.8], [[-1.0, 0.8, 0.85], 0.05, 0.4, 8.2]],                          // buy it from Habitt's website
    [c10, () => EVE, [[0, -1.6, 0.2], 0.45, 0.62, WD * 1.02], [[0, -1.8, 0.2], -0.25, 0.6, WD * 0.94]],               // Playable Spaces: the long end, home framed high above the card
  ];
  const lerpV = (a, b, u) => a.map((x, i) => x + (b[i] - x) * u);
  const shotAt = t => { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1][0]) i++; return i; };
  function placeShot(t) {
    const i = shotAt(t), [t0, hour, a, b] = SHOTS[i], t1 = i < SHOTS.length - 1 ? SHOTS[i + 1][0] : T_END;
    const raw = clamp01((t - t0) / (t1 - t0)), u = raw * 0.6 + easeIO(raw) * 0.4;   // a steady dolly with soft ends
    const tg = lerpV(a[0], b[0], u);
    for (const c of [A.cam, A.camGoal]) { c.target.set(tg[0], tg[1], tg[2]); c.yaw = a[1] + (b[1] - a[1]) * u; c.pitch = a[2] + (b[2] - a[2]) * u; c.dist = a[3] + (b[3] - a[3]) * u; }
    A.setTime(hour(t));
  }

  // ---- the hook: the home starts empty and every piece drops into place ----
  for (const o of A.overlays) o.visible = false;
  for (const it of A.items) it.g.visible = false;
  const floor = A.items.filter(it => !P(it).onTop && !P(it).wall), tops = A.items.filter(it => P(it).onTop), walls = A.items.filter(it => P(it).wall);
  const order = [...floor.sort((a, b) => (a.x - a.z * 0.6) - (b.x - b.z * 0.6)), ...tops, ...walls];   // back left to front right, then tops, then prints
  const d0 = OFF + 0.05, d1 = tPlay - 0.3;
  const DROPS = order.map((it, i) => [d0 + (d1 - d0) * Math.pow(i / Math.max(1, order.length - 1), 0.9), it]);
  const drop = it => { it.g.visible = true; it.lift = P(it).wall ? 0.35 : P(it).onTop ? 0.45 : 1.3; it.liftV = -1.5; it.awake = true; A.kick(it, 0.35); };
  const LANDS = DROPS.filter(([, it]) => price(it)).map(([at, it]) => [at + 0.22, price(it)]);
  const TOTAL = LANDS.reduce((s, [, p]) => s + p, 0);
  const totalAt = t => LANDS.reduce((s, [at, p]) => s + (t >= at ? p : 0), 0);

  // ---- palettes: every slot wipes to the mood's material, a little apart ----
  const cur = Object.fromEntries(A.SLOT_KEYS.map(k => [k, A.curMat(k).id]));
  const moodWipes = (t, key) => {
    const m = A.MOODS[key], out = []; let i = 0;
    for (const k of A.SLOT_KEYS) { const id = m.mats[k]; if (id && id !== cur[k]) { out.push([t + i * 0.06, () => A.wipe(k, id)]); cur[k] = id; i++; } }
    return out;
  };

  // ---- real habitt.com pages, captured at 390 x 844 by tools/capture-site.mjs into _reels/<room>/site/ ----
  const SD = '/_reels/' + ROOM + '/site/';
  const SITE = { list: SD + 'sofas.jpg', page: ['grey', 'red', 'light-green', 'off-white', 'grey'].map(c => SD + 'billy-' + c + '.jpg') };
  // the Billy 3 Seater Sofa tile on the listing, in the 1080 px wide capture (second row, right column)
  const TILE = { x: 792, y: 1830 }, PHONE_W = 260, SCREEN_H = PHONE_W * 844 / 390, SCROLL = TILE.y * PHONE_W / 1080 - SCREEN_H * 0.5;
  await Promise.all([SITE.list, ...SITE.page].map(u => { const im = new Image(); im.src = u; return im.decode().catch(() => console.warn('page capture failed', u)); }));

  // ---- overlay ----
  const css = document.createElement('style');
  css.textContent = `
    .side, .tools, .card.light, #tray, #notes-layer, #cards, #tip, #ui-hint, #ghost, .sel-row button, dialog { display: none !important; }
    #reel { position: fixed; inset: 0; z-index: 20; pointer-events: none; font-family: var(--serif); }
    #reel .cap { position: absolute; left: 18px; right: 18px; top: 8.5%; text-align: center; font: italic 800 33px/1.12 var(--serif); color: var(--paper-hi); letter-spacing: -.01em; text-shadow: 0 2px 18px #00000070; }
    #reel .cap span { display: inline-block; white-space: pre; will-change: transform, opacity, filter; }
    #reel .cap span.hi { color: #FF8A3D; }
    #reel .tick { position: absolute; left: 0; right: 0; top: 23%; display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: 0; }
    #reel .tick small { font: 600 12px var(--ui); letter-spacing: .08em; text-transform: uppercase; color: #FFFEFAcc; }
    #reel .tick b { font: 800 40px/1 var(--display); color: var(--paper-hi); font-variant-numeric: tabular-nums; text-shadow: 0 4px 20px #00000070; }
    #reel .dim { position: absolute; inset: 0; background: #0b141c; opacity: 0; }
    #reel .shop { position: absolute; left: 50%; top: 22%; width: ${PHONE_W + 18}px; height: ${SCREEN_H + 18}px; box-sizing: border-box; padding: 9px; border-radius: 34px; background: #111; box-shadow: 0 30px 70px #000000a0, inset 0 0 0 2px #333; opacity: 0; }
    #reel .shop .screen { position: relative; width: 100%; height: 100%; border-radius: 26px; overflow: hidden; background: #fff; }
    #reel .shop .screen > img { position: absolute; left: 0; top: 0; width: 100%; display: block; }
    #reel .shop .hdr { position: absolute; left: 0; right: 0; top: 0; height: ${Math.round(42 * PHONE_W / 390)}px; overflow: hidden; z-index: 1; }
    #reel .shop .hdr img { width: 100%; display: block; }
    #reel .shop .page { position: absolute; inset: 0; background: #fff; transform: translateX(100%); }
    #reel .shop .page img { width: 100%; display: block; }
    #reel .site { position: absolute; padding: 9px 14px; border-radius: 999px; background: #FFFEFA; color: var(--ink); font: 600 13px var(--ui); box-shadow: 0 10px 30px #00000055; white-space: nowrap; opacity: 0; transform: translate(-50%, 0); }
    #reel .site i { font-style: normal; color: var(--green); }
    #reel .touch { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: #FFFEFAcc; box-shadow: 0 4px 18px #00000040; opacity: 0; }
    #reel .ring { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 2px solid #FFFEFA; opacity: 0; }
    #reel .endbg { position: absolute; left: 0; right: 0; bottom: 0; height: 56%; background: linear-gradient(to bottom, #0b141c00, #0b141cf5 22%, #0b141cf8); opacity: 0; }
    #reel .end { position: absolute; left: 0; right: 0; bottom: 13%; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
    #reel .end > div { opacity: 0; }
    #reel .end .mark { font: italic 800 44px/1 var(--serif); color: var(--paper-hi); text-shadow: 0 4px 24px #00000070; }
    #reel .end .mark b { font: 800 44px var(--display); color: #44B977; letter-spacing: .02em; }
    #reel .end .tag { font: italic 600 19px/1.25 var(--serif); color: #FFFEFAdd; }
    #reel .end .word { margin-top: 10px; font: 800 30px/1 var(--display); color: var(--paper-hi); }
    #reel .end .word b { color: #FF8A3D; font-size: 54px; vertical-align: -6px; }
    #reel .end .url { font: 600 13px var(--ui); color: #FFFEFAcc; }
    #reel .end .brand { margin-top: 10px; font: 700 13px var(--ui); color: var(--paper-hi); background: var(--green); padding: 9px 15px; border-radius: 999px; box-shadow: 0 8px 24px #00000040; }
    #pc-buy.press { transform: scale(.94); filter: brightness(1.15); }
    #reel .go { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto; cursor: pointer; background: #1A120588; color: var(--paper-hi); font: 600 16px var(--ui); }
  `;
  document.head.appendChild(css);
  const root = document.createElement('div'); root.id = 'reel';
  root.innerHTML = `<div class="dim"></div><div class="shop"><div class="screen"><img class="list" src="${SITE.list}" alt=""><div class="hdr"><img src="${SITE.list}" alt=""></div><div class="page"><img src="${SITE.page[0]}" alt=""></div></div></div>
    <div class="cap"></div><div class="tick"><small>Habitt furniture in this home</small><b>Rs 0</b></div>
    <div class="site">habitt.com<i>/products/billy-3-seater-sofa</i></div><div class="touch"></div><div class="ring"></div>
    <div class="endbg"></div><div class="end"><div class="mark">Playable <b>SPACES</b></div><div class="tag">A home you can play with before you buy.</div>
      <div class="word">Comment <b>PLAY</b></div><div class="url">playablespaces.vercel.app</div><div class="brand">Sell furniture? I'll build your store next.</div></div>`;
  document.body.appendChild(root);
  const $r = s => root.querySelector(s);
  const capEl = $r('.cap'), tickEl = $r('.tick'), tickNum = $r('.tick b'), touchEl = $r('.touch'), ringEl = $r('.ring'), endEl = $r('.end');
  const dimEl = $r('.dim'), shopEl = $r('.shop'), listImg = $r('.shop .list'), pageEl = $r('.shop .page'), pageImg = $r('.shop .page img'), siteEl = $r('.site');

  // captions: each spoken line builds word by word on its words
  const cls = w => /^(real|habitt|play|playable|spaces)/i.test(w) ? 'hi' : '';
  let capShown = -1;
  function drawCaption(t) {
    let i = -1;
    for (let k = 0; k <= last; k++) if (t >= L(k).start - 0.05 && t < (k < last ? L(k + 1).start - 0.12 : L(k).end + 0.6)) i = k;
    if (i !== capShown) { capShown = i; capEl.innerHTML = i < 0 ? '' : L(i).words.map(w => `<span class="${cls(w.w)}">${w.w} </span>`).join(''); }
    if (i < 0) return;
    const out = i === last ? easeOut((t - L(i).end - 0.3) / 0.3) : 0;
    capEl.querySelectorAll('span').forEach((s, n) => {
      const k = easeOut((t - L(i).words[n].t + 0.06) / 0.2);
      s.style.opacity = k * (1 - out); s.style.transform = `translateY(${(1 - k) * 12}px) scale(${0.9 + 0.1 * k})`; s.style.filter = `blur(${(1 - k) * 5}px)`;
    });
  }
  // the ticker rolls up to the running total as each Habitt piece lands
  let shownTotal = 0;
  function drawTicker(t, dt) {
    const target = totalAt(t);
    shownTotal += (target - shownTotal) * (1 - Math.exp(-dt * 14));
    if (Math.abs(target - shownTotal) < 1) shownTotal = target;
    tickNum.textContent = 'Rs ' + Math.round(shownTotal).toLocaleString('en-US');
    tickEl.style.opacity = easeOut((t - OFF - 0.05) / 0.3) * (1 - easeOut((t - c1 + 0.15) / 0.2));
    tickNum.style.transform = `scale(${LANDS.some(([at]) => t >= at && t < at + 0.12) ? 1.06 : 1})`;
  }
  // the website: real habitt.com pages captured at phone size (tools/capture-site.mjs) in a phone. The sofa listing
  // scrolls, a tap opens the Billy sofa, on "photo" its real page is up, on "gamble" its colours flick, then it flies away
  const tTile = W(2, 'furniture');
  function drawShop(t) {
    const on = t >= c2 && t < c3 + 0.05;
    if (!on) { shopEl.style.opacity = 0; dimEl.style.opacity = 0; return; }
    const k = easeOut((t - c2) / 0.35), away = easeIn((t - (c3 - 0.35)) / 0.35);
    dimEl.style.opacity = 0.86 * k * (1 - away);
    shopEl.style.opacity = k;
    shopEl.style.transform = `translate(-50%, ${(1 - k) * 30 - away * 140}%) rotate(${-away * 8}deg)`;
    // the listing scrolls until the Billy tile sits under the thumb, then the product page slides over it
    listImg.style.transform = `translateY(${-easeIO((t - c2 - 0.15) / (tTile - 0.25 - c2 - 0.15)) * SCROLL}px)`;
    const p = easeOut((t - tTile - 0.3) / 0.35);
    pageEl.style.transform = `translateX(${(1 - p) * 100}%)`;
    const flips = Math.floor((t - tGamble) / 0.16);
    pageImg.src = SITE.page[t < tGamble || flips >= SITE.page.length ? 0 : flips];
  }
  // the website: a link pill rises out of the Buy button on "Habitt's website"
  function drawSite(t) {
    const k = easeOut((t - tSite + 0.1) / 0.35), out = t > c10 - 0.05 ? 1 : 0;
    const b = document.getElementById('pc-buy');
    if (!b || k <= 0 || out) { siteEl.style.opacity = 0; return; }
    const r = b.getBoundingClientRect();
    Object.assign(siteEl.style, { left: (r.left + r.width / 2) + 'px', top: (r.bottom + 14 + (1 - k) * -18) + 'px', opacity: k });
  }

  // touches: [time, where]; where returns screen x, y
  const onPiece = (it, up = 0.5) => () => A.toScreen(it.g.localToWorld(it.g.position.clone().set(0, up, 0)));
  const onEl = sel => () => { const d = document.querySelector(sel); if (!d) return [-99, -99]; const r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const SWATCHES = ['Light Green', 'Red', 'Off White', 'Grey', 'Light Green'].map((v, i) => [tChange + i * 0.29, v]);
  const BUY_TOUCH = [tBuy, onEl('#pc-buy')];
  const onTile = () => { const r = listImg.getBoundingClientRect(); return [r.left + TILE.x * PHONE_W / 1080, r.top + TILE.y * PHONE_W / 1080]; };
  const TOUCHES = [[tTile, onTile], [tTry, onPiece(sofa, 0.5)], ...SWATCHES.map(([at, v]) => [at, onEl(`#pc-sw .dot[title="${v}"]`)]), [tWhen, onPiece(sofa, 0.5)], BUY_TOUCH].sort((a, b) => a[0] - b[0]);
  let touchPos = null, touchFor = null;
  function drawTouch(t) {
    let tc = null; for (const x of TOUCHES) if (t >= x[0] - 0.12 && t < x[0] + 0.6) tc = x;
    if (!tc) { touchEl.style.opacity = ringEl.style.opacity = 0; touchFor = null; return; }
    const d = t - tc[0];
    if (touchFor !== tc) { touchPos = tc[1](); touchFor = tc; }
    const [x, y] = touchPos;
    const k = d < 0 ? easeOut((d + 0.12) / 0.12) : 1, press = d < 0 ? 1 : d < 0.1 ? 1 - 0.18 * easeOut(d / 0.1) : 0.82 + 0.18 * easeOut((d - 0.1) / 0.18);
    const fade = 1 - easeOut((d - 0.25) / 0.3);
    Object.assign(touchEl.style, { left: x + 'px', top: y + 'px', opacity: k * fade * 0.9, transform: `scale(${(0.6 + 0.4 * k) * press})` });
    const r = easeOut(d / 0.5);
    Object.assign(ringEl.style, { left: x + 'px', top: y + 'px', opacity: d > 0 ? (1 - r) * 0.8 : 0, transform: `scale(${1 + r * 1.4})` });
    const buy = document.getElementById('pc-buy'); if (buy) buy.classList.toggle('press', tc === BUY_TOUCH && d >= 0 && d < 0.18);
  }
  // the end card builds on its words and stays: Playable Spaces, what it is, the ask, the link, the offer to brands
  const endBg = root.querySelector(".endbg");
  function drawEnd(t) {
    endBg.style.opacity = easeOut((t - tCalled + 0.3) / 0.5);
    const at = [tCalled - 0.05, W(8, 'spaces') + 0.35, tComment - 0.05, tPLAY + 0.5, tSell - 0.05];
    endEl.querySelectorAll(':scope > div').forEach((d, n) => {
      const k = easeOut((t - at[n]) / 0.4);
      d.style.opacity = k; d.style.transform = n === 2 ? `scale(${0.7 + 0.3 * easeOut((t - at[n]) / 0.3) + 0.05 * Math.sin(Math.min(1, (t - at[n]) / 0.5) * Math.PI)})` : `translateY(${(1 - k) * 14}px)`;
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
  let holdSofa = false;
  const SOFA_FROM = { x: sofa.x, z: sofa.z, rot: sofa.rot }, MOVE_D = 0.95;
  function steer(t) {
    selEl.style.visibility = (t >= c5 && t < c6) || (t >= c2 && t < c3) ? 'hidden' : '';   // no card while the sofa travels or in the photo
    if (holdSofa) { sofa.lift = 1.7; sofa.liftV = 0; sofa.awake = true; }
    if (t >= tMove && t <= tMove + MOVE_D + 0.05) {
      const u = easeIO((t - tMove) / MOVE_D);
      sofa.x = SOFA_FROM.x + (SOFA_TO.x - SOFA_FROM.x) * u; sofa.z = SOFA_FROM.z + (SOFA_TO.z - SOFA_FROM.z) * u; sofa.rot = SOFA_FROM.rot + (SOFA_TO.rot - SOFA_FROM.rot) * u;
    }
  }
  const EVENTS = [
    ...DROPS.map(([at, it]) => [at, () => drop(it)]),
    ...hoppers.map((it, i) => [tPlay + i * 0.03, () => { it.liftV += 2.2; it.awake = true; A.kick(it, 0.5); }]),
    [tReal - 0.05, () => A.selectItem(sofa)],
    [tPrice - 0.15, () => A.selectItem(table)],
    [c2, () => A.selectItem(null)],
    [c3, () => { holdSofa = true; }],
    [tDeliv - 0.22, () => { holdSofa = false; sofa.liftV = -2; }],
    [tTry, () => A.selectItem(sofa)],
    ...SWATCHES.map(([at, v]) => [at + 0.06, () => { A.setVariant(sofa, v); A.selectItem(sofa); }]),
    [c7, () => A.selectItem(null)],
    ...moodWipes(tRestyle, 'bright'),
    ...moodWipes(tOne, 'moody'),
    ...moodWipes(c8 + 0.05, 'cozy'),
    [tWhen, () => A.selectItem(sofa)],
    [c10, () => A.selectItem(null)],
  ].sort((a, b) => a[0] - b[0]);

  const cuts = SHOTS.slice(1).map(s => s[0]);
  const SFX = [
    ...DROPS.map(([at, it]) => [at + 0.22, P(it).onTop || P(it).wall ? 'tap' : 'thump', { l: P(it).onTop || P(it).wall ? 0.4 : (P(it).h > 0.8 ? 0.55 : 0.32) }]),
    ...LANDS.map(([at]) => [at + 0.02, 'tk', { l: 0.6, p: 1.1 }]),
    ...cuts.map(c => [c, 'air', { l: 0.28, d: 0.22 }]),
    ...hoppers.map((it, i) => [tPlay + i * 0.03 + 0.3, 'tap', { l: 0.35, p: 0.9 + i * 0.04 }]), [tPlay, 'bloop', { f: 480, l: 0.5 }],
    [tReal, 'flick', { l: 0.5 }], [tPrice - 0.1, 'flick', { l: 0.5 }],
    ...Array.from({ length: 10 }, (_, i) => [c2 + 0.3 + i * 0.12, 'tk', { l: 0.35, p: 1.05 }]), [tPhoto, 'air', { l: 0.5, d: 0.3 }], [tPhoto + 0.05, 'tap', { l: 0.8 }], ...[0, 1, 2, 3].map(i => [tGamble + i * 0.15, 'flick', { l: 0.6 }]),
    [tDeliv, 'thump', { l: 1.2 }],
    [tTry, 'tap', { l: 1 }], [tTry + 0.05, 'rise', { l: 0.5, d: 0.25 }],
    [tMove + 0.1, 'air', { l: 0.6, d: MOVE_D }],
    ...SWATCHES.flatMap(([at], i) => [[at, 'tap', { l: 0.8 }], [at + 0.06, 'bloop', { f: 460 + i * 60, l: 0.45 }]]),
    [tRestyle, 'air', { l: 0.8, d: 0.6 }], [tRestyle, 'rise', { l: 0.5, d: 0.5 }], [tOne, 'air', { l: 0.8, d: 0.6 }], [tOne, 'tap', { l: 0.8 }],
    ...Array.from({ length: 18 }, (_, i) => [tMorning + 0.3 + i * 0.07, 'tk', { l: 0.4, p: 1 + i * 0.02 }]),
    [tWhen, 'tap', { l: 1 }], [tWhen + 0.05, 'flick', { l: 0.5 }], [tBuy, 'tap', { l: 1 }], [tSite, 'bloop', { f: 520, l: 0.5 }],
    [tCalled - 0.05, 'rise', { l: 0.6, d: 0.4 }], [tPLAY, 'thump', { l: 0.6 }], [tPLAY, 'bloop', { f: 440, l: 0.6 }], [tSell, 'bloop', { f: 560, l: 0.5 }],
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
    drawCaption(t); clearCaption(); drawTicker(t, dt); drawShop(t); drawSite(t); drawTouch(t); drawEnd(t);
  }
  placeShot(t); A.frame(1 / FPS, true); drawTicker(t, 0); drawEnd(t);
  console.log('reel: Habitt total in the home Rs ' + TOTAL.toLocaleString('en-US'));

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
  scratch: (ac, d, w, a = {}) => { const l = a.l ?? 1, dd = a.d ?? 0.22, s = noiseSrc(ac, w, dd), f = filt(ac, 'bandpass', 1500, 2); f.frequency.setValueAtTime(1500, w); f.frequency.exponentialRampToValueAtTime(3600, w + dd);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, w); g.gain.exponentialRampToValueAtTime(0.05 * l, w + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, w + dd); s.connect(f); f.connect(g); dry(ac, d, g); },
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
