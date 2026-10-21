// Habitt Billy 3 seater Sofa. Listing: 69 L | 28 W | 34 overall H, 11 back thickness (inches); jute fabric, solid wood legs.
// From the photos: boxy low base, rounded track arms a little below the back cushions, one long seat cushion,
// three loose back cushions, square tapered black legs.
import * as THREE from 'three';
import { batch, rbox, cushion, smoothGeo } from '../../kit/util.js';
import { IN, STORE, CHECKED, jute, BLACK_WOOD } from './common.js';

const W = IN(69), D = IN(28), H = IN(34);

export default {
  id: 'habitt-billy-3-seater-sofa',
  name: 'Billy 3 seater Sofa',
  store: STORE, url: 'https://habitt.com/products/billy-3-seater-sofa-1', price: 'Rs 46,256', checked: CHECKED,
  dims: { w: 69, d: 28, h: 34, unit: 'in' },
  parts: { upholstery: 'fabric', legs: 'wood' },
  variants: { upholstery: ['Grey', 'Red', 'Light Green', 'Off White'] },
  build(v = {}) {
    const FAB = jute(v.upholstery || 'Grey'), g = new THREE.Group(), b = batch();
    const leg = 0.17, arm = 0.14, armTop = 0.61, deck = 0.39, back = IN(11);
    // tapered square legs, set in from the corners
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = sx * (W / 2 - 0.07), z = sz * (D / 2 - 0.07);
      b.geo(BLACK_WOOD, new THREE.CylinderGeometry(0.016, 0.024, leg, 4).rotateY(Math.PI / 4), x, leg / 2, z);
    }
    // base box under the seat
    b.geo(FAB, smoothGeo(rbox(W - 0.02, deck - leg, D - 0.02, 0.03, 3)), 0, (leg + deck) / 2, 0, { uv: 'box' });
    // arms with rounded tops
    for (const s of [-1, 1]) b.geo(FAB, smoothGeo(rbox(arm, armTop - leg, D, 0.06, 4)), s * (W / 2 - arm / 2), (leg + armTop) / 2, 0, { uv: 'box' });
    // low back frame behind the cushions
    b.geo(FAB, smoothGeo(rbox(W - arm * 2, 0.62 - deck, 0.12, 0.04, 3)), 0, (deck + 0.62) / 2, -D / 2 + 0.06, { uv: 'box' });
    // one long seat cushion
    const seatW = W - arm * 2 - 0.01, seatD = D - back * 0.55;
    b.geo(FAB, cushion(seatW, 0.11, seatD, 0.05, 0.016), 0, deck + 0.055, D / 2 - seatD / 2 - 0.01, { uv: 'box' });
    // three back cushions leaning on the frame, their tops at the listed overall height
    const cw = seatW / 3, ch = H - (deck + 0.12) - 0.01;
    for (let i = 0; i < 3; i++) b.geo(FAB, cushion(cw - 0.015, ch, 0.17, 0.07, 0.012), -seatW / 2 + cw * (i + 0.5), deck + 0.12 + ch / 2, -D / 2 + 0.17, { rx: -0.14, uv: 'box' });
    b.flush(g); return g;
  },
};
