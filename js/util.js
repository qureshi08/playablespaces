// Small shared helpers: maths, seeded random, cached materials and a geometry batcher.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV, slotMats } from './materials.js';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - (1 - t) ** 3;
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export function rng(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const cache = new Map();
export function std(color, o = {}) {
  const k = 'S' + color + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, envMapIntensity: 0.5, ...o }));
  return cache.get(k);
}
export function gloss(color, o = {}) {
  const k = 'G' + color + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshPhysicalMaterial({ color, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.16, envMapIntensity: 1.1, ...o }));
  return cache.get(k);
}
export function metal(color, o = {}) {
  const k = 'T' + color + JSON.stringify(o);
  if (!cache.has(k)) cache.set(k, new THREE.MeshPhysicalMaterial({ color, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.25, clearcoat: 0.35, clearcoatRoughness: 0.3, ...o }));
  return cache.get(k);
}
export const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: true, fog: false });

export const BLACK_METAL = metal('#1b1c1f', { roughness: 0.4, metalness: 0.6 });
export const BRASS = metal('#c9a15e', { roughness: 0.28, metalness: 1, clearcoat: 0.5 });

const SLOT_SET = new Set(Object.values(slotMats));
export const isSlot = m => SLOT_SET.has(m);

export const rbox = (w, h, d, r = 0.02, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2.02));

// rebuild normals smooth after deforming a geometry
export function smoothGeo(g) {
  g = g.index ? g : g;
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g); g.computeVertexNormals();
  return g;
}

// soft cushion: rounded box whose top bulges up in the middle
export function cushion(w, h, d, r = 0.05, puff = 0.018) {
  const g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, Math.min(w, h, d) / 2.02)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2), y = p.getY(i);
    if (y > 0) p.setY(i, y + puff * Math.max(0, 1 - x * x) * Math.max(0, 1 - z * z) * (y / (h / 2)));
  }
  return smoothGeo(g);
}
// scatter pillow: a box pinched at the edges
export function pillow(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 14, 14, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    const k = Math.pow(Math.max(0, 1 - x * x), 0.55) * Math.pow(Math.max(0, 1 - y * y), 0.55);
    p.setZ(i, p.getZ(i) * (0.16 + 0.84 * k)); p.setX(i, p.getX(i) * (1 - 0.07 * y * y)); p.setY(i, p.getY(i) * (1 - 0.07 * x * x));
  }
  return smoothGeo(g);
}
// lathe from [radius, height] pairs, with uvs in metres
export function lathe(pts, seg = 32) {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const R = Math.max(...pts.map(p => p[0])), uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * R, pos.getY(i));
  return g;
}

