// Habitt Hendrick 4 person dining table. Listing: 47 W | 31 D | 29 H (inches); laminated top, solid beech base, natural finish.
// From the photos: a plain rectangular top with softened edges, a slim apron, four round tapered legs splayed slightly.
import * as THREE from 'three';
import { batch } from '../../kit/util.js';
import { IN, STORE, CHECKED, BEECH } from './common.js';

const W = IN(47), D = IN(31), H = IN(29);

export default {
  id: 'habitt-hendrick-dining-table',
  name: 'Hendrick 4 person dining table',
  store: STORE, url: 'https://habitt.com/products/hendrick-4-person-dining-table-1', price: 'Rs 36,700', checked: CHECKED,
  dims: { w: 47, d: 31, h: 29, unit: 'in' }, surface: IN(29),
  build() {
    const WOOD = BEECH(), g = new THREE.Group(), b = batch(), top = 0.028, apron = 0.06, inset = 0.09, splay = 0.06;
    b.box(WOOD, 0, H - top / 2, 0, W, top, D, { r: 0.008, uv: 'box' });
    b.box(WOOD, 0, H - top - apron / 2, D / 2 - inset, W - inset * 2, apron, 0.02, { uv: 'box' }).box(WOOD, 0, H - top - apron / 2, -D / 2 + inset, W - inset * 2, apron, 0.02, { uv: 'box' })
      .box(WOOD, W / 2 - inset, H - top - apron / 2, 0, 0.02, apron, D - inset * 2, { uv: 'box' }).box(WOOD, -W / 2 + inset, H - top - apron / 2, 0, 0.02, apron, D - inset * 2, { uv: 'box' });
    const legH = H - top;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const tx = sx * (W / 2 - inset), tz = sz * (D / 2 - inset), fx = tx + sx * splay * 0.6, fz = tz + sz * splay * 0.4;
      b.cyl(WOOD, (tx + fx) / 2, legH / 2, (tz + fz) / 2, 0.022, 0.013, Math.hypot(legH, fx - tx, fz - tz), { seg: 14, dir: [tx - fx, legH, tz - fz], uv: 'box' });
    }
    b.flush(g); return g;
  },
};
