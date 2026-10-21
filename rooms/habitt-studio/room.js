// Space 1: the studio flat furnished with Habitt's real catalogue (products.md lists every piece and its source).
// Same shell, moods and camera as the studio; the Habitt pieces replace the stand-ins. Lamps, plants, the rug,
// the wardrobe, the bookcase and the wall pieces stay generic: they are styling, not for sale here.
import studio from '../studio/room.js';

export default {
  ...studio,
  title: 'Studio flat, furnished by Habitt',

  // [product, x, z, rotation degrees] on the floor; [product, hang plane index, along, height] on a wall
  layout: [
    // living
    ['rug', -3.55, -1.15, 90],
    ['habitt-billy-3-seater-sofa', -4.92, -1.1, 90],
    ['habitt-kade-coffee-table', -3.75, -1.1, 90],
    ['habitt-cane-charm-armchair', -2.75, -1.65, -90], ['habitt-cane-charm-armchair', -2.75, -0.6, -90],
    ['habitt-kade-side-table', -4.93, -2.62, 0],
    ['lamp', -4.95, 0.25, 180], ['plant2', -4.95, 0.8, 0], ['plant', -2.0, -3.3, 0],
    ['habitt-otto-series-shelf-04', -4.65, -3.52, 0],
    // dining
    ['habitt-hendrick-dining-table', -3.6, 2.15, 0],
    ['habitt-ease-stripe-dining-chair', -3.9, 1.5, 0], ['habitt-ease-stripe-dining-chair', -3.3, 1.5, 0],
    ['habitt-ease-stripe-dining-chair', -3.9, 2.8, 180], ['habitt-ease-stripe-dining-chair', -3.3, 2.8, 180],
    // bedroom
    ['habitt-marq-king-size-bed', 3.45, -2.68, 0],
    ['habitt-kade-side-table', 2.2, -3.39, 0], ['habitt-kade-side-table', 4.99, -3.39, 0],
    ['wardrobe', 1.82, -0.2, 90], ['snake', 5.0, 0.5, 0],
    // study
    ['habitt-tubo-workstation', 4.2, 1.25, 0], ['taskchair', 4.2, 1.85, 180],
    ['bookcase', 1.69, 3.1, 90], ['plant', 5.0, 3.3, 0],
    // walls
    ['shelf', 0, -3.45, 1.6], ['art', 3, -0.95, 1.55], ['frames', 2, 3.55, 1.55],
  ],

  // the swatch cards point at surfaces visitors can still restyle here
  notes: { y: 3.75, z: -4.2, cards: [['slats', -3.6], ['wallB', -1.75], ['floor', 0.0], ['rug', 1.75], ['bedding', 3.65]] },

  anchors: {
    ...studio.anchors,
    upholstery: { piece: ['habitt-billy-3-seater-sofa'], at: [0, 0.5, 0], or: [-4.9, 0.5, -1.1] },
    accent: { piece: ['habitt-billy-3-seater-sofa'], at: [0.5, 0.6, -0.1], or: [-4.9, 0.6, -1.1] },
    bedding: { piece: ['habitt-marq-king-size-bed'], at: [0, 0.6, 0.3], or: [3.45, 0.6, -2.4] },
    joinery: { piece: ['bookcase', 'wardrobe'], at: [0, 1, 0], or: [1.7, 1, 3.1] },
  },
};
