// Space 1, take three: a small, full flat around Habitt's nine pieces (approved by Anas on 2026-10-22, see design.md).
// Every colour except the products' own is a Wada combination: #343 (opens on it), #296, #207. That covers the walls,
// floor, the glass partition frames, the plinth and the setting around it, curtains, pots, lamps and all the dressing.

// a book colour as a sample: the base colour is Wada's; the darker and lighter tones only give the texture its grain
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + c.map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k).toString(16).padStart(2, '0')).join('');
};
const KIND = {
  paint: { cat: 'paint', k: 13, size: [1.5, 1.5], tones: hex => [hex] },
  limewash: { cat: 'paint', k: 14, size: [2.2, 2.2], tones: hex => [hex, shade(hex, -0.08), shade(hex, 0.08)] },
  wood: { cat: 'wood', k: 1, size: [1.5, 0.38], p: [13, 0.85, 0.11, 0.48], tones: hex => [hex, shade(hex, -0.12), shade(hex, 0.08)] },   // grain stays close to the book colour
  linen: { cat: 'fabric', k: 7, size: [0.16, 0.16], p: [85], tones: hex => [hex, shade(hex, -0.15), shade(hex, 0.12)] },
  knit: { cat: 'fabric', k: 11, size: [0.5, 0.5], p: [8, 12], tones: hex => [hex, shade(hex, -0.18), shade(hex, 0.12)] },
  wool: { cat: 'fabric', k: 8, size: [0.22, 0.22], tones: hex => [hex, shade(hex, -0.2), shade(hex, 0.1)] },
};
// L, warm and tx feed the cozy / bright / moody meter
const wada = (id, name, hex, combo, kind, L, warm, tx) => {
  const K = KIND[kind];
  return { id, name, combo, cat: K.cat, k: K.k, c: K.tones(hex), p: K.p, size: K.size, L, warm, tx, sheen: K.cat === 'fabric' ? 0.15 : undefined };
};

