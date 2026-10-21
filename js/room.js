// The flat: plinth, floor, walls with windows, partitions, slat wall, curtains, doormat.
// Units are metres. x runs left to right, z runs back (-) to front (+), y is up. Floor top is y = 0.
import * as THREE from 'three';
import { slotMats, slotState, boxUV } from './materials.js';
import { std, metal, glow, batch, rng, canvasTex, BLACK_METAL } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const R = {
  X0: -5.3, X1: 5.3, Z0: -3.7, Z1: 3.7, H: 2.75, T: 0.18, LOW: 0.45, PH: 1.3, PT: 0.12,
  winL: { z0: 1.3, z1: 2.8, y0: 0.55, y1: 2.4 },     // dining window, left wall
  winB: { x0: -2.35, x1: 0.75, y0: 0.1, y1: 2.5 },  // big window, back wall
  partA: 1.45, doorA: { z0: 1.6, z1: 2.5 },         // partition between living and the right rooms
  partB: 0.95, doorB: { x0: 2.1, x1: 3.0 },         // partition between bedroom and study
  door: { x0: -1.25, x1: -0.2 },                    // entrance gap in the low front wall
  slatsZ1: -2,                                      // slat wall runs from the back corner to here
  K: -3.1,                                          // studio floor
  TOP: -0.42,                                       // underside of the plinth slab
};

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

