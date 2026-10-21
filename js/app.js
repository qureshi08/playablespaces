// Playable Spaces: the app. Renderer and post chain, the flat and its furniture, interaction, UI.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

import { initTextures, thumb } from './textures.js';
import { MATERIALS, MAT, CATS, CAT_NAME, SLOT_KEYS, SLOTS, slotMats, slotState, setSlotNow, wipeSlot, peekSlot, unpeekSlot, tickSlots, shared } from './materials.js';
import { buildRoom, R, obstacles, wallPlanes, glassLayers } from './room.js';
import { PIECES, PIECE_ORDER, GLOWS, GLOW_BASE, paintPrint, paintPair } from './furniture.js';
import { buildEnv, buildStudio, SKY } from './studio.js';
import { sample, sunAngles, moonAngles, dirFrom, isNight, bodyPos, sliderGradient, fmt, H_MIN, H_MAX, SUNRISE, SUNSET } from './daylight.js';
import { clamp, lerp, easeInOut, easeOut, $, $$ } from './util.js';

// ---------------------------------------------------------------------------------------------
// renderer, scene, camera, post
// ---------------------------------------------------------------------------------------------
const world = $('#world'), app = $('#app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
// capped pixel ratio: sharp enough on a laptop screen without rendering 4x the pixels
const PR = clamp(Math.min(devicePixelRatio, 1.5, Math.sqrt(2.2e6 / (innerWidth * innerHeight))), 1, 1.5);
renderer.setPixelRatio(PR);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;   // shadows are redrawn only when the sun or the furniture moves
renderer.toneMapping = THREE.ACESFilmicToneMapping;
world.appendChild(renderer.domElement);
initTextures(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#10151f');
scene.fog = new THREE.FogExp2('#1a2130', 0.0025);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.3, 400);

const env = buildEnv(renderer);
scene.environment = env;
scene.environmentIntensity = 0.7;

const hemi = new THREE.HemisphereLight('#8fa6d8', '#3a3026', 0.5);
const sun = new THREE.DirectionalLight('#ffd08f', 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 60 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
sun.target.position.set(0, 0.6, 0);
// rim from low behind (catches edges, not the floor) and a faint warm fill from the front
const rim = new THREE.DirectionalLight('#9fb4ff', 0.35); rim.position.set(-6, 3, -14);
const fill = new THREE.DirectionalLight('#fff0dc', 0.22); fill.position.set(8, 12, 12);
scene.add(hemi, sun, sun.target, rim, fill);

// post: render (4x MSAA) -> ambient occlusion at half resolution -> bloom on the lamps -> tone map. No blur.
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * PR, innerHeight * PR, { type: THREE.HalfFloatType, samples: 4 }));
composer.setPixelRatio(PR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
const gtaoSize = gtao.setSize.bind(gtao);
gtao.setSize = (w, h) => gtaoSize(Math.ceil(w / 2), Math.ceil(h / 2));
gtao.setSize(innerWidth * PR, innerHeight * PR);
gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.1, scale: 1.2, samples: 8 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 8 });
gtao.blendIntensity = 0.95;
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.42, 0.55, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// glass panes would confuse the AO pass; hide them for it
// (also the sun, its path and the placement marker, which are overlays rather than solid things)
const overlays = [];
{
  const orig = gtao.render.bind(gtao);
  gtao.render = (...a) => {
    const hide = [...glassLayers, ...overlays];
    const was = hide.map(o => o.visible); hide.forEach(o => { o.visible = false; });
    orig(...a);
    hide.forEach((o, i) => { o.visible = was[i]; });
  };
}

// ---------------------------------------------------------------------------------------------
// the flat and the studio
// ---------------------------------------------------------------------------------------------
buildStudio(scene);
const flat = buildRoom(scene, env);
const itemsRoot = new THREE.Group(); itemsRoot.name = 'items'; flat.root.add(itemsRoot);

// ---------------------------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------------------------
const MOODS = {
  cozy: { name: 'Cozy', h: 18.4, mats: { floor: 'oak', wallL: 'limewash', wallB: 'limewash', slats: 'walnut', upholstery: 'boucle', accent: 'rust', bedding: 'linen', rug: 'knit', joinery: 'walnut' } },
  bright: { name: 'Bright', h: 12.8, mats: { floor: 'whiteoak', wallL: 'chalk', wallB: 'chalk', slats: 'whiteoak', upholstery: 'linen', accent: 'navy', bedding: 'linen', rug: 'linen', joinery: 'whiteoak' } },
  moody: { name: 'Moody', h: 22.2, mats: { floor: 'smoked', wallL: 'ink', wallB: 'ink', slats: 'walnut', upholstery: 'cognac', accent: 'ochre', bedding: 'charcoal', rug: 'heather', joinery: 'smoked' } },
};
// [type, x, z, rotation degrees] for floor pieces; [type, wall plane, along, height] for wall pieces
const LAYOUT = [
  ['rug', -3.4, -1.3, 90], ['sofa', -4.75, -1.6, 90], ['coffee', -3.3, -1.25, 0], ['armchair', -2.05, -1.0, -90], ['pouf', -2.6, -2.4, 0],
  ['lamp', -4.95, 0.4, 180], ['side', -4.9, -3.35, 0], ['credenza', -3.45, -3.47, 0], ['plant', -2.0, -3.3, 0], ['plant2', -4.95, 0.98, 0],
  ['dining', -3.6, 2.15, 0], ['chair', -4.0, 1.4, 0], ['chair', -3.2, 1.4, 0], ['chair', -4.0, 2.9, 180], ['chair', -3.2, 2.9, 180],
  ['bed', 3.55, -2.6, 0], ['nightstand', 2.15, -3.47, 0], ['nightstand', 4.95, -3.47, 0], ['bench', 3.55, -1.2, 0], ['wardrobe', 1.82, -0.2, 90], ['snake', 5.0, 0.5, 0],
  ['desk', 4.2, 1.35, 0], ['taskchair', 4.2, 2.05, 180], ['bookcase', 1.69, 3.1, 90], ['plant', 5.0, 3.3, 0],
  ['shelf', 0, -3.45, 1.6], ['art', 3, -0.95, 1.55], ['frames', 2, 3.55, 1.55],
];
let H = 18.4, hTarget = 18.4, hAnim = null;
const items = [];
let nextId = 1;

// ---------------------------------------------------------------------------------------------
// furniture: spawn, place, collide
// ---------------------------------------------------------------------------------------------
// lamps borrow lights from a fixed pool: a changing light count would recompile every shader (a long freeze)
const lamps = [];   // { local, color, dist, base, item }
const LIGHT_POOL = Array.from({ length: 6 }, () => { const p = new THREE.PointLight('#ffc98a', 0, 3, 2); scene.add(p); return p; });
const _lp = new THREE.Vector3();
function syncLamps() {
  const ranked = lamps.filter(l => l.item.g.visible).sort((a, b) => a.rank - b.rank);   // real lamps first, little LEDs last
  LIGHT_POOL.forEach((p, i) => {
    const l = ranked[i];
    if (!l || !l.item.g.visible) { p.intensity = 0; return; }
    l.item.g.updateMatrixWorld();
    p.position.copy(l.item.g.localToWorld(_lp.copy(l.local)));
    p.color.set(l.color); p.distance = l.dist; p.intensity = l.base * lampLevel * 1.7;
  });
}
function spawn(type) {
  const P = PIECES[type], g = P.build();
  const item = { id: nextId++, type, g, x: 0, z: 0, rot: 0, plane: -1, a: 0, y: 0 };
  g.userData.item = item;
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; o.userData.item = item; } });
  const ls = g.userData.lights || [];
  const use = type === 'shelf' ? [ls[1]] : ls;
  for (const l of use) {
    const [x, y, z, c, k, d] = l;
    const base = k * (type === 'shelf' ? 2.2 : 1);
    lamps.push({ local: new THREE.Vector3(x, y, z), color: c, dist: d * 3.2, base, item, rank: { lamp: 0, flame: 1, led: 2 }[l[6]] ?? 3 });
  }
  itemsRoot.add(g);
  items.push(item);
  return item;
}
function remove(item) {
  itemsRoot.remove(item.g);
  for (let i = lamps.length - 1; i >= 0; i--) if (lamps[i].item === item) lamps.splice(i, 1);
  items.splice(items.indexOf(item), 1);
  item.g.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
}
function applyPose(item) {
  const P = PIECES[item.type];
  if (item.sw === undefined) initFloat(item);
  // resting pieces snap; lifted ones glide there in animateFloat
  if (!(item.lift > 0.0005) || item.splane !== item.plane) {
    item.sx = P.wall ? item.a : item.x; item.sz = item.z; item.srot = item.rot; item.splane = item.plane;
  }
  poseFloat(item);
}

