// Space 1: a one room flat designed around Habitt's nine pieces. The design and its sources are in design.md:
// layout from three real interiors, every colour from Wada's A Dictionary of Color Combinations (#243, #296, #192).
// Lamps, plants, the rug and the prints stay generic: they are styling, not for sale here.

// a book colour as a sample: the base colour is Wada's; the darker and lighter tones only give the texture its grain
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + c.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
};
const KIND = {
  paint: { cat: 'paint', k: 13, size: [1.5, 1.5], tones: hex => [hex] },
  limewash: { cat: 'paint', k: 14, size: [2.2, 2.2], tones: hex => [hex, shade(hex, -0.1), shade(hex, 0.1)] },
  wood: { cat: 'wood', k: 1, size: [1.5, 0.38], p: [13, 0.85, 0.11, 0.48], tones: hex => [hex, shade(hex, -0.3), shade(hex, -0.5)] },
  linen: { cat: 'fabric', k: 7, size: [0.16, 0.16], p: [85], tones: hex => [hex, shade(hex, -0.15), shade(hex, 0.12)] },
  knit: { cat: 'fabric', k: 11, size: [0.5, 0.5], p: [8, 12], tones: hex => [hex, shade(hex, -0.18), shade(hex, 0.12)] },
  wool: { cat: 'fabric', k: 8, size: [0.22, 0.22], tones: hex => [hex, shade(hex, -0.2), shade(hex, 0.1)] },
  felt: { cat: 'fabric', k: 12, size: [0.4, 0.4], tones: hex => [hex, shade(hex, -0.2)] },
};
// L, warm and tx feed the cozy / bright / moody meter
const wada = (id, name, hex, combo, kind, L, warm, tx) => {
  const K = KIND[kind];
  return { id, name, combo, cat: K.cat, k: K.k, c: K.tones(hex), p: K.p, size: K.size, L, warm, tx, sheen: K.cat === 'fabric' ? 0.15 : undefined };
};

