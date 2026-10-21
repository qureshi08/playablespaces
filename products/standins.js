// Every piece of furniture, built in code around its own origin (floor level, centred on its footprint).
// Rotation 0 means the piece faces +z (towards the open front of the flat).
// userData.lights lists lamps it carries: [x, y, z, colour, intensity, distance, kind] in its own space.
import * as THREE from 'three';
import { slotMats, RUG_SIZE } from '../kit/materials.js';
import { batch, std, gloss, metal, glow, rng, rbox, cushion, pillow, lathe, smoothGeo, leaf, aimLeaf, leafTint, LEAF_MAT, tint, BLACK_METAL, BRASS } from '../kit/util.js';

const FAB = slotMats.upholstery, ACC = slotMats.accent, WOOD = slotMats.joinery, DUVET = slotMats.bedding;
const SOIL = std('#2b231c');
const STALK = std('#5a4a34', { roughness: 0.8 });
const LINEN_SHADE = std('#efe6d4', { roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.4 });
const SHEET = std('#f2efe8', { roughness: 0.85 });
const PLASTER = std('#e9e3d8', { roughness: 0.6 });

// glowing parts; their brightness follows the lamps (daylight.js scales them)
export const GLOWS = { shade: glow('#ffd6a0', 1), bulb: glow('#fff0d6', 1), led: glow('#ffc07a', 1), flame: glow('#ffb45c', 1) };
GLOWS.shade.side = THREE.DoubleSide;
export const GLOW_BASE = { shade: 3.2, bulb: 7, led: 3.6, flame: 5 };

const PAGES = std('#ffffff', { roughness: 0.75, vertexColors: true });
const GLAZE = gloss('#ffffff', { roughness: 0.4, clearcoat: 0.5, vertexColors: true });
const SPINES = ['#2c3a54', '#dad1c2', '#8b5b3b', '#4c5a49', '#bba37e', '#1e2125', '#a65038', '#6a7585', '#e5ded1', '#3b3029', '#7d6a4f'].map(c => tint(PAGES, c));
const CERAMICS = ['#e8e3d9', '#c8b499', '#8d9985', '#2e3035', '#b76e4b'].map(c => tint(GLAZE, c));

// ---- decor helpers ----------------------------------------------------------------------------
function pottedSprig(b, x, y, z, s = 1, seed = 1, n = 8) {
  const r = rng(seed);
  b.cyl(CERAMICS[0], x, y + 0.045 * s, z, 0.06 * s, 0.045 * s, 0.09 * s, { seg: 16, open: true })
    .cyl(CERAMICS[0], x, y + 0.003 * s, z, 0.045 * s, 0.045 * s, 0.006 * s, { seg: 16 })
    .cyl(SOIL, x, y + 0.08 * s, z, 0.058 * s, 0.058 * s, 0.006, { seg: 16 });
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + r() * 0.6, up = 0.55 + r() * 0.65;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(up), Math.sin(up), Math.sin(a) * Math.cos(up));
    b.geo(LEAF_MAT, aimLeaf(leaf(0.095 * s * (0.8 + r() * 0.45), 0.055 * s, { fold: 0.3, curl: 0.28, seg: 6 }), new THREE.Vector3(x, y + 0.09 * s, z), dir, r() - 0.5, leafTint(r)), 0, 0, 0, { uv: 'keep' });
  }
}
const VESSELS = [
  [[0, 0], [0.045, 0], [0.072, 0.06], [0.07, 0.13], [0.04, 0.2], [0.03, 0.25], [0.034, 0.27], [0.03, 0.27], [0.026, 0.25]],   // bottle
  [[0, 0], [0.075, 0], [0.085, 0.025], [0.082, 0.13], [0.078, 0.14], [0.07, 0.14]],                                       // bowl-ish pot
  [[0, 0], [0.035, 0], [0.07, 0.05], [0.078, 0.11], [0.055, 0.17], [0.022, 0.21], [0.024, 0.23], [0.02, 0.23]],            // vase
];
function vessel(b, mat, x, y, z, s, kind = 0) { b.geo(mat, lathe(VESSELS[kind].map(([a, c]) => [a * s, c * s]), 28), x, y, z, { uv: 'keep' }); }
function bookRow(b, x0, y, z, len, r, { stack = false, leaning = false } = {}) {
  if (stack) {
    let yy = y;
    for (let i = 0; i < 2 + Math.floor(r() * 2); i++) { const t = 0.025 + r() * 0.015; b.box(SPINES[Math.floor(r() * SPINES.length)], x0 + len / 2, yy + t / 2, z, len * (0.8 + r() * 0.15), t, 0.15 + r() * 0.04, { ry: (r() - 0.5) * 0.25 }); yy += t; }
    return;
  }
  let x = x0;
  while (x < x0 + len - 0.03) {
    const t = 0.02 + r() * 0.025, h = 0.16 + r() * 0.1, d = 0.12 + r() * 0.06;
    b.box(SPINES[Math.floor(r() * SPINES.length)], x + t / 2, y + h / 2, z, t, h, d, { r: 0.003 }); x += t + 0.002;
  }
  if (leaning) b.box(SPINES[Math.floor(r() * SPINES.length)], x + 0.045, y + 0.1, z, 0.025, 0.21, 0.15, { rz: -0.38 });
}
// ceramic table lamp with a drum shade; returns its light
function drumLamp(group, b, x, y, z, s = 1) {
  b.geo(CERAMICS[1], lathe([[0, 0], [0.07, 0], [0.11, 0.07], [0.105, 0.15], [0.05, 0.23], [0.02, 0.26], [0.02, 0.29], [0, 0.29]].map(([a, c]) => [a * s, c * s]), 28), x, y, z, { uv: 'keep' });
  b.cyl(BRASS, x, y + 0.33 * s, z, 0.006, 0.006, 0.08 * s, { seg: 8 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.155 * s, 0.2 * s, 32, 1, true), LINEN_SHADE);
  shade.position.set(x, y + 0.43 * s, z); shade.castShadow = true; group.add(shade);
  const glowIn = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * s, 0.15 * s, 0.19 * s, 32, 1, true), GLOWS.shade);
  glowIn.position.copy(shade.position); group.add(glowIn);
  return [x, y + 0.34 * s, z, '#ffc98a', 2.4 * s, 1.1, 'lamp'];
}
const legs4 = (b, mat, w, d, h, inset, r1 = 0.022, r2 = 0.016) => {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(mat, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset), r1, r2, h, { seg: 10 });
};