// ---- floating: a held piece hangs from a point above it like a pendulum. It lifts on a spring, swings when it moves,
// sways a little while it waits, and bounces once when it lands. Selecting a piece floats it the same way as carrying it. ----
let hoverItem = null;
const LIFT = { hover: 0.05, sel: 0.3, carry: 0.34 };
function liftTarget(it) {
  if (drag && drag.item === it) return PIECES[it.type].rug ? 0.08 : LIFT.carry;
  if (sel === it) return PIECES[it.type].rug ? 0.06 : LIFT.sel;
  if (hoverItem === it) return LIFT.hover;
  return 0;
}
// the hang point sits just above the piece; taller pieces swing slower and lean less
function initFloat(it) {
  const P = PIECES[it.type], hp = P.wall ? P.wall[1] / 2 + 0.12 : P.rug ? 0.3 : (P.h || 1) + 0.15;
  Object.assign(it, {
    sw: { hp, om: 7.5 / Math.sqrt(Math.max(hp, 0.4)), k: (P.rug ? 0.3 : 1) / Math.sqrt(Math.max(hp, 0.6)) },
    lift: 0, liftV: 0, tx: 0, tz: 0, wx: 0, wz: 0, pvx: 0, pvz: 0,
    sx: P.wall ? it.a : it.x, sz: it.z, srot: it.rot, splane: it.plane,
  });
}
// a nudge when a piece is picked up, so it starts swinging
function kick(it, k = 0.5) { if (it.sw === undefined) initFloat(it); it.wx += (Math.random() - 0.5) * k; it.wz += (Math.random() - 0.5) * k; }
const _swq = new THREE.Quaternion(), _swa = new THREE.Vector3(), _swp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function poseFloat(it) {
  const P = PIECES[it.type], S = it.sw;
  const m = Math.hypot(it.tx, it.tz), w = m > 1e-6 ? 0.13 * Math.tanh(m / 0.13) / m : 0;   // lean softly capped near 7 degrees
  if (m * w > 1e-5) _swq.setFromAxisAngle(_swa.set(-it.tz, 0, it.tx).normalize(), m * w); else _swq.identity();
  _swp.set(0, -S.hp, 0).applyQuaternion(_swq);
  const held = it.lift > 0.0005 && (sel === it || (drag && drag.item === it));
  const bob = held ? Math.sin(now * 2.4 + it.id) * 0.018 * Math.min(1, it.lift / 0.15) : 0;
  let x, y, z, yaw;
  if (P.wall) {
    const wp = wallPlanes[it.plane]; if (!wp) return;
    const out = 0.001 + it.lift * 0.6;
    if (wp.axis === 'z') { x = it.sx; z = wp.at + out; yaw = 0; } else { x = wp.at + out; z = it.sx; yaw = Math.PI / 2; }
    y = it.y + bob;
  } else { x = it.sx; z = it.sz; y = (P.rug ? 0.001 : 0) + it.lift + bob; yaw = it.srot; }
  it.g.quaternion.setFromAxisAngle(_up, yaw).premultiply(_swq);
  it.g.position.set(x + _swp.x, y + S.hp + _swp.y, z + _swp.z);
}
// spring and pendulum step per piece, at 120 Hz substeps; returns true while anything is still moving
function animateFloat(dt) {
  let moving = false;
  const h = Math.min(dt, 1 / 30);
  if (h < 1e-4) return !!sel;
  const kPos = 1 - Math.exp(-h * 16), kRot = 1 - Math.exp(-h * 14), kV = 1 - Math.exp(-h / 0.05);
  for (const it of items) {
    const P = PIECES[it.type], t = liftTarget(it);
    if (it.sw === undefined) initFloat(it);
    const held = sel === it || (drag && drag.item === it), along = P.wall ? it.a : it.x;
    if (!held && t === 0 && it.lift < 0.0005 && Math.abs(it.liftV) < 0.001
      && Math.abs(it.tx) + Math.abs(it.tz) + Math.abs(it.wx) + Math.abs(it.wz) < 2e-4
      && Math.abs(it.sx - along) + Math.abs(it.sz - it.z) < 1e-4) {
      if (it.awake) { it.awake = false; it.tx = it.tz = it.wx = it.wz = it.lift = it.liftV = 0; applyPose(it); renderer.shadowMap.needsUpdate = true; }
      continue;
    }
    it.awake = true;
    if (it.splane !== it.plane) { it.sx = along; it.splane = it.plane; }
    // glide to the snapped spot and angle instead of jumping cell to cell
    const ox = it.sx, oz = it.sz;
    it.sx += (along - it.sx) * kPos;
    if (!P.wall) it.sz += (it.z - it.sz) * kPos;
    let dr = it.rot - it.srot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); it.srot += dr * kRot;
    // lift: a slightly underdamped spring, and a small bounce when it touches down
    for (let r = h; r > 1e-6; r -= 1 / 120) {
      const D = Math.min(r, 1 / 120);
      it.liftV += ((t - it.lift) * 220 - it.liftV * 16) * D; it.lift += it.liftV * D;
      if (!t && it.lift < 0) { it.lift = 0; it.liftV = Math.abs(it.liftV) * 0.3; if (it.liftV < 0.08) it.liftV = 0; }
    }
    // swing: the hang point leads, the piece trails behind its speed and acceleration
    const S = it.sw, f = clamp(it.lift / 0.1, 0, 1);
    let vx = (it.sx - ox) / h, vz = (it.sz - oz) / h;
    if (P.wall && wallPlanes[it.plane]?.axis === 'x') { vz = vx; vx = 0; }
    const qx = it.pvx, qz = it.pvz;
    it.pvx += (vx - it.pvx) * kV; it.pvz += (vz - it.pvz) * kV;
    let ax = (it.pvx - qx) / h, az = (it.pvz - qz) / h;
    const am = Math.hypot(ax, az); if (am > 30) { ax *= 30 / am; az *= 30 / am; }
    const sway = held ? 1 : 0;   // a slow idle sway while it waits in the air
    const gx = (-(ax / 160 + it.pvx * 0.007) * S.k + sway * Math.sin(now * 1.3 + it.id) * 0.025) * f;
    const gz = (-(az / 160 + it.pvz * 0.007) * S.k + sway * Math.sin(now * 1.05 + it.id * 1.7) * 0.02) * f;
    const om = S.om, zeta = lerp(0.95, 0.3, f);
    for (let r = h; r > 1e-6; r -= 1 / 120) {
      const D = Math.min(r, 1 / 120);
      it.wx += (-om * om * (it.tx - gx) - 2 * zeta * om * it.wx) * D;
      it.wz += (-om * om * (it.tz - gz) - 2 * zeta * om * it.wz) * D;
      it.tx += it.wx * D; it.tz += it.wz * D;
    }
    // wall pieces only swing flat along their wall
    if (P.wall) { if (wallPlanes[it.plane]?.axis === 'x') it.tx = it.wx = 0; else it.tz = it.wz = 0; }
    poseFloat(it);
    moving = true;
    renderer.shadowMap.needsUpdate = true;   // the shadow stays on the floor and follows the swing
  }
  // a soft footprint outline under the selected piece
  if (!drag) {
    if (sel && !PIECES[sel.type].rug) { tintItem(sel, null); marker.material.uniforms.uA.value = Math.min(1, (sel.lift || 0) / 0.12); }
    else marker.visible = false;
  }
  return moving || !!sel;
}
// footprint rectangles as world polygons
function footprint(type, x, z, rot) {
  const P = PIECES[type], rects = [[0, 0, P.fp[0], P.fp[1]]];
  if (P.extra) rects.push(P.extra);
  const c = Math.cos(rot), s = Math.sin(rot);
  return rects.map(([cx, cz, w, d]) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([px, pz]) => {
    const lx = cx + px, lz = cz + pz;
    return [x + lx * c + lz * s, z - lx * s + lz * c];
  }));
}
function project(poly, ax, ay) { let mn = Infinity, mx = -Infinity; for (const [x, z] of poly) { const v = x * ax + z * ay; if (v < mn) mn = v; if (v > mx) mx = v; } return [mn, mx]; }
function overlap(a, b) {
  for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length], ax = -(z2 - z1), ay = x2 - x1;
    const [a0, a1] = project(a, ax, ay), [b0, b1] = project(b, ax, ay);
    if (a1 <= b0 + 1e-4 || b1 <= a0 + 1e-4) return false;
  }
  return true;
}
const rectPoly = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
function fits(type, x, z, rot, self) {
  const polys = footprint(type, x, z, rot), P = PIECES[type];
  for (const poly of polys) {
    for (const o of obstacles) if (overlap(poly, rectPoly(o))) return false;
    for (const it of items) {
      if (it === self || PIECES[it.type].wall) continue;
      if (P.rug || PIECES[it.type].rug) continue;
      for (const q of footprint(it.type, it.x, it.z, it.rot)) if (overlap(poly, q)) return false;
    }
  }
  return true;
}
// snap to a 10 cm grid, then slide flush against a nearby outer wall
function snapFloor(type, x, z, rot) {
  x = Math.round(x * 10) / 10; z = Math.round(z * 10) / 10;
  let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity;
  for (const poly of footprint(type, x, z, rot)) for (const [px, pz] of poly) { mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mnz = Math.min(mnz, pz); mxz = Math.max(mxz, pz); }
  const g = 0.14;
  if (mnx - R.X0 < g) x += R.X0 + 0.005 - mnx; else if (R.X1 - mxx < g) x -= mxx - (R.X1 - 0.005);
  if (mnz - R.Z0 < g) z += R.Z0 + 0.005 - mnz; else if (R.Z1 - mxz < g) z -= mxz - (R.Z1 - 0.005);
  return [x, z];
}
function wallFits(type, plane, a, y, self) {
  const P = PIECES[type], w = wallPlanes[plane], half = P.wall[0] / 2;
  if (a - half < w.a0 + 0.02 || a + half > w.a1 - 0.02) return false;
  if (y - P.wall[1] / 2 < 0.35 || y + P.wall[1] / 2 > R.H - 0.08) return false;
  for (const it of items) {
    if (it === self || !PIECES[it.type].wall) continue;
    const ow = wallPlanes[it.plane];
    if (ow.axis !== w.axis || Math.abs(ow.at - w.at) > 0.1) continue;
    const Q = PIECES[it.type];
    if (Math.abs(it.a - a) < (P.wall[0] + Q.wall[0]) / 2 && Math.abs(it.y - y) < (P.wall[1] + Q.wall[1]) / 2) return false;
  }
  return true;
}
function placeLayout(list) {
  for (const it of [...items]) remove(it);
  for (const row of list) {
    const [type] = row, P = PIECES[type];
    if (!P) continue;
    const it = spawn(type);
    if (P.wall) { it.plane = row[1]; it.a = row[2]; it.y = row[3]; }
    else { it.x = row[1]; it.z = row[2]; it.rot = row[3] * Math.PI / 180; }
    applyPose(it);
  }
  itemsChanged();
}
// wall pieces in LAYOUT name a plane by index into wallPlanes and a position along it
function fixLayoutPlanes() {
  // plane indices: 0 back wall left of the window, 1 back wall between window and partition, 2 back wall bedroom, 3 left wall, 4 slat wall
  for (const row of LAYOUT) if (PIECES[row[0]].wall) {
    if (row[0] === 'shelf') { row[1] = 0; row[2] = -3.45; }
    if (row[0] === 'art') { row[1] = 3; row[2] = -0.95; }
    if (row[0] === 'frames') { row[1] = 2; row[2] = 3.55; }
  }
}
fixLayoutPlanes();

