// Shared bits for Habitt's products: inch conversion and the finishes Habitt actually uses.
// Products keep their own materials (not the room's swappable slots), so a piece only ever shows
// a colour the store sells.
import * as THREE from 'three';
import { surfaceTex } from '../../kit/textures.js';
import { std, metal, canvasTex, rng } from '../../kit/util.js';

export const IN = v => v * 0.0254;
export const STORE = 'Habitt';
export const CHECKED = '2026-10-22';

// a procedural surface (same painter as the room samples) as a plain material; uv must be 'box' (metres)
const made = new Map();
let seed = 200;
export function texMat(spec, o = {}) {
  if (made.has(spec.id)) return made.get(spec.id);
  spec.i = spec.i ?? seed++;
  const t = surfaceTex(spec, 'plain');
  for (const tex of [t.c, t.n]) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1 / t.span[0], 1 / t.span[1]); }
  const m = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: t.c, normalMap: t.n, roughness: 0.8, envMapIntensity: 0.6, ...o });
  made.set(spec.id, m);
  return m;
}

// woven jute for the Billy sofa, one per colour Habitt sells
export const JUTE = {
  Grey: ['#9d9c99', '#7d7c79', '#b9b8b4'],
  Red: ['#9e3a33', '#7a2723', '#b65049'],
  'Light Green': ['#a7b48f', '#8a9873', '#bfcaa8'],
  'Off White': ['#e2dccf', '#c8c0b0', '#efebe2'],
};
export const jute = name => texMat({ id: 'habitt-jute-' + name, cat: 'fabric', k: 7, c: JUTE[name], p: [70], size: [0.18, 0.18] }, { sheen: 0.2, sheenRoughness: 0.8 });

// laminated wood finishes
export const WALNUT_LAM = () => texMat({ id: 'habitt-walnut-lam', cat: 'wood', k: 1, c: ['#8a5a34', '#5e3a1f', '#3f2714'], p: [12, 0.9, 0.12, 0.45], size: [1.2, 0.3] }, { roughness: 0.55, clearcoat: 0.15 });
export const BEECH = () => texMat({ id: 'habitt-beech', cat: 'wood', k: 1, c: ['#d29a5c', '#b07a40', '#e2b27a'], p: [14, 0.8, 0.1, 0.5], size: [1.2, 0.3] }, { roughness: 0.5, clearcoat: 0.2 });
export const LIGHT_OAK = () => texMat({ id: 'habitt-light-oak', cat: 'wood', k: 1, c: ['#d8b98c', '#b99566', '#e8cfa8'], p: [15, 0.75, 0.09, 0.5], size: [1.2, 0.3] }, { roughness: 0.6 });

export const BLACK_FRAME = metal('#1c1c1e', { roughness: 0.5, metalness: 0.5, clearcoat: 0.1 });
export const BLACK_WOOD = std('#1d1a17', { roughness: 0.6 });
export const BLACK_LEATHER = std('#141414', { roughness: 0.55, envMapIntensity: 0.45 });

// cane weave on a canvas, tinted honey
let caneTex = null, cane = null;
export function caneMat() {
  if (!cane) {
    caneTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#4a3418'; g.fillRect(0, 0, w, h);
      const r = rng(7), step = 16;
      for (let i = 0; i < w; i += step) for (let j = 0; j < h; j += step) {
        g.fillStyle = `rgb(${205 + r() * 25},${150 + r() * 20},${70 + r() * 15})`;
        g.fillRect(i + 1, j + 5, step - 2, 6); g.fillRect(i + 5, j + 1, 6, step - 2);
      }
    });
    caneTex.wrapS = caneTex.wrapT = THREE.RepeatWrapping; caneTex.repeat.set(7, 7);
    cane = new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.7, envMapIntensity: 0.5, side: THREE.DoubleSide });
  }
  return cane;
}
