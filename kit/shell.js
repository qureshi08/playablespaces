// The shell of a room, built from its config (rooms/<id>/room.js): plinth, floor, walls with windows and doors,
// partitions, an optional slat wall, curtains, a doormat at the entrance.
// Units are metres. x runs left to right, z runs back (-) to front (+), y is up. Floor top is y = 0.
// Walls are named by side: left (x = x0), right (x = x1), back (z = z0), front (z = z1).
import * as THREE from 'three';
import { slotMats, slotState, boxUV } from './materials.js';
import { std, metal, glow, batch, rng, canvasTex, BLACK_METAL } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// filled from the room config by buildRoom(); K and TOP are the studio floor and the underside of the plinth slab
export const R = { X0: 0, X1: 0, Z0: 0, Z1: 0, H: 2.75, K: -3.1, TOP: -0.42 };

export const CAP = std('#d8d2c8', { roughness: 0.72 });
const OUTER = std('#222731', { roughness: 0.7 });
const POST = std('#2d333e', { roughness: 0.6, envMapIntensity: 0.7 });
const SKIRT = std('#ece7df', { roughness: 0.55 });

// glass: a faint additive reflection pane plus a very light tint
export const glassLayers = [];
const GLASS_REFL = new THREE.MeshBasicMaterial({ color: '#000000', reflectivity: 0.14, combine: THREE.AddOperation, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const GLASS_TINT = new THREE.MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide });

export const obstacles = [];   // [x0, z0, x1, z1] rectangles furniture cannot enter
export const wallPlanes = [];  // surfaces wall items can hang on
export const roomLights = [];  // [x, y, z, colour, intensity, distance] warm strips etc.

// box faces come in the order +x, -x, +y, -y, +z, -z; for each side: which face points into the room,
// which points out, and which close the low and high ends of a run
const FACE = {
  left: { inner: 0, outer: 1, lo: 5, hi: 4 },
  right: { inner: 1, outer: 0, lo: 5, hi: 4 },
  back: { inner: 4, outer: 5, lo: 1, hi: 0 },
  front: { inner: 5, outer: 4, lo: 1, hi: 0 },
};
const ALONG_Z = { left: true, right: true, back: false, front: false };
// the side wall that meets each end of a wall
const NEXT = { left: ['back', 'front'], right: ['back', 'front'], back: ['left', 'right'], front: ['left', 'right'] };