// one leaf as a curved strip, with vertex colours lighter along the midrib
export function leaf(len, wid, { fold = 0.25, curl = 0.18, shape = 'oval', seg = 9 } = {}) {
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    let w = shape === 'fiddle' ? Math.sin(Math.PI * Math.pow(t, 0.75)) * (0.62 + 0.55 * t)
      : shape === 'heart' ? Math.sin(Math.PI * Math.pow(t, 0.6)) * (1.1 - 0.3 * t)
      : shape === 'blade' ? Math.pow(Math.sin(Math.PI * Math.min(t * 0.95 + 0.05, 1)), 0.4) * (1 - 0.6 * t)
      : shape === 'paddle' ? Math.pow(Math.sin(Math.PI * t), 0.55) : Math.sin(Math.PI * t) * (1 - 0.2 * t);
    w = Math.max(w * wid / 2, 0.0015);
    for (let j = -3; j <= 3; j++) {
      const s = j / 3;
      pos.push(s * w, t * len, -Math.abs(s) * w * fold - curl * len * t * t);
      const m = 1 - Math.abs(s);
      col.push(0.82 + 0.3 * m ** 3, 0.86 + 0.22 * m ** 3, 0.8 + 0.2 * m ** 3);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < 6; j++) { const a = i * 7 + j, b = a + 1, c = a + 7, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g.toNonIndexed();
}
const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
// point a leaf (built along +y) in direction dir from base point, spun by roll, tinted by colour
export function aimLeaf(g, base, dir, roll, tint) {
  _y.copy(dir).normalize();
  _z.set(0, 1, 0).addScaledVector(_y, -_y.y); if (_z.lengthSq() < 1e-4) _z.set(0, 0, 1); _z.normalize();
  _x.crossVectors(_y, _z);
  _m.makeBasis(_x, _y, _z);
  g.applyMatrix4(_m.premultiply(new THREE.Matrix4().makeRotationAxis(_y, roll)));
  g.translate(base.x, base.y, base.z);
  const c = g.attributes.color;
  for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
  return g;
}
const LEAF_GREENS = ['#2f5a2c', '#3b6a33', '#467a3a', '#2a4f2e', '#557f3f'].map(c => new THREE.Color(c));
export const leafTint = r => LEAF_GREENS[Math.floor(r() * LEAF_GREENS.length)].clone().multiplyScalar(0.9 + r() * 0.25);
export const LEAF_MAT = std('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 0.48, envMapIntensity: 0.8 });

// Geometry batcher: queue parts per material, flush merges them into one mesh per material.
const _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
export function batch() {
  const groups = new Map();
  const add = (mat, geo, x, y, z, o = {}) => {
    let tint = null;
    if (mat && mat.isTint) { tint = mat.col; mat = mat.base; }
    geo = geo.index ? geo.toNonIndexed() : geo;
    for (const a of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) geo.deleteAttribute(a);
    if (o.dir) { _q.setFromUnitVectors(_up, _d.set(...o.dir).normalize()); }
    else { _e.set(o.rx || 0, o.ry || 0, o.rz || 0); _q.setFromEuler(_e); }
    geo.applyMatrix4(_m.compose(_p.set(x, y, z), _q, o.s ? _s.set(...o.s) : _s.set(1, 1, 1)));
    if (o.uv !== 'keep' && (o.uv === 'box' || isSlot(mat))) geo = boxUV(geo);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (mat.vertexColors && !geo.attributes.color) {
      const n = geo.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = tint ? tint.r : 1; c[i * 3 + 1] = tint ? tint.g : 1; c[i * 3 + 2] = tint ? tint.b : 1; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    if (geo.attributes.color && !mat.vertexColors) geo.deleteAttribute('color');
    if (!groups.has(mat)) groups.set(mat, []);
    groups.get(mat).push(geo);
  };
  const api = {
    box(mat, x, y, z, w, h, d, o = {}) { add(mat, o.r ? rbox(w, h, d, o.r, o.seg || 2) : new THREE.BoxGeometry(w, h, d), x, y, z, o); return api; },
    cyl(mat, x, y, z, rt, rb, h, o = {}) { add(mat, new THREE.CylinderGeometry(rt, rb, h, o.seg || 20, o.hs || 1, !!o.open), x, y, z, o); return api; },
    sph(mat, x, y, z, r, o = {}) { add(mat, new THREE.SphereGeometry(r, o.seg || 16, o.seg2 || 12), x, y, z, o); return api; },
    tor(mat, x, y, z, r, t, o = {}) { add(mat, new THREE.TorusGeometry(r, t, o.rs || 8, o.ts || 28, o.arc || Math.PI * 2), x, y, z, o); return api; },
    geo(mat, g, x = 0, y = 0, z = 0, o = {}) { add(mat, g.clone(), x, y, z, o); return api; },
    flush(parent, cast = true) {
      const out = [];
      for (const [mat, list] of groups) {
        const mesh = new THREE.Mesh(mergeGeometries(list), mat);
        mesh.castShadow = cast; mesh.receiveShadow = true;
        parent.add(mesh); out.push(mesh);
        list.forEach(g => g.dispose());
      }
      groups.clear();
      return out;
    },
  };
  return api;
}
// a material with a per-part vertex tint (for books, pots) that still merges into one mesh
export const tint = (base, col) => ({ isTint: true, base, col: new THREE.Color(col) });

export function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
