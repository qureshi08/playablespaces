// The sample catalogue and the nine "slot" materials (floor, walls, slats, upholstery...).
// A slot material shows sample A, and can wipe sample B over it from a point in the room (drop / preview).
import * as THREE from 'three';
import { surfaceTex } from './textures.js';

// L = lightness 0..1, warm = -1 cool .. 1 warm, tx = how soft and textured it feels.
// k = pattern kind (see textures.js), c = colours, p = pattern params, size = metres per texture span.
export const MATERIALS = [
  { id: 'oak', cat: 'wood', name: 'Honey oak', k: 1, c: ['#cf9d63', '#97632f', '#6e4622'], p: [13, 0.85, 0.11, 0.48], size: [1.5, 0.38], L: 0.62, warm: 0.62, tx: 0.5, cc: 0.16 },
  { id: 'whiteoak', cat: 'wood', name: 'White oak', k: 1, c: ['#d9c4a2', '#b5966d', '#977853'], p: [15, 0.75, 0.09, 0.52], size: [1.5, 0.38], L: 0.8, warm: 0.28, tx: 0.45, cc: 0.2 },
  { id: 'walnut', cat: 'wood', name: 'Walnut', k: 1, c: ['#7a5036', '#4a2d1c', '#2c1a10'], p: [11, 1.05, 0.13, 0.42], size: [1.5, 0.38], L: 0.34, warm: 0.55, tx: 0.6, cc: 0.34 },
  { id: 'smoked', cat: 'wood', name: 'Smoked oak', k: 1, c: ['#55402f', '#32251a', '#1b140e'], p: [13, 0.85, 0.11, 0.46], size: [1.5, 0.38], L: 0.2, warm: 0.3, tx: 0.5, cc: 0.3 },
  { id: 'ash', cat: 'wood', name: 'Black ash', k: 1, c: ['#34302c', '#1c1a18', '#48413b'], p: [17, 0.65, 0.17, 0.52], size: [1.5, 0.38], L: 0.1, warm: 0, tx: 0.45, cc: 0.18 },
  { id: 'concrete', cat: 'stone', name: 'Concrete', k: 2, c: ['#a6a49f', '#878580', '#bab8b2'], size: [1.5, 1.5], L: 0.6, warm: -0.05, tx: 0.55, tile: [1.2, 0.6, 0], wall: [1.2, 0.6, 0], gr: '#74726c' },
  { id: 'terrazzo', cat: 'stone', name: 'Terrazzo', k: 3, c: ['#e4ddd1', '#8c8781', '#c46c4a', '#3a3835'], size: [0.8, 0.8], L: 0.82, warm: 0.22, tx: 0.6, tile: [0.6, 0.6, 0], wall: [0.6, 0.6, 0], gr: '#ccc5b9', cc: 0.5 },
  { id: 'travertine', cat: 'stone', name: 'Travertine', k: 4, c: ['#d6c3a3', '#b09975', '#e5d6bb'], size: [1.2, 1.2], L: 0.75, warm: 0.5, tx: 0.55, tile: [0.8, 0.4, 0.5], wall: [1.2, 0.4, 0.5], gr: '#c4b396', cc: 0.08 },
  { id: 'marble', cat: 'stone', name: 'Calacatta', k: 5, c: ['#edeae5', '#928d87', '#b6955d'], size: [1.6, 1.6], L: 0.88, warm: 0.1, tx: 0.3, tile: [0.8, 0.8, 0], wall: [1.2, 2.75, 0], gr: '#d6d2cc', cc: 0.8 },
  { id: 'slate', cat: 'stone', name: 'Slate', k: 6, c: ['#3a3e45', '#5a606a'], size: [0.9, 0.9], L: 0.2, warm: -0.35, tx: 0.45, tile: [0.6, 0.6, 0.5], wall: [0.6, 0.3, 0.5], gr: '#22252a', cc: 0.05 },
  { id: 'linen', cat: 'fabric', name: 'Linen', k: 7, c: ['#dad1c1', '#b6aa95', '#ebe4d7'], p: [85], size: [0.16, 0.16], L: 0.8, warm: 0.3, tx: 0.45, sheen: 0.2 },
  { id: 'boucle', cat: 'fabric', name: 'Bouclé', k: 8, c: ['#ebe5da', '#c6bcab', '#faf7f0'], size: [0.2, 0.2], L: 0.88, warm: 0.25, tx: 0.9, sheen: 0.25 },
  { id: 'heather', cat: 'fabric', name: 'Grey wool', k: 7, c: ['#9b9ea3', '#787b80', '#b5b8bc'], p: [66], size: [0.2, 0.2], L: 0.55, warm: -0.15, tx: 0.55, sheen: 0.15 },
  { id: 'knit', cat: 'fabric', name: 'Oat knit', k: 11, c: ['#d7cab3', '#b0a185', '#ebe1ce'], p: [8, 12], size: [0.5, 0.5], L: 0.78, warm: 0.4, tx: 0.95, sheen: 0.1 },
  { id: 'navy', cat: 'fabric', name: 'Navy velvet', k: 9, c: ['#213156', '#131c35'], size: [0.6, 0.6], L: 0.14, warm: -0.6, tx: 0.3, sheen: 1, sheenC: '#7d92c8' },
  { id: 'ochre', cat: 'fabric', name: 'Ochre velvet', k: 9, c: ['#c28b2e', '#8d5d14'], size: [0.6, 0.6], L: 0.5, warm: 0.82, tx: 0.3, sheen: 1, sheenC: '#ffd488' },
  { id: 'rust', cat: 'fabric', name: 'Rust wool', k: 8, c: ['#b3603c', '#884125', '#cb7853'], size: [0.22, 0.22], L: 0.4, warm: 0.9, tx: 0.8, sheen: 0.2 },
  { id: 'cognac', cat: 'fabric', name: 'Cognac leather', k: 10, c: ['#985930', '#5c3118', '#b6723e'], size: [0.35, 0.35], L: 0.36, warm: 0.78, tx: 0.35, sheen: 0.1, cc: 0.32 },
  { id: 'charcoal', cat: 'fabric', name: 'Charcoal felt', k: 12, c: ['#3b3d42', '#292b2f'], size: [0.4, 0.4], L: 0.16, warm: -0.2, tx: 0.4, sheen: 0.1 },
  { id: 'chalk', cat: 'paint', name: 'Chalk white', k: 13, c: ['#eae5dc'], size: [1.5, 1.5], L: 0.9, warm: 0.2, tx: 0.1 },
  { id: 'limewash', cat: 'paint', name: 'Sand limewash', k: 14, c: ['#d2bd9c', '#bda47f', '#e1d0b4'], size: [2.2, 2.2], L: 0.74, warm: 0.55, tx: 0.65 },
  { id: 'sage', cat: 'paint', name: 'Sage', k: 13, c: ['#a0a990'], size: [1.5, 1.5], L: 0.6, warm: 0.05, tx: 0.15 },
  { id: 'clay', cat: 'paint', name: 'Clay', k: 14, c: ['#b77858', '#9c6043', '#c78b6b'], size: [2.2, 2.2], L: 0.45, warm: 0.85, tx: 0.55 },
  { id: 'ink', cat: 'paint', name: 'Ink blue', k: 13, c: ['#23324b'], size: [1.5, 1.5], L: 0.14, warm: -0.6, tx: 0.12 },
  { id: 'forest', cat: 'paint', name: 'Deep green', k: 13, c: ['#2c3930'], size: [1.5, 1.5], L: 0.14, warm: -0.1, tx: 0.12 },
  { id: 'graphite', cat: 'paint', name: 'Graphite', k: 13, c: ['#2f3033'], size: [1.5, 1.5], L: 0.1, warm: -0.2, tx: 0.1 },
];
MATERIALS.forEach((m, i) => { m.i = i; });
export const MAT = Object.fromEntries(MATERIALS.map(m => [m.id, m]));
export const CATS = ['wood', 'stone', 'fabric', 'paint'];
export const CAT_NAME = { wood: 'Wood', stone: 'Stone', fabric: 'Fabric', paint: 'Paint' };