// ---- living -----------------------------------------------------------------------------------
function sofa() {
  // corner sofa: long run along x with a chaise coming forward on the right
  const g = new THREE.Group(), b = batch();
  const W = 2.7, D = 0.95, CW = 0.95, CD = 1.62, arm = 0.18, foot = 0.08, base = 0.16;
  const left = -W / 2, right = W / 2, back = -D / 2, front = D / 2, chaiseFront = back + CD;
  // recessed wooden plinth and little block feet
  b.box(WOOD, 0, foot / 2, 0, W - 0.12, foot, D - 0.12, { r: 0.01 }).box(WOOD, right - CW / 2, foot / 2, (front + chaiseFront) / 2 - 0.03, CW - 0.12, foot, chaiseFront - front, { r: 0.01 });
  // upholstered base boxes
  b.geo(FAB, smoothGeo(rbox(W, base, D, 0.03, 3)), 0, foot + base / 2, 0).geo(FAB, smoothGeo(rbox(CW, base, CD - D + 0.04, 0.03, 3)), right - CW / 2, foot + base / 2, (front + chaiseFront) / 2 - 0.02);
  // back rail and the single left arm
  b.geo(FAB, smoothGeo(rbox(W, 0.42, 0.18, 0.06, 3)), 0, foot + base + 0.21, back + 0.09).geo(FAB, smoothGeo(rbox(arm, 0.3, D, 0.07, 3)), left + arm / 2, foot + base + 0.15, 0);
  // seat cushions
  const seatY = foot + base + 0.075, seatW = (W - arm - CW) / 2;
  for (let i = 0; i < 2; i++) b.geo(FAB, cushion(seatW - 0.02, 0.15, D - 0.24, 0.06, 0.024), left + arm + seatW * (i + 0.5), seatY, back + 0.2 + (D - 0.2) / 2);
  b.geo(FAB, cushion(CW - 0.03, 0.15, CD - 0.25, 0.06, 0.024), right - CW / 2, seatY, back + 0.2 + (CD - 0.2) / 2);
  // back cushions leaning in
  const bw = (W - arm) / 3;
  for (let i = 0; i < 3; i++) b.geo(FAB, cushion(bw - 0.03, 0.42, 0.16, 0.07, 0.012), left + arm + bw * (i + 0.5), seatY + 0.3, back + 0.24, { rx: -0.18 });
  // scatter cushions in the accent fabric
  b.geo(ACC, pillow(0.44, 0.42, 0.14), left + arm + 0.28, seatY + 0.27, back + 0.42, { rx: -0.32, ry: 0.32, rz: 0.08 })
    .geo(ACC, pillow(0.4, 0.38, 0.13), right - 0.32, seatY + 0.26, back + 0.42, { rx: -0.34, ry: -0.28, rz: -0.07 })
    .geo(FAB, pillow(0.38, 0.36, 0.12), left + arm + 0.76, seatY + 0.25, back + 0.43, { rx: -0.35, ry: 0.1, rz: -0.05 })
    .geo(ACC, pillow(0.34, 0.32, 0.11), left + arm + 1.2, seatY + 0.24, back + 0.44, { rx: -0.35, ry: -0.12, rz: 0.1 });
  // a folded throw over the chaise
  b.geo(ACC, smoothGeo(rbox(CW + 0.04, 0.03, 0.42, 0.012, 2)), right - CW / 2, seatY + 0.09, chaiseFront - 0.32);
  b.flush(g); return g;
}
function armchair() {
  // lounge chair: two wooden side frames, a slung seat and back cushion
  const g = new THREE.Group(), b = batch(), W = 0.76, D = 0.82;
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.03);
    b.box(WOOD, x, 0.02, 0, 0.05, 0.04, D - 0.04, { r: 0.01 })                       // runner on the floor
      .box(WOOD, x, 0.27, D / 2 - 0.1, 0.05, 0.5, 0.05, { r: 0.01, rx: 0.08 })         // front post
      .box(WOOD, x, 0.36, -D / 2 + 0.12, 0.05, 0.7, 0.05, { r: 0.01, rx: -0.28 })      // back post
      .box(WOOD, x, 0.54, 0.02, 0.07, 0.035, D - 0.12, { r: 0.012 });                  // arm
  }
  b.box(WOOD, 0, 0.24, D / 2 - 0.1, W - 0.08, 0.04, 0.04, { r: 0.008 }).box(WOOD, 0, 0.24, -D / 2 + 0.16, W - 0.08, 0.04, 0.04, { r: 0.008 });
  b.geo(FAB, cushion(W - 0.12, 0.12, D - 0.2, 0.05, 0.016), 0, 0.33, 0.04, { rx: -0.06 })
    .geo(FAB, cushion(W - 0.14, 0.46, 0.12, 0.06, 0.01), 0, 0.62, -D / 2 + 0.17, { rx: -0.32 })
    .geo(ACC, pillow(0.34, 0.28, 0.11), 0, 0.53, -0.1, { rx: -0.36, rz: -0.06 });
  b.flush(g); return g;
}
function coffee() {
  // round drum coffee table with a slightly overhanging top
  const g = new THREE.Group(), b = batch(), R = 0.5, H = 0.4;
  b.geo(WOOD, smoothGeo(lathe([[0, H - 0.045], [R - 0.02, H - 0.045], [R, H - 0.03], [R, H - 0.012], [R - 0.012, H], [0, H]], 64)), 0, 0, 0, { uv: 'box' })
    .geo(WOOD, smoothGeo(lathe([[0, 0], [R * 0.62, 0], [R * 0.64, 0.02], [R * 0.6, H - 0.06], [R * 0.56, H - 0.045], [0, H - 0.045]], 48)), 0, 0, 0, { uv: 'box' });
  b.box(SPINES[0], -0.15, H + 0.016, 0.08, 0.28, 0.032, 0.21, { ry: 0.3 }).box(SPINES[1], -0.13, H + 0.044, 0.08, 0.22, 0.026, 0.17, { ry: 0.12 });
  pottedSprig(b, 0.16, H, -0.15, 1.3, 4, 9);
  b.flush(g);
  const candle = new THREE.Group(), cb = batch();
  cb.cyl(std('#f2ece0', { roughness: 0.6 }), 0, 0.035, 0, 0.028, 0.028, 0.07, { seg: 16 }); cb.flush(candle);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6).scale(1, 1.8, 1), GLOWS.flame); flame.position.y = 0.085; candle.add(flame);
  candle.position.set(0.2, H, 0.16); g.add(candle);
  g.userData.lights = [[0.2, H + 0.12, 0.16, '#ffae5c', 0.8, 0.5, 'flame']];
  return g;
}
function pouf() {
  // round knitted pouf: a squashed sphere with a button
  const g = new THREE.Group(), b = batch(), R = 0.27, H = 0.4;
  const geo = new THREE.SphereGeometry(1, 48, 24), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - 0.08 * y * y; p.setXYZ(i, p.getX(i) * R * k, (y * 0.5 + 0.5) * H, p.getZ(i) * R * k); }
  b.geo(ACC, smoothGeo(geo), 0, 0, 0, { uv: 'box' }).sph(ACC, 0, H - 0.01, 0, 0.018, { uv: 'box' });
  b.flush(g); return g;
}
function arcLamp() {
  // arc floor lamp: heavy round base, a bent stem, a dome shade hanging over the seat
  const g = new THREE.Group(), b = batch();
  b.cyl(std('#e8e3dc', { roughness: 0.3 }), 0, 0.03, 0, 0.17, 0.18, 0.06, { seg: 36 }).cyl(BRASS, 0, 0.065, 0, 0.025, 0.03, 0.012, { seg: 16 });
  const arc = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(0, 1.9, 0), new THREE.Vector3(0, 2.15, 1.05), new THREE.Vector3(0, 1.72, 1.38));
  b.geo(BLACK_METAL, new THREE.TubeGeometry(arc, 60, 0.012, 8, false));
  b.geo(BLACK_METAL, new THREE.SphereGeometry(0.21, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.53, 1.38).cyl(BLACK_METAL, 0, 1.73, 1.38, 0.02, 0.02, 0.04, { seg: 12 });
  b.flush(g);
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.205, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), GLOWS.shade);
  inner.material = GLOWS.shade; inner.position.set(0, 1.53, 1.38); inner.scale.set(1, 1, 1); inner.onBeforeRender = () => {}; g.add(inner);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 10), GLOWS.bulb); bulb.position.set(0, 1.57, 1.38); g.add(bulb);
  g.userData.lights = [[0, 1.32, 1.38, '#ffc27a', 3.4, 1.5, 'lamp']];
  return g;
}
function sideTable() {
  // little round table on a tulip stem, with a lamp and a sprig
  const g = new THREE.Group(), b = batch(), H = 0.52;
  b.geo(WOOD, smoothGeo(lathe([[0, H - 0.03], [0.23, H - 0.03], [0.24, H - 0.018], [0.235, H - 0.004], [0.22, H], [0, H]], 48)), 0, 0, 0, { uv: 'box' })
    .geo(WOOD, smoothGeo(lathe([[0, 0], [0.17, 0], [0.17, 0.015], [0.06, 0.05], [0.035, 0.2], [0.04, H - 0.04], [0.07, H - 0.03], [0, H - 0.03]], 40)), 0, 0, 0, { uv: 'box' });
  const lamp = drumLamp(g, b, -0.03, H, 0.03);
  pottedSprig(b, 0.13, H, -0.1, 0.9, 17, 6);
  b.flush(g); g.userData.lights = [lamp]; return g;
}
function fiddleFig() {
  const g = new THREE.Group(), b = batch(), r = rng(55);
  const pot = gloss('#ece9e3', { roughness: 0.45, clearcoat: 0.4, flatShading: true });
  b.geo(pot, new THREE.CylinderGeometry(0.2, 0.16, 0.44, 8, 1, true), 0, 0.22, 0).cyl(pot, 0, 0.005, 0, 0.16, 0.16, 0.01, { seg: 8 }).cyl(SOIL, 0, 0.415, 0, 0.198, 0.198, 0.02, { seg: 8 });
  for (const [dx, h, dz] of [[0.03, 1.55, 0.02], [0.22, 1.25, 0.08], [-0.18, 1.1, -0.1], [0.04, 0.9, -0.22]]) {
    const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.42, 0), new THREE.Vector3(dx * 0.35, 0.42 + h * 0.35, dz * 0.35), new THREE.Vector3(dx * 0.95, 0.42 + h * 0.72, dz * 0.95), new THREE.Vector3(dx * 1.35, 0.42 + h, dz * 1.35)]);
    b.geo(STALK, new THREE.TubeGeometry(stem, 16, 0.012, 6, false));
    const n = 11 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const t = 0.24 + 0.76 * i / (n - 1), at = stem.getPoint(t), a = i * 2.39996 + r() * 0.5, el = 0.22 + t * 0.5 + r() * 0.2;
      const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), s = 0.35 - 0.11 * t + r() * 0.05;
      b.geo(LEAF_MAT, aimLeaf(leaf(s, s * 0.78, { shape: 'fiddle', fold: 0.22, curl: 0.26, seg: 10 }), at, dir, (r() - 0.5) * 0.8, leafTint(r)), 0, 0, 0, { uv: 'keep' });
    }
  }
  b.flush(g); return g;
}
function birdOfParadise() {
  const g = new THREE.Group(), b = batch(), r = rng(66);
  const pot = gloss('#3a3d43', { roughness: 0.5, clearcoat: 0.4 });
  const pg = new THREE.CylinderGeometry(0.2, 0.17, 0.46, 48, 6, true), pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), k = 1 + 0.03 * Math.cos(a * 16); pp.setX(i, pp.getX(i) * k); pp.setZ(i, pp.getZ(i) * k); }
  pg.computeVertexNormals();
  b.geo(pot, pg, 0, 0.23, 0).cyl(pot, 0, 0.005, 0, 0.17, 0.17, 0.01, { seg: 24 }).cyl(SOIL, 0, 0.435, 0, 0.195, 0.195, 0.02, { seg: 24 });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996 + r() * 0.3, el = 1.0 + r() * 0.4 - i * 0.02, len = 0.45 + r() * 0.5;
    const dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const at = new THREE.Vector3(Math.cos(a) * 0.03, 0.45, Math.sin(a) * 0.03), tip = at.clone().addScaledVector(dir, len);
    b.geo(STALK, new THREE.CylinderGeometry(0.009, 0.012, len, 6).translate(0, len / 2, 0), at.x, at.y, at.z, { dir: dir.toArray() });
    const ld = dir.clone(); ld.y *= 0.55; ld.normalize();
    b.geo(LEAF_MAT, aimLeaf(leaf(0.5 + r() * 0.22, 0.2 + r() * 0.05, { shape: 'paddle', fold: 0.15, curl: 0.12, seg: 12 }), tip, ld, (r() - 0.5) * 0.6, leafTint(r).multiplyScalar(1.1)), 0, 0, 0, { uv: 'keep' });
  }
  b.flush(g); return g;
}
function sideboard() {
  // low sideboard: plaster body with fluted doors, wooden top, slim legs; vases and books on top
  const g = new THREE.Group(), b = batch(), W = 1.8, D = 0.44, H = 0.6, leg = 0.14, r = rng(12);
  b.box(PLASTER, 0, leg + (H - leg - 0.03) / 2, 0, W, H - leg - 0.03, D, { r: 0.01 }).box(WOOD, 0, H - 0.015, 0, W + 0.02, 0.03, D + 0.02, { r: 0.008 });
  legs4(b, WOOD, W, D, leg, 0.08);
  // flutes on the three doors
  const bodyH = H - leg - 0.07;
  for (let i = 0; i < 3; i++) {
    const cx = (i - 1) * W / 3;
    for (let k = 0; k < 11; k++) b.cyl(PLASTER, cx - W / 6 + 0.04 + k * (W / 3 - 0.08) / 10, leg + 0.02 + bodyH / 2, D / 2 + 0.004, 0.011, 0.011, bodyH, { seg: 8 });
  }
  for (const x of [-W / 6 - 0.04, W / 6 + 0.04]) b.box(BRASS, x, leg + bodyH * 0.6, D / 2 + 0.02, 0.014, 0.14, 0.014, { r: 0.005 });
  vessel(b, CERAMICS[3], -0.6, H, -0.03, 1.3, 0); vessel(b, CERAMICS[0], -0.44, H, 0.05, 1, 2); vessel(b, CERAMICS[4], 0.0, H, -0.05, 0.95, 1);
  bookRow(b, 0.32, H, 0.02, 0.3, r, { stack: true });
  pottedSprig(b, 0.72, H, -0.06, 1.2, 33, 8);
  b.flush(g); return g;
}
function rug() {
  const g = new THREE.Group(), [W, D] = RUG_SIZE;
  const geo = rbox(W, 0.014, D, 0.006, 1), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + W / 2, p.getZ(i) + D / 2);
  geo.translate(0, 0.007, 0);
  const m = new THREE.Mesh(geo, slotMats.rug); m.receiveShadow = true; m.userData.slot = 'rug';
  g.add(m); return g;
}

