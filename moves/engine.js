// Moves engine: camera, body tracking, voice, hook card, screen recording.
// Every app in apps.js is a small object; this file does the shared work.
import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const V = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};
export const C = { paper: '#F5F0E6', card: '#FBF7EE', ind: '#243A7A', ink: '#1B2547', mad: '#C8452A', wi: '#9DB3E2', saf: '#F2B848', wm: '#E58A6B' };
const BONES = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32],[27,29],[28,30]];

/* ---------- small maths helpers apps use ---------- */
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });
export const angle = (a, b, c) => { // angle at b, degrees
  const v1 = Math.atan2(a.y - b.y, a.x - b.x), v2 = Math.atan2(c.y - b.y, c.x - b.x);
  let d = Math.abs(v1 - v2) * 180 / Math.PI; return d > 180 ? 360 - d : d;
};
export const seen = (P, ids, th = 0.45) => P && ids.every(i => P[i] && P[i].v > th);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- storage, voice, beep ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
let actx = null;
export function beep(f = 880, d = 0.15, vol = 0.35) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square'; o.frequency.value = f; g.gain.value = vol;
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
  } catch (e) {}
}
export function say(text, rate = 1.05) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = rate; u.lang = 'en-US'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function unlockAudio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); const o = actx.createOscillator(), g = actx.createGain(); g.gain.value = 0; o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.01); } catch (e) {}
  try { speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch (e) {}
}

/* ---------- drawing helpers (all sizes in units of U = width / 100) ---------- */
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
export function panel(g, E, x, y, w, h, fill = C.card) {
  g.save(); g.globalAlpha = 0.93; g.fillStyle = fill; rrect(g, x, y, w, h, E.U * 2.2); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = C.ind; g.lineWidth = E.U * 0.55; rrect(g, x, y, w, h, E.U * 2.2); g.stroke(); g.restore();
}
export function text(g, E, s, x, y, size, col = C.ink, weight = 800, align = 'center') {
  g.font = `${weight} ${size * E.U}px 'Shantell Sans', cursive`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
export function measure(g, E, s, size, weight = 800) { g.font = `${weight} ${size * E.U}px 'Shantell Sans', cursive`; return g.measureText(s).width; }
// a card that fits its text: lines = [[text, size, colour], ...]
export function card(g, E, lines, x, y, align = 'center') {
  const pad = E.U * 3; let w = 0, h = pad;
  lines.forEach(([s, size, , wt]) => { w = Math.max(w, measure(g, E, s, size, wt || 800)); h += size * E.U * 1.25; });
  w += pad * 2; h += pad * 0.6;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  panel(g, E, left, y, w, h);
  let cy = y + pad;
  lines.forEach(([s, size, col, wt]) => { cy += size * E.U * 0.62; text(g, E, s, left + w / 2, cy, size, col || C.ink, wt || 800); cy += size * E.U * 0.63; });
  return { x: left, y, w, h };
}
export function dashed(g, E, x1, y1, x2, y2, col = C.mad, w = 0.6) {
  g.save(); g.setLineDash([E.U * 2, E.U * 1.6]); g.strokeStyle = col; g.lineWidth = E.U * w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore();
}
function wrap(g, E, s, size, maxW) {
  const words = s.split(' '), out = []; let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (measure(g, E, t, size) > maxW && line) { out.push(line); line = w; } else line = t; });
  if (line) out.push(line); return out;
}

