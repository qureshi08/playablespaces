// Habitt TUBO Workstation. Listing: complete height 61, shelf depth 4, table height 30, table width 26, table depth 18 (inches).
// From the photos: a leaning ladder frame in black metal, a wood desktop and a narrow top shelf.
import * as THREE from 'three';
import { batch } from '../../kit/util.js';
import { IN, STORE, CHECKED, BLACK_FRAME, WALNUT_LAM } from './common.js';

const W = IN(26), D = IN(18), H = IN(61), DESK = IN(30), SHELF = IN(4);

export default {
  id: 'habitt-tubo-workstation',
  name: 'TUBO Workstation',
  store: STORE, url: 'https://habitt.com/products/tubo-workstation', price: 'Rs 26,775', checked: CHECKED,
  dims: { w: 26, d: 18, h: 61, unit: 'in' },
  build() {
    const WOOD = WALNUT_LAM(), g = new THREE.Group(), b = batch(), t = 0.022, back = -D / 2 + t / 2, foot = D / 2 - t / 2;
    // side frames: a back upright and a front rail leaning in to meet it at the top
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - t / 2);
      b.box(BLACK_FRAME, x, H / 2, back, t, H, t);
      b.box(BLACK_FRAME, x, H / 2, (back + foot) / 2, t, Math.hypot(H, foot - back), t, { dir: [0, H, back - foot] });
      b.box(BLACK_FRAME, x, 0.06, (back + foot) / 2, t, t, foot - back);
    }
    b.box(BLACK_FRAME, 0, 0.06, foot, W, t, t).box(BLACK_FRAME, 0, DESK - 0.03, back, W, t, t).box(BLACK_FRAME, 0, H - 0.25 - 0.03, back, W, t, t);
    // desktop and top shelf
    b.box(WOOD, 0, DESK - 0.009, back - t / 2 + D / 2, W - 0.004, 0.018, D, { uv: 'box' });
    b.box(WOOD, 0, H - 0.25, back - t / 2 + SHELF / 2 + 0.01, W - 0.004, 0.018, SHELF + 0.02, { uv: 'box' });
    b.flush(g); return g;
  },
};