// ---------------------------------------------------------------------------------------------
// materials on slots, the print's colours, the moodboard
// ---------------------------------------------------------------------------------------------
const curMat = k => (slotState[k].next && !slotState[k].peek ? slotState[k].next : slotState[k].cur);
function repaintPrints() {
  const hex = k => curMat(k).c[0];
  paintPrint([hex('wallB') === hex('wallL') ? '#efe9de' : hex('wallL'), hex('floor'), hex('accent'), hex('upholstery') === '#ebe5da' ? '#d8cbb4' : hex('upholstery'), hex('joinery')]);
  paintPair(['#f1ece2', hex('accent'), hex('floor'), hex('joinery'), hex('rug')]);
}
function anchorFor(slot) {
  // a world point on the slot's surface, used for wipes started from the UI and for annotation lines
  const find = t => items.find(i => i.type === t);
  const s = find('sofa'), b = find('bed'), r = find('rug');
  switch (slot) {
    case 'floor': return new THREE.Vector3(0.3, 0, 0.6);
    case 'wallL': return new THREE.Vector3(R.X0 + 0.01, 1.7, 0.2);
    case 'wallB': return new THREE.Vector3(-1.0 + 2.2, 1.9, R.Z0 + 0.01);
    case 'slats': return new THREE.Vector3(R.X0 + 0.06, 1.7, -2.9);
    case 'upholstery': return s ? s.g.localToWorld(new THREE.Vector3(-0.3, 0.5, 0.15)) : new THREE.Vector3(-4, 0.5, -1.5);
    case 'accent': return s ? s.g.localToWorld(new THREE.Vector3(-0.9, 0.62, -0.05)) : new THREE.Vector3(-4, 0.6, -1.5);
    case 'bedding': return b ? b.g.localToWorld(new THREE.Vector3(0, 0.55, 0.4)) : new THREE.Vector3(3.5, 0.5, -2.5);
    case 'rug': return r ? r.g.localToWorld(new THREE.Vector3(0.6, 0.02, 0.5)) : new THREE.Vector3(-3, 0, -1);
    case 'joinery': { const c = find('credenza') || find('dining'); return c ? c.g.localToWorld(new THREE.Vector3(0.4, 0.6, 0)) : new THREE.Vector3(-3.4, 0.6, -3.4); }
  }
  return new THREE.Vector3();
}

let now = 0;
function setMaterial(slot, id, point = null, animate = true) {
  const m = MAT[id];
  if (!m || !SLOTS[slot].cats.includes(m.cat)) return false;
  if (curMat(slot) === m) return false;
  if (animate) wipeSlot(slot, m, point || anchorFor(slot), now); else setSlotNow(slot, m);
  boardDirty = true; afterChange();
  return true;
}

// ---------------------------------------------------------------------------------------------
// daylight
// ---------------------------------------------------------------------------------------------
const tmpV = new THREE.Vector3();
let lampLevel = 0;
function applyDaylight(h) {
  const s = sample(h), night = isNight(h);
  const ang = night ? moonAngles(h) : sunAngles(h);
  dirFrom(ang, tmpV);
  sun.position.copy(tmpV).multiplyScalar(30).add(sun.target.position);
  if (night) { sun.color.set('#9fb4ff'); sun.intensity = s.moon * 3.2; }
  else { sun.color.copy(s.sunC); sun.intensity = s.sun * 0.85; }
  hemi.color.copy(s.sky); hemi.groundColor.copy(s.gnd); hemi.intensity = s.hemi * 1.35;
  scene.environmentIntensity = 0.25 + s.env * 1.1;
  renderer.toneMappingExposure = s.exp;
  lampLevel = s.lamps;
  syncLamps();
  for (const k in GLOWS) {
    const base = { shade: '#ffd6a0', bulb: '#fff0d6', led: '#ffc07a', flame: '#ffb45c' }[k];
    GLOWS[k].color.set(base).multiplyScalar(GLOW_BASE[k] * (0.06 + s.lamps * 0.94));
  }
  // sky backdrop
  SKY.uZenith.value.copy(s.zen); SKY.uHorizon.value.copy(s.hor); SKY.uSunGlow.value.copy(s.glow);
  SKY.uTower.value.copy(s.tower); SKY.uMist.value.copy(s.mist); SKY.uSea.value.copy(s.sea); SKY.uLit.value = s.lit;
  const sa = sunAngles(h), phi = ((sa.az - 180 + 540) % 360) - 180;
  SKY.uSunPos.value.set(0.5 - phi / 172, 0.56 + sa.el / 160, night ? 0 : s.gk);
  scene.fog.color.copy(s.zen).lerp(new THREE.Color('#1a2130'), 0.75);
  renderer.shadowMap.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------
// camera: orbit around a target, pan, zoom, keys, cinematic mode
// ---------------------------------------------------------------------------------------------
const HOME = { target: new THREE.Vector3(0.2, -0.35, 0.3), yaw: 0.3, pitch: 0.54, dist: 27 };
// on a tall phone screen the flat is wider than the view, so back the camera off until about 13.6 m fits across
const homeDist = () => Math.max(27, 6.8 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
HOME.dist = homeDist();
const cam = { target: HOME.target.clone(), yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist };
const camGoal = { target: HOME.target.clone(), yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist };
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * 9);
  cam.target.lerp(camGoal.target, k); cam.yaw = lerp(cam.yaw, camGoal.yaw, k); cam.pitch = lerp(cam.pitch, camGoal.pitch, k); cam.dist = lerp(cam.dist, camGoal.dist, k);
  const cp = Math.cos(cam.pitch);
  camera.position.set(cam.target.x + Math.sin(cam.yaw) * cp * cam.dist, cam.target.y + Math.sin(cam.pitch) * cam.dist, cam.target.z + Math.cos(cam.yaw) * cp * cam.dist);
  camera.lookAt(cam.target);
}
function resetView() { camGoal.target.copy(HOME.target); camGoal.yaw = HOME.yaw; camGoal.pitch = HOME.pitch; camGoal.dist = HOME.dist; }

const SHOTS = [
  { t: [-3.4, 0.6, -1.4], yaw: 0.9, pitch: 0.32, dist: 8.5 },
  { t: [3.5, 0.6, -2.2], yaw: -0.5, pitch: 0.42, dist: 8 },
  { t: [-3.6, 0.7, 2.1], yaw: 1.6, pitch: 0.28, dist: 7.5 },
  { t: [0, 0.3, 0], yaw: -0.6, pitch: 0.75, dist: 19 },
  { t: [4.1, 0.7, 1.9], yaw: 0.2, pitch: 0.35, dist: 6.5 },
  { t: [-1.5, 0.4, -0.6], yaw: 0.05, pitch: 0.5, dist: 13 },
];
let cine = false, cineT = 0, cineI = 0;
function setCine(on) {
  cine = on; cineT = 0; cineI = 0;
  $('#cine').setAttribute('aria-pressed', String(on));
  if (!on) resetView();
  toast(on ? 'Cinematic cameras on' : 'Cinematic cameras off');
}
function tickCine(dt) {
  if (!cine) return;
  cineT += dt;
  const s = SHOTS[cineI];
  camGoal.target.set(...s.t); camGoal.pitch = s.pitch; camGoal.dist = s.dist * (1 - cineT * 0.012);
  camGoal.yaw = s.yaw + cineT * 0.035;
  if (cineT > 7) { cineT = 0; cineI = (cineI + 1) % SHOTS.length; }
}

// ---------------------------------------------------------------------------------------------
// sun and moon sprites, the path of the sun
// ---------------------------------------------------------------------------------------------
function sprite(draw, size) {
  const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false, transparent: true }));
  s.scale.set(size, size, 1); s.renderOrder = 5; return s;
}
const sunSprite = sprite(g => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.22, 'rgba(255,214,140,.95)'); gr.addColorStop(0.5, 'rgba(255,170,80,.25)'); gr.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(255,236,190,.95)'; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26); g.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38); g.stroke(); }
  g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(64, 64, 18, 0, 7); g.fill();
}, 1.25);
const moonSprite = sprite(g => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,232,255,.9)'); gr.addColorStop(0.3, 'rgba(180,200,255,.35)'); gr.addColorStop(1, 'rgba(150,170,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#eef3ff'; g.beginPath(); g.arc(64, 64, 18, 0, 7); g.fill();
  g.fillStyle = 'rgba(170,185,215,.6)'; g.beginPath(); g.arc(58, 60, 4, 0, 7); g.arc(70, 70, 3, 0, 7); g.fill();
}, 1.05);
scene.add(sunSprite, moonSprite);
const arcPts = [];
for (let h = SUNRISE; h <= SUNSET + 0.001; h += 0.1) arcPts.push(bodyPos(h));
const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.16, gapSize: 0.16, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
arcLine.computeLineDistances(); arcLine.renderOrder = 4;
scene.add(arcLine);
overlays.push(sunSprite, moonSprite, arcLine);
function placeBodies() {
  const night = isNight(H);
  bodyPos(H, sunSprite.position); moonSprite.position.copy(sunSprite.position);
  sunSprite.visible = !night && notesOn; moonSprite.visible = night && notesOn;
  arcLine.visible = notesOn;
}