/* ---------- the engine ---------- */
export async function run(app) {
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const cv = $('#cv'), g = cv.getContext('2d'), video = $('#vid');
  const key = 'moves:' + app.id;
  const S = Object.assign({}, ...(app.settings || []).map(s => ({ [s.k]: s.def })), store.get(key, {}));
  const save = () => store.set(key, S);
  const E = {
    app, S, save, U: 4, W: 400, H: 700, P: null, Sm: null, t: 0, facing: S.facing || app.cam || 'environment',
    hookUntil: 0, msg: '', gateMode: 0, recording: false, say, beep,
    now: () => performance.now() / 1000,
    toast(s, ms = 1800) { const el = $('#toast'); el.textContent = s; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), ms); },
  };
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
  form.addEventListener('change', e => { const k = e.target.dataset.k; if (k) { S[k] = Number(e.target.value); save(); app.reset && app.reset(E); } });
  document.title = app.title + ' · Moves';

  /* bottom bar buttons */
  const bar = $('#bar');
  const addBtn = (label, fn, cls = '') => { const b = document.createElement('button'); b.textContent = label; b.className = cls; b.onclick = fn; bar.appendChild(b); return b; };
  addBtn('←', () => { location.href = './'; }, 'icon');
  addBtn('Flip', async () => {
    // phones: front or back camera. laptops with several cameras: the next one in the list
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    if (cams.length > 1 && !/iPhone|iPad|Android/i.test(navigator.userAgent)) { const i = cams.findIndex(c => c.deviceId === E.camId); S.cam = cams[(i + 1) % cams.length].deviceId; }
    else { E.facing = E.facing === 'user' ? 'environment' : 'user'; S.facing = E.facing; S.cam = null; }
    save(); try { await openCamera(); } catch (e) { E.toast(cameraError(e), 5000); }
  }, 'icon');
  if (app.gates) addBtn('Set lines', () => { E.gateMode = 1; S.gates = []; E.toast('Tap on the ' + app.gateNames[0]); }, '');
  if (app.action) addBtn(app.action.label, () => app.action.fn(E), 'go');
  addBtn('Reset', () => { app.reset && app.reset(E); E.toast('Reset'); }, '');
  const recBtn = addBtn('● Rec', () => toggleRec(), 'rec');

  /* tap to set lines (gates) */
  cv.addEventListener('pointerdown', e => {
    if (!E.gateMode) return;
    const r = cv.getBoundingClientRect(), sc = Math.min(r.width / cv.width, r.height / cv.height);
    const ox = r.left + (r.width - cv.width * sc) / 2;
    const x = (e.clientX - ox) / sc / cv.width;
    S.gates = S.gates || []; S.gates.push(clamp(x, 0, 1));
    if (S.gates.length >= 2) { E.gateMode = 0; save(); app.reset && app.reset(E); E.toast('Lines set'); }
    else E.toast('Now tap on the ' + app.gateNames[1]);
  });

  /* camera or test video */
  async function openCamera() {
    if (video.srcObject) video.srcObject.getTracks().forEach(t => t.stop());
    if (params.get('video')) { video.srcObject = null; video.src = params.get('video'); video.loop = true; E.facing = 'environment'; await video.play(); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('NOAPI');
    // try the best settings first, then simpler ones (some laptop webcams refuse 60 fps or HD)
    const tries = [
      { facingMode: E.facing, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
      { facingMode: E.facing },
      true,
    ];
    if (S.cam) tries.unshift({ deviceId: { exact: S.cam } });
    let st = null, err = null;
    const get = async v => { try { st = await navigator.mediaDevices.getUserMedia({ audio: false, video: v }); return true; } catch (e) { err = e; return false; } };
    for (const v of tries) { if (await get(v)) break; if (err.name === 'NotAllowedError' || err.name === 'SecurityError') break; }
    // still nothing: the default camera may be busy or be a face login (IR) camera, so try every camera one by one
    if (!st && err && err.name !== 'NotAllowedError' && err.name !== 'SecurityError') {
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      E.camNames = cams.map(c => c.label || 'camera');
      for (const c of cams) { if (await get({ deviceId: { exact: c.deviceId } })) { S.cam = c.deviceId; save(); break; } }
    }
    if (!st) throw err;
    E.camId = st.getVideoTracks()[0]?.getSettings?.().deviceId;
    // a laptop webcam faces you even when we asked for the back camera: mirror it like a selfie
    const fm = st.getVideoTracks()[0]?.getSettings?.().facingMode;
    if (fm) E.facing = fm === 'environment' ? 'environment' : 'user';
    else if (!/iPhone|iPad|Android/i.test(navigator.userAgent)) E.facing = 'user';
    video.srcObject = st; await video.play();
  }
  function cameraError(e) {
    const n = e && e.name, m = e && e.message;
    if (m === 'NOAPI') return 'This browser cannot open the camera here. Open the link in Chrome, Safari or Edge, using the https address.';
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Camera permission is blocked. Click the camera icon in the address bar (on iPhone: Settings, Safari, Camera) and allow it, then press Start again.';
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'Windows says every camera is busy' + (E.camNames && E.camNames.length ? ' (tried: ' + E.camNames.join(', ') + ')' : '') + '. Check three things, then press Start again: 1. Windows Settings, Privacy and security, Camera: turn on "Let desktop apps access your camera". 2. A camera shutter slider above the screen, or a camera key on the keyboard (often F8 or F10), is not switched off. 3. No other program (Zoom, Teams, OBS, the Camera app) has the camera open. Test: if the Windows Camera app also shows nothing, the block is in Windows, not this page.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No camera was found on this device.';
    return 'Could not start: ' + (m || e) + '. Reload the page and press Start again.';
  }
  async function loadPose() {
    const files = await FilesetResolver.forVisionTasks(V + '/wasm');
    const opts = d => ({ baseOptions: { modelAssetPath: MODELS[app.model || 'full'], delegate: d }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
    try { return await PoseLandmarker.createFromOptions(files, opts('GPU')); } catch (e) { return await PoseLandmarker.createFromOptions(files, opts('CPU')); }
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
    } catch (e) { E.toast('Recording is not supported here. Use the iPhone screen recorder.', 3500); rec = null; }
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
    const st = $('#startState'); st.textContent = 'Opening the camera...';
    try {
      await openCamera();
      st.textContent = 'Loading the body tracker (first time takes a few seconds)...';
      const pose = await loadPose();
      try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (e) {}
      $('#intro').classList.add('off');
      E.hookUntil = E.now() + 2.8;
      loop(pose);
    } catch (e) { st.textContent = (e && e.name) ? cameraError(e) : 'Could not load the body tracker. Check the internet connection and press Start again.'; }
  };

  /* main loop */
  function loop(pose) {
    let lastTs = 0;
    const step = (now) => {
      const W = video.videoWidth, H = video.videoHeight;
      if (W && H) {
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        E.W = W; E.H = H; E.U = Math.min(W, H) / 100;
        const ts = Math.max(performance.now(), lastTs + 1); lastTs = ts;
        E.t = (now || performance.now()) / 1000;
        let res = null; try { res = pose.detectForVideo(video, ts); } catch (e) {}
        const mirror = E.facing === 'user';
        const raw = res && res.landmarks && res.landmarks[0];
        if (raw) {
          E.P = raw.map(p => ({ x: (mirror ? 1 - p.x : p.x) * W, y: p.y * H, v: p.visibility ?? 1 }));
          E.Sm = E.Sm ? E.Sm.map((q, i) => ({ x: q.x * 0.45 + E.P[i].x * 0.55, y: q.y * 0.45 + E.P[i].y * 0.55, v: E.P[i].v })) : E.P.map(p => ({ ...p }));
        } else { E.P = null; E.Sm = null; }
        E.msg = '';
        try { app.frame(E); } catch (e) { console.error(e); }
        drawFrame(mirror);
      }
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else requestAnimationFrame(step);
    };
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(step); else requestAnimationFrame(step);
  }

  function drawFrame(mirror) {
    const W = E.W, H = E.H, U = E.U;
    g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); } g.drawImage(video, 0, 0, W, H); g.restore();
    // skeleton
    const P = E.Sm;
    if (P && app.skeleton !== false) {
      g.lineCap = 'round'; g.strokeStyle = C.saf; g.lineWidth = U * 0.9;
      BONES.forEach(([a, b]) => { if (P[a].v > 0.4 && P[b].v > 0.4) { g.beginPath(); g.moveTo(P[a].x, P[a].y); g.lineTo(P[b].x, P[b].y); g.stroke(); } });
      [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(i => { if (P[i].v > 0.4) { g.beginPath(); g.arc(P[i].x, P[i].y, U * 1.1, 0, 7); g.fillStyle = C.mad; g.fill(); g.lineWidth = U * 0.3; g.strokeStyle = C.paper; g.stroke(); } });
    }
    // gates
    if (app.gates && S.gates && S.gates.length) S.gates.forEach((gx, i) => { const x = gx * W; dashed(g, E, x, H * 0.08, x, H * 0.97, C.mad, 0.8); text(g, E, app.gateLabels[i], x, H * 0.06, 3.6, C.mad); });
    if (app.gates && (!S.gates || S.gates.length < 2) && !E.gateMode) card(g, E, [['Press Set lines,', 4, C.ink], ['then tap each cone on screen', 3.4, C.ink, 500]], W / 2, H * 0.4);
    try { app.draw(g, E); } catch (e) { console.error(e); }
    if (E.msg) card(g, E, [[E.msg, 3.6, C.ink, 600]], W / 2, H * 0.86);
    // hook card in the first seconds
    if (E.now() < E.hookUntil) {
      const lines = wrap(g, E, app.hook, 6.4, W * 0.84);
      card(g, E, lines.map(l => [l, 6.4, C.mad]), W / 2, H * 0.1);
    }
    // signature
    text(g, E, 'Anas Qureshi', W - U * 3, H - U * 3, 3.2, C.mad, 700, 'right');
  }
}