// ---- wall pieces: origin on the wall surface at the piece's centre ------------------------------
function shelves() {
  // three staggered floating shelves with lights underneath and a trailing plant
  const g = new THREE.Group(), b = batch(), r = rng(31);
  [[-0.1, -0.42], [0.12, 0], [-0.04, 0.42]].forEach(([x, y], i) => {
    b.box(WOOD, x, y, 0.12, 1.22, 0.035, 0.24, { r: 0.008 });
    const top = y + 0.018;
    if (i === 0) { bookRow(b, x - 0.56, top, 0.12, 0.38, r); vessel(b, CERAMICS[0], x + 0.06, top, 0.12, 1, 0); pottedSprig(b, x + 0.38, top, 0.12, 1.1, 5, 8); }
    if (i === 1) { vessel(b, CERAMICS[3], x - 0.45, top, 0.12, 1.1, 2); bookRow(b, x - 0.28, top, 0.12, 0.32, r, { leaning: true }); bookRow(b, x + 0.18, top, 0.12, 0.3, r, { stack: true }); vessel(b, CERAMICS[1], x + 0.47, top, 0.12, 0.9, 1); }
    if (i === 2) { pottedSprig(b, x - 0.42, top, 0.12, 1.2, 13, 9); bookRow(b, x - 0.12, top, 0.12, 0.3, r); vessel(b, CERAMICS[4], x + 0.36, top, 0.12, 0.9, 0); }
    const led = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.008, 0.012), GLOWS.led); led.position.set(x, y - 0.021, 0.21); g.add(led);
  });
  for (let k = 0; k < 3; k++) {
    let at = new THREE.Vector3(-0.46 + k * 0.045, 0.46, 0.19); const d = new THREE.Vector3(0.03, -1, 0.24).normalize();
    for (let i = 0; i < 8 + k * 2; i++) {
      at = at.clone().addScaledVector(d, 0.056); d.x += (r() - 0.5) * 0.22; d.z = 0.1 + r() * 0.12; d.normalize();
      b.geo(LEAF_MAT, aimLeaf(leaf(0.07, 0.062, { shape: 'heart', fold: 0.25, curl: 0.2, seg: 6 }), at, new THREE.Vector3(r() - 0.5, 0.3, 1).normalize(), r() * 2, leafTint(r).multiplyScalar(1.12)), 0, 0, 0, { uv: 'keep' });
    }
  }
  b.flush(g);
  g.userData.lights = [[-0.1, -0.52, 0.24, '#ffc07a', 1.1, 0.45, 'led'], [0.12, -0.1, 0.24, '#ffc07a', 1.1, 0.45, 'led'], [-0.04, 0.32, 0.24, '#ffc07a', 1.1, 0.45, 'led']];
  return g;
}