// ---------------------------------------------------------------------------------------------
// annotations: swatch cards floating over the room, with lines to the surfaces they describe
// ---------------------------------------------------------------------------------------------
let notesOn = true;
const NOTE_SLOTS = [['upholstery', -3.6], ['slats', -1.75], ['wallB', 0.0], ['floor', 1.75], ['bedding', 3.65]];
const cardsEl = $('#cards'), svg = $('#notes-layer');
const cards = NOTE_SLOTS.map(([slot, x]) => {
  const el = document.createElement('div'); el.className = 'ncard';
  el.innerHTML = '<canvas width="112" height="112"></canvas><div><b></b><i></i></div>';
  cardsEl.appendChild(el);
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'), dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', '3.5'); svg.append(line, dot);
  return { slot, el, line, dot, pos: new THREE.Vector3(x, 3.75, -4.2), shown: null };
});
const projV = new THREE.Vector3();
function toScreen(v) { projV.copy(v).project(camera); return [(projV.x * 0.5 + 0.5) * innerWidth, (-projV.y * 0.5 + 0.5) * innerHeight, projV.z]; }
function updateCards() {
  if (!notesOn) return;
  for (const c of cards) {
    const m = curMat(c.slot);
    if (c.shown !== m) {
      c.shown = m;
      const cv = c.el.querySelector('canvas'), g = cv.getContext('2d'); g.clearRect(0, 0, 112, 112); g.drawImage(thumb(m), 0, 0, 112, 112);
      c.el.querySelector('b').textContent = m.name; c.el.querySelector('i').textContent = SLOTS[c.slot].name === 'Walls' ? 'walls' : SLOTS[c.slot].name.toLowerCase();
    }
    const [sx, sy, sz] = toScreen(c.pos), dist = camera.position.distanceTo(c.pos), sc = clamp(21 / dist, 0.45, 1.6);
    c.el.style.transform = `translate(${sx - 46}px, ${sy - 112}px) scale(${sc})`;
    c.el.style.opacity = sz > 1 ? 0 : 1;
    const [ax, ay] = toScreen(anchorFor(c.slot));
    c.line.setAttribute('x1', sx); c.line.setAttribute('y1', sy + 20 * sc); c.line.setAttribute('x2', ax); c.line.setAttribute('y2', ay);
    c.dot.setAttribute('cx', ax); c.dot.setAttribute('cy', ay);
  }
}
function setNotes(on, say = false) {
  notesOn = on;
  app.classList.toggle('notes-off', !on);
  $('#notes').setAttribute('aria-pressed', String(on));
  $('#notes').title = (on ? 'Hide' : 'Show') + ' annotations (Shift+N)';
  try { localStorage.setItem('mood-notes', on ? '1' : '0'); } catch {}
  if (say) toast(on ? 'Annotations shown' : 'Annotations hidden');
}

// ---------------------------------------------------------------------------------------------
// the meter: how the room reads, and why
// ---------------------------------------------------------------------------------------------
const WEIGHT = { floor: 0.22, wallL: 0.1, wallB: 0.24, slats: 0.07, upholstery: 0.12, accent: 0.06, bedding: 0.06, rug: 0.06, joinery: 0.07 };
const NOUN = { floor: 'floor', wallL: 'left wall', wallB: 'walls', slats: 'slat wall', upholstery: 'sofa', accent: 'cushions', bedding: 'bedding', rug: 'rugs', joinery: 'woodwork' };
function reading() {
  const s = sample(H), day = isNight(H) ? 0 : clamp(s.sun / 3, 0, 1);
  const gold = isNight(H) ? 0 : clamp((Math.abs(H - 13) - 3) / 3, 0, 1);   // low sun near the ends of the day
  let L = 0, W = 0, T = 0;
  for (const k of SLOT_KEYS) { const m = curMat(k); L += WEIGHT[k] * m.L; W += WEIGHT[k] * m.warm; T += WEIGHT[k] * m.tx; }
  const bright = L * 1.0 + day * (1 - gold) * 0.6 - s.lamps * 0.08;
  const cozy = (W * 0.5 + 0.5) * 0.55 + T * 0.35 + gold * day * 0.5 + s.lamps * 0.3 * (1 - day) * (W > 0.2 ? 1 : 0.5);
  const moody = (1 - L) * 0.95 + (1 - day) * 0.3 + s.lamps * 0.12 - W * 0.05 + 0.08;
  const v = { cozy: Math.max(cozy, 0.01) ** 2.5, bright: Math.max(bright, 0.01) ** 2.5, moody: Math.max(moody, 0.01) ** 2.5 };
  const sum = v.cozy + v.bright + v.moody;
  const pct = { cozy: Math.round(v.cozy / sum * 100), bright: Math.round(v.bright / sum * 100) };
  pct.moody = 100 - pct.cozy - pct.bright;
  return { pct, day, gold, lamps: s.lamps };
}
const LIGHT_PHRASE = h => isNight(h) ? 'the lamps' : h < 10 ? 'the morning light' : h < 16 ? 'the midday sun' : h < 19.6 ? 'a low gold sun' : 'the dusk';
let lastWhy = '';
function updateMeter() {
  const { pct } = reading();
  const order = Object.entries(pct).sort((a, b) => b[1] - a[1]), top = order[0][0], second = order[1];
  for (const el of $$('.stat')) {
    const k = el.dataset.k; el.querySelector('b').textContent = pct[k] + '%'; el.querySelector('u span').style.width = pct[k] + '%'; el.classList.toggle('top', k === top);
  }
  const score = k => { const m = curMat(k); return WEIGHT[k] * (top === 'bright' ? m.L : top === 'moody' ? 1 - m.L : (m.warm + m.tx) / 2); };
  const best = SLOT_KEYS.filter(k => k !== 'wallL' || curMat('wallL') !== curMat('wallB')).sort((a, b) => score(b) - score(a)).slice(0, 2);
  const names = best.map(k => `<b>${curMat(k).name.toLowerCase()} ${NOUN[k]}</b>`);
  names[0] = names[0].replace(/<b>(.)/, (m, c) => '<b>' + c.toUpperCase());
  const verb = { cozy: 'make it warm and soft', bright: 'bounce the light around', moody: 'pull it in deep and quiet' }[top];
  const cls = { cozy: 'a', bright: 'c', moody: 'm' }[top];
  let html = `${names[0]}, ${names[1].replace('<b>', '<b>')} and ${LIGHT_PHRASE(H)} ${verb}. It reads <span class="${cls}">${top}</span>.`;
  if (second[1] >= 30) html += ` <span class="m">(with a good share of ${second[0]})</span>`;
  if (html !== lastWhy) { $('#why').innerHTML = html; lastWhy = html; }
  // mood buttons light up when the room matches a preset
  for (const b of $$('.mood')) {
    const m = MOODS[b.dataset.m];
    b.classList.toggle('on', SLOT_KEYS.every(k => curMat(k).id === m.mats[k]) && Math.abs(hTarget - m.h) < 0.6);
  }
}

// ---------------------------------------------------------------------------------------------
// UI: moodboard slots, mood buttons, tray, daylight panel
// ---------------------------------------------------------------------------------------------
let selSlot = null, boardDirty = true;
const slotsEl = $('#slots');
for (const k of SLOT_KEYS) {
  const b = document.createElement('button'); b.className = 'slot'; b.dataset.k = k;
  b.innerHTML = `<canvas width="100" height="100"></canvas><i>${SLOTS[k].name}</i><span></span>`;
  b.onclick = () => selectSlot(selSlot === k ? null : k);
  slotsEl.appendChild(b);
}
const shownOnBoard = {};
function updateBoard() {
  if (!boardDirty) return; boardDirty = false;
  for (const k of SLOT_KEYS) {
    const m = curMat(k), el = slotsEl.querySelector(`[data-k="${k}"]`);
    if (shownOnBoard[k] === m) continue;
    const g = el.querySelector('canvas').getContext('2d'); g.clearRect(0, 0, 100, 100); g.drawImage(thumb(m), 0, 0, 100, 100);
    el.querySelector('span').textContent = m.name;
    if (shownOnBoard[k]) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    shownOnBoard[k] = m;
  }
  for (const it of $$('.it[data-id]')) it.classList.toggle('cur', SLOT_KEYS.some(k => curMat(k).id === it.dataset.id));
  repaintPrints();
}
for (const b of $$('.mood')) {
  const m = MOODS[b.dataset.m];
  b.querySelector('.pal').innerHTML = ['wallB', 'floor', 'upholstery', 'accent'].map(k => `<i style="background:${MAT[m.mats[k]].c[0]}"></i>`).join('');
  b.onclick = () => applyMood(b.dataset.m);
}
function applyMood(key) {
  const m = MOODS[key]; pushUndo();
  const origin = new THREE.Vector3(0, 0.5, R.Z1);
  let i = 0;
  for (const k of SLOT_KEYS) { const id = m.mats[k]; if (curMat(k).id !== id) { setTimeout(() => { wipeSlot(k, MAT[id], origin, now); boardDirty = true; afterChange(false); }, i * 70); i++; } }
  setTime(m.h, true);
  toast(m.name + ' · ' + fmt(m.h));
  afterChange();
}

// tray
let tab = 'wood';
const itemsEl = $('#items');
function renderTray() {
  for (const b of $$('#tabs [data-t]')) {
    b.classList.toggle('on', b.dataset.t === tab);
    b.classList.toggle('off', !!selSlot && b.dataset.t !== 'furniture' && !SLOTS[selSlot].cats.includes(b.dataset.t));
  }
  itemsEl.innerHTML = '';
  if (tab === 'furniture') {
    for (const type of PIECE_ORDER) {
      const b = document.createElement('button'); b.className = 'it fur'; b.dataset.type = type; b.title = PIECES[type].name + ' · drag it into the room';
      const cv = document.createElement('canvas'); cv.width = 176; cv.height = 132; furnitureThumb(type, cv);
      b.append(cv); b.insertAdjacentHTML('beforeend', `<span>${PIECES[type].name}</span>`);
      itemsEl.appendChild(b); bindDragSource(b, { kind: 'piece', type });
    }
  } else {
    for (const m of MATERIALS.filter(m => m.cat === tab)) {
      const b = document.createElement('button'); b.className = 'it'; b.dataset.id = m.id; b.title = m.name + ' · drag it onto a surface';
      const cv = document.createElement('canvas'); cv.width = cv.height = 112; cv.getContext('2d').drawImage(thumb(m), 0, 0);
      b.append(cv); b.insertAdjacentHTML('beforeend', `<span>${m.name}</span>`);
      b.classList.toggle('cur', SLOT_KEYS.some(k => curMat(k).id === m.id));
      itemsEl.appendChild(b); bindDragSource(b, { kind: 'sample', m });
    }
  }
}
for (const b of $$('#tabs [data-t]')) b.onclick = () => { tab = b.dataset.t; renderTray(); };
$('#for button').onclick = () => selectSlot(null);
function selectSlot(k) {
  if (selSlot) slotState[selSlot].hiT = 0;
  selSlot = k;
  for (const el of $$('.slot')) el.classList.toggle('sel', el.dataset.k === k);
  const forEl = $('#for');
  forEl.classList.toggle('on', !!k);
  if (k) {
    slotState[k].hiT = 1;
    forEl.querySelector('span').textContent = SLOTS[k].name + ': pick a sample below';
    if (!SLOTS[k].cats.includes(tab)) tab = SLOTS[k].cats[0];
    selectItem(null);
  }
  renderTray();
}

