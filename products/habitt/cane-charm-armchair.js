// Habitt Cane Charm Armchair. Listing: 22 W | 16.5 D | 32.5 H (inches); moulded plastic frame, cane style seat and back.
// From the photos: slim tube frame, oval cane back, cane seat, curved arms from the back posts down to the front legs.
// The listed depth (16.5 in) is shallow for an armchair; it is modelled as listed.
import * as THREE from 'three';
import { batch, std } from '../../kit/util.js';
import { IN, STORE, CHECKED, caneMat } from './common.js';

const W = IN(22), D = IN(16.5), H = IN(32.5);
const FRAME = { green: '#a3ad4a', black: '#1c1c1c', white: '#ece9e2' };
const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 32, r, 8);

export default {
  id: 'habitt-cane-charm-armchair',
  name: 'Cane Charm Armchair',
  store: STORE, url: 'https://habitt.com/products/cane-charm-armchair-plastic-frame-with-woven-cane-style-seat-back-black-white-green', price: 'Rs 11,830', checked: CHECKED,
  dims: { w: 22, d: 16.5, h: 32.5, unit: 'in' },
  parts: { frame: 'plastic' },
  variants: { frame: ['green', 'black', 'white'] },
  swatches: FRAME,
  build(v = {}) {
    const P = std(FRAME[v.frame || 'green'], { roughness: 0.45, envMapIntensity: 0.7 }), CANE = caneMat();
    const g = new THREE.Group(), b = batch();
    const seatY = 0.45, r = 0.014, hx = W / 2 - 0.03, fz = D / 2 - 0.03, bz = -D / 2 + 0.03;
    // four legs, splayed a touch
    for (const sx of [-1, 1]) {
      b.geo(P, tube([[sx * (hx - 0.01), seatY + 0.012, fz - 0.01], [sx * hx, 0, fz]], r));
      b.geo(P, tube([[sx * (hx - 0.01), seatY + 0.012, bz + 0.01], [sx * hx, 0, bz - 0.01]], r));
      for (const z of [fz - 0.01, bz + 0.01]) b.sph(P, sx * (hx - 0.01), seatY + 0.012, z, r, { seg: 10, seg2: 8 });
    }
    // seat: a rounded rim around a cane panel
    const sw = W - 0.06, sd = D - 0.05;
    b.geo(P, new THREE.TorusGeometry(1, 0.012, 8, 48), 0, seatY, 0, { rx: Math.PI / 2, s: [sw / 2, sd / 2, 1] });
    b.geo(CANE, new THREE.CylinderGeometry(1, 1, 0.012, 48), 0, seatY - 0.004, 0, { s: [sw / 2 - 0.01, 1, sd / 2 - 0.01], uv: 'keep' });
    // back posts and the oval back, tilted back a little
    const backY = H - 0.19, bw = W - 0.14, bh = 0.36, tilt = -0.12;
    for (const sx of [-1, 1]) b.geo(P, tube([[sx * (hx - 0.01), seatY, bz + 0.01], [sx * (bw / 2 - 0.02), backY - 0.08, bz - 0.04]], r));
    b.geo(P, new THREE.TorusGeometry(1, 0.013, 8, 48), 0, backY, bz - 0.05, { rx: tilt, s: [bw / 2, bh / 2, 1] });
    b.geo(CANE, new THREE.CylinderGeometry(1, 1, 0.01, 48), 0, backY, bz - 0.05, { rx: Math.PI / 2 + tilt, s: [bw / 2 - 0.01, 1, bh / 2 - 0.01], uv: 'keep' });
    // arms: from the back post round to the front leg
    for (const sx of [-1, 1]) b.geo(P, tube([[sx * (bw / 2 - 0.03), backY - 0.1, bz - 0.03], [sx * hx, 0.6, bz + 0.07], [sx * hx, 0.6, fz - 0.07], [sx * (hx - 0.01), seatY + 0.01, fz - 0.01]], 0.013));
    b.flush(g); return g;
  },
};