// the abstract print is repainted in the room's current colours
const printCanvas = document.createElement('canvas'); printCanvas.width = 400; printCanvas.height = 520;
export const printTex = new THREE.CanvasTexture(printCanvas); printTex.colorSpace = THREE.SRGBColorSpace; printTex.anisotropy = 8;
export function paintPrint(cols) {
  const g = printCanvas.getContext('2d'), W = 400, H = 520, r = rng(5150);
  g.fillStyle = cols[0]; g.fillRect(0, 0, W, H);
  const shape = (x, y, rx, ry, c, ph) => {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2, k = 1 + 0.1 * Math.sin(a * 3 + ph) + 0.05 * Math.cos(a * 5 - ph); const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.fill();
  };
  g.fillStyle = cols[1]; g.fillRect(0, H * 0.6, W, H * 0.4);
  shape(W * 0.38, H * 0.32, W * 0.28, H * 0.19, cols[2], 0.4); shape(W * 0.68, H * 0.64, W * 0.25, H * 0.21, cols[3], 1.7);
  shape(W * 0.26, H * 0.76, W * 0.18, H * 0.13, cols[4], 2.9);
  g.strokeStyle = cols[3]; g.lineWidth = 5; g.beginPath(); g.arc(W * 0.72, H * 0.22, W * 0.11, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 2800; i++) g.fillRect(r() * W, r() * H, 1.5, 1.5);
  printTex.needsUpdate = true;
}
function print() {
  const g = new THREE.Group(), b = batch(), W = 0.98, H = 1.24;
  b.box(WOOD, 0, 0, 0.018, W, H, 0.036, { r: 0.006 }).box(std('#efeae1', { roughness: 0.9 }), 0, 0, 0.037, W - 0.06, H - 0.06, 0.004);
  b.box(BRASS, 0, H / 2 + 0.09, 0.09, 0.44, 0.022, 0.03, { r: 0.008 }).box(BRASS, 0, H / 2 + 0.045, 0.045, 0.012, 0.09, 0.012, { rx: -0.6 });
  b.flush(g);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.24, H - 0.24), std('#ffffff', { map: printTex, roughness: 0.85 }));
  art.position.z = 0.04; art.receiveShadow = true; g.add(art);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.006, 0.01), GLOWS.led); led.position.set(0, H / 2 + 0.077, 0.098); g.add(led);
  g.userData.lights = [[0, H / 2 - 0.2, 0.35, '#ffd09a', 1.2, 0.55, 'led']];
  return g;
}
const pairCanvas = document.createElement('canvas'); pairCanvas.width = 480; pairCanvas.height = 320;
export const pairTex = new THREE.CanvasTexture(pairCanvas); pairTex.colorSpace = THREE.SRGBColorSpace; pairTex.anisotropy = 8;
export function paintPair(cols) {
  const g = pairCanvas.getContext('2d'), W = 480, H = 320;
  g.fillStyle = cols[0]; g.fillRect(0, 0, W, H);
  // left: a hill and a sun; right: stacked arcs and a square
  g.fillStyle = cols[2]; g.beginPath(); g.ellipse(120, H * 0.86, 100, 80, 0, Math.PI, 0); g.fill();
  g.fillStyle = cols[1]; g.beginPath(); g.arc(150, H * 0.34, 28, 0, 7); g.fill();
  g.strokeStyle = cols[3]; g.lineWidth = 7;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(360, H * 0.88, 36 + i * 24, Math.PI, Math.PI * 2); g.stroke(); }
  g.fillStyle = cols[4]; g.fillRect(338, H * 0.16, 40, 40);
  pairTex.needsUpdate = true;
}
function frames() {
  const g = new THREE.Group(), b = batch();
  for (const s of [-1, 1]) b.box(WOOD, s * 0.26, 0, 0.015, 0.44, 0.58, 0.03, { r: 0.005 }).box(std('#efeae1', { roughness: 0.9 }), s * 0.26, 0, 0.031, 0.4, 0.54, 0.003);
  b.flush(g);
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.3, 0.44), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + (s > 0 ? 0.5 : 0));
    const m = new THREE.Mesh(geo, std('#ffffff', { map: pairTex, roughness: 0.85 })); m.position.set(s * 0.26, 0, 0.034); m.receiveShadow = true; g.add(m);
  }
  return g;
}

