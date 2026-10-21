// The studio flat: living room, dining corner, bedroom and study, cut open on a plinth.
// Everything that makes this room this room lives here; the kit builds it. Units are metres.
// x runs left to right, z runs back (-) to front (+). Walls are named left, right, back, front.
export default {
  title: 'Studio flat',
  plinth: { label: 'PLAYABLE SPACES' },

  shell: {
    x0: -5.3, x1: 5.3, z0: -3.7, z1: 3.7, height: 2.75, thick: 0.18, low: 0.45,
    walls: [
      { side: 'left', tall: true, slot: 'wallL', windows: [{ from: 1.3, to: 2.8, y0: 0.55, y1: 2.4, mullions: 1, transom: 0.7, curtains: ['start'] }] },
      { side: 'back', tall: true, slot: 'wallB', windows: [{ from: -2.35, to: 0.75, y0: 0.1, y1: 2.5, mullions: 3, curtains: ['start', 'end'] }] },
      { side: 'front', slot: 'wallB', doors: [{ from: -1.25, to: -0.2, mat: true }] },
      { side: 'right', slot: 'wallB' },
    ],
    // low walls between the rooms: a run along z at x, or along x at z, with door gaps
    partitions: {
      height: 1.3, thick: 0.12,
      list: [
        { x: 1.45, z: [-3.7, 3.7], doors: [[1.6, 2.5]] },
        { z: 0.95, x: [1.51, 5.3], doors: [[2.1, 3.0]] },
      ],
    },
    slatWall: { side: 'left', from: -3.7, to: -2 },
    // where shelves and prints can hang; the order is part of share links, so only append
    hang: [
      { side: 'back', from: -5.3, to: -2.35, name: 'back wall' },
      { side: 'back', from: 0.75, to: 1.39, name: 'back wall' },
      { side: 'back', from: 1.51, to: 5.3, name: 'back wall' },
      { side: 'left', from: -1.98, to: 1.3, name: 'left wall' },
      { side: 'left', from: -3.7, to: -2, inset: 0.06, name: 'slat wall' },
    ],
  },

  start: 'cozy',
  moods: {
    cozy: { name: 'Cozy', note: 'golden hour', h: 18.4, mats: { floor: 'oak', wallL: 'limewash', wallB: 'limewash', slats: 'walnut', upholstery: 'boucle', accent: 'rust', bedding: 'linen', rug: 'knit', joinery: 'walnut' } },
    bright: { name: 'Bright', note: 'midday', h: 12.8, mats: { floor: 'whiteoak', wallL: 'chalk', wallB: 'chalk', slats: 'whiteoak', upholstery: 'linen', accent: 'navy', bedding: 'linen', rug: 'linen', joinery: 'whiteoak' } },
    moody: { name: 'Moody', note: 'after dark', h: 22.2, mats: { floor: 'smoked', wallL: 'ink', wallB: 'ink', slats: 'walnut', upholstery: 'cognac', accent: 'ochre', bedding: 'charcoal', rug: 'heather', joinery: 'smoked' } },
  },

  // [product, x, z, rotation degrees] on the floor; [product, hang plane index, along, height] on a wall
  layout: [
    ['rug', -3.4, -1.3, 90], ['sofa', -4.75, -1.6, 90], ['coffee', -3.3, -1.25, 0], ['armchair', -2.05, -1.0, -90], ['pouf', -2.6, -2.4, 0],
    ['lamp', -4.95, 0.4, 180], ['side', -4.9, -3.35, 0], ['credenza', -3.45, -3.47, 0], ['plant', -2.0, -3.3, 0], ['plant2', -4.95, 0.98, 0],
    ['dining', -3.6, 2.15, 0], ['chair', -4.0, 1.4, 0], ['chair', -3.2, 1.4, 0], ['chair', -4.0, 2.9, 180], ['chair', -3.2, 2.9, 180],
    ['bed', 3.55, -2.6, 0], ['nightstand', 2.15, -3.47, 0], ['nightstand', 4.95, -3.47, 0], ['bench', 3.55, -1.2, 0], ['wardrobe', 1.82, -0.2, 90], ['snake', 5.0, 0.5, 0],
    ['desk', 4.2, 1.35, 0], ['taskchair', 4.2, 2.05, 180], ['bookcase', 1.69, 3.1, 90], ['plant', 5.0, 3.3, 0],
    ['shelf', 0, -3.45, 1.6], ['art', 3, -0.95, 1.55], ['frames', 2, 3.55, 1.55],
  ],

  camera: {
    home: { target: [0.2, -0.35, 0.3], yaw: 0.3, pitch: 0.54, dist: 27 },
    // cinematic mode cycles through these
    shots: [
      { t: [-3.4, 0.6, -1.4], yaw: 0.9, pitch: 0.32, dist: 8.5 },
      { t: [3.5, 0.6, -2.2], yaw: -0.5, pitch: 0.42, dist: 8 },
      { t: [-3.6, 0.7, 2.1], yaw: 1.6, pitch: 0.28, dist: 7.5 },
      { t: [0, 0.3, 0], yaw: -0.6, pitch: 0.75, dist: 19 },
      { t: [4.1, 0.7, 1.9], yaw: 0.2, pitch: 0.35, dist: 6.5 },
      { t: [-1.5, 0.4, -0.6], yaw: 0.05, pitch: 0.5, dist: 13 },
    ],
  },

  // swatch cards floating over the room: which surface, and where across the room the card sits
  notes: { y: 3.75, z: -4.2, cards: [['upholstery', -3.6], ['slats', -1.75], ['wallB', 0.0], ['floor', 1.75], ['bedding', 3.65]] },

  // a point on each surface, for wipes started from the UI and for the card lines;
  // a product anchor follows that piece wherever it has been moved
  anchors: {
    floor: [0.3, 0, 0.6],
    wallL: [-5.29, 1.7, 0.2],
    wallB: [1.2, 1.9, -3.69],
    slats: [-5.24, 1.7, -2.9],
    upholstery: { piece: ['sofa'], at: [-0.3, 0.5, 0.15], or: [-4, 0.5, -1.5] },
    accent: { piece: ['sofa'], at: [-0.9, 0.62, -0.05], or: [-4, 0.6, -1.5] },
    bedding: { piece: ['bed'], at: [0, 0.55, 0.4], or: [3.5, 0.5, -2.5] },
    rug: { piece: ['rug'], at: [0.6, 0.02, 0.5], or: [-3, 0, -1] },
    joinery: { piece: ['credenza', 'dining'], at: [0.4, 0.6, 0], or: [-3.4, 0.6, -3.4] },
  },
};