export const SLOT_KEYS = ['floor', 'wallL', 'wallB', 'slats', 'upholstery', 'accent', 'bedding', 'rug', 'joinery'];
export const SLOTS = {
  floor: { name: 'Floor', cats: ['wood', 'stone'] },
  wallL: { name: 'Left wall', cats: ['paint', 'stone'] },
  wallB: { name: 'Walls', cats: ['paint', 'stone'] },
  slats: { name: 'Slat wall', cats: ['wood', 'paint'] },
  upholstery: { name: 'Upholstery', cats: ['fabric'] },
  accent: { name: 'Accents', cats: ['fabric'] },
  bedding: { name: 'Bedding', cats: ['fabric'] },
  rug: { name: 'Rugs', cats: ['fabric'] },
  joinery: { name: 'Woodwork', cats: ['wood', 'stone'] },
};
// which finish each slot can carry: cc = clearcoat (floors, woodwork), sh = sheen (fabrics)
const FINISH = { floor: 'cc', joinery: 'cc', upholstery: 'sh', accent: 'sh', bedding: 'sh', rug: 'sh', wallL: '', wallB: '', slats: '' };

export const RUG_SIZE = [3, 2.1];

function layoutFor(slot, m) {
  if (slot === 'floor') return m.cat === 'wood' ? 'planks' : 'tiles';
  if ((slot === 'wallL' || slot === 'wallB') && m.cat === 'stone') return 'walltiles';
  if (slot === 'rug') return 'rug';
  return 'plain';
}