// furniture thumbnails: each piece rendered once on a transparent background, inside the main scene
// (everything else hidden) so it reuses the shaders that are already compiled
const thumbCam = new THREE.PerspectiveCamera(28, 4 / 3, 0.05, 80);
const thumbRT = new THREE.WebGLRenderTarget(176, 132, { type: THREE.HalfFloatType, samples: 4 });
const thumbBuf = new Uint16Array(176 * 132 * 4);
const furnThumbs = new Map();
const half = h => { const e = (h >> 10) & 31, m = h & 1023, sg = h >> 15 ? -1 : 1; return e === 0 ? sg * 6.1e-5 * (m / 1024) : e === 31 ? 0 : sg * 2 ** (e - 15) * (1 + m / 1024); };
const aces = x => { x *= 0.6; return Math.min(1, Math.max(0, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))); };
const enc = v => v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
function furnitureThumb(type, cv) {
  if (!furnThumbs.has(type)) {
    const g = PIECES[type].build(); g.position.set(0, 60, 0); scene.add(g); g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const r = Math.max(sz.x, sz.y * 1.2, sz.z) * 1.15, wallPiece = !!PIECES[type].wall;
    thumbCam.position.set(c.x + r * (wallPiece ? 0.25 : 0.9), c.y + r * (wallPiece ? 0.1 : 0.75), c.z + r * 1.6); thumbCam.lookAt(c);
    const hideList = scene.children.filter(o => o !== g && !o.isLight && o.visible);
    hideList.forEach(o => { o.visible = false; });
    const bg = scene.background, sp = sun.position.clone(), si = sun.intensity, sc = sun.color.clone();
    scene.background = null;   // fog stays: removing it would change every shader
    sun.position.set(-8, 30, 18).add(sun.target.position); sun.intensity = 2.2; sun.color.set('#fff4e4');
    const prev = renderer.getRenderTarget(), clr = renderer.getClearAlpha();
    renderer.setRenderTarget(thumbRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, thumbCam);
    renderer.readRenderTargetPixels(thumbRT, 0, 0, 176, 132, thumbBuf);
    renderer.setRenderTarget(prev); renderer.setClearColor(0x000000, clr);
    scene.background = bg; sun.position.copy(sp); sun.intensity = si; sun.color.copy(sc);
    hideList.forEach(o => { o.visible = true; });
    scene.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    renderer.shadowMap.needsUpdate = true;
    const out = document.createElement('canvas'); out.width = 176; out.height = 132;
    const ctx = out.getContext('2d'), img = ctx.createImageData(176, 132), exp = 1.6;
    for (let y = 0; y < 132; y++) for (let x = 0; x < 176; x++) {
      const si2 = ((131 - y) * 176 + x) * 4, di = (y * 176 + x) * 4, al = Math.min(1, Math.max(0, half(thumbBuf[si2 + 3])));
      for (let ch = 0; ch < 3; ch++) img.data[di + ch] = Math.round(255 * enc(aces((al > 0 ? half(thumbBuf[si2 + ch]) / al : 0) * exp)));
      img.data[di + 3] = Math.round(al * 255);
    }
    ctx.putImageData(img, 0, 0);
    furnThumbs.set(type, out);
  }
  cv.getContext('2d').drawImage(furnThumbs.get(type), 0, 0);
}

// daylight panel: slider, clock, preset buttons with previews of the flat at that hour
const slides = [$('#tslide'), $('#tslide2')];
for (const s of slides) {
  s.querySelector('.tr').style.background = sliderGradient();
  for (const h of [7.6, 12.8, 18.5, 22.2]) { const t = document.createElement('div'); t.className = 'tk'; t.style.left = ((h - H_MIN) / (H_MAX - H_MIN) * 100) + '%'; s.appendChild(t); }
  let dragging = false;
  const at = e => { const r = s.getBoundingClientRect(); return H_MIN + clamp((e.clientX - r.left) / r.width, 0, 1) * (H_MAX - H_MIN); };
  s.addEventListener('pointerdown', e => { dragging = true; s.setPointerCapture(e.pointerId); pushUndo(); setTime(at(e)); });
  s.addEventListener('pointermove', e => { if (dragging) setTime(at(e)); });
  s.addEventListener('pointerup', () => { dragging = false; afterChange(); });
  s.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setTime(hTarget + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 1 : 0.25), true); } });
}
for (const b of $$('.time')) b.onclick = () => { pushUndo(); setTime(+b.dataset.h, true); afterChange(); };
function setTime(h, animate = false) {
  h = clamp(h, H_MIN, H_MAX); hTarget = h;
  if (animate) hAnim = { from: H, to: h, t: 0 }; else { hAnim = null; H = h; applyDaylight(H); }
}
function updateTimeUI() {
  const t = fmt(H), pos = ((H - H_MIN) / (H_MAX - H_MIN) * 100) + '%';
  for (const s of slides) { s.querySelector('.kn').style.left = pos; s.setAttribute('aria-valuenow', H.toFixed(2)); s.setAttribute('aria-valuetext', t); }
  $('#clock').textContent = t; $('#clock2').textContent = t;
  let nearest = null, d = 9;
  for (const b of $$('.time')) { const dd = Math.abs(+b.dataset.h - hTarget); if (dd < d) { d = dd; nearest = b; } }
  for (const b of $$('.time')) b.classList.toggle('on', b === nearest && d < 1.6);
}
const previewCanvases = $$('.time .th').map(th => { const c = document.createElement('canvas'); c.width = 236; c.height = 132; th.appendChild(c); return c; });
const previewCam = new THREE.PerspectiveCamera(30, 236 / 132, 0.3, 400);
let previewsDue = 0;
// previews go through a tiny composer (render target + tone mapping), so they reuse the main view's
// compiled shaders; rendering straight to the screen would compile a second set and freeze for seconds
const PW = 236, PH = 132;
const previewComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(PW, PH, { type: THREE.HalfFloatType, samples: 2 }));
previewComposer.renderToScreen = false;
previewComposer.setPixelRatio(1); previewComposer.setSize(PW, PH);
previewComposer.addPass(new RenderPass(scene, previewCam));
previewComposer.addPass(new OutputPass());
const previewOut = new THREE.WebGLRenderTarget(PW, PH);
const previewCopy = new FullScreenQuad(new THREE.MeshBasicMaterial({ toneMapped: false }));
const previewBuf = new Uint8Array(PW * PH * 4);
// one preview per call, so a refresh is spread over four frames instead of one long pause
let previewQueue = [];
function renderPreviews() { for (let i = 0; i < 4; i++) renderPreview(i); }
function renderPreview(i) {
  const keep = H, hidden = [sunSprite, moonSprite, arcLine];
  const vis = hidden.map(o => o.visible); hidden.forEach(o => { o.visible = false; });
  previewCam.position.set(7.5, 13.5, 16); previewCam.lookAt(0.2, 0, 0.2);
  [$$('.time')[i]].forEach(b => {
    applyDaylight(+b.dataset.h);
    renderer.shadowMap.needsUpdate = true;
    previewComposer.render();
    previewCopy.material.map = previewComposer.readBuffer.texture;
    renderer.setRenderTarget(previewOut); previewCopy.render(renderer);
    renderer.readRenderTargetPixels(previewOut, 0, 0, PW, PH, previewBuf); renderer.setRenderTarget(null);
    const g = previewCanvases[i].getContext('2d'), img = g.createImageData(PW, PH);
    for (let y = 0; y < PH; y++) img.data.set(previewBuf.subarray((PH - 1 - y) * PW * 4, (PH - y) * PW * 4), y * PW * 4);
    g.putImageData(img, 0, 0);
  });
  hidden.forEach((o, i) => { o.visible = vis[i]; });
  applyDaylight(keep);
  renderer.shadowMap.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------
// pointer interaction: hover, click, orbit, drag samples, drag furniture, drag the sun
// ---------------------------------------------------------------------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), canvas = renderer.domElement;
ray.camera = camera;
const tipEl = $('#tip'), ghost = $('#ghost'), selEl = $('#sel');
const notPickable = new Set(glassLayers);
function setNdc(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); }
// what is under the cursor: { kind: 'sun' } | { kind: 'item', item, slot, point } | { kind: 'surface', slot, point } | null
function pick(x, y) {
  setNdc(x, y);
  if (notesOn && (sunSprite.visible || moonSprite.visible)) {
    const sp = sunSprite.visible ? sunSprite : moonSprite;
    const [sx, sy, sz] = toScreen(sp.position);
    if (sz < 1 && Math.hypot(sx - x, sy - y) < 26) return { kind: 'sun' };
  }
  const hits = ray.intersectObjects([flat.shell, itemsRoot], true);
  for (const h of hits) {
    const o = h.object;
    if (notPickable.has(o) || o.material?.transparent && !o.userData.slot && !o.userData.item) continue;
    const slot = o.material?.userData?.key;
    if (o.userData.item) return { kind: 'item', item: o.userData.item, slot: slot || null, point: h.point };
    if (slot) return { kind: 'surface', slot, point: h.point };
    return null;
  }
  return null;
}
function tip(html, x, y) {
  if (!html) { tipEl.classList.remove('on'); return; }
  tipEl.innerHTML = html; tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; tipEl.classList.add('on');
}
const TIP = {
  surface: p => `<b>${SLOTS[p.slot].name}: ${curMat(p.slot).name}</b>drop a sample on it, or click to pick one below`,
  item: p => `<b>${PIECES[p.item.type].name}</b>drag to move · click to turn or remove`,
  sun: () => `<b>${isNight(H) ? 'The moon' : 'The sun'} · ${fmt(H)}</b>drag it along its path`,
};