export function buildRoom(scene, env, cfg) {
  const S = cfg.shell;
  const X0 = S.x0, X1 = S.x1, Z0 = S.z0, Z1 = S.z1, H = S.height, T = S.thick, LOW = S.low;
  Object.assign(R, { X0, X1, Z0, Z1, H });
  GLASS_REFL.envMap = env;
  const root = new THREE.Group(); root.name = 'flat';
  const shell = new THREE.Group(); root.add(shell);
  const walls = Object.fromEntries(S.walls.map(w => [w.side, w]));
  const tall = side => !!walls[side]?.tall;

  // world position of a point on a wall: u runs along it, n is the distance in from its inner face
  const inner = { left: X0, right: X1, back: Z0, front: Z1 };
  const inward = { left: 1, right: -1, back: 1, front: -1 };
  const at = (side, u, n) => {
    const p = inner[side] + inward[side] * n;
    return ALONG_Z[side] ? [p, u] : [u, p];
  };
  // a box on a wall: centre (u, y, n), size along, high, deep
  const wbox = (b, mat, side, u, y, n, along, high, deep, o) => {
    const [x, z] = at(side, u, n);
    return ALONG_Z[side] ? b.box(mat, x, y, z, deep, high, along, o) : b.box(mat, x, y, z, along, high, deep, o);
  };

  // ---- plinth --------------------------------------------------------------------------------
  {
    const b = batch();
    const ex0 = X0 - T - 0.5, ex1 = X1 + T + 0.45, ez0 = Z0 - T - 0.5, ez1 = Z1 + T + 0.45;
    const cx = (ex0 + ex1) / 2, cz = (ez0 + ez1) / 2, w = ex1 - ex0, d = ez1 - ez0;
    b.box(POST, cx, (R.TOP - 0.05) / 2, cz, w, -0.05 - R.TOP, d, { r: 0.02 });
    b.box(std('#c9c3b9', { roughness: 0.62 }), cx, -0.04, cz, w + 0.02, 0.03, d + 0.02, { r: 0.012 });
    const inset = 0.34;
    b.box(metal('#23272e', { roughness: 0.42, metalness: 0.7 }), cx, (R.K + R.TOP) / 2, cz, w - inset * 2, R.TOP - R.K, d - inset * 2, { r: 0.05 });
    b.box(metal('#434a55', { roughness: 0.36 }), cx, R.K + 0.06, cz, w - inset * 2 + 0.16, 0.12, d - inset * 2 + 0.16, { r: 0.04 });
    b.flush(root);
    // warm LED lines under the slab and along the foot
    const led = glow('#ffb468', 3.4), led2 = glow('#ffae5c', 1.5);
    const y = R.TOP - 0.012, a = 0.07;
    for (const [x, z, sx, sz] of [[cx, ez1 - a, w - 0.2, 0.03], [cx, ez0 + a, w - 0.2, 0.03], [ex0 + a, cz, 0.03, d - 0.2], [ex1 - a, cz, 0.03, d - 0.2]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.02, sz), led); m.position.set(x, y, z); root.add(m);
    }
    for (const [x, z, sx, sz] of [[cx, ez1 - inset + 0.09, w - inset * 2 + 0.1, 0.02], [ex1 - inset + 0.09, cz, 0.02, d - inset * 2 + 0.1]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.02, sz), led2); m.position.set(x, R.K + 0.125, z); root.add(m);
    }
    // a name plate on the front of the plinth
    const text = cfg.plinth?.label ?? 'PLAYABLE SPACES';
    const drawPlate = (g, W, Hh) => {
      g.clearRect(0, 0, W, Hh); g.fillStyle = '#c8b28f'; g.font = '800 140px Montserrat, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 0.85; g.fillText(text, W / 2, Hh / 2 + 6);
    };
    const label = canvasTex(2048, 256, drawPlate);
    // the canvas draws before the web font arrives; redraw once it has
    document.fonts.load('800 140px Montserrat').then(() => { const c = label.image; drawPlate(c.getContext('2d'), c.width, c.height); label.needsUpdate = true; });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.52), new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.5, metalness: 0.4, emissive: '#3a2a14', emissiveMap: label, emissiveIntensity: 0.6 }));
    plate.position.set(cx - 1.6, -1.05, ez1 - inset + 0.004); root.add(plate);
    for (const f of [-0.38, 0, 0.38]) roomLights.push([cx + w * f, R.TOP - 0.6, ez1 - 0.3, '#ffb05e', 3, 0.9]);
    for (const f of [-0.3, 0.13]) roomLights.push([ex1 - 0.3, R.TOP - 0.6, cz + d * f, '#ffb05e', 3, 0.9]);
  }

  // ---- floor ---------------------------------------------------------------------------------
  const floorGeo = boxUV(new THREE.BoxGeometry(X1 - X0, 0.03, Z1 - Z0).translate((X0 + X1) / 2, -0.015, (Z0 + Z1) / 2));
  const floor = new THREE.Mesh(floorGeo, slotMats.floor);
  floor.receiveShadow = true; floor.userData.slot = 'floor';
  shell.add(floor); slotState.floor.meshes.push(floor);

  // ---- walls: boxes whose faces carry different materials ------------------------------------
  const byMat = new Map(), matSlot = new Map();
  function addBox(x0, x1, y0, y1, z0, z1, faces) {
    if (y0 === 0) y0 = -0.026;
    const g = boxUV(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    for (const grp of g.groups) {
      const m = faces[grp.materialIndex], part = new THREE.BufferGeometry();
      for (const a of ['position', 'normal', 'uv']) {
        const at = g.attributes[a];
        part.setAttribute(a, new THREE.BufferAttribute(at.array.slice(grp.start * at.itemSize, (grp.start + grp.count) * at.itemSize), at.itemSize));
      }
      if (!byMat.has(m)) byMat.set(m, []);
      byMat.get(m).push(part);
    }
  }
  const SPAN = { left: [Z0, Z1], right: [Z0, Z1], back: [X0 - T, X1 + T], front: [X0 - T, X1 + T] };
  // one piece of a wall: along u0..u1, height y0..y1, with a material per face role
  function wallPiece(side, u0, u1, y0, y1, roles) {
    const f = FACE[side], faces = new Array(6).fill(CAP);
    faces[f.inner] = roles.inner; faces[f.outer] = roles.outer; faces[f.lo] = roles.lo; faces[f.hi] = roles.hi;
    faces[2] = roles.top ?? CAP; faces[3] = roles.bottom ?? CAP;
    const p0 = inner[side] - inward[side] * T, p1 = inner[side];
    const [a, b] = p0 < p1 ? [p0, p1] : [p1, p0];
    if (ALONG_Z[side]) addBox(a, b, y0, y1, u0, u1, faces); else addBox(u0, u1, y0, y1, a, b, faces);
  }
  for (const w of S.walls) {
    const side = w.side, SL = slotMats[w.slot], top = w.tall ? H : LOW;
    matSlot.set(SL, w.slot);
    // a wall's end at a corner: hidden behind a tall neighbour, capped next to a low one, dark on a low wall
    const endMat = i => (!w.tall ? OUTER : tall(NEXT[side][i]) ? SL : CAP);
    const opens = [...(w.windows || []).map(o => ({ ...o, kind: 'window' })), ...(w.doors || []).map(o => ({ ...o, kind: 'door' }))].sort((a, b) => a.from - b.from);
    let cur = SPAN[side][0];
    opens.forEach(o => {
      wallPiece(side, cur, o.from, 0, top, { inner: SL, outer: OUTER, lo: cur === SPAN[side][0] ? endMat(0) : SL, hi: SL });
      if (o.kind === 'window') {
        wallPiece(side, o.from, o.to, 0, o.y0, { inner: SL, outer: OUTER, lo: SL, hi: SL, top: SL });
        wallPiece(side, o.from, o.to, o.y1, top, { inner: SL, outer: OUTER, lo: SL, hi: SL, bottom: SL });
      } else if (w.tall) {
        wallPiece(side, o.from, o.to, o.h ?? 2.1, top, { inner: SL, outer: OUTER, lo: SL, hi: SL, bottom: SL });
      }
      cur = o.to;
    });
    wallPiece(side, cur, SPAN[side][1], 0, top, { inner: SL, outer: OUTER, lo: opens.length ? SL : endMat(0), hi: endMat(1) });
  }

  // partitions: a run along z at a fixed x, or along x at a fixed z, with door gaps
  const P = S.partitions || { list: [] }, PH = P.height, PT = P.thick;
  for (const p of P.list) {
    const SL = slotMats[p.slot || 'wallB']; matSlot.set(SL, p.slot || 'wallB');
    const alongZ = typeof p.x === 'number', c = alongZ ? p.x : p.z, [a0, a1] = alongZ ? p.z : p.x;
    const faces = [SL, SL, CAP, CAP, SL, SL];
    let cur = a0;
    for (const [d0, d1] of [...(p.doors || []), [a1, a1]]) {
      if (d0 > cur) {
        if (alongZ) { addBox(c - PT / 2, c + PT / 2, 0, PH, cur, d0, faces); obstacles.push([c - PT / 2, cur, c + PT / 2, d0]); }
        else { addBox(cur, d0, 0, PH, c - PT / 2, c + PT / 2, faces); obstacles.push([cur, c - PT / 2, d0, c + PT / 2]); }
      }
      cur = d1;
    }
  }
  for (const [m, list] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(list), m);
    mesh.castShadow = mesh.receiveShadow = true;
    shell.add(mesh);
    const slot = matSlot.get(m);
    if (slot) { mesh.userData.slot = slot; slotState[slot].meshes.push(mesh); }
  }

  // collision: the outer walls
  const e = 0.001;
  obstacles.push([X0 - 1, Z0 - 1, X0 + e, Z1 + 1], [X1 - e, Z0 - 1, X1 + 1, Z1 + 1], [X0 - 1, Z0 - 1, X1 + 1, Z0 + e], [X0 - 1, Z1 - e, X1 + 1, Z1 + 1]);
  // walls that can carry shelves and prints, listed in the config so share links keep their plane numbers
  for (const h of S.hang) {
    if (h.side !== 'left' && h.side !== 'back') throw new Error('hang planes are supported on the left and back walls');
    wallPlanes.push({ axis: h.side === 'left' ? 'x' : 'z', at: inner[h.side] + (h.inset || 0), n: 1, a0: h.from, a1: h.to, name: h.name });
  }

  // ---- details: corner posts, skirting, window frames, rods, curtains ------------------------
  {
    const b = batch();
    // a post where a tall wall stops next to a low one
    const CORNER = { 'left0': 'BL', 'left1': 'FL', 'right0': 'BR', 'right1': 'FR', 'back0': 'BL', 'back1': 'BR', 'front0': 'FL', 'front1': 'FR' };
    const CXZ = { BL: [X0 - T / 2, Z0 - T / 2], BR: [X1 + T / 2, Z0 - T / 2], FL: [X0 - T / 2, Z1 + T / 2], FR: [X1 + T / 2, Z1 + T / 2] };
    const posts = new Set();
    for (const w of S.walls) if (w.tall) [0, 1].forEach(i => { if (!tall(NEXT[w.side][i])) posts.add(CORNER[w.side + i]); });
    for (const c of posts) {
      const [x, z] = CXZ[c];
      b.box(POST, x, (H + 0.14) / 2, z, T + 0.26, H + 0.14, T + 0.26, { r: 0.02 }).box(CAP, x, H + 0.15, z, T + 0.26, 0.02, T + 0.26);
    }
    // skirting along tall walls, broken at floor-level windows, doors, the slat wall and partitions
    for (const w of S.walls) if (w.tall) {
      const side = w.side, gaps = [];
      for (const o of w.windows || []) if (o.y0 < 0.2) gaps.push([o.from, o.to]);
      for (const o of w.doors || []) gaps.push([o.from, o.to]);
      if (S.slatWall?.side === side) gaps.push([S.slatWall.from, S.slatWall.to]);
      for (const p of P.list) {
        const alongZ = typeof p.x === 'number', ends = alongZ ? p.z : p.x;
        const touches = alongZ ? (side === 'back' && ends[0] <= Z0) || (side === 'front' && ends[1] >= Z1) : (side === 'left' && ends[0] <= X0) || (side === 'right' && ends[1] >= X1);
        if (touches) gaps.push([(alongZ ? p.x : p.z) - PT / 2, (alongZ ? p.x : p.z) + PT / 2]);
      }
      gaps.sort((a, b) => a[0] - b[0]);
      let cur = ALONG_Z[side] ? Z0 : X0;
      const end = ALONG_Z[side] ? Z1 : X1;
      for (const [g0, g1] of [...gaps, [end, end]]) {
        if (g0 - cur > 0.05) wbox(b, SKIRT, side, (cur + g0) / 2, 0.045, 0.008, g0 - cur, 0.09, 0.016);
        cur = Math.max(cur, g1);
      }
    }
    // window frames, sills, rods and curtains
    const f = 0.035;
    for (const w of S.walls) for (const o of w.windows || []) {
      const side = w.side, len = o.to - o.from, hgt = o.y1 - o.y0, um = (o.from + o.to) / 2, ym = (o.y0 + o.y1) / 2, nm = -T / 2;
      wbox(b, BLACK_METAL, side, o.from + f / 2, ym, nm, f, hgt, 0.06); wbox(b, BLACK_METAL, side, o.to - f / 2, ym, nm, f, hgt, 0.06);
      wbox(b, BLACK_METAL, side, um, o.y0 + f / 2, nm, len, f, 0.06); wbox(b, BLACK_METAL, side, um, o.y1 - f / 2, nm, len, f, 0.06);
      const n = o.mullions || 0;
      for (let i = 1; i <= n; i++) wbox(b, BLACK_METAL, side, o.from + len * i / (n + 1), ym, nm, 0.024, hgt, 0.05);
      if (o.transom) wbox(b, BLACK_METAL, side, um, o.y0 + hgt * o.transom, nm, len, 0.022, 0.05);
      wbox(b, CAP, side, um, o.y0 - 0.015, 0.03, len + 0.1, 0.03, 0.1 + T * 0.5);
      const rodY = Math.min(o.y1 + 0.16, H - 0.15), [rx, rz] = at(side, um, 0.1);
      b.cyl(BLACK_METAL, rx, rodY, rz, 0.009, 0.009, len + 0.9, ALONG_Z[side] ? { rx: Math.PI / 2, seg: 8 } : { rz: Math.PI / 2, seg: 8 });
      const [px, pz] = at(side, um, nm);
      pane(shell, len - 0.05, hgt - 0.05, px, ym, pz, ALONG_Z[side] ? Math.PI / 2 : 0);
      (o.curtains || []).forEach((c, i) => {
        const [cx, cz] = at(side, c === 'start' ? o.from - 0.02 : o.to + 0.02, 0.1);
        curtain(shell, 0.55, rodY - 0.08, cx, cz, ALONG_Z[side] ? Math.PI / 2 : 0, 9 + i, i * 1.2);
      });
    }
    b.flush(shell);
  }

  // ---- slat wall: vertical battens on a dark backing ------------------------------------------
  if (S.slatWall) {
    const { side, from, to } = S.slatWall, alongZ = ALONG_Z[side];
    const u0 = from + 0.005, u1 = to, d = 0.045, w = 0.034, pitch = 0.068, n = Math.floor((u1 - u0) / pitch), r = rng(11), parts = [];
    const [bx, bz] = at(side, (u0 + u1) / 2, 0.006);
    const back = new THREE.Mesh(alongZ ? new THREE.BoxGeometry(0.012, H, u1 - u0) : new THREE.BoxGeometry(u1 - u0, H, 0.012), std('#1b1c20', { roughness: 1 }));
    back.position.set(bx, H / 2, bz); back.receiveShadow = true; shell.add(back);
    for (let i = 0; i < n; i++) {
      const u = u0 + pitch * (i + 0.5) + (u1 - u0 - n * pitch) / 2;
      const g = (alongZ ? new THREE.BoxGeometry(w, H - 0.004, d) : new THREE.BoxGeometry(d, H - 0.004, w)).toNonIndexed();
      const p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv, oy = r() * 6, oz = r() * 0.4;
      for (let k = 0; k < p.count; k++) {
        const across = Math.abs(alongZ ? nn.getX(k) : nn.getZ(k)) > 0.5 ? (alongZ ? p.getZ(k) : p.getX(k)) : (alongZ ? p.getX(k) : p.getZ(k));
        uv.setXY(k, p.getY(k) + H / 2 + oy, across + oz);
      }
      const [x, z] = at(side, u, 0.012 + w / 2);
      g.translate(x, H / 2, z); parts.push(g);
    }
    const slats = new THREE.Mesh(mergeGeometries(parts), slotMats.slats);
    slats.castShadow = slats.receiveShadow = true; slats.userData.slot = 'slats';
    shell.add(slats); slotState.slats.meshes.push(slats);
  }

  // ---- doormat inside each door that asks for one --------------------------------------------
  for (const w of S.walls) for (const o of w.doors || []) if (o.mat) {
    const t = canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#8c7458'; g.fillRect(0, 0, w, h); const r = rng(61);
      for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = `rgba(${v > 0.5 ? 60 : 210},${v > 0.5 ? 44 : 180},${v > 0.5 ? 28 : 130},${0.08 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 3 + r() * 5); }
      g.strokeStyle = '#4f3f2e'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    });
    const mat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.018, 0.62), std('#ffffff', { map: t, roughness: 0.95 }));
    const [x, z] = at(w.side, (o.from + o.to) / 2, 0.42);
    mat.position.set(x, 0.009, z); if (ALONG_Z[w.side]) mat.rotation.y = Math.PI / 2;
    mat.receiveShadow = true; shell.add(mat);
  }

  scene.add(root);
  return { root, shell, floor };
}

function pane(parent, w, h, x, y, z, ry) {
  const g = new THREE.PlaneGeometry(w, h);
  for (const m of [GLASS_REFL, GLASS_TINT]) {
    const p = new THREE.Mesh(g, m); p.position.set(x, y, z); p.rotation.y = ry; p.renderOrder = 2;
    parent.add(p); glassLayers.push(p);
  }
}

const SHEER = std('#f1ece2', { roughness: 0.9, transparent: true, opacity: 0.86, side: THREE.DoubleSide, envMapIntensity: 0.4 });
function curtain(parent, w, h, x, z, ry, folds = 9, phase = 1) {
  const g = new THREE.PlaneGeometry(w, h, 40, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const f = p.getX(i) / w + 0.5; p.setZ(i, Math.sin(f * Math.PI * folds + phase) * 0.028 * (0.6 + 0.4 * f)); }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, SHEER); m.rotation.y = ry; m.position.set(x, h / 2 + 0.04, z);
  m.castShadow = true; parent.add(m);
  return m;
}
