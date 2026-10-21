// Habitt Ease Stripe Dining Chair (Black). Listing: 16 W | 16 L | 36 H (inches); metal frame, artificial leather, plywood seat.
// From the photos: a tall slim back with horizontal stitched channels, a padded seat, four thin black square legs.
import * as THREE from 'three';
import { batch, cushion, smoothGeo, rbox } from '../../kit/util.js';
import { IN, STORE, CHECKED, BLACK_FRAME, BLACK_LEATHER } from './common.js';

const W = IN(16), D = IN(16), H = IN(36);

export default {
  id: 'habitt-ease-stripe-dining-chair',
  name: 'Ease Stripe Dining Chair (Black)',
  store: STORE, url: 'https://habitt.com/products/ease-stripe-dining-chair-black', price: 'Rs 10,220', checked: CHECKED,
  dims: { w: 16, d: 16, h: 36, unit: 'in' },
  build() {
    const g = new THREE.Group(), b = batch(), seatY = 0.44, leg = 0.018;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(BLACK_FRAME, sx * (W / 2 - 0.03), (seatY - 0.04) / 2, sz * (D / 2 - 0.03), leg, seatY - 0.04, leg);
    b.geo(BLACK_LEATHER, cushion(W, 0.07, D, 0.03, 0.012), 0, seatY, 0);
    // the back: a stack of padded channels, leaning back slightly
    const n = 8, y0 = seatY + 0.03, bh = H - y0, ch = bh / n, lean = -0.04, z0 = -D / 2 + 0.035;
    b.geo(BLACK_LEATHER, smoothGeo(rbox(W - 0.004, bh, 0.035, 0.012, 3)), 0, y0 + bh / 2, z0 - 0.012 + bh / 2 * lean, { rx: lean });
    for (let i = 0; i < n; i++) {
      const y = y0 + ch * (i + 0.5);
      b.geo(BLACK_LEATHER, smoothGeo(rbox(W - 0.012, ch + 0.004, 0.04, 0.018, 3)), 0, y, z0 + (y - y0) * lean, { rx: lean });
    }
    b.flush(g); return g;
  },
};