let hoverSlot = null, hoverAt = null;
function doHover() {
  if (!hoverAt || press || drag) return;
  const [x, y] = hoverAt; hoverAt = null;
  const p0 = performance.now(); const p = pick(x, y); perf.pick = Math.max(perf.pick, performance.now() - p0);
  setHoverSlot(p && (p.kind === 'surface') ? p.slot : null);
  hoverItem = p && p.kind === 'item' ? p.item : null;
  canvas.style.cursor = p ? (p.kind === 'sun' || p.kind === 'item' ? 'grab' : 'pointer') : 'default';
  tip(p ? TIP[p.kind](p) : null, x, y);
}
function setHoverSlot(k) {
  if (hoverSlot === k) return;
  if (hoverSlot && hoverSlot !== selSlot) slotState[hoverSlot].hiT = 0;
  hoverSlot = k;
  if (k && k !== selSlot) slotState[k].hiT = 0.55;
}

// orbit / pan
let press = null;   // { x, y, button, moved, hit, mode }
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (drag) return;
  canvas.setPointerCapture(e.pointerId);
  const hit = e.button === 0 ? pick(e.clientX, e.clientY) : null;
  press = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, button: e.button, moved: false, hit, mode: null };
  if (cine) setCine(false);
});
canvas.addEventListener('pointermove', e => {
  if (drag) return;
  if (!press) { hoverAt = [e.clientX, e.clientY]; return; }
  const dx = e.clientX - press.lx, dy = e.clientY - press.ly;
  press.lx = e.clientX; press.ly = e.clientY;
  if (!press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) {
    press.moved = true; tip(null);
    if (press.hit?.kind === 'sun') press.mode = 'sun';
    else if (press.hit?.kind === 'item') { press.mode = 'item'; startItemDrag(press.hit.item, e); return; }
    else press.mode = press.button === 2 || e.shiftKey ? 'pan' : 'orbit';
    if (press.mode === 'sun') pushUndo();
  }
  if (!press.moved) return;
  if (press.mode === 'orbit') { camGoal.yaw -= dx * 0.005; camGoal.pitch = clamp(camGoal.pitch + dy * 0.004, 0.08, 1.45); }
  if (press.mode === 'pan') {
    const s = camGoal.dist * 0.0011, right = new THREE.Vector3(Math.cos(camGoal.yaw), 0, -Math.sin(camGoal.yaw)), fwd = new THREE.Vector3(-Math.sin(camGoal.yaw), 0, -Math.cos(camGoal.yaw));
    camGoal.target.addScaledVector(right, -dx * s).addScaledVector(fwd, dy * s);
    clampTarget();
  }
  if (press.mode === 'sun') dragSun(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', e => {
  if (drag) return;
  const p = press; press = null;
  if (!p) return;
  if (p.mode === 'sun') afterChange();
  if (p.moved) return;
  const hit = p.hit;
  if (!hit) { selectSlot(null); selectItem(null); return; }
  if (hit.kind === 'item') { selectItem(sel === hit.item ? null : hit.item); selectSlot(null); }
  else if (hit.kind === 'surface') { lastSurfacePoint = hit.point.clone(); selectSlot(selSlot === hit.slot ? null : hit.slot); }
});
canvas.addEventListener('pointerleave', () => { if (!press) { tip(null); setHoverSlot(null); hoverItem = null; } });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (drag && drag.kind === 'move' && drag.item) { turnHeld(e.deltaY > 0 ? 1 : -1); return; }
  camGoal.dist = clamp(camGoal.dist * Math.exp(e.deltaY * 0.0011), 4, Math.max(40, HOME.dist * 1.2));
}, { passive: false });
let lastSurfacePoint = null;
function clampTarget() { camGoal.target.x = clamp(camGoal.target.x, -8, 8); camGoal.target.z = clamp(camGoal.target.z, -7, 7); }

function dragSun(x, y) {
  let best = H, bd = Infinity;
  for (let h = H_MIN; h <= H_MAX; h += 0.05) {
    const [sx, sy, sz] = toScreen(bodyPos(h, tmpV)); if (sz > 1) continue;
    const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = h; }
  }
  setTime(best);
}

// ---- selection toolbar for a piece of furniture ----
let sel = null;
function selectItem(it) {
  if (it && it !== sel) { kick(it); it.liftV += 1.2; }   // a little pop and a swing, same as picking it up
  sel = it;
  selEl.classList.toggle('on', !!it);
  if (it) $('#sel-n').textContent = PIECES[it.type].name;
}
function placeSelBar() {
  if (!sel) return;
  const P = PIECES[sel.type], top = sel.g.localToWorld(new THREE.Vector3(0, P.wall ? P.wall[1] / 2 + 0.1 : P.h + 0.15, 0));
  const [x, y] = toScreen(top);
  selEl.style.left = x + 'px'; selEl.style.top = (y - 6) + 'px';
}
function turn(it, dir) {
  const P = PIECES[it.type];
  if (P.wall) { toast("Wall pieces don't turn"); return; }
  for (let k = 1; k <= 7; k++) {
    const rot = it.rot + dir * k * Math.PI / 4;
    const [x, z] = snapFloor(it.type, it.x, it.z, rot);
    if (fits(it.type, x, z, rot, it)) { pushUndo(); it.rot = rot; it.x = x; it.z = z; it.liftV += 0.9; applyPose(it); itemsChanged(); afterChange(); return; }
  }
  toast('No room to turn it here');
}
function takeOut(it) { pushUndo(); remove(it); if (sel === it) selectItem(null); itemsChanged(); afterChange(); toast(PIECES[it.type].name + ' taken out'); }
$('#sel-rot').onclick = () => sel && turn(sel, 1);
$('#sel-del').onclick = () => sel && takeOut(sel);

