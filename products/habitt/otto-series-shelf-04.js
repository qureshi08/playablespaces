// Habitt OTTO SERIES SHELF 04. Listing: 23.6 W | 13.4 D | 39.3 H (inches); metal frame, laminated shelves.
// From the photos: black square tube frame, cross braces on the back, four light wood shelves.
import * as THREE from 'three';
import { batch } from '../../kit/util.js';
import { IN, STORE, CHECKED, BLACK_FRAME, LIGHT_OAK } from './common.js';

const W = IN(23.6), D = IN(13.4), H = IN(39.3);

export default {
  id: 'habitt-otto-series-shelf-04',
  name: 'OTTO SERIES SHELF 04',
  store: STORE, url: 'https://habitt.com/products/otto-series-shelf-04', price: 'Rs 25,350', checked: CHECKED,
  dims: { w: 23.6, d: 13.4, h: 39.3, unit: 'in' }, surface: IN(39.3),
  build() {
    const WOOD = LIGHT_OAK(), g = new THREE.Group(), b = batch(), t = 0.02;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(BLACK_FRAME, sx * (W / 2 - t / 2), H / 2, sz * (D / 2 - t / 2), t, H, t);
    const levels = [0.06, 0.37, 0.67, H - 0.012];
    for (const y of levels) b.box(WOOD, 0, y, 0, W - 0.004, 0.018, D - 0.004, { uv: 'box' });
    // a cross brace on the back between each pair of shelves
    for (let i = 0; i < levels.length - 1; i++) {
      const y0 = levels[i] + 0.01, y1 = levels[i + 1] - 0.01, len = Math.hypot(W - t * 2, y1 - y0), zb = -D / 2 + 0.006;
      b.box(BLACK_FRAME, 0, (y0 + y1) / 2, zb, 0.008, len, 0.008, { dir: [W - t * 2, y1 - y0, 0] })
        .box(BLACK_FRAME, 0, (y0 + y1) / 2, zb, 0.008, len, 0.008, { dir: [-(W - t * 2), y1 - y0, 0] });
    }
    b.flush(g); return g;
  },
};
