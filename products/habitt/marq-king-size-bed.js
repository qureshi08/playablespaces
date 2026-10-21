// Habitt Marq King Size Bed. Listing: 74.2 W | 79.6 D | 30 H (inches), lamination, mattress not included.
// From the photos: low walnut platform, black metal corner posts, a wide headboard panel with a black metal ledge on top.
// The mattress and bedding are shown for the room but are not part of the product.
import * as THREE from 'three';
import { batch, std, cushion, pillow, smoothGeo, rbox } from '../../kit/util.js';
import { slotMats } from '../../kit/materials.js';
import { IN, STORE, CHECKED, WALNUT_LAM, BLACK_FRAME } from './common.js';

const W = IN(74.2), D = IN(79.6), H = IN(30);

export default {
  id: 'habitt-marq-king-size-bed',
  name: 'Marq King Size Bed',
  store: STORE, url: 'https://habitt.com/products/marq-king-size-bed', price: 'Rs 49,000', checked: CHECKED,
  dims: { w: 74.2, d: 79.6, h: 30, unit: 'in' },
  build() {
    const WOOD = WALNUT_LAM(), DUVET = slotMats.bedding, g = new THREE.Group(), b = batch();
    const post = 0.045, railY0 = 0.1, railY1 = 0.32, board = 0.035, back = -D / 2;
    // corner posts: tall at the head, short at the foot
    for (const sx of [-1, 1]) {
      b.box(BLACK_FRAME, sx * (W / 2 - post / 2), H / 2, back + post / 2, post, H, post)
        .box(BLACK_FRAME, sx * (W / 2 - post / 2), railY1 / 2 + 0.01, D / 2 - post / 2, post, railY1 + 0.02, post);
    }
    // side and foot rails
    for (const sx of [-1, 1]) b.box(WOOD, sx * (W / 2 - board / 2), (railY0 + railY1) / 2, 0, board, railY1 - railY0, D - post * 2, { uv: 'box' });
    b.box(WOOD, 0, (railY0 + railY1) / 2, D / 2 - board / 2, W - post * 2, railY1 - railY0, board, { uv: 'box' });
    // headboard panel and its black ledge
    b.box(WOOD, 0, (railY1 + H - 0.03) / 2, back + 0.03, W - post * 2, H - 0.03 - railY1, board, { uv: 'box' });
    b.box(BLACK_FRAME, 0, H - 0.012, back + 0.05, W + 0.04, 0.025, 0.11);
    // mattress (72 x 78 in) and bedding, for the look only
    const mW = IN(72), mD = IN(78), mT = 0.22, mY = railY1 - 0.06;
    b.geo(std('#f4f1ea', { roughness: 0.9 }), smoothGeo(rbox(mW - 0.02, mT, mD - 0.06, 0.05, 3)), 0, mY + mT / 2, back + 0.06 + mD / 2);
    b.geo(DUVET, cushion(mW + 0.04, 0.07, mD * 0.72, 0.05, 0.02), 0, mY + mT + 0.02, D / 2 - mD * 0.36 - 0.08);
    for (const sx of [-1, 1]) b.geo(DUVET, pillow(0.62, 0.42, 0.14), sx * 0.42, mY + mT + 0.12, back + 0.32, { rx: -0.9 });
    b.flush(g); return g;
  },
};
