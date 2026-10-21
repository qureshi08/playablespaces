// Habitt Kade Coffee Table (48 W | 24 D | 15.2 H in) and Kade Side Table (24 W | 24 D | 15.2 H in), laminated wood.
// From the photos: a thick slab top held between chunky block legs at each corner; the legs rise a little past the top.
import * as THREE from 'three';
import { batch } from '../../kit/util.js';
import { IN, STORE, CHECKED, WALNUT_LAM } from './common.js';

function kade(W, D, H) {
  const WOOD = WALNUT_LAM(), g = new THREE.Group(), b = batch();
  const top = 0.05, rise = 0.022, lx = 0.12, lz = 0.1;
  const topY = H - rise;
  b.box(WOOD, 0, topY - top / 2, 0, W - 0.03, top, D - 0.05, { r: 0.004, uv: 'box' });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    // each corner leg is two planks side by side, with a hairline between them
    const x = sx * (W / 2 - lx / 2), z = sz * (D / 2 - lz / 2);
    // built lying down and stood up, so the plank grain runs up the leg
    b.box(WOOD, x - lx / 4, H / 2, z, H, lx / 2 - 0.002, lz, { r: 0.004, rz: Math.PI / 2, uv: 'keep' })
      .box(WOOD, x + lx / 4, H / 2, z, H, lx / 2 - 0.002, lz, { r: 0.004, rz: Math.PI / 2, uv: 'keep' });
  }
  b.flush(g); return g;
}

export const kadeCoffee = {
  id: 'habitt-kade-coffee-table',
  name: 'Kade Coffee Table',
  store: STORE, url: 'https://habitt.com/products/kade-coffee-table', price: 'Rs 8,900', checked: CHECKED,
  dims: { w: 48, d: 24, h: 15.2, unit: 'in' },
  build: () => kade(IN(48), IN(24), IN(15.2)),
};

export const kadeSide = {
  id: 'habitt-kade-side-table',
  name: 'Kade Side Table',
  store: STORE, url: 'https://habitt.com/products/kade-side-table', price: 'Rs 6,700', checked: CHECKED,
  dims: { w: 24, d: 24, h: 15.2, unit: 'in' },
  build: () => kade(IN(24), IN(24), IN(15.2)),
};
