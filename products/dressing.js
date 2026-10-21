// Generic dressing that makes a space look lived in. Not for sale, and coloured only by the room's slots,
// so in a book coloured room every one of these follows its Wada palette.
import * as THREE from 'three';
import { slotMats } from '../kit/materials.js';
import { batch, cushion, pillow, smoothGeo, rbox, lathe, BLACK_METAL } from '../kit/util.js';

const ACC = slotMats.accent, SOFT = slotMats.upholstery, JOIN = slotMats.joinery, PALE = slotMats.wallB, DARK = slotMats.slats;

// a kitchen run against a wall: base cabinets, worktop, sink, hob, kettle, an open shelf of jars above; faces +z
function kitchenRun() {
  const g = new THREE.Group(), b = batch(), W = 2.2, D = 0.6, H = 0.9, back = -D / 2;
  b.box(DARK, 0, 0.05, 0.02, W - 0.04, 0.1, D - 0.1);                                    // toe kick
  b.box(JOIN, 0, 0.1 + (H - 0.14) / 2, 0, W, H - 0.14, D - 0.02);                         // cabinets
  for (let i = 1; i < 4; i++) b.box(DARK, -W / 2 + (W * i) / 4, 0.1 + (H - 0.14) / 2, D / 2 - 0.009, 0.006, H - 0.2, 0.004);
  for (let i = 0; i < 4; i++) b.box(DARK, -W / 2 + (W * (i + 0.5)) / 4, H - 0.12, D / 2 + 0.006, 0.16, 0.014, 0.014, { r: 0.004 });
  b.box(PALE, 0, H - 0.02, 0.01, W + 0.02, 0.04, D + 0.02);                              // worktop
  b.box(BLACK_METAL, -0.45, H + 0.002, 0.02, 0.5, 0.004, 0.38);                          // sink
  b.cyl(BLACK_METAL, -0.45, H + 0.14, back + 0.09, 0.012, 0.012, 0.28, { seg: 10 }).cyl(BLACK_METAL, -0.45, H + 0.27, back + 0.16, 0.009, 0.009, 0.16, { rx: Math.PI / 2, seg: 8 });
  b.box(BLACK_METAL, 0.5, H + 0.004, 0.02, 0.56, 0.008, 0.46);                           // hob
  for (const [x, z] of [[0.38, -0.08], [0.62, -0.08], [0.38, 0.12], [0.62, 0.12]]) b.tor(DARK, x, H + 0.01, z, 0.07, 0.006, { rx: Math.PI / 2 });
  b.cyl(BLACK_METAL, 0.92, H + 0.1, -0.05, 0.075, 0.09, 0.2, { seg: 20 }).cyl(BLACK_METAL, 0.92, H + 0.21, -0.05, 0.02, 0.03, 0.03, { seg: 10 });   // kettle
  b.box(JOIN, 0, 1.55, back + 0.14, W - 0.4, 0.03, 0.26);                                 // open shelf
  for (let i = 0; i < 6; i++) b.cyl(i % 2 ? ACC : PALE, -0.7 + i * 0.28, 1.565 + 0.08, back + 0.12, 0.05, 0.05, 0.16, { seg: 18 });
  b.geo(ACC, lathe([[0, 0], [0.09, 0], [0.12, 0.04], [0.13, 0.12], [0.125, 0.13]], 24), -1.0, H, -0.12, { uv: 'keep' });   // a bowl
  b.flush(g); return g;
}

// three cushions leaning on the sofa back and a throw over the seat; sits on the sofa's seat
function sofaDressing() {
  const g = new THREE.Group(), b = batch();
  b.geo(ACC, pillow(0.46, 0.44, 0.15), -0.52, 0.2, -0.1, { rx: -0.35, ry: 0.18, rz: 0.06 })
    .geo(PALE, pillow(0.44, 0.42, 0.14), 0.0, 0.19, -0.1, { rx: -0.36, rz: -0.04 })
    .geo(ACC, pillow(0.4, 0.38, 0.13), 0.5, 0.18, -0.08, { rx: -0.34, ry: -0.2, rz: 0.05 });
  b.geo(SOFT, smoothGeo(rbox(0.5, 0.025, 0.62, 0.01, 2)), 0.62, 0.02, 0.06, { ry: 0.08 })
    .geo(SOFT, smoothGeo(rbox(0.5, 0.2, 0.025, 0.01, 2)), 0.62, -0.08, 0.37, { ry: 0.08 });
  b.flush(g); return g;
}

// books, a bowl and a small vase on a table top
function tableDecor() {
  const g = new THREE.Group(), b = batch();
  b.box(ACC, -0.08, 0.016, 0.02, 0.26, 0.032, 0.19, { ry: 0.25, r: 0.004 }).box(PALE, -0.07, 0.046, 0.02, 0.22, 0.028, 0.16, { ry: 0.1, r: 0.004 }).box(DARK, -0.075, 0.072, 0.025, 0.2, 0.024, 0.15, { ry: 0.3, r: 0.004 });
  b.geo(PALE, lathe([[0, 0], [0.05, 0], [0.09, 0.03], [0.11, 0.06], [0.105, 0.065]], 28), 0.16, 0, -0.05, { uv: 'keep' });
  b.geo(ACC, lathe([[0, 0], [0.03, 0], [0.045, 0.06], [0.03, 0.14], [0.02, 0.17], [0.024, 0.19]], 24), 0.14, 0, 0.09, { uv: 'keep' });
  b.flush(g); return g;
}

export default {
  kitchen: { name: 'Kitchen run', build: kitchenRun, fp: [2.2, 0.6], h: 1.6 },
  sofadress: { name: 'Cushions and throw', build: sofaDressing, fp: [1.5, 0.45], h: 0.45, onTop: true },
  tabledecor: { name: 'Books and a bowl', build: tableDecor, fp: [0.4, 0.3], h: 0.2, onTop: true },
};