export function buildRoom(scene, env) {
  GLASS_REFL.envMap = env;
  const root = new THREE.Group(); root.name = 'flat';
  const shell = new THREE.Group(); root.add(shell);
  const { X0, X1, Z0, Z1, H, T, LOW, PH, PT } = R;

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
    const label = canvasTex(2048, 256, (g, W, Hh) => {
      g.clearRect(0, 0, W, Hh); g.fillStyle = '#c8b28f'; g.font = '700 150px Outfit, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.globalAlpha = 0.85; g.fillText('PLAYABLE ROOM', W / 2, Hh / 2 + 6);
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.52), new THREE.MeshStandardMaterial({ map: label, transparent: true, roughness: 0.5, metalness: 0.4, emissive: '#3a2a14', emissiveMap: label, emissiveIntensity: 0.6 }));
    plate.position.set(-1.6, -1.05, ez1 - inset + 0.004); plate.rotation.x = 0; root.add(plate);
    for (const [x, z] of [[-4, ez1 - 0.3], [0, ez1 - 0.3], [4, ez1 - 0.3], [ex1 - 0.3, -2.5], [ex1 - 0.3, 1]]) roomLights.push([x, R.TOP - 0.6, z, '#ffb05e', 3, 0.9]);
  }

  // ---- floor ---------------------------------------------------------------------------------
  const floorGeo = boxUV(new THREE.BoxGeometry(X1 - X0, 0.03, Z1 - Z0).translate((X0 + X1) / 2, -0.015, (Z0 + Z1) / 2));
  const floor = new THREE.Mesh(floorGeo, slotMats.floor);
  floor.receiveShadow = true; floor.userData.slot = 'floor';
  shell.add(floor); slotState.floor.meshes.push(floor);

  // ---- walls: boxes whose faces carry different materials ------------------------------------
  const byMat = new Map();
  const WL = slotMats.wallL, WB = slotMats.wallB;
  // faces order: +x, -x, +y, -y, +z, -z
  function wall(x0, x1, y0, y1, z0, z1, faces) {
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
  const wl = R.winL, wb = R.winB;
  // left wall (inner face +x is the "left wall" slot)
  wall(X0 - T, X0, 0, H, Z0, wl.z0, [WL, OUTER, CAP, CAP, WL, WL]);
  wall(X0 - T, X0, 0, H, wl.z1, Z1, [WL, OUTER, CAP, CAP, CAP, WL]);
  wall(X0 - T, X0, 0, wl.y0, wl.z0, wl.z1, [WL, OUTER, WL, CAP, WL, WL]);
  wall(X0 - T, X0, wl.y1, H, wl.z0, wl.z1, [WL, OUTER, CAP, WL, WL, WL]);
  // back wall (inner face +z)
  wall(X0 - T, wb.x0, 0, H, Z0 - T, Z0, [WB, OUTER, CAP, CAP, WB, OUTER]);
  wall(wb.x1, X1 + T, 0, H, Z0 - T, Z0, [CAP, WB, CAP, CAP, WB, OUTER]);
  wall(wb.x0, wb.x1, 0, wb.y0, Z0 - T, Z0, [WB, WB, WB, CAP, WB, OUTER]);
  wall(wb.x0, wb.x1, wb.y1, H, Z0 - T, Z0, [WB, WB, CAP, WB, WB, OUTER]);
  // low front wall with the entrance gap, low right wall
  wall(X0 - T, R.door.x0, 0, LOW, Z1, Z1 + T, [WB, OUTER, CAP, CAP, OUTER, WB]);
  wall(R.door.x1, X1 + T, 0, LOW, Z1, Z1 + T, [CAP, WB, CAP, CAP, OUTER, WB]);
  wall(X1, X1 + T, 0, LOW, Z0, Z1, [OUTER, WB, CAP, CAP, CAP, CAP]);
  // partitions
  const pa = R.partA, pb = R.partB;
  wall(pa - PT / 2, pa + PT / 2, 0, PH, Z0, R.doorA.z0, [WB, WB, CAP, CAP, WB, WB]);
  wall(pa - PT / 2, pa + PT / 2, 0, PH, R.doorA.z1, Z1, [WB, WB, CAP, CAP, WB, WB]);
  wall(pa + PT / 2, R.doorB.x0, 0, PH, pb - PT / 2, pb + PT / 2, [WB, WB, CAP, CAP, WB, WB]);
  wall(R.doorB.x1, X1, 0, PH, pb - PT / 2, pb + PT / 2, [WB, WB, CAP, CAP, WB, WB]);
  for (const [m, list] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(list), m);
    mesh.castShadow = mesh.receiveShadow = true;
    shell.add(mesh);
    if (m === WL) { mesh.userData.slot = 'wallL'; slotState.wallL.meshes.push(mesh); }
    if (m === WB) { mesh.userData.slot = 'wallB'; slotState.wallB.meshes.push(mesh); }
  }

  // collision rectangles for furniture
  const e = 0.001;
  obstacles.push(
    [X0 - 1, Z0 - 1, X0 + e, Z1 + 1], [X1 - e, Z0 - 1, X1 + 1, Z1 + 1], [X0 - 1, Z0 - 1, X1 + 1, Z0 + e], [X0 - 1, Z1 - e, X1 + 1, Z1 + 1],
    [pa - PT / 2, Z0, pa + PT / 2, R.doorA.z0], [pa - PT / 2, R.doorA.z1, pa + PT / 2, Z1],
    [pa, pb - PT / 2, R.doorB.x0, pb + PT / 2], [R.doorB.x1, pb - PT / 2, X1, pb + PT / 2],
  );
  // walls that can carry shelves and prints (tall walls only, away from windows)
  wallPlanes.push(
    { axis: 'z', at: Z0, n: 1, a0: X0, a1: wb.x0, name: 'back wall' },
    { axis: 'z', at: Z0, n: 1, a0: wb.x1, a1: pa - PT / 2, name: 'back wall' },
    { axis: 'z', at: Z0, n: 1, a0: pa + PT / 2, a1: X1, name: 'back wall' },
    { axis: 'x', at: X0, n: 1, a0: R.slatsZ1 + 0.02, a1: wl.z0, name: 'left wall' },
    { axis: 'x', at: X0 + 0.06, n: 1, a0: Z0, a1: R.slatsZ1, name: 'slat wall' },
  );

  // ---- details: corner posts, skirting, window frames, rods ---------------------------------
  {
    const b = batch();
    b.box(POST, X0 - T / 2, (H + 0.14) / 2, Z1 + T / 2, T + 0.26, H + 0.14, T + 0.26, { r: 0.02 }).box(CAP, X0 - T / 2, H + 0.15, Z1 + T / 2, T + 0.26, 0.02, T + 0.26);
    b.box(POST, X1 + T / 2, (H + 0.14) / 2, Z0 - T / 2, T + 0.26, H + 0.14, T + 0.26, { r: 0.02 }).box(CAP, X1 + T / 2, H + 0.15, Z0 - T / 2, T + 0.26, 0.02, T + 0.26);
    b.box(SKIRT, X0 + 0.008, 0.045, (R.slatsZ1 + Z1 - 0.1) / 2, 0.016, 0.09, Z1 - 0.1 - R.slatsZ1);
    for (const [a, c] of [[X0, wb.x0], [wb.x1, pa - PT / 2], [pa + PT / 2, X1]]) b.box(SKIRT, (a + c) / 2, 0.045, Z0 + 0.008, c - a, 0.09, 0.016);
    const fx = X0 - T / 2, f = 0.035;
    // dining window frame
    b.box(BLACK_METAL, fx, (wl.y0 + wl.y1) / 2, wl.z0 + f / 2, 0.06, wl.y1 - wl.y0, f).box(BLACK_METAL, fx, (wl.y0 + wl.y1) / 2, wl.z1 - f / 2, 0.06, wl.y1 - wl.y0, f)
      .box(BLACK_METAL, fx, wl.y0 + f / 2, (wl.z0 + wl.z1) / 2, 0.06, f, wl.z1 - wl.z0).box(BLACK_METAL, fx, wl.y1 - f / 2, (wl.z0 + wl.z1) / 2, 0.06, f, wl.z1 - wl.z0)
      .box(BLACK_METAL, fx, (wl.y0 + wl.y1) / 2, (wl.z0 + wl.z1) / 2, 0.05, wl.y1 - wl.y0, 0.022).box(BLACK_METAL, fx, wl.y0 + (wl.y1 - wl.y0) * 0.7, (wl.z0 + wl.z1) / 2, 0.05, 0.022, wl.z1 - wl.z0);
    b.box(CAP, X0 + 0.03, wl.y0 - 0.015, (wl.z0 + wl.z1) / 2, 0.1 + T * 0.5, 0.03, wl.z1 - wl.z0 + 0.1);
    b.cyl(BLACK_METAL, X0 + 0.1, 2.56, (wl.z0 + wl.z1) / 2, 0.009, 0.009, wl.z1 - wl.z0 + 0.8, { rx: Math.PI / 2, seg: 8 });
    // big window frame with three mullions
    const bz = Z0 - T / 2, bw = wb.x1 - wb.x0, bh = wb.y1 - wb.y0;
    b.box(BLACK_METAL, wb.x0 + f / 2, (wb.y0 + wb.y1) / 2, bz, f, bh, 0.06).box(BLACK_METAL, wb.x1 - f / 2, (wb.y0 + wb.y1) / 2, bz, f, bh, 0.06)
      .box(BLACK_METAL, (wb.x0 + wb.x1) / 2, wb.y1 - f / 2, bz, bw, f, 0.06).box(BLACK_METAL, (wb.x0 + wb.x1) / 2, wb.y0 + f / 2, bz, bw, f, 0.06);
    for (let i = 1; i < 4; i++) b.box(BLACK_METAL, wb.x0 + bw * i / 4, (wb.y0 + wb.y1) / 2, bz, 0.024, bh, 0.05);
    b.box(CAP, (wb.x0 + wb.x1) / 2, wb.y0 - 0.012, Z0 + 0.04, bw + 0.08, 0.024, 0.1);
    b.cyl(BLACK_METAL, (wb.x0 + wb.x1) / 2, 2.6, Z0 + 0.1, 0.009, 0.009, bw + 1, { rz: Math.PI / 2, seg: 8 });
    b.flush(shell);
    pane(shell, wl.z1 - wl.z0 - 0.05, wl.y1 - wl.y0 - 0.05, fx, (wl.y0 + wl.y1) / 2, (wl.z0 + wl.z1) / 2, Math.PI / 2);
    pane(shell, bw - 0.05, bh - 0.05, (wb.x0 + wb.x1) / 2, (wb.y0 + wb.y1) / 2, bz, 0);
    curtain(shell, 0.5, 2.48, X0 + 0.1, wl.z0 + 0.02, Math.PI / 2, 9, 0);
    curtain(shell, 0.55, 2.5, wb.x0 - 0.05, Z0 + 0.1, 0, 10, 1);
    curtain(shell, 0.55, 2.5, wb.x1 + 0.05, Z0 + 0.1, 0, 10, 2.2);
  }

  // ---- slat wall: vertical battens on a dark backing in the back-left corner --------------------
  {
    const z0 = Z0 + 0.005, z1 = R.slatsZ1, d = 0.045, w = 0.034, pitch = 0.068, n = Math.floor((z1 - z0) / pitch), r = rng(11), parts = [];
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.012, H, z1 - z0), std('#1b1c20', { roughness: 1 }));
    back.position.set(X0 + 0.006, H / 2, (z0 + z1) / 2); back.receiveShadow = true; shell.add(back);
    for (let i = 0; i < n; i++) {
      const z = z0 + pitch * (i + 0.5) + (z1 - z0 - n * pitch) / 2;
      const g = new THREE.BoxGeometry(w, H - 0.004, d).toNonIndexed();
      const p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv, oy = r() * 6, oz = r() * 0.4;
      for (let k = 0; k < p.count; k++) { const along = p.getY(k) + H / 2, across = Math.abs(nn.getX(k)) > 0.5 ? p.getZ(k) : p.getX(k); uv.setXY(k, along + oy, across + oz); }
      g.translate(X0 + 0.012 + w / 2, H / 2, z); parts.push(g);
    }
    const slats = new THREE.Mesh(mergeGeometries(parts), slotMats.slats);
    slats.castShadow = slats.receiveShadow = true; slats.userData.slot = 'slats';
    shell.add(slats); slotState.slats.meshes.push(slats);
  }

  // ---- doormat at the entrance ---------------------------------------------------------------
  {
    const t = canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#8c7458'; g.fillRect(0, 0, w, h); const r = rng(61);
      for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = `rgba(${v > 0.5 ? 60 : 210},${v > 0.5 ? 44 : 180},${v > 0.5 ? 28 : 130},${0.08 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 3 + r() * 5); }
      g.strokeStyle = '#4f3f2e'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
    });
    const mat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.018, 0.62), std('#ffffff', { map: t, roughness: 0.95 }));
    mat.position.set((R.door.x0 + R.door.x1) / 2, 0.009, Z1 - 0.42); mat.receiveShadow = true; shell.add(mat);
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