export default {
  title: 'Small flat, furnished by Habitt',
  plinth: { label: 'PLAYABLE SPACES', color: '#ebd3a2' },   // Ivory Buff, #343
  setting: 'palette',                                         // no night city: the setting takes the frames colour
  slotNames: { slats: 'Frames' },

  shell: {
    x0: -4.1, x1: 4.1, z0: -2.4, z1: 2.4, height: 2.75, thick: 0.18, low: 0.45,
    bookColours: true,
    walls: [
      { side: 'left', tall: true, slot: 'wallL' },
      { side: 'back', tall: true, slot: 'wallB', windows: [
        { from: -3.5, to: -1.85, y0: 0.9, y1: 2.35, mullions: 1, curtains: ['start', 'end'] },
        { from: 1.65, to: 3.4, y0: 0.95, y1: 2.35, mullions: 1, curtains: ['start', 'end'] },
      ] },
      { side: 'front', slot: 'wallB', doors: [{ from: -0.8, to: 0.2, mat: true }] },
      { side: 'right', slot: 'wallB' },
    ],
    // the bedroom behind a full height steel and glass screen (reference 29)
    partitions: { height: 2.75, thick: 0.035, list: [{ x: 0.9, z: [-2.4, 1.2], glass: true, slot: 'slats' }] },
    hang: [
      { side: 'back', from: -1.75, to: 0.84, name: 'back wall' },
      { side: 'left', from: -2.4, to: -0.15, name: 'left wall' },
    ],
  },

  onlyRoomMaterials: true,
  materials: [
    // #343 Ivory Buff, Deep Grayish Olive, Burnt Sienna, Vandar Poel's Blue
    wada('w343-ivory', 'Ivory Buff', '#ebd3a2', 343, 'limewash', 0.86, 0.45, 0.55),
    wada('w343-olive-oak', 'Deep Grayish Olive', '#635a3a', 343, 'wood', 0.39, 0.3, 0.5),
    wada('w343-blue', "Vandar Poel's Blue", '#064f6e', 343, 'paint', 0.31, -0.6, 0.12),
    wada('w343-sienna-knit', 'Burnt Sienna knit', '#ae5224', 343, 'knit', 0.46, 0.9, 0.9),
    wada('w343-sienna-wool', 'Burnt Sienna wool', '#ae5224', 343, 'wool', 0.46, 0.9, 0.8),
    wada('w343-ivory-linen', 'Ivory Buff linen', '#ebd3a2', 343, 'linen', 0.86, 0.4, 0.45),
    // #296 Sulpher Yellow, Ochraceous Salmon, Pale Raw Umber, Slate Color
    wada('w296-sulpher', 'Sulpher Yellow', '#f5ecc2', 296, 'paint', 0.93, 0.35, 0.1),
    wada('w296-umber', 'Pale Raw Umber', '#71502f', 296, 'wood', 0.37, 0.55, 0.5),
    wada('w296-slate', 'Slate Color', '#34454c', 296, 'paint', 0.28, -0.2, 0.12),
    wada('w296-salmon-knit', 'Ochraceous Salmon knit', '#d8a37b', 296, 'knit', 0.71, 0.6, 0.85),
    wada('w296-salmon-wool', 'Ochraceous Salmon wool', '#d8a37b', 296, 'wool', 0.71, 0.6, 0.8),
    wada('w296-sulpher-linen', 'Sulpher Yellow linen', '#f5ecc2', 296, 'linen', 0.93, 0.3, 0.45),
    // #207 Glaucous Green, Sudan Brown, Black
    wada('w207-glaucous', 'Glaucous Green', '#b4cdc2', 207, 'paint', 0.8, -0.2, 0.12),
    wada('w207-sudan', 'Sudan Brown', '#a36752', 207, 'wood', 0.5, 0.65, 0.5),
    wada('w207-black', 'Black', '#111314', 207, 'paint', 0.06, 0, 0.1),
    wada('w207-sudan-knit', 'Sudan Brown knit', '#a36752', 207, 'knit', 0.5, 0.65, 0.85),
    wada('w207-sudan-wool', 'Sudan Brown wool', '#a36752', 207, 'wool', 0.5, 0.65, 0.8),
    wada('w207-glaucous-linen', 'Glaucous Green linen', '#b4cdc2', 207, 'linen', 0.8, -0.15, 0.45),
  ],

  start: 'cozy',
  moods: {
    cozy: { name: 'Cozy', note: 'Wada #343', h: 17.2, mats: { floor: 'w343-olive-oak', wallL: 'w343-ivory', wallB: 'w343-ivory', slats: 'w343-blue', upholstery: 'w343-ivory-linen', accent: 'w343-sienna-wool', bedding: 'w343-ivory-linen', rug: 'w343-sienna-knit', joinery: 'w343-olive-oak' } },
    bright: { name: 'Bright', note: 'Wada #296', h: 12.8, mats: { floor: 'w296-umber', wallL: 'w296-sulpher', wallB: 'w296-sulpher', slats: 'w296-slate', upholstery: 'w296-sulpher-linen', accent: 'w296-salmon-wool', bedding: 'w296-sulpher-linen', rug: 'w296-salmon-knit', joinery: 'w296-umber' } },
    moody: { name: 'Moody', note: 'Wada #207', h: 22.2, mats: { floor: 'w207-sudan', wallL: 'w207-glaucous', wallB: 'w207-glaucous', slats: 'w207-black', upholstery: 'w207-glaucous-linen', accent: 'w207-sudan-wool', bedding: 'w207-glaucous-linen', rug: 'w207-sudan-knit', joinery: 'w207-sudan' } },
  },

  // [product, x, z, rotation degrees] on the floor; [product, hang plane index, along, height] on a wall.
  // Circulation: a clear strip at least 1.05 m deep runs along the front (z 1.3 to 2.4) from the entrance to the
  // kitchen and into the bedroom gap (z 1.2 to 2.4); every zone keeps the usual clearances (sofa to coffee table
  // about 0.4 m, chairs pulled back from tables, 0.6 m or more beside the bed). Nothing overlaps (checked on load).
  layout: [
    // kitchen and dining, by the left window
    ['kitchen', -3.79, 1.2, 90],
    ['habitt-otto-series-shelf-04', -3.92, -1.85, 90], ['tabledecor', -3.92, -1.85, 90],
    ['habitt-hendrick-dining-table', -2.6, -1.75, 0],
    ['habitt-ease-stripe-dining-chair', -2.9, -1.0, 180], ['habitt-ease-stripe-dining-chair', -2.3, -1.0, 180],
    ['habitt-ease-stripe-dining-chair', -3.43, -1.75, 90], ['habitt-ease-stripe-dining-chair', -1.77, -1.75, -90],
    ['plant', -1.25, -2.12, 0],
    // living, round the sofa against the glass
    ['rug', -0.5, -0.6, 90],
    ['habitt-billy-3-seater-sofa', 0.485, -0.6, -90], ['sofadress', 0.6, -0.6, -90],
    ['habitt-kade-side-table', 0.535, -1.8, 0], ['tablelamp', 0.55, -1.85, 0],
    ['lamp', 0.62, 0.68, -90],
    ['habitt-kade-coffee-table', -0.62, -0.6, 90], ['tabledecor', -0.62, -0.75, 90],
    ['habitt-cane-charm-armchair', -1.5, -1.0, 90], ['habitt-cane-charm-armchair', -1.5, -0.15, 90],
    // bedroom behind the glass
    ['habitt-marq-king-size-bed', 2.52, -1.38, 0],
    ['habitt-kade-side-table', 1.27, -2.085, 0], ['tablelamp', 1.27, -2.12, 0],
    ['habitt-kade-side-table', 3.79, -2.085, 0], ['tablelamp', 3.79, -2.12, 0],
    ['plant', 3.85, -0.12, 0],
    // work corner
    ['habitt-tubo-workstation', 3.86, 1.63, -90], ['habitt-ease-stripe-dining-chair', 3.3, 1.63, 90], ['snake', 3.88, 0.92, 0],
    // walls
    ['art', 0, 0.15, 1.75], ['frames', 1, -1.85, 1.75], ['art', 1, -0.6, 1.7],
  ],

  furniture: ['habitt-billy-3-seater-sofa', 'habitt-cane-charm-armchair', 'habitt-kade-coffee-table', 'habitt-kade-side-table', 'habitt-hendrick-dining-table', 'habitt-ease-stripe-dining-chair', 'habitt-marq-king-size-bed', 'habitt-tubo-workstation', 'habitt-otto-series-shelf-04', 'tablelamp', 'lamp', 'rug', 'plant', 'plant2', 'snake', 'art', 'frames', 'kitchen', 'sofadress', 'tabledecor'],

  camera: {
    home: { target: [0, -0.3, 0], yaw: 0.3, pitch: 0.58, dist: 21 },
    shots: [
      { t: [-0.3, 0.5, 0.75], yaw: -1.2, pitch: 0.32, dist: 5.5 },
      { t: [-2.3, 0.6, -1.3], yaw: 0.7, pitch: 0.3, dist: 5.5 },
      { t: [2.5, 0.6, -1.4], yaw: -0.4, pitch: 0.38, dist: 5.5 },
      { t: [3.6, 0.8, 1.6], yaw: -1.1, pitch: 0.3, dist: 4 },
      { t: [0, 0.3, 0], yaw: -0.6, pitch: 0.75, dist: 14 },
    ],
  },

  notes: { y: 3.4, z: -3.1, cards: [['wallB', -3.2], ['floor', -1.6], ['slats', 0.0], ['rug', 1.6], ['bedding', 3.2]] },

  anchors: {
    floor: [0, 0, 1.8],
    wallL: [-4.09, 1.7, 0.5],
    wallB: [-0.4, 1.9, -2.39],
    slats: [0.9, 1.5, -0.4],
    upholstery: { piece: ['sofadress'], at: [0.62, 0.03, 0.1], or: [0.5, 0.55, 0.7] },
    accent: { piece: ['sofadress'], at: [-0.5, 0.2, -0.1], or: [0.5, 0.7, 0.7] },
    bedding: { piece: ['habitt-marq-king-size-bed'], at: [0, 0.6, 0.3], or: [2.5, 0.6, -1.1] },
    rug: { piece: ['rug'], at: [0.6, 0.02, 0.5], or: [-0.35, 0, 0.75] },
    joinery: { piece: ['kitchen'], at: [0.4, 0.5, 0.3], or: [-3.7, 0.5, 1.2] },
  },
};