// ---- dragging: samples and furniture from the tray, furniture already in the room ----
let drag = null;   // { kind: 'sample'|'piece'|'move', m?, type?, item?, el?, over3d, ok, slot, point, boardSlot, origin }
const ghostCtx = ghost.getContext('2d');
function bindDragSource(el, src) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let started = false;
    const move = ev => {
      if (!started && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 6) { started = true; beginDrag(src, el, ev); }
      if (started) dragMove(ev);
    };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      if (started) dragEnd(ev);
      else if (src.kind === 'sample') clickSample(src.m);
      else toast('Drag it into the room');
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}
function clickSample(m) {
  const slot = selSlot && SLOTS[selSlot].cats.includes(m.cat) ? selSlot : { wood: 'floor', stone: 'floor', fabric: 'upholstery', paint: 'wallB' }[m.cat];
  pushUndo();
  if (setMaterial(slot, m.id, selSlot === slot && lastSurfacePoint ? lastSurfacePoint : null)) toast(`${m.name} on the ${SLOTS[slot].name.toLowerCase()}`);
  else popUndo();
}
function beginDrag(src, el, e) {
  tip(null); selectItem(null);
  drag = { ...src, el, over3d: false, ok: false, slot: null, point: null, boardSlot: null };
  ghost.className = src.kind === 'piece' ? 'fur on' : 'on';
  ghostCtx.clearRect(0, 0, 176, 132);
  if (src.kind === 'sample') { ghost.width = ghost.height = 112; ghostCtx.drawImage(thumb(src.m), 0, 0); }
  else { ghost.width = 176; ghost.height = 132; ghostCtx.drawImage(furnThumbs.get(src.type), 0, 0); }
  el.classList.add('lift');
  if (src.kind === 'piece') pushUndo();
}
function overBoardSlot(x, y) {
  for (const el of $$('.slot')) { const r = el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.k; }
  return null;
}
const overUI = (x, y) => { const el = document.elementFromPoint(x, y); return el && el !== canvas && !el.closest('#world'); };
let dragPending = null;
function dragMove(e) { dragPending = { clientX: e.clientX, clientY: e.clientY }; }
function flushDrag() { if (dragPending && drag) { const e = dragPending; dragPending = null; dragMoveNow(e); } }
function dragMoveNow(e) {
  const x = e.clientX, y = e.clientY;
  ghost.style.transform = `translate(${x}px, ${y}px) rotate(-6deg) scale(1.08)`;
  if (drag.kind === 'sample') {
    const m = drag.m, bs = overBoardSlot(x, y);
    for (const el of $$('.slot')) el.classList.toggle('drop', el.dataset.k === bs && SLOTS[bs].cats.includes(m.cat));
    let slot = null, point = null;
    if (bs) slot = bs;
    else if (!overUI(x, y)) { const p = pick(x, y); if (p && p.slot) { slot = p.slot; point = p.point; } }
    const ok = !!slot && SLOTS[slot].cats.includes(m.cat);
    if (drag.slot && drag.slot !== slot) unpeekSlot(drag.slot);
    drag.slot = slot; drag.point = point; drag.ok = ok; drag.boardSlot = bs;
    if (ok && point) peekSlot(slot, m, point);
    if (slot && !ok) tip(`<b>${SLOTS[slot].name}</b>${CAT_NAME[m.cat]} doesn't go on the ${SLOTS[slot].name.toLowerCase()} · it takes ${SLOTS[slot].cats.map(c => CAT_NAME[c].toLowerCase()).join(' or ')}`, x, y);
    else if (ok) tip(`<b>${SLOTS[slot].name}</b>Let go to lay ${m.name.toLowerCase()} here`, x, y);
    else tip(null);
    return;
  }
  // furniture
  const inRoom = !overUI(x, y);
  ghost.classList.toggle('on', !inRoom || drag.kind === 'piece' && !drag.item);
  if (!inRoom) {
    if (drag.item) { drag.item.g.visible = false; marker.visible = false; }
    drag.ok = false;
    tip(drag.kind === 'move' ? '<b>Let go to take it out</b>' : null, x, y);
    return;
  }
  if (!drag.item) { drag.item = spawn(drag.type); drag.fresh = true; }
  const it = drag.item, P = PIECES[it.type];
  it.g.visible = true; ghost.classList.remove('on');
  setNdc(x, y);
  let ok = false;
  if (P.wall) {
    let best = null;
    wallPlanes.forEach((w, i) => {
      const plane = w.axis === 'z' ? new THREE.Plane(new THREE.Vector3(0, 0, 1), -w.at) : new THREE.Plane(new THREE.Vector3(1, 0, 0), -w.at);
      const hitP = ray.ray.intersectPlane(plane, new THREE.Vector3()); if (!hitP) return;
      const a = w.axis === 'z' ? hitP.x : hitP.z; if (a < w.a0 - 0.5 || a > w.a1 + 0.5 || hitP.y < 0 || hitP.y > R.H + 0.6) return;
      const d = hitP.distanceTo(camera.position); if (!best || d < best.d) best = { i, a: clamp(a, w.a0 + P.wall[0] / 2 + 0.03, w.a1 - P.wall[0] / 2 - 0.03), y: hitP.y, d };
    });
    if (best) {
      it.plane = best.i; it.a = Math.round(best.a * 10) / 10; it.y = clamp(Math.round(best.y * 20) / 20, P.wall[1] / 2 + 0.36, R.H - P.wall[1] / 2 - 0.09);
      ok = wallFits(it.type, it.plane, it.a, it.y, it); applyPose(it);
    }
    tip(ok ? `<b>${PIECES[it.type].name}</b>on the ${wallPlanes[it.plane]?.name || 'wall'}` : '<b>No room on this wall</b>', x, y);
  } else {
    const p = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (p) {
      const [sx, sz] = snapFloor(it.type, p.x, p.z, it.rot);
      it.x = sx; it.z = sz; ok = fits(it.type, sx, sz, it.rot, it); applyPose(it);
    }
    tip(ok ? null : '<b>No room for it here</b>', x, y);
  }
  drag.ok = ok;
  tintItem(it, ok ? null : '#FF7723');
}
// a soft footprint on the floor (or wall) under a held piece: green where it fits, orange where it doesn't
// drawn as a rounded rectangle: a bright edge line over a faint fill, sized in metres so the corners stay round on any piece
const marker = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
  uniforms: { uSize: { value: new THREE.Vector2(1, 1) }, uCol: { value: new THREE.Color('#44B977') }, uA: { value: 1 }, uFill: { value: 0.14 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec2 vUv;uniform vec2 uSize;uniform vec3 uCol;uniform float uA;uniform float uFill;'
    + 'void main(){vec2 p=(vUv-.5)*uSize;vec2 q=abs(p)-uSize*.5+.09;float d=length(max(q,0.))+min(max(q.x,q.y),0.)-.09;'
    + 'float aa=fwidth(d);float edge=1.-smoothstep(.006,.006+aa*1.5,abs(d+.025));float fill=(1.-smoothstep(-aa,0.,d))*uFill;'
    + 'gl_FragColor=vec4(uCol*1.6,(edge*.95+fill)*uA);}',
  transparent: true, depthWrite: false, toneMapped: false,
}));
const MARK_PAD = 0.16;
marker.renderOrder = 3; marker.visible = false; scene.add(marker); overlays.push(marker);
function tintItem(it, color) {
  if (!it || !it.g.visible) { marker.visible = false; return; }
  const P = PIECES[it.type];
  marker.visible = true;
  marker.material.uniforms.uCol.value.set(color || '#44B977'); marker.material.uniforms.uA.value = 1; marker.material.uniforms.uFill.value = color ? 0.26 : 0.14;
  if (P.wall) {
    const w = wallPlanes[it.plane]; if (!w) { marker.visible = false; return; }
    marker.scale.set(P.wall[0] + MARK_PAD, P.wall[1] + MARK_PAD, 1); marker.material.uniforms.uSize.value.set(marker.scale.x, marker.scale.y);
    if (w.axis === 'z') { marker.position.set(it.a, it.y, w.at + 0.01); marker.rotation.set(0, 0, 0); }
    else { marker.position.set(w.at + 0.01, it.y, it.a); marker.rotation.set(0, Math.PI / 2, 0); }
  } else {
    marker.scale.set(P.fp[0] + MARK_PAD, P.fp[1] + MARK_PAD, 1); marker.material.uniforms.uSize.value.set(marker.scale.x, marker.scale.y);
    marker.position.set(it.x, 0.02, it.z); marker.rotation.set(-Math.PI / 2, 0, it.rot);
  }
}
function dragEnd(e) {
  flushDrag();
  tip(null);
  for (const el of $$('.slot')) el.classList.remove('drop');
  ghost.className = '';
  drag.el?.classList.remove('lift');
  const d = drag; drag = null;
  if (d.kind === 'sample') {
    if (d.ok) {
      pushUndo();
      if (setMaterial(d.slot, d.m.id, d.point)) toast(`${d.m.name} on the ${SLOTS[d.slot].name.toLowerCase()}`);
      else { popUndo(); unpeekSlot(d.slot); }
    } else if (d.slot) unpeekSlot(d.slot);
    return;
  }
  const it = d.item;
  marker.visible = false;
  if (!it) { popUndo(); return; }
  if (d.ok && it.g.visible) {
    applyPose(it); itemsChanged(); afterChange();
    if (d.kind === 'piece') toast(PIECES[it.type].name + ' added');
  } else if (d.kind === 'move' && it.g.visible) {
    Object.assign(it, d.origin); applyPose(it); popUndo(); toast('No room for it there');
  } else if (d.kind === 'move') {
    remove(it); itemsChanged(); afterChange(); toast(PIECES[it.type].name + ' taken out');
  } else { remove(it); popUndo(); }
}
function startItemDrag(item, e) {
  pushUndo();
  drag = { kind: 'move', item, type: item.type, origin: { x: item.x, z: item.z, rot: item.rot, plane: item.plane, a: item.a, y: item.y }, ok: true };
  ghost.width = 176; ghost.height = 132; ghostCtx.clearRect(0, 0, 176, 132); ghostCtx.drawImage(furnitureThumbCanvas(item.type), 0, 0);
  ghost.className = 'fur';
  selectItem(null); kick(item); canvas.style.cursor = 'grabbing';
  const move = ev => dragMove(ev);
  const up = ev => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); press = null; canvas.style.cursor = 'default'; dragEnd(ev); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
  dragMoveNow(e);
}
function furnitureThumbCanvas(type) { if (!furnThumbs.has(type)) furnitureThumb(type, document.createElement('canvas')); return furnThumbs.get(type); }
function turnHeld(dir) {
  const it = drag.item; if (!it || PIECES[it.type].wall) return;
  it.rot += dir * Math.PI / 4;
  const [x, z] = snapFloor(it.type, it.x, it.z, it.rot); it.x = x; it.z = z;
  drag.ok = fits(it.type, x, z, it.rot, it); applyPose(it); tintItem(it, drag.ok ? null : '#FF7723');
}

// ---------------------------------------------------------------------------------------------
// undo / redo, links, saving, toasts
// ---------------------------------------------------------------------------------------------
const TYPE_LIST = Object.keys(PIECES);
function snapshot() {
  return {
    m: SLOT_KEYS.map(k => curMat(k).id),
    h: Math.round(hTarget * 100) / 100,
    i: items.map(it => PIECES[it.type].wall ? [TYPE_LIST.indexOf(it.type), 'w', it.plane, +it.a.toFixed(2), +it.y.toFixed(2)] : [TYPE_LIST.indexOf(it.type), +it.x.toFixed(2), +it.z.toFixed(2), Math.round(it.rot / (Math.PI / 4))]),
  };
}
function restore(s, animate = true) {
  SLOT_KEYS.forEach((k, i) => { const m = MAT[s.m[i]]; if (m && curMat(k) !== m) { if (animate) wipeSlot(k, m, anchorFor(k), now); else setSlotNow(k, m); } });
  for (const it of [...items]) remove(it);
  for (const row of s.i) {
    const type = TYPE_LIST[row[0]]; if (!type) continue;
    const it = spawn(type);
    if (row[1] === 'w') { it.plane = row[2]; it.a = row[3]; it.y = row[4]; } else { it.x = row[1]; it.z = row[2]; it.rot = row[3] * Math.PI / 4; }
    applyPose(it);
  }
  setTime(s.h, animate);
  selectItem(null); boardDirty = true; itemsChanged();
}
const undo = [], redo = [];
let undoMark = null;
function pushUndo() { undo.push(JSON.stringify(snapshot())); if (undo.length > 80) undo.shift(); redo.length = 0; syncUndo(); }
function popUndo() { undo.pop(); syncUndo(); }
function syncUndo() { $('#undo').disabled = !undo.length; $('#redo').disabled = !redo.length; }
function step(dir) {
  const from = dir < 0 ? undo : redo, to = dir < 0 ? redo : undo;
  if (!from.length) return;
  to.push(JSON.stringify(snapshot()));
  restore(JSON.parse(from.pop()));
  syncUndo(); afterChange(); toast(dir < 0 ? 'Undone' : 'Redone');
}
$('#undo').onclick = () => step(-1);
$('#redo').onclick = () => step(1);

const b64 = { enc: s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))) };
let hashTimer = 0;
function writeHash() { clearTimeout(hashTimer); hashTimer = setTimeout(() => history.replaceState(null, '', '#r=' + b64.enc(JSON.stringify(snapshot()))), 400); }
const shareUrl = () => location.origin + location.pathname + '#r=' + b64.enc(JSON.stringify(snapshot()));
$('#link').onclick = async () => { try { await navigator.clipboard.writeText(shareUrl()); toast('Link to this room copied'); } catch { toast("Couldn't copy the link"); } };