export default {
  title: 'One room flat, furnished by Habitt',
  plinth: { label: 'PLAYABLE SPACES' },

  shell: {
    x0: -5.2, x1: 5.2, z0: -2.8, z1: 2.8, height: 2.75, thick: 0.18, low: 0.45,
    walls: [
      { side: 'left', tall: true, slot: 'wallL' },
      { side: 'back', tall: true, slot: 'wallB', windows: [
        { from: -4.5, to: -2.7, y0: 0.9, y1: 2.4, mullions: 1, curtains: ['start'] },
        { from: -1.0, to: 1.3, y0: 0.95, y1: 2.45, mullions: 2, curtains: ['start', 'end'] },
      ] },
      { side: 'front', slot: 'wallB', doors: [{ from: -1.6, to: -0.6, mat: true }] },
      { side: 'right', slot: 'wallB' },
    ],
    // the soft separation in front of the bed, finished like the battens
    partitions: { height: 1.1, thick: 0.12, list: [{ x: 1.9, z: [-2.8, 0.7], doors: [], slot: 'slats' }] },
    slatWall: { side: 'left', from: -2.8, to: 1.2 },
    hang: [
      { side: 'back', from: -2.7, to: -1.0, name: 'back wall' },
      { side: 'back', from: 1.96, to: 5.2, name: 'back wall' },
      { side: 'left', from: 1.3, to: 2.8, name: 'left wall' },
      { side: 'left', from: -2.8, to: 1.2, inset: 0.06, name: 'slat wall' },
    ],
  },

  // only this palette appears in the swatch tray here
  onlyRoomMaterials: true,
  materials: [
    // #243 Ivory Buff, Raw Sienna, Olive Green, Slate Color
    wada('w243-ivory-buff', 'Ivory Buff', '#ebd3a2', 243, 'limewash', 0.86, 0.5, 0.6),
    wada('w243-raw-sienna', 'Raw Sienna', '#bb7125', 243, 'wood', 0.55, 0.8, 0.5),
    wada('w243-slate', 'Slate Color', '#34454c', 243, 'paint', 0.28, -0.2, 0.15),
    wada('w243-olive', 'Olive Green', '#6b7140', 243, 'knit', 0.46, 0.15, 0.9),
    wada('w243-ivory-linen', 'Ivory Buff linen', '#ebd3a2', 243, 'linen', 0.86, 0.4, 0.45),
    wada('w243-sienna-wool', 'Raw Sienna wool', '#bb7125', 243, 'wool', 0.55, 0.85, 0.8),
    // #296 Sulpher Yellow, Ochraceous Salmon, Pale Raw Umber, Slate Color
    wada('w296-sulpher', 'Sulpher Yellow', '#f5ecc2', 296, 'paint', 0.93, 0.35, 0.1),
    wada('w296-salmon', 'Ochraceous Salmon', '#d8a37b', 296, 'wood', 0.71, 0.6, 0.45),
    wada('w296-umber', 'Pale Raw Umber', '#71502f', 296, 'wood', 0.37, 0.55, 0.5),
    wada('w296-slate-knit', 'Slate Color knit', '#34454c', 296, 'knit', 0.28, -0.25, 0.85),
    wada('w296-sulpher-linen', 'Sulpher Yellow linen', '#f5ecc2', 296, 'linen', 0.93, 0.3, 0.45),
    wada('w296-salmon-linen', 'Ochraceous Salmon linen', '#d8a37b', 296, 'linen', 0.71, 0.55, 0.45),
    // #192 Cream Yellow, Vandyke Brown, Deep Violet / Plumbeous
    wada('w192-plumbeous', 'Plumbeous', '#70727c', 192, 'paint', 0.48, -0.15, 0.12),
    wada('w192-vandyke', 'Vandyke Brown', '#4b3317', 192, 'wood', 0.24, 0.5, 0.5),
    wada('w192-cream-knit', 'Cream Yellow knit', '#fdbf68', 192, 'knit', 0.82, 0.9, 0.9),
    wada('w192-plumbeous-felt', 'Plumbeous felt', '#70727c', 192, 'felt', 0.48, -0.15, 0.4),
    wada('w192-cream-wool', 'Cream Yellow wool', '#fdbf68', 192, 'wool', 0.82, 0.9, 0.8),
  ],

  start: 'cozy',
  moods: {
    cozy: { name: 'Cozy', note: 'Wada #243', h: 18.4, mats: { floor: 'w243-raw-sienna', wallL: 'w243-ivory-buff', wallB: 'w243-ivory-buff', slats: 'w243-slate', upholstery: 'w243-ivory-linen', accent: 'w243-sienna-wool', bedding: 'w243-ivory-linen', rug: 'w243-olive', joinery: 'w243-raw-sienna' } },
    bright: { name: 'Bright', note: 'Wada #296', h: 12.8, mats: { floor: 'w296-salmon', wallL: 'w296-sulpher', wallB: 'w296-sulpher', slats: 'w296-umber', upholstery: 'w296-sulpher-linen', accent: 'w296-salmon-linen', bedding: 'w296-sulpher-linen', rug: 'w296-slate-knit', joinery: 'w296-umber' } },
    moody: { name: 'Moody', note: 'Wada #192', h: 22.2, mats: { floor: 'w192-vandyke', wallL: 'w192-plumbeous', wallB: 'w192-plumbeous', slats: 'w192-vandyke', upholstery: 'w192-plumbeous-felt', accent: 'w192-cream-wool', bedding: 'w192-plumbeous-felt', rug: 'w192-cream-knit', joinery: 'w192-vandyke' } },
  },

  // [product, x, z, rotation degrees] on the floor; [product, hang plane index, along, height] on a wall
  layout: [
    // dining, by its window at the left end
    ['habitt-hendrick-dining-table', -3.6, -1.75, 0],
    ['habitt-ease-stripe-dining-chair', -3.9, -2.42, 0], ['habitt-ease-stripe-dining-chair', -3.3, -2.42, 0],
    ['habitt-ease-stripe-dining-chair', -3.9, -1.08, 180], ['habitt-ease-stripe-dining-chair', -3.3, -1.08, 180],
    ['plant2', -4.9, -2.5, 0],
    ['habitt-otto-series-shelf-04', -5.02, 1.9, 90],
    // living, backed to the wide window
    ['rug', 0.15, -1.25, 0],
    ['habitt-billy-3-seater-sofa', 0.15, -2.42, 0],
    ['habitt-kade-coffee-table', 0.15, -1.3, 0],
    ['habitt-cane-charm-armchair', -0.45, -0.35, 180], ['habitt-cane-charm-armchair', 0.75, -0.35, 180],
    ['habitt-kade-side-table', -1.15, -2.48, 0], ['tablelamp', -1.15, -2.55, 0],
    ['lamp', 1.42, -2.55, 0], ['plant', -1.45, -1.6, 0],
    // bedroom, behind the divider
    ['habitt-marq-king-size-bed', 3.58, -1.78, 0],
    ['habitt-kade-side-table', 2.3, -2.48, 0], ['habitt-kade-side-table', 4.86, -2.48, 0],
    ['tablelamp', 2.3, -2.55, 0], ['tablelamp', 4.86, -2.55, 0],
    // work corner
    ['habitt-tubo-workstation', 4.96, 1.95, -90], ['taskchair', 4.35, 1.95, 90], ['snake', 4.95, 0.9, 0],
    // walls
    ['art', 0, -1.85, 1.5], ['frames', 1, 3.58, 1.5], ['shelf', 3, -1.0, 1.6],
  ],

  // the Furniture tab here: Habitt's pieces first, then the generic styling
  furniture: ['habitt-billy-3-seater-sofa', 'habitt-cane-charm-armchair', 'habitt-kade-coffee-table', 'habitt-kade-side-table', 'habitt-hendrick-dining-table', 'habitt-ease-stripe-dining-chair', 'habitt-marq-king-size-bed', 'habitt-tubo-workstation', 'habitt-otto-series-shelf-04', 'tablelamp', 'lamp', 'rug', 'plant', 'plant2', 'snake', 'shelf', 'art', 'frames', 'taskchair'],

  camera: {
    home: { target: [0, -0.3, 0], yaw: 0.3, pitch: 0.56, dist: 24 },
    shots: [
      { t: [0.15, 0.5, -1.5], yaw: 0.1, pitch: 0.35, dist: 7 },
      { t: [-3.6, 0.6, -1.7], yaw: 0.8, pitch: 0.3, dist: 6.5 },
      { t: [3.6, 0.6, -1.8], yaw: -0.5, pitch: 0.38, dist: 6.5 },
      { t: [4.6, 0.8, 1.9], yaw: -1.1, pitch: 0.3, dist: 4.5 },
      { t: [0, 0.3, 0], yaw: -0.6, pitch: 0.75, dist: 17 },
    ],
  },

  notes: { y: 3.6, z: -3.4, cards: [['slats', -4.2], ['wallB', -2.0], ['floor', 0.2], ['rug', 2.0], ['bedding', 4.0]] },

  anchors: {
    floor: [0.2, 0, 0.8],
    wallL: [-5.19, 1.7, 2.0],
    wallB: [-1.85, 1.9, -2.79],
    slats: [-5.14, 1.7, -1.2],
    upholstery: { piece: ['habitt-billy-3-seater-sofa'], at: [0, 0.5, 0], or: [0.15, 0.5, -2.4] },
    accent: { piece: ['habitt-billy-3-seater-sofa'], at: [0.5, 0.6, -0.1], or: [0.15, 0.6, -2.4] },
    bedding: { piece: ['habitt-marq-king-size-bed'], at: [0, 0.6, 0.3], or: [3.58, 0.6, -1.5] },
    rug: { piece: ['rug'], at: [0.6, 0.02, 0.5], or: [0.15, 0, -1.25] },
    joinery: { piece: ['habitt-kade-coffee-table'], at: [0, 0.39, 0], or: [0.15, 0.39, -1.3] },
  },
};