const flatNormal = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
flatNormal.needsUpdate = true;

export const shared = { time: { value: 0 } };

const SLOT_COMMON = /* glsl */`
uniform sampler2D tA0, tA1, tB0, tB1; uniform vec2 uSA, uSB; uniform vec4 uWipe; uniform float uWipeOn, uHi, uTime; uniform vec3 uGlowC;
varying vec3 vSlotWP; vec4 sC, sN; float sRing;`;
const SLOT_MAP = /* glsl */`{
  vec2 uv = vNormalMapUv; float k = 0.0; sRing = 0.0;
  if (uWipeOn > 0.5){ float d = distance(vSlotWP, uWipe.xyz); k = 1.0 - smoothstep(uWipe.w - 0.03, uWipe.w, d);
    sRing = (1.0 - smoothstep(0.0, 0.05, abs(d - uWipe.w))) * step(0.001, uWipe.w); }
  sC = texture2D(tA0, uv * uSA); sN = texture2D(tA1, uv * uSA);
  if (k > 0.0){ vec4 cB = texture2D(tB0, uv * uSB), nB = texture2D(tB1, uv * uSB); sC = mix(sC, cB, k); sN = mix(sN, nB, k); }
  diffuseColor.rgb *= sC.rgb; }`;

function makeSlotMaterial(key) {
  const f = FINISH[key];
  const u = {
    tA0: { value: null }, tA1: { value: null }, tB0: { value: null }, tB1: { value: null },
    uSA: { value: new THREE.Vector2(1, 1) }, uSB: { value: new THREE.Vector2(1, 1) },
    uWipe: { value: new THREE.Vector4(0, 0, 0, -1) }, uWipeOn: { value: 0 }, uHi: { value: 0 },
    uGlowC: { value: new THREE.Color(0.45, 0.85, 1.15) }, uTime: shared.time,
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 1, metalness: 0, normalMap: flatNormal,
    sheen: f === 'sh' ? 0.001 : 0, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 1, 1),
    clearcoat: f === 'cc' ? 0.001 : 0, clearcoatRoughness: 0.22, envMapIntensity: 0.6,
  });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSlotWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSlotWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SLOT_COMMON)
      .replace('#include <map_fragment>', SLOT_MAP)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor *= sC.a;')
      .replace('#include <normal_fragment_maps>', '{ vec3 mapN = sN.xyz * 2.0 - 1.0; mapN.xy *= normalScale; normal = normalize(tbn * mapN); }')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowC * (sRing * 1.25 * uWipeOn + uHi * (0.07 + 0.05 * sin(uTime * 6.0)));');
  };
  m.customProgramCacheKey = () => 'slot' + f;
  m.userData = { key, u, finish: f };
  return m;
}

export const slotMats = Object.fromEntries(SLOT_KEYS.map(k => [k, makeSlotMaterial(k)]));

// per-slot state: current sample, the one being wiped in, and the wipe animation
export const slotState = Object.fromEntries(SLOT_KEYS.map(k => [k, { cur: null, next: null, r: -1, rT: -1, rMax: 12, t0: 0, peek: false, hi: 0, hiT: 0, meshes: [] }]));

function bind(u, ab, slot, m) {
  const t = surfaceTex(m, layoutFor(slot, m), RUG_SIZE);
  u['t' + ab + '0'].value = t.c; u['t' + ab + '1'].value = t.n;
  u['uS' + ab].value.set(1 / t.span[0], 1 / t.span[1]);
}