// ---- dining, bedroom, study -------------------------------------------------------------------
function bookcase() {
  // open bookcase with a dark back
  const g = new THREE.Group(), b = batch(), W = 1, D = 0.34, H = 2, r = rng(91);
  for (const s of [-1, 1]) b.box(WOOD, s * (W / 2 - 0.012), H / 2, 0, 0.024, H, D, { r: 0.004 });
  const shelvesY = [0.05, 0.45, 0.85, 1.25, 1.65, 1.99];
  shelvesY.forEach(y => b.box(WOOD, 0, y, 0, W - 0.02, 0.024, D - 0.01, { r: 0.004 }));
  b.box(std('#2d2926', { roughness: 0.8 }), 0, H / 2, -D / 2 + 0.008, W - 0.04, H - 0.02, 0.012);
  shelvesY.slice(0, 5).forEach((y, i) => {
    const t = y + 0.012;
    if (i % 2 === 0) { bookRow(b, -0.44, t, -0.02, 0.48, r); vessel(b, CERAMICS[(i + 2) % 5], 0.26, t, 0, 0.9, i % 3); }
    else { vessel(b, CERAMICS[i % 5], -0.32, t, 0, 1, 2); bookRow(b, -0.12, t, -0.02, 0.5, r, { leaning: true }); }
  });
  pottedSprig(b, 0.22, 1.99 + 0.012, 0, 1.1, 19, 8);
  b.flush(g); return g;
}
function diningTable() {
  // trestle table: two splayed A-frames joined by a stretcher
  const g = new THREE.Group(), b = batch(), W = 1.7, D = 0.9, H = 0.75, r = rng(71);
  b.box(WOOD, 0, H - 0.02, 0, W, 0.04, D, { r: 0.012 });
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.28);
    b.box(WOOD, x, H - 0.065, 0, 0.08, 0.05, D - 0.16, { r: 0.008 });
    for (const sz of [-1, 1]) b.box(WOOD, x, (H - 0.09) / 2, sz * 0.17, 0.06, H - 0.07, 0.06, { r: 0.008, rx: sz * 0.32 });
    b.box(WOOD, x, 0.02, 0, 0.08, 0.04, D - 0.16, { r: 0.008 });
  }
  b.box(WOOD, 0, 0.22, 0, W - 0.56, 0.05, 0.05, { r: 0.008 });
  vessel(b, CERAMICS[0], -0.14, H, 0.02, 1.15, 0); vessel(b, CERAMICS[1], 0.32, H, -0.06, 1.3, 1);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.3, d = new THREE.Vector3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize(), at = new THREE.Vector3(-0.14 + d.x * 0.1, H + 0.3 + i * 0.025, 0.02 + d.z * 0.1);
    b.geo(LEAF_MAT, aimLeaf(leaf(0.12, 0.05, { fold: 0.2, curl: 0.3, seg: 6 }), at, d, r() * 2, leafTint(r)), 0, 0, 0, { uv: 'keep' });
  }
  b.flush(g); return g;
}
function diningChair() {
  // wooden chair with a curved back rail and a seat pad
  const g = new THREE.Group(), b = batch(), W = 0.46, D = 0.48, H = 0.46;
  for (const s of [-1, 1]) {
    b.cyl(WOOD, s * (W / 2 - 0.035), H / 2, D / 2 - 0.04, 0.018, 0.015, H, { seg: 8, rz: s * 0.04 })
      .cyl(WOOD, s * (W / 2 - 0.035), 0.4, -D / 2 + 0.05, 0.018, 0.015, 0.8, { seg: 8, rx: -0.1 });
  }
  b.box(WOOD, 0, H - 0.025, 0, W - 0.02, 0.03, D - 0.02, { r: 0.008 }).geo(ACC, cushion(W - 0.05, 0.045, D - 0.07, 0.02, 0.008), 0, H + 0.01, 0.01);
  b.geo(WOOD, new THREE.TorusGeometry(0.4, 0.016, 8, 24, 0.95).rotateX(Math.PI / 2).rotateY(Math.PI / 2 - 0.475), 0, 0.76, 0.32 - D / 2);
  b.flush(g); return g;
}
function bed() {
  // low platform bed with a tall upholstered headboard
  const g = new THREE.Group(), b = batch(), W = 1.8, L = 2.12;
  b.box(WOOD, 0, 0.17, 0.04, W + 0.1, 0.16, L - 0.04, { r: 0.02 }).box(std('#1d1f23'), 0, 0.045, 0.04, W - 0.2, 0.09, L - 0.3);
  b.geo(FAB, smoothGeo(rbox(W + 0.16, 1.05, 0.1, 0.04, 3)), 0, 0.62, -L / 2 + 0.03);
  for (let i = 0; i < 4; i++) b.geo(FAB, cushion((W + 0.1) / 4 - 0.02, 0.6, 0.06, 0.05, 0.01), -W / 2 - 0.05 + (W + 0.1) * (i + 0.5) / 4, 0.82, -L / 2 + 0.1);
  b.geo(SHEET, smoothGeo(rbox(W - 0.04, 0.24, L - 0.14, 0.07, 3)), 0, 0.37, 0.05);
  b.geo(DUVET, smoothGeo(rbox(W + 0.05, 0.26, L * 0.62, 0.1, 3)), 0, 0.4, L / 2 - L * 0.31 + 0.02).geo(DUVET, smoothGeo(rbox(W + 0.05, 0.07, 0.24, 0.035, 2)), 0, 0.53, L / 2 - L * 0.62 + 0.11, { rx: 0.16 });
  for (const s of [-1, 1]) b.geo(SHEET, pillow(0.64, 0.42, 0.17), s * 0.44, 0.6, -L / 2 + 0.36, { rx: -1.16 });
  for (const s of [-1, 1]) b.geo(ACC, pillow(0.44, 0.33, 0.13), s * 0.35, 0.66, -L / 2 + 0.52, { rx: -1, rz: s * 0.07 });
  b.geo(ACC, smoothGeo(rbox(W + 0.12, 0.035, 0.48, 0.015, 2)), 0, 0.545, L / 2 - 0.33);
  b.flush(g); return g;
}
function nightstand() {
  const g = new THREE.Group(), b = batch(), W = 0.5, D = 0.4, H = 0.5;
  b.box(WOOD, 0, 0.3, 0, W, 0.4, D, { r: 0.014 }).box(std('#3b3a38'), 0, 0.34, D / 2 + 0.001, W - 0.05, 0.006, 0.004);
  legs4(b, WOOD, W, D, 0.1, 0.05, 0.016, 0.012);
  b.box(BRASS, 0, 0.42, D / 2 + 0.012, 0.12, 0.012, 0.012, { r: 0.004 }).box(SPINES[0], 0.1, H + 0.015, 0.04, 0.2, 0.03, 0.15, { ry: 0.25 });
  const lamp = drumLamp(g, b, -0.08, H, -0.04, 0.85);
  b.flush(g); g.userData.lights = [lamp]; return g;
}
function tableLamp() {
  const g = new THREE.Group(), b = batch();
  const lamp = drumLamp(g, b, 0, 0, 0, 0.9);
  b.flush(g); g.userData.lights = [lamp]; return g;
}
function wardrobe() {
  const g = new THREE.Group(), b = batch(), W = 1.6, D = 0.6, H = 2.15;
  const lacquer = std('#d8d3ca', { roughness: 0.45, envMapIntensity: 0.7 });
  b.box(lacquer, 0, H / 2 + 0.04, 0, W, H - 0.08, D, { r: 0.012 }).box(std('#222731', { roughness: 0.7 }), 0, 0.04, 0, W - 0.04, 0.08, D - 0.06);
  b.box(WOOD, -W / 4 + 0.008, H / 2 + 0.05, D / 2 + 0.012, W / 2 - 0.016, H - 0.14, 0.022, { r: 0.006 }).box(lacquer, W / 4 - 0.008, H / 2 + 0.05, D / 2 + 0.012, W / 2 - 0.016, H - 0.14, 0.022, { r: 0.006 });
  for (const x of [-0.04, 0.04]) b.box(BLACK_METAL, x, H / 2 + 0.05, D / 2 + 0.035, 0.012, 0.55, 0.018, { r: 0.004 });
  b.flush(g); return g;
}
function bench() {
  const g = new THREE.Group(), b = batch(), W = 1.2, D = 0.4, H = 0.45;
  b.geo(ACC, cushion(W, 0.1, D, 0.04, 0.012), 0, H - 0.05, 0).box(WOOD, 0, H - 0.115, 0, W - 0.02, 0.03, D - 0.02, { r: 0.006 }).box(WOOD, 0, 0.11, 0, W - 0.14, 0.02, D - 0.1);
  legs4(b, WOOD, W, D, H - 0.13, 0.06, 0.02, 0.016);
  b.box(SPINES[1], 0.3, 0.135, 0, 0.3, 0.03, 0.22).box(SPINES[4], 0.32, 0.165, 0, 0.26, 0.03, 0.2, { ry: 0.15 });
  b.flush(g); return g;
}
function desk() {
  // slab desk on two sled legs, a laptop and a task lamp
  const g = new THREE.Group(), b = batch(), W = 1.4, D = 0.65, H = 0.75;
  const glassScreen = std('#222937', { roughness: 0.3, envMapIntensity: 1 }), alu = metal('#b8bcc3', { roughness: 0.3 });
  b.box(WOOD, 0, H - 0.02, 0, W, 0.04, D, { r: 0.01 });
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.08);
    b.box(BLACK_METAL, x, (H - 0.04) / 2, D / 2 - 0.07, 0.03, H - 0.04, 0.03).box(BLACK_METAL, x, (H - 0.04) / 2, -D / 2 + 0.07, 0.03, H - 0.04, 0.03)
      .box(BLACK_METAL, x, 0.015, 0, 0.03, 0.03, D - 0.1).box(BLACK_METAL, x, H - 0.055, 0, 0.03, 0.03, D - 0.1);
  }
  b.box(alu, -0.1, H + 0.006, 0.1, 0.34, 0.012, 0.24, { r: 0.004 }).box(alu, -0.1, H + 0.12, -0.03, 0.34, 0.23, 0.01, { r: 0.004, rx: -0.22 }).box(glassScreen, -0.1, H + 0.12, -0.024, 0.31, 0.2, 0.004, { rx: -0.22 });
  b.box(SPINES[6], 0.34, H + 0.01, 0.12, 0.22, 0.02, 0.16, { ry: 0.3 }).cyl(CERAMICS[3], 0.3, H + 0.05, -0.17, 0.04, 0.035, 0.1, { seg: 14 });
  pottedSprig(b, -0.56, H, -0.18, 1, 23, 7);
  b.cyl(BLACK_METAL, 0.55, H + 0.01, -0.18, 0.07, 0.08, 0.02, { seg: 20 }).cyl(BLACK_METAL, 0.55, H + 0.2, -0.18, 0.008, 0.008, 0.38, { seg: 8, rz: 0.22 })
    .cyl(BLACK_METAL, 0.47, H + 0.38, -0.1, 0.008, 0.008, 0.22, { seg: 8, rz: -1.1 }).cyl(BLACK_METAL, 0.38, H + 0.34, -0.08, 0.03, 0.07, 0.1, { seg: 20, open: true, rz: 0.5 });
  b.flush(g);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20), GLOWS.bulb); bulb.position.set(0.36, H + 0.29, -0.08); bulb.rotation.x = -Math.PI / 2; bulb.rotation.y = 0.4; g.add(bulb);
  g.userData.lights = [[0.34, H + 0.18, -0.08, '#ffd09a', 1.5, 0.9, 'lamp']];
  return g;
}
function deskChair() {
  const g = new THREE.Group(), b = batch(), chrome = metal('#9aa0a8', { roughness: 0.3 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; b.box(BLACK_METAL, Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14, 0.04, 0.03, 0.3, { ry: a }).sph(BLACK_METAL, Math.sin(a) * 0.27, 0.03, Math.cos(a) * 0.27, 0.03, { seg: 8, seg2: 6 }); }
  b.cyl(chrome, 0, 0.26, 0, 0.022, 0.026, 0.36, { seg: 12 }).geo(FAB, cushion(0.48, 0.08, 0.46, 0.04, 0.01), 0, 0.47, 0.02)
    .box(BLACK_METAL, 0, 0.56, -0.2, 0.06, 0.28, 0.03, { rx: -0.1 }).geo(FAB, cushion(0.44, 0.42, 0.07, 0.05, 0.006), 0, 0.8, -0.24, { rx: -0.12 });
  for (const s of [-1, 1]) b.box(BLACK_METAL, s * 0.26, 0.6, 0, 0.03, 0.2, 0.03).box(BLACK_METAL, s * 0.26, 0.7, 0.02, 0.05, 0.025, 0.26, { r: 0.01 });
  b.flush(g); return g;
}
function snakePlant() {
  const g = new THREE.Group(), b = batch(), r = rng(33);
  b.geo(CERAMICS[4], lathe([[0, 0], [0.12, 0], [0.15, 0.05], [0.165, 0.3], [0.17, 0.32], [0.16, 0.32], [0.15, 0.3]], 32), 0, 0, 0, { uv: 'keep' }).cyl(SOIL, 0, 0.285, 0, 0.152, 0.152, 0.012, { seg: 20 });
  for (let i = 0; i < 12; i++) {
    const a = i * 2.39996 + r(), lean = 0.08 + r() * 0.2, dir = new THREE.Vector3(Math.sin(a) * lean, 1, Math.cos(a) * lean).normalize(), len = 0.5 + r() * 0.4;
    b.geo(LEAF_MAT, aimLeaf(leaf(len, 0.07 + r() * 0.04, { shape: 'blade', fold: 0.12, curl: -0.02, seg: 10 }), new THREE.Vector3(Math.sin(a) * 0.05, 0.29, Math.cos(a) * 0.05), dir, a, leafTint(r).multiplyScalar(0.85)), 0, 0, 0, { uv: 'keep' });
  }
  b.flush(g); return g;
}

// fp = footprint [w, d] at rotation 0; extra = a second footprint rect [cx, cz, w, d]; wall pieces carry [w, h] and a centre height y
export const PIECES = {
  sofa: { name: 'Sofa', build: sofa, fp: [2.7, 0.95], extra: [0.875, 0.81, 0.95, 0.67], h: 0.85 },
  armchair: { name: 'Armchair', build: armchair, fp: [0.76, 0.82], h: 0.8 },
  coffee: { name: 'Coffee table', build: coffee, fp: [1, 1], h: 0.5 },
  pouf: { name: 'Pouf', build: pouf, fp: [0.54, 0.54], h: 0.4 },
  lamp: { name: 'Arc lamp', build: arcLamp, fp: [0.36, 0.36], h: 2.1 },
  side: { name: 'Side table', build: sideTable, fp: [0.5, 0.5], h: 1 },
  plant: { name: 'Fiddle fig', build: fiddleFig, fp: [0.44, 0.44], h: 1.9 },
  plant2: { name: 'Bird of paradise', build: birdOfParadise, fp: [0.46, 0.46], h: 1.5 },
  credenza: { name: 'Sideboard', build: sideboard, fp: [1.8, 0.46], h: 0.9 },
  rug: { name: 'Rug', build: rug, fp: RUG_SIZE, h: 0.02, rug: true },
  shelf: { name: 'Shelves', build: shelves, wall: [1.3, 1], y: 1.55, h: 0.9 },
  art: { name: 'Print', build: print, wall: [1, 1.25], y: 1.5, h: 1.25 },
  frames: { name: 'Two prints', build: frames, wall: [1, 0.6], y: 1.5, h: 0.6 },
  bookcase: { name: 'Bookcase', build: bookcase, fp: [1, 0.36], h: 2.05 },
  dining: { name: 'Dining table', build: diningTable, fp: [1.7, 0.9], h: 0.95 },
  chair: { name: 'Dining chair', build: diningChair, fp: [0.5, 0.52], h: 0.85 },
  bed: { name: 'Bed', build: bed, fp: [1.96, 2.14], h: 1.15 },
  nightstand: { name: 'Nightstand', build: nightstand, fp: [0.5, 0.42], h: 0.95 },
  wardrobe: { name: 'Wardrobe', build: wardrobe, fp: [1.6, 0.62], h: 2.15 },
  bench: { name: 'Bench', build: bench, fp: [1.2, 0.42], h: 0.46 },
  desk: { name: 'Desk', build: desk, fp: [1.4, 0.65], h: 1.1 },
  taskchair: { name: 'Desk chair', build: deskChair, fp: [0.6, 0.6], h: 1 },
  snake: { name: 'Snake plant', build: snakePlant, fp: [0.36, 0.36], h: 1.2 },
  tablelamp: { name: 'Table lamp', build: tableLamp, fp: [0.3, 0.3], h: 0.55, onTop: true },
};
export const PIECE_ORDER = ['sofa', 'armchair', 'coffee', 'pouf', 'side', 'lamp', 'credenza', 'rug', 'plant', 'plant2', 'snake', 'shelf', 'art', 'frames', 'bookcase', 'dining', 'chair', 'bed', 'nightstand', 'tablelamp', 'bench', 'wardrobe', 'desk', 'taskchair'];