let toastTimer = 0;
function toast(msg) { const el = $('#ui-hint'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1700); }

$('#save').onclick = () => {
  composer.render();
  const shot = renderer.domElement, W = 1800, Hh = 1000, out = document.createElement('canvas'); out.width = W; out.height = Hh;
  const g = out.getContext('2d');
  g.fillStyle = '#EEE9D6'; g.fillRect(0, 0, W, Hh);
  const sw = W - 560, sh = Hh, ar = shot.width / shot.height;
  let cw = shot.width, ch = shot.width / (sw / sh); if (ch > shot.height) { ch = shot.height; cw = ch * (sw / sh); }
  g.drawImage(shot, (shot.width - cw) / 2, (shot.height - ch) / 2, cw, ch, 560, 0, sw, sh);
  const grd = g.createLinearGradient(560, 0, 760, 0); grd.addColorStop(0, '#EEE9D6'); grd.addColorStop(1, 'rgba(238,233,214,0)'); g.fillStyle = grd; g.fillRect(560, 0, 200, Hh);
  g.fillStyle = '#1A1205'; g.font = 'italic 800 34px Newsreader, serif'; g.fillText('Playable', 56, 92);
  g.fillStyle = '#2D7A4F'; g.font = '800 60px Montserrat, sans-serif'; g.fillText('SPACES', 52, 150);
  const { pct } = reading(), top = Object.entries(pct).sort((a, b) => b[1] - a[1])[0][0];
  g.fillStyle = '#4A4030'; g.font = '500 20px Inter, sans-serif'; g.fillText(`${pct.cozy}% cozy · ${pct.bright}% bright · ${pct.moody}% moody · ${fmt(H)}`, 56, 196);
  SLOT_KEYS.forEach((k, i) => {
    const m = curMat(k), cx = 56 + (i % 3) * 150, cy = 250 + Math.floor(i / 3) * 230;
    g.save(); g.beginPath(); g.roundRect(cx, cy, 120, 120, 16); g.clip(); g.drawImage(thumb(m), cx, cy, 120, 120); g.restore();
    g.fillStyle = '#7A6F58'; g.font = '700 12px Inter, sans-serif'; g.fillText(SLOTS[k].name.toUpperCase(), cx, cy + 148);
    g.fillStyle = '#1A1205'; g.font = '600 19px Inter, sans-serif'; g.fillText(m.name, cx, cy + 174);
  });
  out.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `moodboard-${top}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast('Moodboard saved'); }, 'image/png');
};

$('#notes').onclick = () => setNotes(!notesOn, true);
$('#cine').onclick = () => setCine(!cine);
$('#how').onclick = () => $('#info').showModal();
$('#close').onclick = () => $('#info').close();
$('#info').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

// ---------------------------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------------------------
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  if ($('#info').open) return;
  const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); step(e.shiftKey ? 1 : -1); return; }
  if ((e.metaKey || e.ctrlKey) && k === 'y') { e.preventDefault(); step(1); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (k === '1' || k === '2' || k === '3') applyMood(['cozy', 'bright', 'moody'][+k - 1]);
  else if (k === '[' || k === ']') { pushUndo(); setTime(hTarget + (k === '[' ? -0.5 : 0.5), true); afterChange(); }
  else if ((k === ',' || k === '.') && sel) turn(sel, k === ',' ? -1 : 1);
  else if ((k === 'delete' || k === 'backspace') && sel) { e.preventDefault(); takeOut(sel); }
  else if (k === 'n' && e.shiftKey) setNotes(!notesOn, true);
  else if (k === 'c') setCine(!cine);
  else if (k === 'r') { resetView(); setCine(false); }
  else if (k === 'escape') { selectItem(null); selectSlot(null); }
  else if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
function tickKeys(dt) {
  if (!keys.size) return;
  if (cine) setCine(false);
  const sp = camGoal.dist * 0.45 * dt, f = new THREE.Vector3(-Math.sin(camGoal.yaw), 0, -Math.cos(camGoal.yaw)), r = new THREE.Vector3(Math.cos(camGoal.yaw), 0, -Math.sin(camGoal.yaw));
  if (keys.has('w') || keys.has('arrowup')) camGoal.target.addScaledVector(f, sp);
  if (keys.has('s') || keys.has('arrowdown')) camGoal.target.addScaledVector(f, -sp);
  if (keys.has('a') || keys.has('arrowleft')) camGoal.target.addScaledVector(r, -sp);
  if (keys.has('d') || keys.has('arrowright')) camGoal.target.addScaledVector(r, sp);
  if (keys.has('q')) camGoal.yaw += dt * 1.1;
  if (keys.has('e')) camGoal.yaw -= dt * 1.1;
  clampTarget();
}

// ---------------------------------------------------------------------------------------------
// change bookkeeping and the loop
// ---------------------------------------------------------------------------------------------
function itemsChanged() { renderer.shadowMap.needsUpdate = true; syncLamps(); }
function afterChange(previews = true) {
  updateMeter(); writeHash();
  if (previews) previewsDue = performance.now() + 700;
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const wasHome = Math.abs(camGoal.dist - HOME.dist) < 0.5; HOME.dist = homeDist(); if (wasHome && !cine) camGoal.dist = HOME.dist;
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});

// first state: from the link if there is one, otherwise the cozy room
for (const k of SLOT_KEYS) setSlotNow(k, MAT[MOODS.cozy.mats[k]]);
placeLayout(LAYOUT);
let fromLink = null;
try { const m = location.hash.match(/r=([\w-]+)/); if (m) fromLink = JSON.parse(b64.dec(m[1])); } catch { fromLink = null; }
if (fromLink && fromLink.m && fromLink.i) restore(fromLink, false); else setTime(MOODS.cozy.h);
try { if (localStorage.getItem('mood-notes') === '0') setNotes(false); } catch {}
applyDaylight(H);
renderTray(); updateBoard(); updateMeter(); syncUndo();
// compile every shader in the background (parallel compile) before showing the room, so nothing freezes later
renderer.shadowMap.needsUpdate = true;
// (compiled against the composer's render target: the screen would need a different, unused variant)
$('#loading').textContent = 'Preparing the materials…';
renderer.setRenderTarget(composer.renderTarget1);
try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn(e); }
renderer.setRenderTarget(null);
// warm the rest (shadow, AO and bloom passes, previews) while the loading line is still up
await new Promise(r => setTimeout(r, 30));
const say = async t => { $('#loading').textContent = t; await new Promise(r => setTimeout(r, 30)); };
await say('Lighting the room…');
composer.render(0.016);
await say('Setting the daylight…');
renderPreviews(); previewsDue = 0;
await say('Unpacking the furniture…');
for (const type of PIECE_ORDER) furnitureThumbCanvas(type);   // the Furniture tab opens instantly
$('#loading').remove();
previewsDue = performance.now() + 600;

// render on demand: input, animations, camera easing and changes wake the loop; an idle room costs nothing
let wake = 3;
const request = (n = 3) => { wake = Math.max(wake, n); };
for (const t of ['pointermove', 'pointerdown', 'pointerup', 'wheel', 'keydown', 'resize']) addEventListener(t, () => request(), { capture: true, passive: true });
const camMoving = () => cam.target.distanceToSquared(camGoal.target) > 1e-6 || Math.abs(cam.yaw - camGoal.yaw) > 1e-4 || Math.abs(cam.pitch - camGoal.pitch) > 1e-4 || Math.abs(cam.dist - camGoal.dist) > 1e-3;
const clock = new THREE.Clock();
const perf = { n: 0, work: 0, pick: 0, gap: 0, last: 0 };
renderer.setAnimationLoop(() => {
  const f0 = performance.now(); if (perf.last) perf.gap = Math.max(perf.gap, f0 - perf.last); perf.last = f0;
  const dt = Math.min(clock.getDelta(), 0.05);
  now += dt; shared.time.value = now;
  if (hAnim) {
    hAnim.t = Math.min(1, hAnim.t + dt / 1.3); H = lerp(hAnim.from, hAnim.to, easeInOut(hAnim.t)); applyDaylight(H);
    if (hAnim.t >= 1) { hAnim = null; afterChange(); }
  }
  const wiping = tickSlots(dt);
  if (wiping) boardDirty = true;
  doHover(); flushDrag();
  if (drag && drag.item) syncLamps();
  const floating = animateFloat(dt);
  const active = floating || hAnim || wiping || keys.size || cine || drag || press || camMoving() || renderer.shadowMap.needsUpdate || previewQueue.length > 0 || (previewsDue && performance.now() > previewsDue);
  if (active) request(2);
  if (wake <= 0) return;
  wake--;
  tickKeys(dt); tickCine(dt); updateCamera(dt);
  placeBodies(); updateBoard(); updateTimeUI();
  if (previewsDue && performance.now() > previewsDue && !drag && !press) { previewsDue = 0; previewQueue = [0, 1, 2, 3]; }
  if (previewQueue.length && !drag && !press && !hAnim && !wiping) { renderPreview(previewQueue.shift()); request(1); }
  composer.render(dt);
  updateCards(); placeSelBar();
  perf.n++; perf.work += performance.now() - f0;
});

// exposed for debugging in the console
window.__mood = { perf, animateFloat, scene, camera, items, setTime, applyMood, snapshot, cam, camGoal, renderer, composer, applyDaylight, updateCamera, renderPreviews };
// dev: render one frame and post it to the local server as _shots/<name>.png
window.__shot = async (name = 'shot', steps = 1) => {
  if (hAnim) { H = hAnim.to; hAnim = null; applyDaylight(H); }
  placeBodies(); updateMeter(); updateBoard(); updateTimeUI();
  for (let i = 0; i < steps; i++) { tickSlots(0.05); updateCamera(1); composer.render(0.016); }
  updateCards();
  const url = renderer.domElement.toDataURL('image/png');
  await fetch('/__shot?name=' + name, { method: 'POST', body: url });
  return 'saved ' + name;
};