function finishOf(m) {
  return { sheen: m.sheen || 0.001, sheenC: new THREE.Color(m.sheenC || '#ffffff'), cc: Math.max(m.cc || 0, 0.001), ccR: m.cat === 'stone' ? 0.1 : 0.3 };
}
function applyFinish(mat, m, k = 1, from = null) {
  const a = finishOf(m), b = from ? finishOf(from) : a, f = mat.userData.finish;
  if (f === 'sh') { mat.sheen = THREE.MathUtils.lerp(b.sheen, a.sheen, k); mat.sheenColor.copy(b.sheenC).lerp(a.sheenC, k); }
  if (f === 'cc') { mat.clearcoat = THREE.MathUtils.lerp(b.cc, a.cc, k); mat.clearcoatRoughness = THREE.MathUtils.lerp(b.ccR, a.ccR, k); }
}

// set a slot at once, no animation
export function setSlotNow(slot, m) {
  const s = slotState[slot], mat = slotMats[slot], u = mat.userData.u;
  s.cur = m; s.next = null; s.r = s.rT = -1; s.peek = false;
  bind(u, 'A', slot, m); bind(u, 'B', slot, m);
  u.uWipeOn.value = 0; u.uWipe.value.w = -1;
  applyFinish(mat, m);
}

// spread a new sample out from a world point
export function wipeSlot(slot, m, point, now) {
  const s = slotState[slot], u = slotMats[slot].userData.u;
  if (s.next && !s.peek) setSlotNow(slot, s.next);   // finish a wipe that is still running
  if (!s.cur) return setSlotNow(slot, m);
  const fromPeek = s.peek && s.next === m;            // a previewed patch just keeps growing
  if (!fromPeek) { bind(u, 'B', slot, m); u.uWipe.value.set(point.x, point.y, point.z, 0); s.r = 0; }
  s.next = m; s.peek = false; s.unpeek = false; s.t0 = now;
  u.uWipeOn.value = 1; s.rT = s.rMax;
}

// show a small patch of a sample where the cursor is
export function peekSlot(slot, m, point) {
  const s = slotState[slot], u = slotMats[slot].userData.u;
  if (s.next && !s.peek) setSlotNow(slot, s.next);
  if (s.next !== m) bind(u, 'B', slot, m);
  s.next = m; s.peek = true;
  u.uWipe.value.x = point.x; u.uWipe.value.y = point.y; u.uWipe.value.z = point.z;
  u.uWipeOn.value = 1; s.rT = 0.45; if (s.r < 0) s.r = 0;
}
export function unpeekSlot(slot) {
  const s = slotState[slot];
  if (s.peek) { s.rT = 0; s.unpeek = true; }
}

// advance wipe radii and highlights; returns true while anything is moving
export function tickSlots(dt) {
  let moving = false;
  for (const k of SLOT_KEYS) {
    const s = slotState[k], mat = slotMats[k], u = mat.userData.u;
    if (s.r >= 0 && s.next) {
      const speed = s.peek || s.unpeek ? 6 : 1;
      if (s.peek || s.unpeek) s.r += (s.rT - s.r) * Math.min(1, dt * 14);
      else s.r += dt * (2.2 + s.r * 2.6) * speed;
      u.uWipe.value.w = s.r;
      if (!s.peek && !s.unpeek) applyFinish(mat, s.next, Math.min(1, s.r / s.rMax), s.cur);
      moving = true;
      if (s.unpeek && s.r < 0.01) { s.unpeek = false; s.peek = false; s.next = null; s.r = -1; u.uWipeOn.value = 0; u.uWipe.value.w = -1; }
      else if (!s.peek && !s.unpeek && s.r >= s.rMax) setSlotNow(k, s.next);
    }
    s.hi += (s.hiT - s.hi) * Math.min(1, dt * 10);
    u.uHi.value = s.hi;
    if (Math.abs(s.hiT - s.hi) > 0.01) moving = true;
  }
  return moving;
}

// box-projected UVs in metres, so every surface tiles at real-world scale
export function boxUV(geo) {
  if (geo.index) geo = geo.toNonIndexed();
  const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(t.subVectors(a, b));
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    for (let j = 0; j < 3; j++) {
      const p = j === 0 ? a : j === 1 ? b : c;
      let u, v;
      if (ax >= ay && ax >= az) { u = p.z * Math.sign(n.x || 1); v = p.y; }
      else if (ay >= az) { u = p.x; v = p.z * Math.sign(n.y || 1); }
      else { u = -p.x * Math.sign(n.z || 1); v = p.y; }
      uv[(i + j) * 2] = u; uv[(i + j) * 2 + 1] = v;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
